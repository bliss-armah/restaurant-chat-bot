import { Router } from "express";
import { WebhookController } from "../controllers/webhookController.js";

const router = Router();
const controller = new WebhookController();

// Webhook verification (GET)
router.get("/", (req, res) => controller.verify(req, res));

// Webhook message handler (POST)
router.post("/", (req, res, next) => controller.handleMessage(req, res, next));

export default router;
