import "dotenv/config";
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { config, validateConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler";

validateConfig();

const app: Application = express();

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROUTES
// ============================================

import webhookRoutes from "./routes/webhookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import menuItemRoutes from "./routes/menuItemRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";

app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    service: "Restaurant Bot API",
    timestamp: new Date().toISOString(),
  });
});

// WhatsApp Webhook (public — verified by HMAC signature)
app.use("/webhook", webhookRoutes);

// Authentication
app.use("/auth", authRoutes);

// Restaurant management
app.use("/restaurants", restaurantRoutes);

// Menu management (scoped to restaurant via JWT role)
app.use("/categories", categoryRoutes);
app.use("/menu-items", menuItemRoutes);

// Orders
app.use("/orders", orderRoutes);

// Dashboard stats
app.use("/stats", statsRoutes);

// Admin user management (SUPER_ADMIN only)
app.use("/admin", adminRoutes);

// Billing & subscriptions (Paystack)
app.use("/billing", billingRoutes);

// ============================================
// ERROR HANDLING
// ============================================

app.use(errorHandler);

// ============================================
// SERVER
// ============================================

app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/health`);
});

export default app;
