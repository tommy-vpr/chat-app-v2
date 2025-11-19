// backend/middleware/authMiddleware.js (CORRECTED)
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { ENV } from "../lib/env.js";
import { logger } from "../lib/logger.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token found",
      });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);

    // Find user and exclude password
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("Auth middleware error", {
      error: error.message,
      path: req.path,
    });

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
