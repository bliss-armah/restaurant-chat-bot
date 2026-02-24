import { Router } from "express";
import { WebhookController } from "../controllers/webhookController.js";
import { validateWhatsAppSignature } from "../middleware/webhookSignature.js";

const router = Router();
const controller = new WebhookController();

router.get("/", (req, res) => controller.verify(req, res));

router.post("/", validateWhatsAppSignature, (req, res, next) =>
  controller.handleMessage(req, res, next),
);

export default router;
