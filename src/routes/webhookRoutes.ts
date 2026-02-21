import { Router } from "express";
import { WebhookController } from "../controllers/webhookController.js";
import { validateWhatsAppSignature } from "../middleware/webhookSignature.js";

const router = Router();
const controller = new WebhookController();

// ── GET /webhook — Meta webhook verification challenge ───────────────────────
// No signature validation on GET — Meta does not sign the verification request.
router.get("/", (req, res) => controller.verify(req, res));

// ── POST /webhook — Incoming WhatsApp messages ───────────────────────────────
// validateWhatsAppSignature ensures only Meta can POST here.
// The WhatsApp bot logic runs entirely via Prisma with service_role — RLS
// does not apply to any of the bot's DB writes.
router.post("/", validateWhatsAppSignature, (req, res, next) =>
  controller.handleMessage(req, res, next),
);

export default router;
