import { prisma } from "../config/database.js";

export interface CategoryPayload {
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

function assertOwnership(category: { restaurantId: string }, restaurantId: string) {
  if (category.restaurantId !== restaurantId) {
    throw new Object({ status: 403, message: "Forbidden: category does not belong to your restaurant" });
  }
}

export const categoryService = {
  async list(restaurantId: string) {
    return prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: "asc" },
    });
  },

  async create(restaurantId: string, data: CategoryPayload) {
    return prisma.menuCategory.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        restaurantId,
      },
    });
  },

  async update(id: string, restaurantId: string, data: CategoryPayload) {
    const category = await prisma.menuCategory.findUnique({ where: { id } });
    if (!category) throw { status: 404, message: "Category not found" };
    if (category.restaurantId !== restaurantId) {
      throw { status: 403, message: "Forbidden" };
    }
    return prisma.menuCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  },

  async toggleActive(id: string, restaurantId: string) {
    const category = await prisma.menuCategory.findUnique({ where: { id } });
    if (!category) throw { status: 404, message: "Category not found" };
    if (category.restaurantId !== restaurantId) throw { status: 403, message: "Forbidden" };
    return prisma.menuCategory.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  },

  async remove(id: string, restaurantId: string) {
    const category = await prisma.menuCategory.findUnique({ where: { id } });
    if (!category) throw { status: 404, message: "Category not found" };
    if (category.restaurantId !== restaurantId) throw { status: 403, message: "Forbidden" };
    await prisma.menuCategory.delete({ where: { id } });
  },
};
