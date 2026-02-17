import axios from "axios";
import { config } from "../config/env.js";

// ============================================
// WHATSAPP MESSAGE TYPES
// ============================================

interface TextMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: {
    body: string;
  };
}

interface InteractiveListMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "list";
    header?: {
      type: "text";
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

// ============================================
// WHATSAPP UTILS
// ============================================

export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor() {
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.token = config.whatsapp.token;
    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Send a text message to a WhatsApp user
   */
  async sendTextMessage(to: string, text: string): Promise<void> {
    const message: TextMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    };

    await this.sendMessage(message);
  }

  /**
   * Send an interactive list message (for categories or items)
   */
  async sendListMessage(
    to: string,
    body: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    header?: string,
  ): Promise<void> {
    const message: InteractiveListMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: {
          button: buttonText,
          sections,
        },
      },
    };

    if (header) {
      message.interactive.header = {
        type: "text",
        text: header,
      };
    }

    await this.sendMessage(message);
  }

  /**
   * Internal method to send messages via WhatsApp Cloud API
   */
  private async sendMessage(
    message: TextMessage | InteractiveListMessage,
  ): Promise<void> {
    try {
      await axios.post(this.apiUrl, message, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });
    } catch (error) {
      console.error("❌ WhatsApp API Error:", error);
      throw new Error("Failed to send WhatsApp message");
    }
  }
}
