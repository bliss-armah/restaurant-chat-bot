import { Request, Response, NextFunction } from "express";
import { orderService } from "../services/orderService.js";

export class OrderController {
  /**
   * GET /orders
   * Returns all orders for the authenticated admin's restaurant.
   * SUPER_ADMIN must also pass a restaurantId query param (or we skip for now).
   */
  async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req as any).userRole;
      const isSuperAdmin = userRole?.role === "SUPER_ADMIN";

      const restaurantId: string | undefined = isSuperAdmin
        ? ((req.query.restaurantId as string | undefined) ??
          userRole?.restaurantId)
        : userRole?.restaurantId;

      if (!restaurantId) {
        // Super admin hasn't picked a restaurant yet — return empty list
        // rather than an error so the UI can prompt them to select one.
        res.json({ success: true, data: [] });
        return;
      }

      const orders = await orderService.getOrdersByRestaurant(restaurantId);

      const normalised = orders.map((o) => ({
        id: o.id,
        order_number: o.orderNumber,
        total_amount: o.totalAmount,
        status: o.status,
        payment_status: o.paymentStatus,
        delivery_address: o.deliveryAddress,
        customer_notes: o.customerNotes,
        created_at: o.createdAt,
        customer: o.customer,
        items: o.items.map((i) => ({
          id: i.id,
          item_name: i.itemName,
          item_price: i.itemPrice,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
      }));

      res.json({ success: true, data: normalised });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /orders/:id/status
   * Body: { status?: OrderStatus, paymentStatus?: PaymentStatus }
   *
   * Validates ownership, validates transition, updates DB, fires WhatsApp message.
   */
  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = String(req.params.id);
      const userRole = (req as any).userRole;
      const restaurantId = userRole?.restaurantId as string | undefined;

      if (!restaurantId) {
        res.status(400).json({
          error:
            "No restaurant associated with your account. Contact a super admin.",
        });
        return;
      }

      const { status, paymentStatus } = req.body as {
        status?: string;
        paymentStatus?: string;
      };

      if (!status && !paymentStatus) {
        res
          .status(400)
          .json({ error: "Provide at least one of: status, paymentStatus" });
        return;
      }

      const updated = await orderService.updateOrderStatus(
        orderId,
        restaurantId,
        { status: status as any, paymentStatus: paymentStatus as any },
      );

      // Normalise to snake_case for frontend
      res.json({
        success: true,
        data: {
          id: updated.id,
          order_number: updated.orderNumber,
          total_amount: updated.totalAmount,
          status: updated.status,
          payment_status: updated.paymentStatus,
          delivery_address: updated.deliveryAddress,
          customer_notes: updated.customerNotes,
          created_at: updated.createdAt,
          customer: updated.customer,
          items: updated.items.map((i) => ({
            id: i.id,
            item_name: i.itemName,
            item_price: i.itemPrice,
            quantity: i.quantity,
            subtotal: i.subtotal,
          })),
        },
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}
