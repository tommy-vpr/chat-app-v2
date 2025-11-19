// backend/socket/socketHandler.js (PRODUCTION-READY v3)
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import Message from "../models/messageModel.js";
import { ENV } from "../lib/env.js";
import sanitizeHtml from "sanitize-html";
import { socketLogger } from "../lib/logger.js";
import { captureException } from "../lib/sentry.js";

let io;

// Store online users (userId -> socketId)
const onlineUsers = new Map();

// ✅ FIXED: Store typing timeouts per socket (not global)
const typingTimeouts = new Map(); // socketId -> timeout

// ==========================
// RATE LIMITING
// ==========================
const rateLimits = new Map();

const checkRateLimit = (userId, event, maxRequests = 10, windowMs = 1000) => {
  const key = `${userId}:${event}`;
  const now = Date.now();

  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  const entry = rateLimits.get(key);

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return true;
  }

  if (entry.count >= maxRequests) {
    socketLogger.warn("Rate limit exceeded", { userId, event });
    return false;
  }

  entry.count++;
  return true;
};

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
// VALIDATION
// ==========================
const isValidMongoId = (id) => {
  if (!id || typeof id !== "string") return false;
  return /^[a-f\d]{24}$/i.test(id);
};

// ==========================
// INITIALIZE SOCKET
// ==========================
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:
        ENV.NODE_ENV === "development"
          ? "http://localhost:5173"
          : ENV.FRONTEND_URL || "https://chat-app-0ith6.sevalla.app",
      credentials: true,
    },
    maxHttpBufferSize: 1e6, // 1MB max
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  // ==========================
  // AUTH MIDDLEWARE
  // ==========================
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;

      if (!cookieHeader) {
        socketLogger.warn("Socket connection without cookie", {
          ip: socket.handshake.address,
        });
        return next(new Error("Authentication required"));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.jwt || cookies.token;

      if (!token) {
        socketLogger.warn("Socket connection without token", {
          ip: socket.handshake.address,
        });
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, ENV.JWT_SECRET);

      // ✅ IMPROVED: More explicit token field extraction
      const userId = decoded.id || decoded.userId || decoded._id;

      if (!userId || !isValidMongoId(userId)) {
        socketLogger.warn("Invalid token payload", {
          decoded: { ...decoded, password: undefined }, // Don't log sensitive data
        });
        return next(new Error("Invalid token payload"));
      }

      socket.userId = userId.toString();

      // Limit to 5 connections per user
      const existing = [...io.sockets.sockets.values()].filter(
        (s) => s.userId === socket.userId
      );

      if (existing.length >= 5) {
        socketLogger.warn("Too many connections", {
          userId: socket.userId,
          count: existing.length,
        });
        return next(new Error("Too many active connections"));
      }

      next();
    } catch (err) {
      socketLogger.error("Socket auth error", { error: err.message });
      captureException(err, { context: "socket_auth" });
      return next(new Error("Authentication failed"));
    }
  });

  // ==========================
  // CONNECTION HANDLER
  // ==========================
  io.on("connection", (socket) => {
    const userId = socket.userId;

    socketLogger.info("User connected", { userId, socketId: socket.id });
    onlineUsers.set(userId, socket.id);

    socket.join(userId);

    // Broadcast to all that this user is online
    io.emit("user_online", { userId });

    // Send list of online users to the newly connected user
    socket.emit("online_users", { users: [...onlineUsers.keys()] });

    // ==========================
    // SEND MESSAGE (Disabled - REST only)
    // ==========================
    socket.on("send_message", () => {
      socketLogger.debug("Socket message ignored — REST handles sending", {
        userId,
      });
    });

    // ==========================
    // MARK READ
    // ==========================
    socket.on("mark_read", async ({ senderId }) => {
      try {
        if (!checkRateLimit(userId, "mark_read", 20, 1000)) {
          return socket.emit("mark_read_error", {
            error: "Rate limit exceeded",
          });
        }

        if (!isValidMongoId(senderId)) {
          throw new Error("Invalid sender ID");
        }

        const result = await Message.updateMany(
          { senderId, receiverId: userId, read: false },
          { $set: { read: true } }
        );

        socketLogger.debug("Messages marked as read", {
          userId,
          senderId,
          count: result.modifiedCount,
        });

        // Notify sender that messages were read
        io.to(senderId).emit("messages_read", {
          readBy: userId,
          count: result.modifiedCount,
        });

        // Confirm to requester
        socket.emit("mark_read_success", {
          senderId,
          count: result.modifiedCount,
        });
      } catch (err) {
        socketLogger.error("Mark read error", {
          userId,
          error: err.message,
        });
        captureException(err, { userId, event: "mark_read" });
        socket.emit("mark_read_error", { error: err.message });
      }
    });

    // ==========================
    // TYPING EVENTS
    // ==========================
    socket.on("typing", ({ receiverId }) => {
      if (!isValidMongoId(receiverId)) {
        socketLogger.warn("Invalid receiver ID in typing event", {
          userId,
          receiverId,
        });
        return;
      }

      if (!checkRateLimit(userId, "typing", 3, 1000)) return;

      // Emit to receiver
      io.to(receiverId).emit("user_typing", { userId });

      // ✅ FIXED: Clear previous timeout for this socket
      const existingTimeout = typingTimeouts.get(socket.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout for this socket
      const timeout = setTimeout(() => {
        io.to(receiverId).emit("user_stop_typing", { userId });
        typingTimeouts.delete(socket.id);
      }, 5000);

      typingTimeouts.set(socket.id, timeout);
    });

    socket.on("stop_typing", ({ receiverId }) => {
      if (!isValidMongoId(receiverId)) return;

      // Clear timeout
      const existingTimeout = typingTimeouts.get(socket.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeouts.delete(socket.id);
      }

      io.to(receiverId).emit("user_stop_typing", { userId });
    });

    // ==========================
    // DISCONNECT
    // ==========================
    socket.on("disconnect", (reason) => {
      socketLogger.info("User disconnected", { userId, reason });

      onlineUsers.delete(userId);
      io.emit("user_offline", { userId });

      // ✅ ADDED: Cleanup typing timeout for this socket
      const typingTimeout = typingTimeouts.get(socket.id);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeouts.delete(socket.id);
      }

      // Cleanup rate limits
      for (const key of rateLimits.keys()) {
        if (key.startsWith(userId)) {
          rateLimits.delete(key);
        }
      }
    });

    // ==========================
    // ERROR HANDLING
    // ==========================
    socket.on("error", (error) => {
      socketLogger.error("Socket error", { userId, error: error.message });
      captureException(error, { userId, context: "socket_error" });
    });
  });

  // ==========================
  // CLEANUP STALE DATA
  // ==========================
  setInterval(() => {
    const now = Date.now();
    let cleanedRateLimits = 0;

    // Cleanup rate limits older than 1 minute past expiry
    for (const [key, entry] of rateLimits) {
      if (now > entry.resetAt + 60000) {
        rateLimits.delete(key);
        cleanedRateLimits++;
      }
    }

    if (cleanedRateLimits > 0) {
      socketLogger.debug("Cleaned stale rate limits", {
        count: cleanedRateLimits,
      });
    }
  }, 60000); // Every 1 minute

  socketLogger.info("Socket.io initialized", {
    cors: ENV.NODE_ENV === "development" ? "localhost:5173" : ENV.FRONTEND_URL,
  });

  return io;
};

// ==========================
// HELPERS
// ==========================
export const getIO = () => io;

export const getOnlineUsers = () => [...onlineUsers.keys()];

export const isUserOnline = (userId) => onlineUsers.has(userId);

export const sendToUser = (userId, event, data) => {
  if (!io) {
    socketLogger.warn("Cannot send to user - Socket.io not initialized", {
      userId,
    });
    return false;
  }

  io.to(userId).emit(event, data);
  return true;
};

// Get socket metrics
export const getSocketMetrics = () => {
  if (!io) return null;

  return {
    totalConnections: io.sockets.sockets.size,
    onlineUsers: onlineUsers.size,
    rateLimitEntries: rateLimits.size,
    typingTimeouts: typingTimeouts.size,
  };
};
