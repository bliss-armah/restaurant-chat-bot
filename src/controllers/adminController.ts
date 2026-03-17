import { Request, Response, NextFunction } from "express";
import { adminService } from "../services/adminService.js";

export class AdminController {
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, password, role, restaurantId } = req.body;

      if (!name || !password || !role) {
        res.status(400).json({ error: "name, password, and role are required" });
        return;
      }
      if (!email && !phone) {
        res.status(400).json({ error: "Either email or phone is required" });
        return;
      }
      if (!["SUPER_ADMIN", "RESTAURANT_ADMIN"].includes(role)) {
        res.status(400).json({ error: "role must be SUPER_ADMIN or RESTAURANT_ADMIN" });
        return;
      }

      const user = await adminService.createUser({ name, email, phone, password, role, restaurantId });
      res.status(201).json({ success: true, data: user });
    } catch (error: any) {
      if (error.message?.includes("already in use")) {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await adminService.listUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { role, restaurantId } = req.body;

      if (!role) {
        res.status(400).json({ error: "role is required" });
        return;
      }

      await adminService.updateUserRole(id, role, restaurantId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
