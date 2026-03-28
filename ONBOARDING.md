# Restaurant Onboarding Guide

This guide covers how to onboard a new restaurant onto the platform, from registering
their WhatsApp number in Meta through to having a working bot and admin dashboard login.

---

## Prerequisites

You must be logged in as a **SUPER_ADMIN** to perform all steps below. All API calls
require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

---

## Step 1 — Get a dedicated SIM for the bot

Before touching Meta's dashboard, the restaurant needs the right type of phone number.

**The number used for the bot must:**
- Be a real SIM the restaurant owns (prepaid is fine)
- Have **never had WhatsApp installed** — it cannot be a number currently used with the WhatsApp app (personal or WhatsApp Business App)
- Not be the restaurant owner's personal number — they need that for their own WhatsApp

**Why it can't be a WhatsApp number:**
A phone number can only live in one place at a time — either on the WhatsApp app on a device, or on the WhatsApp Cloud API (Meta's platform). Once registered in Meta, the number no longer works with any WhatsApp app. The owner will not be able to use that number with WhatsApp on their phone.

**Practical advice:**
Tell the restaurant to buy a cheap dedicated prepaid SIM specifically for the bot. They only need it to receive one SMS or call for Meta's verification step — after that the SIM can sit in a drawer. It does not need mobile data or airtime.

If the restaurant only has a number that already has WhatsApp on it:
1. They must back up their WhatsApp chats if needed
2. Delete WhatsApp from the device
3. Wait **72 hours** for Meta to release the number
4. Then proceed with registration below

---

## Step 2 — Register the phone number in Meta

Each restaurant needs its own WhatsApp number registered under your Meta App. One Meta
App supports multiple phone numbers under the same WhatsApp Business Account (WABA),
all sharing the same `WHATSAPP_TOKEN` — no `.env` changes are needed per restaurant.

In **development/sandbox mode** only 5 test recipient numbers can receive messages from
your bot. In **Live mode** (production), any WhatsApp user in the world can message the
bot freely — no pre-registration of customer numbers is required.

To switch your app to Live mode: Meta for Developers → App Settings → Basic → **App Mode → Live**.

### Registering the number

1. Go to [Meta for Developers](https://developers.facebook.com) → Your App → **WhatsApp → Manage phone numbers**
2. Click **Add phone number**
3. Enter the dedicated SIM number from Step 1
4. Verify via SMS or voice call to that SIM
5. Once verified, Meta shows two values — **save both**:

   | Value | Where to find it | Example |
   |---|---|---|
   | **Phone Number ID** | Listed next to the number in the dashboard | `109876543210123` |
   | **Phone number** | The actual number you registered | `+233248888888` |

> **Note:** Your existing `WHATSAPP_TOKEN` in `.env` covers all numbers under the same app.
> No `.env` changes are needed when adding a new restaurant.

---

## Step 3 — Create the restaurant record

Call the API as SUPER_ADMIN:

```http
POST /restaurants
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Kofi's Kitchen",
  "phone": "+233201234567",
  "momoNumber": "+233201234567",
  "momoName": "Kofi Mensah",
  "description": "Local Ghanaian cuisine",
  "email": "kofi@example.com",
  "whatsappNumber": "+233248888888",
  "whatsappPhoneNumberId": "109876543210123"
}
```

### Field reference

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Restaurant display name shown to customers in the bot |
| `phone` | Yes | Restaurant owner's contact number — **order payment notifications are sent here** |
| `momoNumber` | Yes | MTN MoMo number customers send payment to |
| `momoName` | Yes | Account name displayed in payment instructions |
| `description` | No | Short description (for future use) |
| `email` | No | Owner email (for future use) |
| `whatsappNumber` | Yes | The Meta-registered bot number — **must match exactly** what Meta sends as `display_phone_number` in webhooks (include `+` prefix) |
| `whatsappPhoneNumberId` | Yes | The Phone Number ID from Meta's dashboard — used to send outbound messages from the correct number |

> `phone` and `whatsappNumber` are **different fields**:
> - `phone` = the restaurant owner's personal/business number where they receive order alerts
> - `whatsappNumber` = the bot number customers text to place orders

Save the `id` from the response — you need it in Step 4.

---

## Step 4 — Create the restaurant admin user

```http
POST /admin/users
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Kofi Mensah",
  "email": "kofi@example.com",
  "password": "SecurePassword123!",
  "role": "RESTAURANT_ADMIN",
  "restaurantId": "<id from step 2>"
}
```

This creates the user in both the `users` table and the `user_roles` table (the canonical
role store). The user can now log into the dashboard at `/login`.

> Either `email` or `phone` is required — both can be provided.

---

## Step 5 — Verify the setup

### Check webhook routing

Send a WhatsApp message to the bot number registered in Step 1. The server logs should show:

```
✅ Webhook verified
```

If there is no response and no log entry, the restaurant's `whatsappNumber` does not
match what Meta is sending. Check the exact value Meta sends by temporarily logging
`value.metadata.display_phone_number` in `webhookController.ts`.

### Check outbound messages

The customer should receive a welcome message listing the restaurant's menu categories.
If the bot responds but from the wrong number, check that `whatsappPhoneNumberId` in the
DB matches the Phone Number ID in Meta's dashboard for that number.

### Check admin dashboard

The restaurant admin logs in at `/login` with the credentials from Step 3. They should see:
- Their own restaurant's orders only
- Settings page showing their restaurant name
- No access to `/dashboard/admin/*` (SUPER_ADMIN only)

---

## Step 6 — Configure business hours (optional)

The restaurant admin can set opening and closing times from the Settings page in the
dashboard. Until set, the bot is available whenever `isOpen = true`.

If the restaurant has specific hours:
1. Log in as the restaurant admin
2. Go to **Settings → Business Hours**
3. Set Opening Time and Closing Time (24h format)
4. Click **Save Hours**

Customers who message outside these hours receive a closed message with the opening time.

---

## Onboarding checklist

```
[ ] Restaurant has a dedicated SIM that has never had WhatsApp installed
[ ] If the SIM previously had WhatsApp: uninstalled and 72 hours have passed
[ ] Phone number registered and verified in Meta dashboard
[ ] App is in Live mode (production) — not sandbox
[ ] whatsappNumber and whatsappPhoneNumberId noted from Meta dashboard
[ ] Restaurant record created via POST /restaurants
[ ] Restaurant admin user created via POST /admin/users
[ ] Admin can log in to dashboard
[ ] Customer can text the bot number and receive a welcome message
[ ] Payment notification reaches restaurant.phone when customer sends PAID
[ ] Business hours configured (if applicable)
```

---

## Adding subscriptions — recommended approach

The `restaurants` table already has `subscriptionStatus` (default `"TRIAL"`) and
`trialEndsAt` fields. The recommended way to extend this into a full subscription system:

### Option A — Use a payment gateway directly (simpler, Ghana-appropriate)

Since the platform already uses **MTN MoMo**, the most practical approach for a Ghanaian
SaaS is to handle subscription payments the same way customer orders are handled:

1. Add a `subscriptionPlan` field (`TRIAL | STARTER | GROWTH | ENTERPRISE`) and
   `subscriptionExpiresAt` to the `Restaurant` model
2. When a restaurant's `trialEndsAt` passes, set `subscriptionStatus = "EXPIRED"` via a
   daily cron job
3. Expired restaurants have their `isActive` set to `false` — the webhook ignores inactive
   restaurants and the dashboard blocks login
4. SUPER_ADMIN manually verifies MoMo payment and calls `PATCH /restaurants/:id` to
   extend `subscriptionExpiresAt` and set `subscriptionStatus = "ACTIVE"`

**Pros:** No third-party dependency, works with MoMo, simple to reason about
**Cons:** Manual payment verification step

### Option B — Integrate Paystack (automated, recommended long-term)

[Paystack](https://paystack.com) supports Ghana (GHS), Nigeria (NGN), and cards. It has
a straightforward REST API and handles recurring billing natively.

**Schema additions needed:**

```prisma
model Restaurant {
  // existing fields ...
  subscriptionStatus     String    @default("TRIAL") @map("subscription_status")
  subscriptionPlan       String?   @map("subscription_plan")   // STARTER | GROWTH | ENTERPRISE
  subscriptionExpiresAt  DateTime? @map("subscription_expires_at")
  paystackCustomerId     String?   @map("paystack_customer_id")
  paystackSubscriptionId String?   @map("paystack_subscription_id")
}
```

**Flow:**
1. SUPER_ADMIN creates restaurant (trial starts automatically — already implemented)
2. Before `trialEndsAt`, restaurant admin clicks **Upgrade** in the dashboard
3. Dashboard calls backend → backend calls Paystack to create a subscription link
4. Restaurant admin pays → Paystack sends a webhook to `POST /webhooks/paystack`
5. Backend verifies the Paystack webhook signature, updates `subscriptionStatus`,
   `subscriptionExpiresAt`, and stores `paystackSubscriptionId`
6. Paystack handles recurring billing automatically; sends webhook on each renewal or failure

**Enforcement:**
Add a check in `authenticate` middleware or a dedicated `requireActiveSubscription`
middleware that rejects API calls when `subscriptionStatus = "EXPIRED"` (except for
SUPER_ADMIN and the Paystack webhook route).

**Pros:** Automated recurring billing, no manual verification
**Cons:** Requires Paystack account and webhook endpoint, slightly more complex setup

### Subscription status values

| Status | Meaning |
|---|---|
| `TRIAL` | Within free trial period (`trialEndsAt` not yet passed) |
| `ACTIVE` | Paid and current |
| `EXPIRED` | Trial ended or payment failed — bot and dashboard disabled |
| `CANCELLED` | Manually cancelled by SUPER_ADMIN |

The `isActive` flag on the restaurant is a hard disable (SUPER_ADMIN action).
`subscriptionStatus` is the automated billing state. Keep them separate.
