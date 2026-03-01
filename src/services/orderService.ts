import { prisma } from "../config/database.js";
import { WhatsAppService } from "../utils/whatsapp.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus =
  | "UNPAID"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "FAILED";

export interface UpdateOrderStatusPayload {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Valid state transitions
// An admin can only move orders forward through the lifecycle.
// REJECTED is a special action that maps to: status=CANCELLED, paymentStatus=FAILED
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp message templates per status
// ─────────────────────────────────────────────────────────────────────────────

function buildWhatsAppMessage(
  orderNumber: string,
  newStatus: OrderStatus,
): string | null {
  switch (newStatus) {
    case "CONFIRMED":
      return (
        `🎉 Your order *#${orderNumber}* has been confirmed!\n` +
        `We are preparing it now.`
      );
    case "CANCELLED":
      return (
        `❌ Your order *#${orderNumber}* was rejected.\n` +
        `If payment was made, please contact support.`
      );
    case "PREPARING":
      return `👨‍🍳 Your order *#${orderNumber}* is being prepared.`;
    case "READY":
      return `📦 Your order *#${orderNumber}* is ready!`;
    case "COMPLETED":
      return `✅ Your order *#${orderNumber}* is complete. Thank you!`;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Service
// ─────────────────────────────────────────────────────────────────────────────

const whatsapp = new WhatsAppService();

export const orderService = {
  /**
   * Fetch all orders for a given restaurant, newest first.
   * Multi-tenant: always scoped to restaurantId.
   */
  async getOrdersByRestaurant(restaurantId: string) {
    return prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      include: {
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
    });
  },

  /**
   * Update order status with multi-tenant protection, state-machine validation,
   * and WhatsApp side-effect.
   *
   * @param orderId      - Order to update
   * @param restaurantId - Caller's restaurant (from req.userRole) — enforces ownership
   * @param payload      - { status?, paymentStatus? }
   */
  async updateOrderStatus(
    orderId: string,
    restaurantId: string,
    payload: UpdateOrderStatusPayload,
  ) {
    const { status: newStatus, paymentStatus: newPaymentStatus } = payload;

    if (!newStatus && !newPaymentStatus) {
      throw Object.assign(
        new Error("At least one of status or paymentStatus is required"),
        { statusCode: 400 },
      );
    }

    // ── 1. Fetch order and validate ownership ──────────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { phone: true, name: true } },
      },
    });

    if (!order) {
      throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    }

    if (order.restaurantId !== restaurantId) {
      throw Object.assign(
        new Error("Forbidden: order does not belong to your restaurant"),
        { statusCode: 403 },
      );
    }

    // ── 2. Validate state transition ───────────────────────────────────────
    if (newStatus) {
      const allowed = VALID_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw Object.assign(
          new Error(
            `Invalid transition: ${order.status} → ${newStatus}. Allowed: [${allowed.join(", ") || "none"}]`,
          ),
          { statusCode: 422 },
        );
      }
    }

    // ── 3. Build update payload ────────────────────────────────────────────
    const updateData: Record<string, string> = {};
    if (newStatus) updateData.status = newStatus;

    // When CONFIRMED: automatically verify payment
    if (newStatus === "CONFIRMED") {
      updateData.paymentStatus = "VERIFIED";
    }
    // When CANCELLED: mark payment as FAILED if it was pending
    else if (newStatus === "CANCELLED") {
      if (
        order.paymentStatus === "PENDING_VERIFICATION" ||
        order.paymentStatus === "UNPAID"
      ) {
        updateData.paymentStatus = "FAILED";
      }
    }
    // Manual paymentStatus override (e.g., admin marks payment as verified separately)
    else if (newPaymentStatus) {
      updateData.paymentStatus = newPaymentStatus;
    }

    // ── 4. Persist ─────────────────────────────────────────────────────────
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
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
    });

    // ── 5. Send WhatsApp notification (non-blocking; don't fail the request) ─
    if (newStatus) {
      const message = buildWhatsAppMessage(order.orderNumber, newStatus);
      if (message && order.customer.phone) {
        whatsapp.sendTextMessage(order.customer.phone, message).catch((err) => {
          console.error(
            `⚠️  WhatsApp notification failed for order ${order.orderNumber}:`,
            err,
          );
        });
      }
    }

    return updated;
  },
};
