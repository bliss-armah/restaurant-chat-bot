import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/env.js";

export function validatePaystackSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const signature = req.headers["x-paystack-signature"] as string | undefined;

  if (!signature) {
    res.status(401).json({ error: "Missing Paystack signature" });
    return;
  }

  // rawBody is attached by the express.json verify callback in index.ts
  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: "Raw body unavailable" });
    return;
  }

  const hash = crypto
    .createHmac("sha512", config.paystack.secretKey)
    .update(rawBody)
    .digest("hex");

  if (hash !== signature) {
    res.status(401).json({ error: "Invalid Paystack signature" });
    return;
  }

  next();
}
