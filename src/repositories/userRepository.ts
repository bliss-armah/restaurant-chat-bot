import { prisma } from "../config/database.js";
import { User } from "@prisma/client";

export class UserRepository {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { restaurant: true },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { restaurant: true },
    });
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data,
      include: { restaurant: true },
    });
  }
}

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  restaurantId?: string; // Optional for SUPER_ADMIN
  role?: "SUPER_ADMIN" | "RESTAURANT_ADMIN";
}
