// ============================================
// CONVERSATION STATES
// ============================================

export enum ConversationState {
  WELCOME = "WELCOME",
  SELECT_CATEGORY = "SELECT_CATEGORY",
  SELECT_ITEM = "SELECT_ITEM",
  SELECT_QUANTITY = "SELECT_QUANTITY",
  ADD_MORE = "ADD_MORE",
  CONFIRM_ORDER = "CONFIRM_ORDER",
  PAYMENT_INSTRUCTIONS = "PAYMENT_INSTRUCTIONS",
  PAYMENT_CONFIRMATION = "PAYMENT_CONFIRMATION",
}

// ============================================
// ORDER STATUSES
// ============================================

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum PaymentStatus {
  UNPAID = "UNPAID",
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  VERIFIED = "VERIFIED",
  FAILED = "FAILED",
}

// ============================================
// TEMPORARY ORDER CONTEXT
// ============================================

export interface TempOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface TempOrderContext {
  items: TempOrderItem[];
  selectedCategoryId?: string;
  selectedItemId?: string;
  pendingQuantity?: number;
}

// ============================================
// DTOs
// ============================================

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuItemDTO {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateMenuItemDTO {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  sortOrder?: number;
}

export interface CreateOrderDTO {
  customerId: string;
  restaurantId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  deliveryAddress?: string;
  customerNotes?: string;
}

export interface UpdateOrderStatusDTO {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

// ============================================
// WHATSAPP TYPES
// ============================================

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "interactive";
  text?: {
    body: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
      };
      field: string;
    }>;
  }>;
}
