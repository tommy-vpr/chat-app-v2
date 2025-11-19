// backend/controllers/messageController.js (CORRECTED)
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import sanitizeHtml from "sanitize-html";
import { PAGINATION } from "../config/constant.js";
import { getIO } from "../socket/socketHandler.js";
import { logger } from "../lib/logger.js";
import { captureException } from "../lib/sentry.js";

// ==========================
// SANITIZATION
// ==========================
const sanitizeText = (text) => {
  if (!text || typeof text !== "string") return "";

  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .trim()
    .substring(0, 5000);
};

// ==========================
// GET ALL CONTACTS
// ==========================
export const getAllContacts = async (req, res) => {
  try {
    const myId = req.user._id;

    const contacts = await User.find({ _id: { $ne: myId } })
      .select("fullname email avatar")
      .sort({ fullname: 1 })
      .limit(500)
      .lean();

    res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error) {
    logger.error("Get contacts error", { error: error.message });
    captureException(error, { context: "getAllContacts" });

    res.status(500).json({
      success: false,
      message: "Failed to load contacts",
    });
  }
};

// ==========================
// GET CHAT PARTNERS
// ==========================
export const getChatPartners = async (req, res) => {
  try {
    const myId = req.user._id;

    const chatPartners = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: myId }, { receiverId: myId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$senderId", myId] }, "$receiverId", "$senderId"],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", myId] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { "lastMessage.createdAt": -1 } },
      { $limit: 100 },
      {
        $project: {
          _id: 1,
          user: {
            _id: "$user._id",
            fullname: "$user.fullname",
            email: "$user.email",
            avatar: "$user.avatar",
          },
          lastMessage: {
            _id: "$lastMessage._id",
            text: "$lastMessage.text",
            image: "$lastMessage.image",
            createdAt: "$lastMessage.createdAt",
          },
          unreadCount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      chats: chatPartners,
    });
  } catch (error) {
    logger.error("Get chat partners error", { error: error.message });
    captureException(error, { context: "getChatPartners" });

    res.status(500).json({
      success: false,
      message: "Failed to load chats",
    });
  }
};

// ==========================
// GET MESSAGES WITH PAGINATION
// ==========================
export const getMessages = async (req, res) => {
  try {
    // ✅ Validation already done by Zod middleware
    const { id: otherUserId } = req.params;
    const { before, limit = PAGINATION.MESSAGES_PER_PAGE } = req.query;
    const myId = req.user._id;

    const otherUser = await User.findById(otherUserId)
      .select("fullname avatar")
      .lean();

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let query = {
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const limitNum = parseInt(limit) || PAGINATION.MESSAGES_PER_PAGE;

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    // Mark as read (non-blocking)
    Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: myId,
        read: false,
      },
      { $set: { read: true } }
    ).exec();

    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      user: otherUser,
      hasMore: messages.length === limitNum,
      nextCursor: messages.length > 0 ? messages[0].createdAt : null,
    });
  } catch (error) {
    logger.error("Get messages error", { error: error.message });
    captureException(error, { context: "getMessages" });

    res.status(500).json({
      success: false,
      message: "Failed to load messages",
    });
  }
};

// ==========================
// SEND TEXT MESSAGE
// ==========================
export const sendMessage = async (req, res) => {
  try {
    // ✅ Validation already done by Zod middleware
    const { receiverId, text } = req.body;
    const senderId = req.user._id;

    const receiver = await User.findById(receiverId).lean();
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const sanitizedText = sanitizeText(text);

    const message = await Message.create({
      senderId,
      receiverId,
      text: sanitizedText,
      read: false,
    });

    // Broadcast via socket
    const io = getIO();
    if (io) {
      io.to(receiverId.toString()).emit("new_message", {
        message,
        from: senderId.toString(),
      });
    }

    logger.info("Message sent", {
      messageId: message._id,
      from: senderId,
      to: receiverId,
    });

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    logger.error("Send message error", { error: error.message });
    captureException(error, { context: "sendMessage" });

    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

// ==========================
// SEND IMAGE MESSAGE
// ==========================
export const sendImageMessage = async (req, res) => {
  try {
    // ✅ Validation already done by Zod middleware
    const { receiverId, text } = req.body;
    const senderId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const fileType = req.file.mimetype;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type. Only JPEG, PNG, GIF, WEBP allowed",
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Image must be less than 5MB",
      });
    }

    const receiver = await User.findById(receiverId).lean();
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, "messages");

    // Create the message
    const message = await Message.create({
      senderId,
      receiverId,
      text: text ? sanitizeText(text) : "",
      image: result.secure_url,
      imagePublicId: result.public_id,
      read: false,
    });

    // Emit to socket
    const io = getIO();
    if (io) {
      io.to(receiverId.toString()).emit("new_message", {
        message,
        from: senderId.toString(),
      });
    }

    logger.info("Image message sent", {
      messageId: message._id,
      from: senderId,
      to: receiverId,
    });

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    logger.error("Send image error", { error: error.message });
    captureException(error, { context: "sendImageMessage" });

    res.status(500).json({
      success: false,
      message: "Failed to send image",
    });
  }
};
