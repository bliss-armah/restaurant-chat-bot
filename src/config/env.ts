export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  databaseUrl: process.env.DATABASE_URL || "",

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "default-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || "",
    monthlyPlanCode: process.env.PAYSTACK_MONTHLY_PLAN_CODE || "",
    yearlyPlanCode: process.env.PAYSTACK_YEARLY_PLAN_CODE || "",
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL || "http://localhost:3000/dashboard/billing",
  },
} as const;

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
    console.error("❌ Missing required environment variables:", missing.join(", "));
    if (config.nodeEnv === "production") {
      process.exit(1);
    }
  }
}
