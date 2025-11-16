// backend/src/socket/socketHandler.js (PRODUCTION-READY)
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import Message from "../models/messageModel.js";
import { ENV } from "../lib/env.js";
import DOMPurify from "isomorphic-dompurify";

let io;

// Store online users (userId -> socketId)
const onlineUsers = new Map();

// ✅ RATE LIMITING - Per user per event
const rateLimits = new Map();

const checkRateLimit = (userId, event, maxRequests = 10, windowMs = 1000) => {
  const key = `${userId}:${event}`;
  const now = Date.now();

  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  const limit = rateLimits.get(key);

  if (now > limit.resetAt) {
    limit.count = 1;
    limit.resetAt = now + windowMs;
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
};

// ✅ INPUT SANITIZATION
const sanitizeText = (text) => {
  if (!text || typeof text !== "string") return "";
  const cleaned = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  return cleaned.trim().substring(0, 5000);
};

// ✅ VALIDATION HELPERS
const isValidMongoId = (id) => {
  return /^[a-f\d]{24}$/i.test(id);
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:
        ENV.NODE_ENV === "development"
          ? "http://localhost:5173"
          : ENV.FRONTEND_URL || "https://chat-app-0ith6.sevalla.app",
      credentials: true,
    },
    // ✅ Connection limits
    maxHttpBufferSize: 1e6, // 1MB max message size
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT AUTHENTICATION MIDDLEWARE
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;

      if (!cookieHeader) {
        return next(new Error("Authentication required"));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.jwt || cookies.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, ENV.JWT_SECRET);
      socket.userId = decoded.userId || decoded.id || decoded._id;

      if (!socket.userId) {
        return next(new Error("Invalid token payload"));
      }

      // ✅ Limit connections per user
      const existingConnections = Array.from(
        io.sockets.sockets.values()
      ).filter((s) => s.userId === socket.userId);

      if (existingConnections.length >= 5) {
        return next(new Error("Maximum connections exceeded"));
      }

      console.log(`✅ Socket auth successful for user: ${socket.userId}`);
      next();
    } catch (error) {
      console.error("❌ Socket auth error:", error.message);

      if (error.name === "JsonWebTokenError") {
        return next(new Error("Invalid authentication token"));
      }
      if (error.name === "TokenExpiredError") {
        return next(new Error("Authentication token expired"));
      }

      next(new Error("Authentication failed"));
    }
  });

  // CONNECTION HANDLER
  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`✅ User connected: ${userId}`);

    onlineUsers.set(userId, socket.id);
    socket.join(userId);

    io.emit("user_online", { userId });
    socket.emit("online_users", { users: Array.from(onlineUsers.keys()) });

    // ✅ SEND MESSAGE - WITH RATE LIMITING & VALIDATION
    socket.on("send_message", async (data) => {
      try {
        // ✅ Rate limit: 10 messages per second
        if (!checkRateLimit(userId, "send_message", 10, 1000)) {
          return socket.emit("message_error", {
            error: "Rate limit exceeded. Please slow down.",
            tempId: data.tempId,
          });
        }

        const { receiverId, text, image, tempId } = data;

        // ✅ Validate inputs
        if (!receiverId || !isValidMongoId(receiverId)) {
          throw new Error("Invalid receiver ID");
        }

        if (!text && !image) {
          throw new Error("Message must contain text or image");
        }

        // ✅ Validate text length
        if (text && text.length > 5000) {
          throw new Error("Message too long (max 5000 characters)");
        }

        // ✅ Sanitize text
        const sanitizedText = sanitizeText(text);

        // ✅ Validate image URL if provided
        if (image && typeof image !== "string") {
          throw new Error("Invalid image format");
        }

        console.log(`📤 Sending message: ${userId} → ${receiverId}`);

        // Save to database
        const message = await Message.create({
          senderId: userId,
          receiverId,
          text: sanitizedText,
          image: image || null,
          read: false,
        });

        console.log(`✅ Message saved: ${message._id}`);

        // Send to receiver
        io.to(receiverId).emit("new_message", {
          message,
          from: userId,
        });

        // Confirm to sender
        socket.emit("message_sent", {
          tempId,
          message,
        });
      } catch (error) {
        console.error("❌ Send message error:", error);
        socket.emit("message_error", {
          error: error.message || "Failed to send message",
          tempId: data.tempId,
        });
      }
    });

    // MARK READ
    socket.on("mark_read", async (data) => {
      try {
        const { senderId } = data;

        if (!senderId || !isValidMongoId(senderId)) {
          throw new Error("Invalid sender ID");
        }

        const result = await Message.updateMany(
          {
            senderId: senderId,
            receiverId: userId,
            read: false,
          },
          { $set: { read: true } }
        );

        console.log(`✅ Marked ${result.modifiedCount} messages as read`);

        io.to(senderId).emit("messages_read", {
          readBy: userId,
          count: result.modifiedCount,
        });

        socket.emit("mark_read_success", {
          senderId,
          count: result.modifiedCount,
        });
      } catch (error) {
        console.error("❌ Mark read error:", error);
        socket.emit("mark_read_error", {
          error: error.message,
        });
      }
    });

    // ✅ TYPING - WITH THROTTLE
    let typingTimeout;
    socket.on("typing", (data) => {
      const { receiverId } = data;

      if (!receiverId || !isValidMongoId(receiverId)) {
        return;
      }

      // ✅ Throttle: Only allow 1 typing event per 500ms
      if (!checkRateLimit(userId, "typing", 2, 1000)) {
        return;
      }

      console.log(`⌨️ User typing: ${userId} → ${receiverId}`);
      io.to(receiverId).emit("user_typing", { userId });

      // ✅ Auto-stop typing after 5 seconds
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        io.to(receiverId).emit("user_stop_typing", { userId });
      }, 5000);
    });

    socket.on("stop_typing", (data) => {
      const { receiverId } = data;

      if (!receiverId || !isValidMongoId(receiverId)) {
        return;
      }

      clearTimeout(typingTimeout);
      console.log(`⏸️ User stopped typing: ${userId} → ${receiverId}`);
      io.to(receiverId).emit("user_stop_typing", { userId });
    });

    // DISCONNECT
    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${userId} (${reason})`);

      onlineUsers.delete(userId);
      io.emit("user_offline", { userId });

      // ✅ Cleanup rate limits
      for (const [key] of rateLimits) {
        if (key.startsWith(userId)) {
          rateLimits.delete(key);
        }
      }

      clearTimeout(typingTimeout);
    });

    socket.on("error", (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  });

  // ✅ Cleanup stale rate limits every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, limit] of rateLimits) {
      if (now > limit.resetAt + 300000) {
        // 5 minutes
        rateLimits.delete(key);
      }
    }
  }, 300000);

  console.log("✅ Socket.io initialized with JWT authentication");
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

export const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

export const sendToUser = (userId, event, data) => {
  if (!io) {
    console.warn("Socket.io not initialized");
    return false;
  }

  io.to(userId).emit(event, data);
  return true;
};
