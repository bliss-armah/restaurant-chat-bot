import { prisma } from "../config/database.js";

export interface MenuItemPayload {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  sortOrder?: number;
  isAvailable?: boolean;
}

async function assertCategoryOwnership(categoryId: string, restaurantId: string) {
  const category = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw { status: 404, message: "Category not found" };
  if (category.restaurantId !== restaurantId) {
    throw { status: 403, message: "Forbidden: category does not belong to your restaurant" };
  }
}

async function assertItemOwnership(id: string, restaurantId: string) {
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { category: { select: { restaurantId: true } } },
  });
  if (!item) throw { status: 404, message: "Menu item not found" };
  if (item.category.restaurantId !== restaurantId) throw { status: 403, message: "Forbidden" };
  return item;
}

export const menuItemService = {
  async list(restaurantId: string) {
    return prisma.menuItem.findMany({
      where: {
        category: { restaurantId },
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
  },

  async create(restaurantId: string, data: MenuItemPayload) {
    await assertCategoryOwnership(data.categoryId, restaurantId);
    return prisma.menuItem.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
        isAvailable: data.isAvailable ?? true,
      },
    });
  },

  async update(id: string, restaurantId: string, data: Partial<MenuItemPayload>) {
    await assertItemOwnership(id, restaurantId);
    if (data.categoryId) await assertCategoryOwnership(data.categoryId, restaurantId);

    return prisma.menuItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      },
    });
  },

  async toggleAvailable(id: string, restaurantId: string) {
    const item = await assertItemOwnership(id, restaurantId);
    return prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  },

  async remove(id: string, restaurantId: string) {
    await assertItemOwnership(id, restaurantId);
    await prisma.menuItem.delete({ where: { id } });
  },
};
