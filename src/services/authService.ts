import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database.js";
import { config } from "../config/env.js";

export const authService = {
  async login(identifier: string, password: string) {
    // Find by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
        isActive: true,
      },
    });

    if (!user) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    const roleRecord = await prisma.userRoleRecord.findUnique({
      where: { userId: user.id },
    });

    if (!roleRecord) throw new Error("User has no role assigned");

    const payload = {
      id: user.id,
      role: roleRecord.role,
      restaurantId: roleRecord.restaurantId ?? undefined,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: roleRecord.role,
        restaurantId: roleRecord.restaurantId,
      },
    };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, isActive: true },
    });

    if (!user || !user.isActive) throw new Error("User not found");

    const roleRecord = await prisma.userRoleRecord.findUnique({
      where: { userId },
      select: { role: true, restaurantId: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: roleRecord?.role,
      restaurantId: roleRecord?.restaurantId ?? null,
    };
  },
};
