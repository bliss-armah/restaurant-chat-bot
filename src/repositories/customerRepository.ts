import { prisma } from "../config/database.js";
import { Customer, Conversation, ConversationState } from "@prisma/client";
import { TempOrderContext } from "../types/index.js";

export class CustomerRepository {
  /**
   * Find or create a customer by phone number and restaurant
   */
  async findOrCreate(
    phone: string,
    restaurantId: string,
    name?: string,
  ): Promise<Customer> {
    let customer = await prisma.customer.findUnique({
      where: {
        phone_restaurantId: {
          phone,
          restaurantId,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone,
          name,
          restaurantId,
        },
      });
    }

    return customer;
  }

  /**
   * Get customer by ID
   */
  async findById(id: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { id },
    });
  }
}

export class ConversationRepository {
  /**
   * Get or create conversation for a customer
   */
  async getOrCreate(customerId: string): Promise<Conversation> {
    let conversation = await prisma.conversation.findUnique({
      where: { customerId },
    });

    if (!conversation) {
      // Get customer to find restaurantId
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      conversation = await prisma.conversation.create({
        data: {
          customerId,
          restaurantId: customer.restaurantId,
          state: "WELCOME",
          context: {},
        },
      });
    }

    return conversation;
  }

  /**
   * Update conversation state
   */
  async updateState(
    customerId: string,
    state: ConversationState,
    context?: TempOrderContext,
  ): Promise<Conversation> {
    return prisma.conversation.update({
      where: { customerId },
      data: {
        state,
        ...(context !== undefined && { context: context as any }),
        lastMessageAt: new Date(),
      },
    });
  }

  /**
   * Reset conversation to WELCOME state
   */
  async reset(customerId: string): Promise<Conversation> {
    return prisma.conversation.update({
      where: { customerId },
      data: {
        state: ConversationState.WELCOME,
        context: {},
        lastMessageAt: new Date(),
      },
    });
  }

  /**
   * Get conversation by customer ID
   */
  async findByCustomerId(customerId: string): Promise<Conversation | null> {
    return prisma.conversation.findUnique({
      where: { customerId },
    });
  }
}
