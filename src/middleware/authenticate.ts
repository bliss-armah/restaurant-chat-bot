import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

/**
 * Validates our custom JWT from the Authorization header.
 * Attaches the decoded user payload to req.user.
 *
 * JWT payload: { id, role, restaurantId? }
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: missing token" });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      role: string;
      restaurantId?: string;
    };

    (req as any).user = {
      id: decoded.id,
      role: decoded.role,
      restaurantId: decoded.restaurantId,
    };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }
}
