import { PrismaClient } from "@prisma/client";
import { config } from "../config/env";

const prisma = new PrismaClient();

const PAYSTACK_BASE = "https://api.paystack.co";

function paystackHeaders() {
  return {
    Authorization: `Bearer ${config.paystack.secretKey}`,
    "Content-Type": "application/json",
  };
}

// ─── Plan resolution ───────────────────────────────────────────────────────────

function planCode(interval: "monthly" | "yearly"): string {
  return interval === "monthly"
    ? config.paystack.monthlyPlanCode
    : config.paystack.yearlyPlanCode;
}

// ─── Initialize a subscription payment ────────────────────────────────────────

export async function initializeSubscription(
  userId: string,
  restaurantId: string,
  interval: "monthly" | "yearly",
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) {
    throw new Error("User email is required for billing but was not found");
  }

  const plan = planCode(interval);
  const body = {
    email: user.email,
    amount: interval === "monthly" ? 300000 : 3240000,
    plan,
    callback_url: config.paystack.callbackUrl,
    metadata: { restaurantId },
  };


  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to initialize Paystack transaction");
  }

  const data = await res.json();
  return data.data as { authorization_url: string; reference: string; access_code: string };
}

// ─── Webhook handlers ──────────────────────────────────────────────────────────

export async function handleSubscriptionCreate(payload: any) {
  const customerEmail: string = payload.customer?.email;
  const subscriptionCode: string = payload.subscription_code;
  const emailToken: string = payload.email_token;
  const customerCode: string = payload.customer?.customer_code;
  const amount: number = payload.amount; // in pesewas
  const plan: string = payload.plan?.plan_code;
  const nextPaymentDate: string | null = payload.next_payment_date;

  // Resolve restaurant via the admin user's email
  const user = await prisma.user.findFirst({ where: { email: customerEmail } });
  if (!user?.restaurantId) {
    console.warn(`[billing] No restaurant found for email ${customerEmail}`);
    return;
  }

  const restaurantId = user.restaurantId;

  const interval =
    plan === config.paystack.monthlyPlanCode ? "monthly" : "yearly";

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { restaurantId },
      create: {
        restaurantId,
        paystackSubscriptionCode: subscriptionCode,
        paystackEmailToken: emailToken,
        paystackCustomerCode: customerCode,
        billingInterval: interval,
        amount,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextPaymentDate ? new Date(nextPaymentDate) : null,
      },
      update: {
        paystackSubscriptionCode: subscriptionCode,
        paystackEmailToken: emailToken,
        paystackCustomerCode: customerCode,
        billingInterval: interval,
        amount,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextPaymentDate ? new Date(nextPaymentDate) : null,
        cancelledAt: null,
      },
    }),
    prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        subscriptionStatus: "ACTIVE",
        paystackCustomerCode: customerCode,
      },
    }),
  ]);
}

export async function handleSubscriptionDisable(payload: any) {
  const subscriptionCode: string = payload.subscription_code;

  const subscription = await prisma.subscription.findFirst({
    where: { paystackSubscriptionCode: subscriptionCode },
  });
  if (!subscription) return;

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    }),
    prisma.restaurant.update({
      where: { id: subscription.restaurantId },
      data: { subscriptionStatus: "CANCELLED" },
    }),
  ]);

}

export async function handleSubscriptionNotRenew(payload: any) {
  const subscriptionCode: string = payload.subscription_code;

  const subscription = await prisma.subscription.findFirst({
    where: { paystackSubscriptionCode: subscriptionCode },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "non-renewing" },
  });

}

// ─── Cancel a subscription ─────────────────────────────────────────────────────

export async function cancelSubscription(restaurantId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId },
  });

  if (!subscription?.paystackSubscriptionCode || !subscription?.paystackEmailToken) {
    throw new Error("No active subscription found to cancel");
  }

  const res = await fetch(`${PAYSTACK_BASE}/subscription/disable`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      code: subscription.paystackSubscriptionCode,
      token: subscription.paystackEmailToken,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to cancel subscription");
  }

  // DB update will happen via the webhook; optimistically update here too
  await prisma.$transaction([
    prisma.subscription.update({
      where: { restaurantId },
      data: { status: "cancelled", cancelledAt: new Date() },
    }),
    prisma.restaurant.update({
      where: { id: restaurantId },
      data: { subscriptionStatus: "CANCELLED" },
    }),
  ]);
}

// ─── Fetch subscription ────────────────────────────────────────────────────────

export async function getSubscription(restaurantId: string) {
  const [subscription, restaurant] = await Promise.all([
    prisma.subscription.findUnique({ where: { restaurantId } }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    }),
  ]);
  return { subscription: subscription ?? null, restaurant };
}
