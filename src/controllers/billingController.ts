import { Request, Response } from "express";
import * as billingService from "../services/billingService.js";

// POST /billing/initialize
// Body: { interval: "monthly" | "yearly" }
export async function initializeSubscription(req: Request, res: Response) {
  try {
    const { interval } = req.body as { interval: "monthly" | "yearly" };

    if (!interval || !["monthly", "yearly"].includes(interval)) {
      res.status(400).json({ error: "interval must be 'monthly' or 'yearly'" });
      return;
    }

    const user = (req as any).user as { id: string; restaurantId?: string };
    const restaurantId: string = (req as any).userRole?.restaurantId;
    
    if (!restaurantId) {
      res.status(403).json({ error: "No restaurant associated with this account" });
      return;
    }
    
    const result = await billingService.initializeSubscription(user.id, restaurantId, interval);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// GET /billing/subscription
export async function getSubscription(req: Request, res: Response) {
  try {
    const userRole = (req as any).userRole;
    const restaurantId: string = userRole?.restaurantId;

    if (!restaurantId) {
      res.status(403).json({ error: "No restaurant associated with this account" });
      return;
    }

    const { subscription, restaurant } = await billingService.getSubscription(restaurantId);
    res.json({
      success: true,
      data: {
        subscription,
        subscriptionStatus: restaurant?.subscriptionStatus ?? null,
        trialEndsAt: restaurant?.trialEndsAt ?? null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// POST /billing/cancel
export async function cancelSubscription(req: Request, res: Response) {
  try {
    const userRole = (req as any).userRole;
    const restaurantId: string = userRole?.restaurantId;

    if (!restaurantId) {
      res.status(403).json({ error: "No restaurant associated with this account" });
      return;
    }

    await billingService.cancelSubscription(restaurantId);
    res.json({ success: true, message: "Subscription cancelled" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// POST /billing/webhook  (no auth — signature validated by middleware)
export async function handleWebhook(req: Request, res: Response) {
  // Respond immediately to avoid Paystack timeout
  res.sendStatus(200);

  const { event, data } = req.body;

  try {
    if (event === "subscription.create" || event === "charge.success") {
      await billingService.handleSubscriptionCreate(data);
    } else if (event === "subscription.disable") {
      await billingService.handleSubscriptionDisable(data);
    } else if (event === "subscription.not_renew") {
      await billingService.handleSubscriptionNotRenew(data);
    }
    // Other events (charge.success, etc.) can be handled here later
  } catch (err) {
    console.error(`[billing webhook] Error handling ${event}:`, err);
  }
}
