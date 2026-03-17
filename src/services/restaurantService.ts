import { prisma } from "../config/database.js";

export interface RestaurantCreatePayload {
  name: string;
  description?: string;
  phone: string;
  email?: string;
  momoNumber: string;
  momoName: string;
  whatsappNumber?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
}

export interface RestaurantUpdatePayload {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  momoNumber?: string;
  momoName?: string;
  openingTime?: string | null;
  closingTime?: string | null;
  timezone?: string;
}

export const restaurantService = {
  async list() {
    return prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new Error("Restaurant not found");
    return restaurant;
  },

  async create(data: RestaurantCreatePayload) {
    const existing = await prisma.restaurant.findUnique({
      where: { phone: data.phone },
    });
    if (existing) throw new Error("Phone number already in use");

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return prisma.restaurant.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        phone: data.phone,
        email: data.email ?? null,
        momoNumber: data.momoNumber,
        momoName: data.momoName,
        whatsappNumber: data.whatsappNumber ?? null,
        whatsappPhoneNumberId: data.whatsappPhoneNumberId ?? null,
        whatsappBusinessAccountId: data.whatsappBusinessAccountId ?? null,
        isActive: true,
        isOpen: true,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
      },
    });
  },

  async update(id: string, data: RestaurantUpdatePayload) {
    await restaurantService.getById(id); // throws if not found
    return prisma.restaurant.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.momoNumber !== undefined && { momoNumber: data.momoNumber }),
        ...(data.momoName !== undefined && { momoName: data.momoName }),
        ...(data.openingTime !== undefined && { openingTime: data.openingTime }),
        ...(data.closingTime !== undefined && { closingTime: data.closingTime }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
      },
    });
  },

  async setOpenStatus(id: string, isOpen: boolean) {
    await restaurantService.getById(id);
    return prisma.restaurant.update({
      where: { id },
      data: { isOpen },
    });
  },
};
