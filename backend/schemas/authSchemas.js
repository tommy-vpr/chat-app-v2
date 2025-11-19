// backend/schemas/authSchemas.js (CORRECTED)
import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long"),
  fullname: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ✅ FIXED: Added missing fields
export const updateProfileSchema = z
  .object({
    fullname: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name too long")
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password too long")
      .optional(),
    currentPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // If password is provided, currentPassword must also be provided
      if (data.password && !data.currentPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Current password is required when setting a new password",
      path: ["currentPassword"],
    }
  );
