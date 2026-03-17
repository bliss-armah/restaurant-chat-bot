import { Request, Response } from "express";
import { authService } from "../services/authService.js";

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: "identifier and password are required" });
      return;
    }

    try {
      const result = await authService.login(identifier, password);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(401).json({ error: err.message || "Login failed" });
    }
  },

  async me(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id;
    try {
      const user = await authService.me(userId);
      res.json({ success: true, data: user });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },
};
