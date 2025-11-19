// backend/middleware/rateLimitMiddleware.js (CORRECTED)
import { isSpoofedBot } from "@arcjet/inspect";
import { logger } from "../lib/logger.js";

/**
 * Creates a rate-limiting and protection middleware for Express
 * following Arcjet best practices.
 *
 * @param {ReturnType<typeof arcjet>} arcjetInstance
 */
export const createRateLimitMiddleware = (arcjetInstance) => {
  return async (req, res, next) => {
    try {
      // Skip Arcjet in development
      if (process.env.NODE_ENV === "development") {
        return next();
      }

      // ✅ Get the real client IP (handle proxies & Cloudflare)
      const clientIp =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.headers["x-real-ip"] ||
        req.ip;

      // ✅ FIXED: Use req.user?._id (not req.user?.id)
      const identifier = req.user?._id || clientIp;

      // ✅ Explicitly tell Arcjet which IP to evaluate
      const decision = await arcjetInstance.protect(req, {
        ip: clientIp,
        userId: identifier,
        requested: 1,
      });

      logger.debug("Arcjet decision", {
        conclusion: decision.conclusion,
        ip: clientIp,
        isHosting: decision.ip?.isHosting(),
      });

      // --- 🧩 DENIAL HANDLING ---

      // 1️⃣ Rate limit exceeded
      if (decision.isDenied() && decision.reason.isRateLimit()) {
        logger.warn("Arcjet rate limit exceeded", {
          ip: clientIp,
          userId: identifier,
        });
        return res.status(429).json({
          success: false,
          error: "Too many requests. Please try again later.",
        });
      }

      // 2️⃣ Bot detected
      if (decision.isDenied() && decision.reason.isBot()) {
        logger.warn("Arcjet bot detected", { ip: clientIp });
        return res.status(403).json({
          success: false,
          error: "Bot access not allowed",
        });
      }

      // 3️⃣ Generic denial (shield, injection, etc.)
      if (decision.isDenied()) {
        logger.warn("Arcjet request denied", {
          ip: clientIp,
          reason: decision.reason,
        });
        return res.status(403).json({
          success: false,
          error: "Forbidden",
        });
      }

      // --- 🧩 OPTIONAL FLAGS ---

      // ⚠️ Log hosting networks but don't block
      if (decision.ip?.isHosting?.()) {
        logger.debug("Hosting IP detected (allowed)", { ip: clientIp });
      }

      // ❌ Bot verification failed
      if (decision.results?.some?.(isSpoofedBot)) {
        logger.warn("Spoofed bot detected", { ip: clientIp });
        return res.status(403).json({
          success: false,
          error: "Bot verification failed",
        });
      }

      // ✅ Request allowed
      next();
    } catch (error) {
      logger.error("Arcjet error", { error: error.message });
      // ✅ Fail open (don't block legit users if Arcjet fails)
      next();
    }
  };
};
