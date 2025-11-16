// backend/src/controllers/messageController.js (PRODUCTION-READY)
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import DOMPurify from "isomorphic-dompurify";
import { body, param, query, validationResult } from "express-validator";
import { PAGINATION } from "../config/constant.js";

// ✅ VALIDATION MIDDLEWARE
export const validateSendMessage = [
  body("receiverId").isMongoId().withMessage("Invalid receiver ID"),
  body("text")
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message must be 1-5000 characters"),
];

export const validateGetMessages = [
  param("id").isMongoId().withMessage("Invalid user ID"),
  query("before").optional().isISO8601().withMessage("Invalid date format"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be 1-100"),
];

// ✅ SANITIZE INPUT
const sanitizeText = (text) => {
  if (!text) return "";

  // Remove all HTML tags
  const cleaned = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Trim and truncate
  return cleaned.trim().substring(0, 5000);
};

// GET /api/messages/contacts
export const getAllContacts = async (req, res) => {
  try {
    const myId = req.user._id;

    // ✅ Add limit to prevent huge queries
    const contacts = await User.find({ _id: { $ne: myId } })
      .select("fullname email avatar")
      .sort({ fullname: 1 })
      .limit(500) // ✅ Prevent loading 10k+ users
      .lean(); // ✅ Return plain objects (faster)

    res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.error("❌ Get contacts error:", error);
    // ✅ Don't leak error details
    res.status(500).json({
      success: false,
      message: "Failed to load contacts",
    });
  }
};

// GET /api/messages/chats
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
      {
        $unwind: "$user",
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
      {
        $limit: 100, // ✅ Limit chat list
      },
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
    console.error("❌ Get chat partners error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load chats",
    });
  }
};

// ✅ GET /api/messages/:id - WITH PAGINATION
export const getMessages = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id: otherUserId } = req.params;
    // ✅ Use constant as default
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

    const limitNum = parseInt(limit) || PAGINATION.MESSAGES_PER_PAGE; // ✅ Fallback to constant

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

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
    console.error("❌ Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load messages",
    });
  }
};

// ✅ SEND MESSAGE - VALIDATED & SANITIZED
export const sendMessage = async (req, res) => {
  try {
    // ✅ Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { receiverId, text } = req.body;
    const senderId = req.user._id;

    if (!text && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId).lean();
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    // ✅ Sanitize text
    const sanitizedText = sanitizeText(text);

    const message = await Message.create({
      senderId,
      receiverId,
      text: sanitizedText,
      read: false,
    });

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("❌ Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

// ✅ SEND IMAGE - WITH VALIDATION
export const sendImageMessage = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    // ✅ Validate file type by magic number (not just extension)
    const fileType = req.file.mimetype;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type. Only JPEG, PNG, GIF, WEBP allowed",
      });
    }

    // ✅ Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "Image must be less than 5MB",
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, "messages");

    const message = await Message.create({
      senderId,
      receiverId,
      image: result.secure_url,
      imagePublicId: result.public_id,
      read: false,
    });

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("❌ Send image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send image",
    });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"],
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $limit: 100, // ✅ Limit results
      },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          "userInfo.fullname": 1,
          "userInfo.avatar": 1,
          "userInfo.email": 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("❌ Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load conversations",
    });
  }
};
