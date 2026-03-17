import { Request, Response } from "express";
import { categoryService } from "../services/categoryService.js";

function resolveRestaurantId(req: Request): string | null {
  const userRole = (req as any).userRole as { role: string; restaurantId?: string };
  if (userRole.role === "SUPER_ADMIN") {
    return (req.query.restaurantId as string) || null;
  }
  return userRole.restaurantId || null;
}

export const categoryController = {
  async list(req: Request, res: Response): Promise<void> {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ error: "restaurantId is required" });
      return;
    }
    try {
      const data = await categoryService.list(restaurantId);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ error: "restaurantId is required" });
      return;
    }
    try {
      const data = await categoryService.create(restaurantId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      res.status(403).json({ error: "No restaurant context" });
      return;
    }
    try {
      const data = await categoryService.update(String(req.params.id), restaurantId, req.body);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },

  async toggleActive(req: Request, res: Response): Promise<void> {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      res.status(403).json({ error: "No restaurant context" });
      return;
    }
    try {
      const data = await categoryService.toggleActive(String(req.params.id), restaurantId);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },

  async remove(req: Request, res: Response): Promise<void> {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      res.status(403).json({ error: "No restaurant context" });
      return;
    }
    try {
      await categoryService.remove(String(req.params.id), restaurantId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },
};
