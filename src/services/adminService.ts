import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { prisma } from "../config/database.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateUserPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: "SUPER_ADMIN" | "RESTAURANT_ADMIN";
  restaurantId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Service
// All operations here use the service_role key, which bypasses RLS.
// This is correct — role assignment must never be done by the client.
// ─────────────────────────────────────────────────────────────────────────────

export const adminService = {
  /**
   * Creates a new platform user.
   *
   * SECURITY DESIGN:
   * - Supabase Auth user_metadata ONLY stores display name (non-sensitive).
   * - Role + restaurantId are stored in the user_roles table via Prisma.
   * - RLS policies read from user_roles, never from user_metadata.
   * - Rollback: if the DB insert fails, the Auth user is deleted to avoid orphans.
   */
  async createUser(payload: CreateUserPayload) {
    const { name, email, phone, password, role, restaurantId } = payload;

    if (!email && !phone) {
      throw new Error("Either email or phone is required");
    }
    if (role === "RESTAURANT_ADMIN" && !restaurantId) {
      throw new Error("restaurantId is required for RESTAURANT_ADMIN role");
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ── Step 1: Create Supabase Auth user ──────────────────────────────────
    // user_metadata only gets the display name.
    // Role is NOT stored here — it lives in user_roles (the secure source).
    const authPayload: Parameters<
      typeof supabaseAdmin.auth.admin.createUser
    >[0] = {
      password,
      email_confirm: true,
      user_metadata: { name }, // ← ONLY name; never role or restaurantId here
    };

    if (email) {
      authPayload.email = email;
    } else {
      authPayload.phone = phone;
      authPayload.phone_confirm = true;
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser(authPayload);

    if (authError) throw new Error(`Auth error: ${authError.message}`);

    const authUserId = authData.user.id;

    // ── Step 2: Write role to user_roles + user profile — as a transaction ─
    try {
      const [userRecord] = await prisma.$transaction([
        // User profile row (mirrors Auth user)
        prisma.user.create({
          data: {
            id: authUserId,
            name,
            email: email ?? null,
            phone: phone ?? null,
            password: "managed-by-supabase-auth", // Auth manages the real password
            role,
            restaurantId: restaurantId ?? null,
            isActive: true,
          },
        }),
        // Canonical role record — this is what RLS policies read
        prisma.userRoleRecord.create({
          data: {
            userId: authUserId,
            role,
            restaurantId: restaurantId ?? null,
          },
        }),
      ]);

      return userRecord;
    } catch (dbError: any) {
      // Rollback: delete the Auth user so we don't leave an orphan
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw new Error(
        `Database error (auth user rolled back): ${dbError.message}`,
      );
    }
  },

  /**
   * Updates a user's role assignment.
   * Only callable from the backend with service_role — never from the client.
   */
  async updateUserRole(
    userId: string,
    role: "SUPER_ADMIN" | "RESTAURANT_ADMIN",
    restaurantId?: string,
  ) {
    if (role === "RESTAURANT_ADMIN" && !restaurantId) {
      throw new Error("restaurantId is required for RESTAURANT_ADMIN role");
    }

    return prisma.$transaction([
      prisma.userRoleRecord.upsert({
        where: { userId },
        create: { userId, role, restaurantId: restaurantId ?? null },
        update: { role, restaurantId: restaurantId ?? null },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { role, restaurantId: restaurantId ?? null },
      }),
    ]);
  },

  /**
   * Lists all users (super admin only).
   */
  async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        restaurantId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
