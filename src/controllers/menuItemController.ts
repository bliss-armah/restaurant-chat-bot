import { Request, Response } from "express";
import { menuItemService } from "../services/menuItemService.js";

function resolveRestaurantId(req: Request): string | null {
  const userRole = (req as any).userRole as { role: string; restaurantId?: string };
  if (userRole.role === "SUPER_ADMIN") {
    return (req.query.restaurantId as string) || null;
  }
  return userRole.restaurantId || null;
}

export const menuItemController = {
  async list(req: Request, res: Response): Promise<void> {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ error: "restaurantId is required" });
      return;
    }
    try {
      const data = await menuItemService.list(restaurantId);
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
      const b = req.body;
      const data = await menuItemService.create(restaurantId, {
        name: b.name,
        description: b.description,
        price: parseFloat(b.price),
        categoryId: b.categoryId,
        imageUrl: b.imageUrl,
        sortOrder: b.sortOrder,
        isAvailable: b.isAvailable,
      });
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
      const b = req.body;
      const body: Record<string, any> = {};
      if (b.name !== undefined) body.name = b.name;
      if (b.description !== undefined) body.description = b.description;
      if (b.price !== undefined) body.price = parseFloat(b.price);
      if (b.categoryId !== undefined) body.categoryId = b.categoryId;
      if (b.imageUrl !== undefined) body.imageUrl = b.imageUrl;
      if (b.sortOrder !== undefined) body.sortOrder = b.sortOrder;
      if (b.isAvailable !== undefined) body.isAvailable = b.isAvailable;
      const data = await menuItemService.update(String(req.params.id), restaurantId, body);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },

  async toggleAvailable(req: Request, res: Response): Promise<void> {
    const restaurantId = resolveRestaurantId(req);
    if (!restaurantId) {
      res.status(403).json({ error: "No restaurant context" });
      return;
    }
    try {
      const data = await menuItemService.toggleAvailable(String(req.params.id), restaurantId);
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
      await menuItemService.remove(String(req.params.id), restaurantId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },
};
