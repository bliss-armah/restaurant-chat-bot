import * as dotenv from "dotenv";

dotenv.config();

// Environment configuration with type safety
export const config = {
  // Server
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Database
  databaseUrl: process.env.DATABASE_URL || "",

  // WhatsApp Cloud API
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || "default-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@restaurant.com",
    password: process.env.ADMIN_PASSWORD || "changeme123",
  },
} as const;

// Validate required environment variables
export function validateConfig(): void {
  const required = [
    "DATABASE_URL",
    "WHATSAPP_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_VERIFY_TOKEN",
    "JWT_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      "❌ Missing required environment variables:",
      missing.join(", "),
    );
    if (config.nodeEnv === "production") {
      process.exit(1);
    }
  }
}
