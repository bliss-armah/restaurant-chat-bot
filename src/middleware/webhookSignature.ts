import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 * Validates WhatsApp webhook signatures.
 *
 * Meta signs every webhook delivery with HMAC-SHA256 using the
 * app's client secret. Without this guard, anyone can POST fake
 * messages to your webhook endpoint.
 *
 * Reference: https://developers.facebook.com/docs/messenger-platform/webhook#security
 *
 * Required env var: WHATSAPP_APP_SECRET
 */
export function validateWhatsAppSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // In development without the secret configured, warn but allow through.
  // In production this MUST be set — refuse the request otherwise.
  if (!appSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "❌ WHATSAPP_APP_SECRET is not set. Rejecting webhook in production.",
      );
      res.sendStatus(403);
      return;
    }
    console.warn(
      "⚠️  WHATSAPP_APP_SECRET not set — skipping signature check (dev only).",
    );
    next();
    return;
  }

  const signature = req.headers["x-hub-signature-256"] as string | undefined;

  if (!signature) {
    res.status(403).json({ error: "Missing X-Hub-Signature-256 header" });
    return;
  }

  // The body must be the raw buffer for HMAC to match.
  // express.json() parses it — use rawBody if you configure it, otherwise
  // re-stringify the parsed body (good enough for most payloads).
  const body =
    (req as any).rawBody instanceof Buffer
      ? (req as any).rawBody
      : Buffer.from(JSON.stringify(req.body));

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(body).digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    console.error("❌ Invalid WhatsApp webhook signature");
    res.status(403).json({ error: "Invalid signature" });
    return;
  }

  next();
}
