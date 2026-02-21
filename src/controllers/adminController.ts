import { Request, Response, NextFunction } from "express";
import { adminService } from "../services/adminService.js";

export class AdminController {
  /**
   * POST /admin/users
   * Creates a new platform user. Super admin only (enforced in route).
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, password, role, restaurantId } = req.body;

      if (!name || !password || !role) {
        res
          .status(400)
          .json({ error: "name, password, and role are required" });
        return;
      }

      if (!email && !phone) {
        res.status(400).json({ error: "Either email or phone is required" });
        return;
      }

      const validRoles = ["SUPER_ADMIN", "RESTAURANT_ADMIN"];
      if (!validRoles.includes(role)) {
        res
          .status(400)
          .json({ error: `role must be one of: ${validRoles.join(", ")}` });
        return;
      }

      const user = await adminService.createUser({
        name,
        email,
        phone,
        password,
        role,
        restaurantId,
      });

      res.status(201).json({ message: "User created successfully", user });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /admin/users
   * Lists all platform users. Super admin only.
   */
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await adminService.listUsers();
      res.json({ users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /admin/users/:id/role
   * Updates a user's role and restaurant assignment. Super admin only.
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { role, restaurantId } = req.body;

      if (!role) {
        res.status(400).json({ error: "role is required" });
        return;
      }

      const [userRole] = await adminService.updateUserRole(
        id,
        role,
        restaurantId,
      );

      res.json({ message: "Role updated successfully", userRole });
    } catch (error) {
      next(error);
    }
  }
}
