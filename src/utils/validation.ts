import { z } from "zod";

// ============================================
// AUTHENTICATION
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ============================================
// CATEGORY
// ============================================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// MENU ITEM
// ============================================

export const createMenuItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  categoryId: z.string().cuid("Invalid category ID"),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  categoryId: z.string().cuid().optional(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ============================================
// ORDER
// ============================================

export const updateOrderStatusSchema = z.object({
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  paymentStatus: z
    .enum(["UNPAID", "PENDING_VERIFICATION", "VERIFIED", "FAILED"])
    .optional(),
});
