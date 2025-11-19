// backend/routes/message.js (FINAL)
import express from "express";
import {
  sendMessage,
  sendImageMessage,
  getAllContacts,
  getChatPartners,
  getMessages,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multer.js";
import { createRateLimitMiddleware } from "../middleware/rateLimitMiddleware.js";
import { ajGeneral } from "../lib/arcjet.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validation.js";
import {
  sendMessageSchema,
  sendImageMessageSchema,
  userIdParamSchema,
  getMessagesPaginatedSchema,
} from "../schemas/messageSchemas.js";
import { csrfProtection } from "../middleware/csrf.js";

const router = express.Router();
const messageRateLimit = createRateLimitMiddleware(ajGeneral);

// ==========================
// GLOBAL MIDDLEWARE
// ==========================
router.use(protect); // All routes require authentication
router.use(messageRateLimit); // Rate limiting via Arcjet

// ==========================
// GET ROUTES (No CSRF needed)
// ==========================

// Get all contacts (all users)
router.get("/contacts", getAllContacts);

// Get chat partners (users you've messaged)
router.get("/chats", getChatPartners);

// Get messages with specific user
router.get(
  "/:id",
  validateParams(userIdParamSchema),
  validateQuery(getMessagesPaginatedSchema),
  getMessages
);

// ==========================
// POST ROUTES (CSRF protected)
// ==========================

// Send text message
router.post(
  "/send",
  csrfProtection,
  validateBody(sendMessageSchema),
  sendMessage
);

// Send image message
router.post(
  "/send-image",
  csrfProtection,
  upload.single("image"),
  validateBody(sendImageMessageSchema),
  sendImageMessage
);

export default router;
