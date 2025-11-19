// backend/middleware/validation.js (COMPLETE)
import { z } from "zod";
import { logger } from "../lib/logger.js";

export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      logger.warn("Body validation failed", {
        path: req.path,
        errors: err.errors,
        body: req.body,
      });

      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      logger.warn("Query validation failed", {
        path: req.path,
        errors: err.errors,
        query: req.query,
      });

      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
  };
};

// ✅ ADDED: Validate URL parameters
export const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      logger.warn("Params validation failed", {
        path: req.path,
        errors: err.errors,
        params: req.params,
      });

      return res.status(400).json({
        success: false,
        error: "Invalid URL parameters",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
  };
};

// Common validation schemas
export const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
