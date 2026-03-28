import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { validatePaystackSignature } from "../middleware/paystackWebhook.js";
import * as billingController from "../controllers/billingController.js";

const router = Router();

// POST /billing/webhook — public, validated by Paystack HMAC signature
router.post("/webhook", validatePaystackSignature, billingController.handleWebhook);

// All remaining routes require a valid JWT + role
router.use(authenticate);
router.use(requireRole("RESTAURANT_ADMIN", "SUPER_ADMIN"));

// GET /billing/subscription — fetch current subscription
router.get("/subscription", billingController.getSubscription);

// POST /billing/initialize — start a new subscription payment
router.post("/initialize", billingController.initializeSubscription);

// POST /billing/cancel — cancel current subscription
router.post("/cancel", billingController.cancelSubscription);

export default router;
