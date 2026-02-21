import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.js";

type AllowedRole = "SUPER_ADMIN" | "RESTAURANT_ADMIN";

/**
 * Role guard middleware.
 *
 * Reads the caller's role from the user_roles table — NEVER from
 * the JWT user_metadata. Must be used after the authenticate() middleware.
 *
 * Usage:
 *   router.post('/users', authenticate, requireRole('SUPER_ADMIN'), handler)
 */
export function requireRole(...roles: AllowedRole[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authUser = (req as any).user;

    if (!authUser?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Look up role from DB — the canonical source of truth
    const userRole = await prisma.userRoleRecord.findUnique({
      where: { userId: authUser.id },
      select: { role: true, restaurantId: true },
    });

    if (!userRole) {
      res.status(403).json({ error: "Forbidden: no role assigned" });
      return;
    }

    if (!roles.includes(userRole.role as AllowedRole)) {
      res
        .status(403)
        .json({ error: `Forbidden: requires one of [${roles.join(", ")}]` });
      return;
    }

    // Attach role context for downstream handlers
    (req as any).userRole = userRole;
    next();
  };
}
