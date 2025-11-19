// backend/controllers/authController.js (CORRECTED)
import User from "../models/userModel.js";
import { generateToken } from "../utils/generateToken.js";
import { sendWelcomeEmail } from "../utils/sendWelcomeEmail.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/uploadToCloudinary.js";
import { logger } from "../lib/logger.js";
import { captureException } from "../lib/sentry.js";

export const signUpController = async (req, res) => {
  try {
    // ✅ Validation already done by Zod middleware
    let { fullname, email, password } = req.body;

    // Normalize input
    fullname = fullname.trim();
    email = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // ✅ Create user (password hashing handled by model)
    const user = await User.create({
      fullname,
      email,
      password, // Will be hashed by pre-save hook
    });

    // Send JWT in cookie
    generateToken(res, user._id, user.email);

    // Attempt to send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(user.email, user.fullname);
    } catch (error) {
      logger.warn("Failed to send welcome email", {
        email: user.email,
        error: error.message,
      });
    }

    logger.info("User registered", { userId: user._id, email: user.email });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error("Signup error", { error: error.message });
    captureException(error, { context: "signup" });

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    // ✅ Validation already done by Zod middleware
    let { email, password } = req.body;

    // Normalize email
    email = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ✅ Use model method to compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token in cookie
    generateToken(res, user._id, user.email);

    logger.info("User logged in", { userId: user._id, email: user.email });

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error("Login error", { error: error.message });
    captureException(error, { context: "login" });

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const logout = (req, res) => {
  res.cookie("jwt", "", { httpOnly: true, expires: new Date(0) });

  logger.info("User logged out", { userId: req.user?._id });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const updateProfile = async (req, res) => {
  try {
    // ✅ Validation already done by Zod middleware
    let { fullname, email, password, currentPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Handle avatar upload
    if (req.file) {
      try {
        // Delete old avatar from Cloudinary if exists
        if (user.avatarPublicId) {
          await deleteFromCloudinary(user.avatarPublicId);
        }

        // Upload new avatar
        const result = await uploadToCloudinary(req.file.buffer, "avatars");
        user.avatar = result.secure_url;
        user.avatarPublicId = result.public_id;
      } catch (error) {
        logger.error("Avatar upload error", { error: error.message });
        return res.status(500).json({
          success: false,
          message: "Failed to upload avatar",
        });
      }
    }

    // Update email if provided
    if (email) {
      email = email.trim().toLowerCase();

      if (email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        }
        user.email = email;
      }
    }

    // Update fullname if provided
    if (fullname) {
      user.fullname = fullname.trim();
    }

    // Update password if provided
    if (password) {
      // ✅ currentPassword validation already done by Zod
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );

      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // ✅ Will be hashed by pre-save hook
      user.password = password;
    }

    await user.save();

    logger.info("Profile updated", { userId: user._id });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error("Update profile error", { error: error.message });
    captureException(error, { context: "updateProfile" });

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error("Check auth error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
