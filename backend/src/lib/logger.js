// backend/lib/logger.js
import pino from "pino";
import { ENV } from "./env.js";

export const logger = pino({
  level: ENV.NODE_ENV === "production" ? "info" : "debug",
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    ENV.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

// Helper for socket logging
export const socketLogger = logger.child({ context: "socket" });
export const apiLogger = logger.child({ context: "api" });
