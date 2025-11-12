import { isSpoofedBot } from "@arcjet/inspect";

/**
 * Creates a rate-limiting and protection middleware for Express
 * following Arcjet best practices.
 *
 * @param {ReturnType<typeof arcjet>} arcjetInstance
 */
export const createRateLimitMiddleware = (arcjetInstance) => {
  return async (req, res, next) => {
    try {
      // ✅ Get the real client IP (handle proxies & Cloudflare)
      const clientIp =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;

      // Use authenticated user ID if available, otherwise fallback to IP
      const identifier = req.user?.id || clientIp;

      // ✅ Explicitly tell Arcjet which IP to evaluate
      const decision = await arcjetInstance.protect(req, {
        ip: clientIp,
        userId: identifier,
        requested: 1,
      });

      console.log(
        `🛡️ Arcjet decision: ${
          decision.conclusion
        } | IP: ${clientIp} | Hosting: ${decision.ip?.isHosting()}`
      );

      // --- 🧩 DENIAL HANDLING ---

      // 1️⃣ Rate limit exceeded
      if (decision.isDenied() && decision.reason.isRateLimit()) {
        return res.status(429).json({
          error: "Too many requests. Please try again later.",
        });
      }

      // 2️⃣ Bot detected
      if (decision.isDenied() && decision.reason.isBot()) {
        return res.status(403).json({
          error: "No bots allowed",
        });
      }

      // 3️⃣ Generic denial (shield, injection, etc.)
      if (decision.isDenied()) {
        return res.status(403).json({
          error: "Forbidden",
        });
      }

      // --- 🧩 OPTIONAL FLAGS ---

      // ⚠️ Log hosting networks but don’t block (API endpoints often come from them)
      if (decision.ip.isHosting()) {
        console.warn(`⚠️ Hosting IP detected (allowed): ${clientIp}`);
        // You could add analytics or temporary throttling here if desired
      }

      // ❌ Bot verification failed (premium Arcjet feature)
      if (decision.results.some(isSpoofedBot)) {
        console.warn(`⚠️ Spoofed bot detected (blocked): ${clientIp}`);
        return res.status(403).json({ error: "Bot verification failed" });
      }

      // ✅ If we reach here, the request is allowed
      next();
    } catch (error) {
      console.error("❌ Arcjet error:", error.message);
      // ✅ Fail open (don’t block legit users if Arcjet fails)
      next();
    }
  };
};
