// backend/schemas/messageSchemas.js (COMPLETE)
import { z } from "zod";
import { mongoIdSchema } from "../middleware/validation.js";

// Send text message
export const sendMessageSchema = z.object({
  receiverId: mongoIdSchema,
  text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message too long"),
});

// ✅ ADDED: Send image message
export const sendImageMessageSchema = z.object({
  receiverId: mongoIdSchema,
  text: z.string().max(5000, "Message too long").optional(),
  // Note: image file is handled by multer, not Zod
});

// ✅ ADDED: Validate user ID in URL params
export const userIdParamSchema = z.object({
  id: mongoIdSchema,
});

// Get messages with pagination
export const getMessagesPaginatedSchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
