// backend/routes/auth.js
import express from "express";
import {
  signUpController,
  login,
  logout,
  updateProfile,
  checkAuth,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.js";
import { createRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";
import { ajAuth } from "../lib/arcjet.js";
import { validateBody } from "../middleware/validation.js";
import {
  signupSchema,
  loginSchema,
  updateProfileSchema,
} from "../schemas/authSchemas.js";
import { csrfProtection } from "../middleware/csrf.js";

const router = express.Router();
const authRateLimit = createRateLimitMiddleware(ajAuth);

// ==========================
// PUBLIC ROUTES
// ==========================

// Signup
router.post(
  "/signup",
  authRateLimit,
  validateBody(signupSchema),
  signUpController
);

// Login
router.post("/login", authRateLimit, validateBody(loginSchema), login);

// Logout
router.post("/logout", logout);

// ==========================
// PROTECTED ROUTES
// ==========================

// Check auth status
router.get("/check", protect, checkAuth);

// Update profile (with optional avatar upload)
router.put(
  "/update-profile",
  protect,
  csrfProtection,
  upload.single("avatar"),
  validateBody(updateProfileSchema),
  updateProfile
);

export default router;
