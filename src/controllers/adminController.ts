import { Request, Response, NextFunction } from "express";
import { adminService } from "../services/adminService.js";

export class AdminController {
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, password, role, restaurantId } = req.body;

      if (!name || !password || !role) {
        return res
          .status(400)
          .json({ error: "Name, password, and role are required" });
      }

      if (!email && !phone) {
        return res
          .status(400)
          .json({ error: "Either email or phone is required" });
      }

      const user = await adminService.createUser({
        name,
        email,
        phone,
        password,
        role,
        restaurantId,
      });

      return res
        .status(201)
        .json({ message: "User created successfully", user });
    } catch (error: any) {
      next(error);
    }
  }
}
