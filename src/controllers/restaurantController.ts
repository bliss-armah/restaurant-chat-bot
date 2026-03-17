import { Request, Response } from "express";
import { restaurantService } from "../services/restaurantService.js";

function userRole(req: Request) {
  return (req as any).userRole as { role: string; restaurantId?: string };
}

export const restaurantController = {
  // GET /restaurants  (SUPER_ADMIN: all, RESTAURANT_ADMIN: own only)
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { role, restaurantId } = userRole(req);

      if (role === "SUPER_ADMIN") {
        const restaurants = await restaurantService.list();
        res.json({ success: true, data: restaurants });
      } else {
        if (!restaurantId) {
          res.status(403).json({ error: "No restaurant assigned" });
          return;
        }
        const restaurant = await restaurantService.getById(restaurantId);
        res.json({ success: true, data: [restaurant] });
      }
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  // GET /restaurants/me  (RESTAURANT_ADMIN: own restaurant)
  async getOwn(req: Request, res: Response): Promise<void> {
    const { restaurantId } = userRole(req);
    if (!restaurantId) {
      res.status(403).json({ error: "No restaurant assigned" });
      return;
    }
    try {
      const restaurant = await restaurantService.getById(restaurantId);
      res.json({ success: true, data: restaurant });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  // POST /restaurants  (SUPER_ADMIN only)
  async create(req: Request, res: Response): Promise<void> {
    const { role } = userRole(req);
    if (role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Forbidden: SUPER_ADMIN only" });
      return;
    }
    try {
      const restaurant = await restaurantService.create(req.body);
      res.status(201).json({ success: true, data: restaurant });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },

  // PATCH /restaurants/:id  (SUPER_ADMIN: any, RESTAURANT_ADMIN: own)
  async update(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { role, restaurantId } = userRole(req);

    if (role !== "SUPER_ADMIN" && restaurantId !== id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const restaurant = await restaurantService.update(id, req.body);
      res.json({ success: true, data: restaurant });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },

  // PATCH /restaurants/:id/open-status  (SUPER_ADMIN: any, RESTAURANT_ADMIN: own)
  async setOpenStatus(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { role, restaurantId } = userRole(req);

    if (role !== "SUPER_ADMIN" && restaurantId !== id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { isOpen } = req.body;
    if (typeof isOpen !== "boolean") {
      res.status(400).json({ error: "isOpen must be a boolean" });
      return;
    }

    try {
      const restaurant = await restaurantService.setOpenStatus(id, isOpen);
      res.json({ success: true, data: restaurant });
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message });
    }
  },
};
