// backend/middleware/requestLogger.js
import { logger } from "../lib/logger.js";

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?.id || "anonymous",
    });
  });

  next();
};
