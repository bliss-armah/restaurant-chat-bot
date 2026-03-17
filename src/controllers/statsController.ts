import { Request, Response } from "express";
import { prisma } from "../config/database.js";

export const statsController = {
  async get(req: Request, res: Response): Promise<void> {
    const userRole = (req as any).userRole as { role: string; restaurantId?: string };

    try {
      if (userRole.role === "SUPER_ADMIN") {
        // Platform-wide stats
        const [totalRestaurants, activeRestaurants, totalUsers, orders] = await Promise.all([
          prisma.restaurant.count(),
          prisma.restaurant.count({ where: { isActive: true } }),
          prisma.user.count(),
          prisma.order.findMany({ select: { totalAmount: true, paymentStatus: true } }),
        ]);

        const totalOrders = orders.length;
        const totalRevenue = orders
          .filter((o) => o.paymentStatus === "VERIFIED")
          .reduce((sum, o) => sum + o.totalAmount, 0);

        res.json({
          success: true,
          data: {
            totalRestaurants,
            activeRestaurants,
            totalUsers,
            totalOrders,
            totalRevenue,
            recentActivity: [],
          },
        });
      } else {
        // Restaurant-scoped stats
        const restaurantId = userRole.restaurantId;
        if (!restaurantId) {
          res.status(403).json({ error: "No restaurant assigned" });
          return;
        }

        const [orders, menuItems, categoryCount] = await Promise.all([
          prisma.order.findMany({
            where: { restaurantId },
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              paymentStatus: true,
              deliveryAddress: true,
              customerNotes: true,
              createdAt: true,
              customer: { select: { name: true, phone: true } },
              items: {
                select: {
                  id: true,
                  itemName: true,
                  itemPrice: true,
                  quantity: true,
                  subtotal: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.menuItem.count({
            where: { category: { restaurantId } },
          }),
          prisma.menuCategory.count({ where: { restaurantId } }),
        ]);

        const paidOrders = orders.filter((o) => o.paymentStatus === "VERIFIED");
        const pendingOrders = orders.filter(
          (o) => o.status === "PENDING" || o.paymentStatus === "PENDING_VERIFICATION",
        );
        const revenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        const recentOrders = orders.slice(0, 5);

        res.json({
          success: true,
          data: {
            totalOrders: orders.length,
            pendingOrders: pendingOrders.length,
            revenue,
            avgOrderValue: paidOrders.length ? revenue / paidOrders.length : 0,
            totalMenuItems: menuItems,
            totalCategories: categoryCount,
            recentOrders,
          },
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
