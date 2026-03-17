import { Request, Response, NextFunction } from "express";

type AllowedRole = "SUPER_ADMIN" | "RESTAURANT_ADMIN";

/**
 * Role guard middleware.
 *
 * Reads role from the JWT payload attached by authenticate().
 * Must be used after authenticate().
 *
 * Attaches req.userRole = { role, restaurantId } for downstream use.
 */
export function requireRole(...roles: AllowedRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as { id: string; role: string; restaurantId?: string };

    if (!user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(user.role as AllowedRole)) {
      res.status(403).json({ error: `Forbidden: requires one of [${roles.join(", ")}]` });
      return;
    }

    // Attach for downstream handlers
    (req as any).userRole = {
      role: user.role,
      restaurantId: user.restaurantId ?? null,
    };

    next();
  };
}
