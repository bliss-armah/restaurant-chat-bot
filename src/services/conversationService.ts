import { ConversationState } from "@prisma/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (s: string) => UUID_RE.test(s);
import {
  CustomerRepository,
  ConversationRepository,
} from "../repositories/customerRepository.js";
import { WhatsAppService } from "../utils/whatsapp.js";
import { formatPrice } from "../utils/helpers.js";
import { TempOrderContext, TempOrderItem } from "../types/index.js";
import { prisma } from "../config/database.js";

/**
 * Conversation Engine - Handles WhatsApp message flow
 * Implements deterministic state machine for order flow
 *
 * MULTI-TENANT: Each conversation is scoped to a restaurant via restaurantId
 */
export class ConversationService {
  private customerRepo: CustomerRepository;
  private conversationRepo: ConversationRepository;

  constructor() {
    this.customerRepo = new CustomerRepository();
    this.conversationRepo = new ConversationRepository();
  }

  /**
   * Returns current time (hours, minutes) in a given IANA timezone.
   */
  private getCurrentTimeInTimezone(timezone: string): { hours: number; minutes: number } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
    const minutes = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
    return { hours, minutes };
  }

  /**
   * Checks whether the restaurant is open based on schedule and manual toggle.
   * Returns: { open: boolean; minutesToClose: number | null }
   * minutesToClose is set when open but closing within 60 minutes.
   */
  private checkRestaurantHours(restaurant: {
    isOpen: boolean;
    openingTime: string | null;
    closingTime: string | null;
    timezone: string;
  }): { open: boolean; minutesToClose: number | null } {
    if (!restaurant.isOpen) return { open: false, minutesToClose: null };

    const { openingTime, closingTime, timezone } = restaurant;
    if (!openingTime || !closingTime) return { open: true, minutesToClose: null };

    const { hours, minutes } = this.getCurrentTimeInTimezone(timezone);
    const nowMins = hours * 60 + minutes;

    const [openH, openM] = openingTime.split(":").map(Number);
    const [closeH, closeM] = closingTime.split(":").map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    // Handle overnight schedules (e.g. open 20:00, close 02:00)
    let isWithinHours: boolean;
    let minutesToClose: number | null = null;

    if (openMins < closeMins) {
      // Same-day schedule
      isWithinHours = nowMins >= openMins && nowMins < closeMins;
      if (isWithinHours) {
        const remaining = closeMins - nowMins;
        if (remaining <= 60) minutesToClose = remaining;
      }
    } else {
      // Overnight schedule (closing time is next day)
      isWithinHours = nowMins >= openMins || nowMins < closeMins;
      if (isWithinHours) {
        const remaining = nowMins >= openMins
          ? 24 * 60 - nowMins + closeMins
          : closeMins - nowMins;
        if (remaining <= 60) minutesToClose = remaining;
      }
    }

    return { open: isWithinHours, minutesToClose };
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleMessage(
    from: string,
    messageText: string,
    restaurantId: string,
    customerName?: string,
  ): Promise<void> {
    // Check if restaurant is currently open before doing anything else
    const restaurantStatus = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { isOpen: true, name: true, openingTime: true, closingTime: true, timezone: true, whatsappPhoneNumberId: true },
    });

    if (!restaurantStatus) return;

    const whatsapp = new WhatsAppService(restaurantStatus.whatsappPhoneNumberId ?? undefined);

    const { open, minutesToClose } = this.checkRestaurantHours(restaurantStatus);

    if (!open) {
      let closedMsg = `🔴 *We're currently closed*\n\nThank you for reaching out to *${restaurantStatus.name}*!\n\nUnfortunately, we are not accepting orders at this time.`;
      if (restaurantStatus.openingTime) {
        closedMsg += ` We open at *${restaurantStatus.openingTime}*.`;
      }
      closedMsg += `\n\nWe'd love to serve you when we reopen! 🙏\n\nPlease check back soon — we can't wait to have you order with us again. 😊`;
      await whatsapp.sendTextMessage(from, closedMsg);
      return;
    }

    const customer = await this.customerRepo.findOrCreate(
      from,
      restaurantId,
      customerName,
    );

    const conversation = await this.conversationRepo.getOrCreate(customer.id);

    const context = (conversation.context as any as TempOrderContext) || {
      items: [],
    };

    const normalizedText = messageText.trim().toLowerCase();

    if (normalizedText === "restart") {
      await prisma.order.updateMany({
        where: {
          customerId: customer.id,
          paymentStatus: {
            in: ["UNPAID", "PENDING_VERIFICATION"],
          },
        },
        data: {
          status: "CANCELLED",
        },
      });

      await this.conversationRepo.reset(customer.id);

      await whatsapp.sendTextMessage(
        from,
        "🔄 Your previous order has been cleared.\n\nLet's start fresh!",
      );

      await this.handleWelcome(from, customer.id, restaurantId, whatsapp);
      return;
    }

    switch (conversation.state) {
      case ConversationState.WELCOME:
        await this.handleWelcome(from, customer.id, restaurantId, whatsapp, undefined, minutesToClose ?? undefined);
        break;

      case ConversationState.SELECT_CATEGORY:
        await this.handleCategorySelection(
          from,
          messageText,
          customer.id,
          restaurantId,
          whatsapp,
          context,
        );
        break;

      case ConversationState.SELECT_ITEM:
        await this.handleItemSelection(from, messageText, customer.id, whatsapp, context);
        break;

      case ConversationState.SELECT_QUANTITY:
        await this.handleQuantityInput(from, messageText, customer.id, whatsapp, context);
        break;

      case ConversationState.ADD_MORE:
        await this.handleAddMore(
          from,
          messageText,
          customer.id,
          restaurantId,
          whatsapp,
          context,
        );
        break;

      case ConversationState.CONFIRM_ORDER:
        await this.handleOrderConfirmation(
          from,
          messageText,
          customer.id,
          restaurantId,
          whatsapp,
          context,
        );
        break;

      case ConversationState.SELECT_ORDER_TYPE:
        await this.handleOrderTypeSelection(
          from,
          messageText,
          customer.id,
          restaurantId,
          whatsapp,
          context,
        );
        break;

      case ConversationState.COLLECT_DELIVERY_ADDRESS:
        await this.handleDeliveryAddressCollection(
          from,
          messageText,
          customer.id,
          restaurantId,
          whatsapp,
          context,
        );
        break;

      case ConversationState.PAYMENT_CONFIRMATION:
        await this.handlePaymentConfirmation(
          from,
          messageText,
          customer.id,
          restaurantId,
          whatsapp,
        );
        break;

      default:
        await this.handleWelcome(from, customer.id, restaurantId, whatsapp);
    }
  }

  /**
   * WELCOME state - Show categories
   */
  private async handleWelcome(
    from: string,
    customerId: string,
    restaurantId: string,
    whatsapp: WhatsAppService,
    context?: TempOrderContext,
    minutesToClose?: number,
  ): Promise<void> {
    // Get categories for this restaurant
    const categories = await prisma.menuCategory.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (categories.length === 0) {
      await whatsapp.sendTextMessage(
        from,
        `🍽️ Welcome ${restaurant?.name}! Our menu is being updated. Please check back later.`,
      );
      return;
    }

    let welcomeBody = `Welcome to ${restaurant?.name}! Please select a category to start ordering:`;
    if (minutesToClose !== undefined) {
      welcomeBody = `⚠️ *Closing soon!* We close in ${minutesToClose} minute${minutesToClose === 1 ? "" : "s"} — please order ASAP!\n\n` + welcomeBody;
    }

    await whatsapp.sendListMessage(
      from,
      welcomeBody,
      "View Menu",
      [
        {
          title: "Food Categories",
          rows: categories.map((cat) => ({
            id: cat.id,
            title: cat.name,
            description: cat.description || undefined,
          })),
        },
      ],
      "🎉 Welcome!",
    );

    await this.conversationRepo.updateState(
      customerId,
      ConversationState.SELECT_CATEGORY,
      context ?? { items: [] },
    );
  }

  private async handleCategorySelection(
    from: string,
    categoryId: string,
    customerId: string,
    restaurantId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
  ): Promise<void> {
    if (!isUUID(categoryId)) {
      await this.handleWelcome(from, customerId, restaurantId, whatsapp, context);
      return;
    }

    // Get items for this category
    const items = await prisma.menuItem.findMany({
      where: {
        categoryId,
        isAvailable: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    if (items.length === 0) {
      await whatsapp.sendTextMessage(
        from,
        "😕 This category has no items available. Let me show you the menu again.",
      );
      await this.handleWelcome(from, customerId, restaurantId, whatsapp);
      return;
    }

    await whatsapp.sendListMessage(
      from,
      "Select an item from this category:",
      "Choose Item",
      [
        {
          title: "Available Items",
          rows: items.map((item) => ({
            id: item.id,
            title: item.name,
            description: `${formatPrice(item.price)}${item.description ? ` - ${item.description}` : ""}`,
          })),
        },
      ],
    );

    await this.conversationRepo.updateState(
      customerId,
      ConversationState.SELECT_ITEM,
      {
        ...context,
        selectedCategoryId: categoryId,
      },
    );
  }

  /**
   * SELECT_ITEM state - User selected an item
   */
  private async handleItemSelection(
    from: string,
    itemId: string,
    customerId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
  ): Promise<void> {
    if (!isUUID(itemId)) {
      await whatsapp.sendTextMessage(
        from,
        "Please select an item from the list above.",
      );
      return;
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.isAvailable) {
      await whatsapp.sendTextMessage(
        from,
        "😕 This item is not available right now.",
      );
      return;
    }

    await whatsapp.sendTextMessage(
      from,
      `📝 ${item.name}\n💰 ${formatPrice(item.price)}\n\nHow many would you like? (Enter a number)`,
    );

    await this.conversationRepo.updateState(
      customerId,
      ConversationState.SELECT_QUANTITY,
      {
        ...context,
        selectedItemId: itemId,
      },
    );
  }

  /**
   * SELECT_QUANTITY state - User entered quantity
   */
  private async handleQuantityInput(
    from: string,
    input: string,
    customerId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
  ): Promise<void> {
    const quantity = parseInt(input.trim(), 10);

    if (isNaN(quantity) || quantity < 1) {
      await whatsapp.sendTextMessage(
        from,
        "❌ Please enter a valid quantity (e.g., 1, 2, 3)",
      );
      return;
    }

    if (!context.selectedItemId) {
      await whatsapp.sendTextMessage(
        from,
        "❌ Something went wrong. Let me restart.",
      );
      await this.conversationRepo.reset(customerId);
      return;
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: context.selectedItemId },
    });

    if (!item) {
      await whatsapp.sendTextMessage(from, "❌ Item not found.");
      return;
    }

    // Add item to order
    const newItem: TempOrderItem = {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
    };

    const updatedContext: TempOrderContext = {
      ...context,
      items: [...context.items, newItem],
    };

    await whatsapp.sendButtonMessage(
      from,
      `✅ Added ${quantity}x ${item.name} (${formatPrice(item.price * quantity)})\n\nWould you like to add more items?`,
      [
        { id: "YES", title: "✅ Add More" },
        { id: "NO", title: "✋ I'm Done" },
      ],
    );

    await this.conversationRepo.updateState(
      customerId,
      ConversationState.ADD_MORE,
      updatedContext,
    );
  }

  /**
   * ADD_MORE state - Ask if user wants more items
   */
  private async handleAddMore(
    from: string,
    input: string,
    customerId: string,
    restaurantId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
  ): Promise<void> {
    const response = input.trim().toLowerCase();

    if (response === "yes" || response === "y") {
      await this.handleWelcome(from, customerId, restaurantId, whatsapp, context);
    } else if (response === "no" || response === "n") {
      await this.showOrderSummary(from, customerId, whatsapp, context);
    } else {
      await whatsapp.sendButtonMessage(
        from,
        "Would you like to add more items?",
        [
          { id: "YES", title: "✅ Add More" },
          { id: "NO", title: "✋ I'm Done" },
        ],
      );
    }
  }

  /**
   * Show order summary and ask for confirmation
   */
  private async showOrderSummary(
    from: string,
    customerId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
  ): Promise<void> {
    if (context.items.length === 0) {
      await whatsapp.sendTextMessage(
        from,
        "You haven't added any items yet.",
      );
      return;
    }

    let summary = "📋 *Your Order Summary*\n\n";
    let total = 0;

    context.items.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      summary += `${index + 1}. ${item.name}\n   ${item.quantity}x @ ${formatPrice(item.price)} = ${formatPrice(itemTotal)}\n\n`;
    });

    summary += `💰 *Total: ${formatPrice(total)}*`;

    await whatsapp.sendButtonMessage(
      from,
      summary,
      [
        { id: "CONFIRM", title: "✅ Confirm Order" },
        { id: "CANCEL", title: "❌ Cancel" },
      ],
    );
    await this.conversationRepo.updateState(
      customerId,
      ConversationState.CONFIRM_ORDER,
      context,
    );
  }

  /**
   * CONFIRM_ORDER state - Ask for delivery/pickup preference
   */
  private async handleOrderConfirmation(
    from: string,
    input: string,
    customerId: string,
    restaurantId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
  ): Promise<void> {
    const response = input.trim().toLowerCase();

    if (response === "cancel") {
      await whatsapp.sendTextMessage(
        from,
        "❌ Order cancelled. Type HI to start a new order.",
      );
      await this.conversationRepo.reset(customerId);
      return;
    }

    if (response !== "confirm") {
      await whatsapp.sendButtonMessage(
        from,
        "Please confirm or cancel your order:",
        [
          { id: "CONFIRM", title: "✅ Confirm Order" },
          { id: "CANCEL", title: "❌ Cancel" },
        ],
      );
      return;
    }

    await whatsapp.sendButtonMessage(
      from,
      "How would you like to receive your order?",
      [
        { id: "DELIVERY", title: "🚚 Delivery" },
        { id: "PICKUP", title: "🏪 Pickup" },
      ],
    );
    await this.conversationRepo.updateState(
      customerId,
      ConversationState.SELECT_ORDER_TYPE,
      context,
    );
  }

  /**
   * SELECT_ORDER_TYPE state - Handle delivery or pickup selection
   */
  private async handleOrderTypeSelection(
    from: string,
    input: string,
    customerId: string,
    restaurantId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
  ): Promise<void> {
    const response = input.trim().toUpperCase();

    if (response === "DELIVERY") {
      await whatsapp.sendTextMessage(from, "📍 Please share your delivery address:");
      await this.conversationRepo.updateState(
        customerId,
        ConversationState.COLLECT_DELIVERY_ADDRESS,
        { ...context, orderType: "DELIVERY" },
      );
    } else if (response === "PICKUP") {
      await this.createOrderAndSendPayment(from, customerId, restaurantId, whatsapp, context, "PICKUP");
    } else {
      await whatsapp.sendButtonMessage(
        from,
        "How would you like to receive your order?",
        [
          { id: "DELIVERY", title: "🚚 Delivery" },
          { id: "PICKUP", title: "🏪 Pickup" },
        ],
      );
    }
  }

  /**
   * COLLECT_DELIVERY_ADDRESS state - Collect delivery address then create order
   */
  private async handleDeliveryAddressCollection(
    from: string,
    input: string,
    customerId: string,
    restaurantId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
  ): Promise<void> {
    const address = input.trim();

    if (!address) {
      await whatsapp.sendTextMessage(from, "📍 Please share your delivery address:");
      return;
    }

    await this.createOrderAndSendPayment(from, customerId, restaurantId, whatsapp, context, "DELIVERY", address);
  }

  /**
   * Create order in DB and send payment instructions
   */
  private async createOrderAndSendPayment(
    from: string,
    customerId: string,
    restaurantId: string,
    whatsapp: WhatsAppService,
    context: TempOrderContext,
    orderType: "DELIVERY" | "PICKUP",
    deliveryAddress?: string,
  ): Promise<void> {
    const orderNumber = `ORD-${Date.now()}`;
    const totalAmount = context.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        restaurantId,
        totalAmount,
        status: "PENDING",
        paymentStatus: "UNPAID",
        fulfillmentType: orderType,
        deliveryAddress: deliveryAddress || null,
        items: {
          create: context.items.map((item) => ({
            menuItemId: item.menuItemId,
            itemName: item.name,
            itemPrice: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
        },
      },
    });

    const restaurant = await this.getRestaurant(restaurantId);
    const fulfillmentLine = orderType === "DELIVERY"
      ? `📍 Delivery to: ${deliveryAddress}`
      : `🏪 Pickup — collect at the restaurant`;

    const paymentMessage =
      `✅ *Order Confirmed!*\n\n` +
      `📝 Order Number: ${order.orderNumber}\n` +
      `💰 Total Amount: ${formatPrice(order.totalAmount)}\n` +
      `${fulfillmentLine}\n\n` +
      `*Payment Instructions:*\n` +
      `Please send ${formatPrice(order.totalAmount)} to:\n\n` +
      `📱 MTN MoMo: ${restaurant.momoNumber}\n` +
      `👤 Name: ${restaurant.momoName}\n\n` +
      `Reply *PAID* once you have completed the payment.`;

    await whatsapp.sendTextMessage(from, paymentMessage);
    await this.conversationRepo.updateState(
      customerId,
      ConversationState.PAYMENT_CONFIRMATION,
      { items: [] },
    );
  }

  /**
   * PAYMENT_CONFIRMATION state - Handle "PAID" response
   */
  private async handlePaymentConfirmation(
    from: string,
    input: string,
    customerId: string,
    restaurantId: string,
    whatsapp: WhatsAppService,
  ): Promise<void> {
    const response = input.trim().toLowerCase();

    if (response === "paid") {
      // Get the most recent order
      const order = await prisma.order.findFirst({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        select: { id: true, orderNumber: true, totalAmount: true, fulfillmentType: true, deliveryAddress: true },
      });

      if (!order) {
        await whatsapp.sendTextMessage(from, "❌ No recent order found.");
        return;
      }

      // Update payment status
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PENDING_VERIFICATION" },
      });

      await whatsapp.sendTextMessage(
        from,
        `✅ Thank you! We have received your payment notification.\n\n` +
          `Order #${order.orderNumber} is being verified.\n` +
          `You will be notified once confirmed.\n\n` +
          `Type HI to place a new order.`,
      );

      const restaurant = await this.getRestaurant(restaurantId);
      if (restaurant.phone) {
        const fulfillmentNotif = order.fulfillmentType === "DELIVERY"
          ? `Type: 🚚 DELIVERY — 📍 ${order.deliveryAddress}`
          : `Type: 🏪 PICKUP`;
        const notificationMessage =
          `New payment notification!\n\n` +
          `Order #${order.orderNumber}\n` +
          `Customer: ${from}\n` +
          `Amount: GHS ${Number(order.totalAmount).toFixed(2)}\n` +
          `${fulfillmentNotif}\n\n` +
          `Payment status: Pending verification\n` +
          `Check your dashboard to manage this order.`;

        whatsapp.sendTextMessage(restaurant.phone, notificationMessage).catch((err) => {
          console.error("Failed to send restaurant order notification:", err);
        });
      }

      await this.conversationRepo.reset(customerId);
    } else {
      await whatsapp.sendTextMessage(
        from,
        "Please reply *PAID* once you have completed the payment, or type HI to start a new order.",
      );
    }
  }

  /**
   * Helper to get restaurant details
   */
  private async getRestaurant(restaurantId: string) {
    const { prisma } = await import("../config/database.js");
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) throw new Error("Restaurant not found");
    return restaurant;
  }
}
