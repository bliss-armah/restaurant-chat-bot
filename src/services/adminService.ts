import bcrypt from "bcrypt";
import { prisma } from "../config/database.js";

export interface CreateUserPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: "SUPER_ADMIN" | "RESTAURANT_ADMIN";
  restaurantId?: string;
}

export const adminService = {
  async createUser(payload: CreateUserPayload) {
    const { name, email, phone, password, role, restaurantId } = payload;

    if (!email && !phone) throw new Error("Either email or phone is required");
    if (role === "RESTAURANT_ADMIN" && !restaurantId) {
      throw new Error("restaurantId is required for RESTAURANT_ADMIN role");
    }

    // Uniqueness checks
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new Error("Email already in use");
    }
    if (phone) {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) throw new Error("Phone already in use");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Use interactive transaction so DB generates the user ID and we can
    // reference it immediately when creating the role record.
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email ?? null,
          phone: phone ?? null,
          password: passwordHash,
          role,
          restaurantId: restaurantId ?? null,
          isActive: true,
        },
      });

      await tx.userRoleRecord.create({
        data: {
          userId: user.id,
          role,
          restaurantId: restaurantId ?? null,
        },
      });

      return user;
    });
  },

  async updateUserRole(
    userId: string,
    role: "SUPER_ADMIN" | "RESTAURANT_ADMIN",
    restaurantId?: string,
  ) {
    if (role === "RESTAURANT_ADMIN" && !restaurantId) {
      throw new Error("restaurantId is required for RESTAURANT_ADMIN role");
    }

    return prisma.$transaction([
      prisma.userRoleRecord.upsert({
        where: { userId },
        create: { userId, role, restaurantId: restaurantId ?? null },
        update: { role, restaurantId: restaurantId ?? null },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { role, restaurantId: restaurantId ?? null },
      }),
    ]);
  },

  async listUsers() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        restaurantId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Attach restaurant name in a single query
    const restaurantIds = [...new Set(users.map((u) => u.restaurantId).filter(Boolean))] as string[];
    const restaurants = restaurantIds.length
      ? await prisma.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true },
        })
      : [];
    const restaurantMap = Object.fromEntries(restaurants.map((r) => [r.id, r]));

    return users.map((u) => ({
      ...u,
      restaurant: u.restaurantId ? restaurantMap[u.restaurantId] ?? null : null,
    }));
  },
};
