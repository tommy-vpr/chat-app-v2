// backend/server.js (PRODUCTION-READY)
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet"; // ✅ Security headers
import cors from "cors"; // ✅ CORS middleware
import compression from "compression"; // ✅ Compress responses
import morgan from "morgan"; // ✅ Request logging
import rateLimit from "express-rate-limit"; // ✅ Rate limiting

import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { initializeSocket } from "./socket/socketHandler.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const __dirname = path.resolve();
const PORT = ENV.PORT || 3000;

// ===== SECURITY MIDDLEWARE =====

// ✅ Helmet - Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ✅ CORS
app.use(
  cors({
    origin:
      ENV.NODE_ENV === "development"
        ? "http://localhost:5173"
        : ENV.FRONTEND_URL,
    credentials: true,
  })
);

// ✅ Compression
app.use(compression());

// ✅ Request logging
if (ENV.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ✅ Trust proxy (for rate limiting behind load balancer)
app.set("trust proxy", 1);

// ✅ Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ✅ Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// ✅ API-specific rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many API requests, please slow down",
});

// ===== SOCKET.IO =====
initializeSocket(httpServer);
console.log("✅ Socket.io initialized");

// ===== HEALTH CHECK =====
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ===== API ROUTES =====
app.use("/api/auth", apiLimiter, authRoutes);
app.use("/api/messages", apiLimiter, messageRoutes);

// ===== SERVE FRONTEND IN PRODUCTION =====
if (ENV.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");
  console.log("📦 Serving frontend from:", frontendPath);

  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  // Don't leak error details in production
  const message =
    ENV.NODE_ENV === "production" ? "Internal server error" : err.message;

  res.status(err.status || 500).json({
    success: false,
    message,
  });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ===== GRACEFUL SHUTDOWN =====
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    console.log("✅ HTTP server closed");

    // Close database connection
    try {
      await connectDB().then((conn) => conn.connection.close());
      console.log("✅ Database connection closed");
    } catch (err) {
      console.error("❌ Error closing database:", err);
    }

    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error("❌ Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ===== START SERVER =====
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔒 Security: Helmet enabled`);
  console.log(`🚦 Rate limiting: Active`);
  console.log(`🗜️ Compression: Enabled`);
  console.log(`🚀 Socket.io: Ready`);
  connectDB();
});

// ===== UNHANDLED ERRORS =====
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
  gracefulShutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});
