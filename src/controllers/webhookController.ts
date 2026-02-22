import { Request, Response, NextFunction } from "express";
import { ConversationService } from "../services/conversationService.js";
import { config } from "../config/env.js";
import { WhatsAppWebhookPayload } from "../types/index.js";
import { prisma } from "../config/database.js";

const conversationService = new ConversationService();

export class WebhookController {
  /**
   * GET /webhook - Webhook verification
   */
  async verify(req: Request, res: Response): Promise<void> {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === config.whatsapp.verifyToken) {
      console.log("✅ Webhook verified");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }

  /**
   * POST /webhook - Handle incoming WhatsApp messages
   */
  async handleMessage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body: WhatsAppWebhookPayload = req.body;

      // Respond quickly to WhatsApp
      res.sendStatus(200);

      // Process asynchronously
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            const { value } = change;

            // Handle messages
            if (value.messages && value.messages.length > 0) {
              const message = value.messages[0];
              const from = message.from;

              // Get message text
              let messageText = "";
              if (message.type === "text" && message.text) {
                messageText = message.text.body;
              } else if (
                message.type === "interactive" &&
                message.interactive
              ) {
                // Handle interactive responses (list selections)
                if (message.interactive.list_reply) {
                  messageText = message.interactive.list_reply.id;
                } else if (message.interactive.button_reply) {
                  messageText = message.interactive.button_reply.id;
                }
              }

              // Get customer name if available
              const customerName = value.contacts?.[0]?.profile?.name;

              // Identify restaurant by phone number
              const restaurant = await this.getRestaurantByPhone(
                `+${value.metadata.display_phone_number}`,
              );

              if (restaurant) {
                // Process message
                await conversationService.handleMessage(
                  from,
                  messageText,
                  restaurant.id,
                  customerName,
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Webhook error:", error);
      // Don't call next(error) since we already sent response
    }
  }

  /**
   * Helper to identify restaurant by WhatsApp number
   */
  private async getRestaurantByPhone(phone: string) {
    return prisma.restaurant.findFirst({
      where: {
        OR: [{ whatsappNumber: phone }, { phone: phone }],
      },
    });
  }
}
