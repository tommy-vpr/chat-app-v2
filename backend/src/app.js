// backend/server.js (PRODUCTION-READY v3 - FINAL)
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { initializeSocket, getSocketMetrics } from "./socket/socketHandler.js";
import { logger } from "./lib/logger.js";
import {
  initSentry,
  sentryErrorHandler,
  captureException,
} from "./lib/sentry.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { csrfProtection, getCsrfToken } from "./middleware/csrf.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const __dirname = path.resolve();
const PORT = ENV.PORT || 3000;

// ==========================
// SENTRY INITIALIZATION
// ==========================
initSentry(app);

// ==========================
// SECURITY MIDDLEWARE
// ==========================

// ✅ Helmet - Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "wss:", "ws:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
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

// ✅ Trust proxy (for rate limiting behind load balancer)
app.set("trust proxy", 1);

// ✅ Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ✅ Request logging (development only)
if (ENV.NODE_ENV === "development") {
  app.use(requestLogger);
}

// ==========================
// RATE LIMITING
// ==========================

// ✅ Speed limiter (slow down requests before blocking)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 500, // Allow 500 requests per 15 mins, then start delaying
  delayMs: (hits) => hits * 100, // Add 100ms delay per request
  skip: (req) => ENV.NODE_ENV === "development",
});

// ✅ Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ENV.NODE_ENV === "development",
});

// ✅ API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: "Too many API requests, please slow down",
  },
  skip: (req) => ENV.NODE_ENV === "development",
});

// ✅ Auth rate limiter (strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: "Too many authentication attempts. Try again in 15 minutes.",
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});

app.use(speedLimiter);
app.use(globalLimiter);

// ==========================
// SOCKET.IO
// ==========================
initializeSocket(httpServer);
logger.info("Socket.io initialized");

// ==========================
// HEALTH CHECK
// ==========================
app.get("/health", async (req, res) => {
  try {
    // Check database
    const dbConnection = await connectDB();
    const dbStatus =
      dbConnection.connection.readyState === 1 ? "connected" : "disconnected";

    // Get socket metrics
    const socketMetrics = getSocketMetrics();

    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: ENV.NODE_ENV,
      database: dbStatus,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      socket: socketMetrics,
    };

    res.status(200).json(health);
  } catch (err) {
    logger.error("Health check failed", { error: err.message });
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Service unavailable",
    });
  }
});

// ==========================
// CSRF TOKEN ENDPOINT
// ==========================
app.get("/api/csrf-token", csrfProtection, getCsrfToken);

// ==========================
// API ROUTES
// ==========================

// Auth routes (with stricter rate limiting)
app.use("/api/auth", authLimiter, authRoutes);

// ✅ FIXED: Remove csrfProtection from here (it's already in the routes)
app.use("/api/messages", apiLimiter, messageRoutes);

// ==========================
// SERVE FRONTEND IN PRODUCTION
// ==========================
if (ENV.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");
  logger.info("Serving frontend from", { path: frontendPath });

  app.use(
    express.static(frontendPath, {
      maxAge: "1d",
      etag: true,
      setHeaders: (res, filepath) => {
        // Add security headers for static files
        if (filepath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// ==========================
// SENTRY ERROR HANDLER
// ==========================
app.use(sentryErrorHandler());

// ==========================
// ERROR HANDLER
// ==========================
app.use((err, req, res, next) => {
  // CSRF error
  if (err.code === "EBADCSRFTOKEN") {
    logger.warn("CSRF token invalid", {
      ip: req.ip,
      path: req.path,
      userAgent: req.get("user-agent"),
    });
    return res.status(403).json({
      success: false,
      error: "Invalid CSRF token",
    });
  }

  // Multer file upload errors
  if (err.name === "MulterError") {
    logger.warn("File upload error", {
      error: err.message,
      code: err.code,
      ip: req.ip,
    });
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Validation errors (from Zod or Mongoose)
  if (err.name === "ValidationError") {
    logger.warn("Validation error", {
      error: err.message,
      ip: req.ip,
    });
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.errors,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    logger.warn("JWT error", {
      error: err.message,
      ip: req.ip,
    });
    return res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }

  // Log unknown errors
  logger.error("Request error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Capture in Sentry
  captureException(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?._id,
  });

  // Don't leak error details in production
  const message =
    ENV.NODE_ENV === "production" ? "Internal server error" : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: message,
  });
});

// ==========================
// 404 HANDLER
// ==========================
app.use((req, res) => {
  logger.warn("Route not found", {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// ==========================
// GRACEFUL SHUTDOWN
// ==========================
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info("HTTP server closed");

    // Close database connection
    try {
      const connection = await connectDB();
      await connection.connection.close();
      logger.info("Database connection closed");
    } catch (err) {
      logger.error("Error closing database", { error: err.message });
    }

    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ==========================
// START SERVER
// ==========================
httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info("Server started", {
    port: PORT,
    environment: ENV.NODE_ENV,
    nodeVersion: process.version,
    security: {
      helmet: true,
      cors: true,
      csrf: true,
      rateLimit: true,
      compression: true,
    },
  });

  connectDB();
});

// ==========================
// UNHANDLED ERRORS
// ==========================
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION", {
    error: err.message,
    stack: err.stack,
  });
  captureException(err, { context: "unhandledRejection" });
  gracefulShutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION", {
    error: err.message,
    stack: err.stack,
  });
  captureException(err, { context: "uncaughtException" });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});
