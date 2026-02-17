import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { config, validateConfig } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler";

// Validate environment variables
validateConfig();

const app: Application = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// ROUTES
// ============================================

// Import routes
import webhookRoutes from "./routes/webhookRoutes.js";

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Restaurant Bot WhatsApp Webhook",
    timestamp: new Date().toISOString(),
  });
});

// WhatsApp Webhook Route (only route needed - dashboard uses Supabase directly)
app.use("/webhook", webhookRoutes);

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
