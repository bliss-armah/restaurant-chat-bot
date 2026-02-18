import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getSupabaseAdmin() {
  if (
    !config.supabase.serviceRoleKey ||
    config.supabase.serviceRoleKey === "your-service-role-key-here"
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Get it from Supabase Dashboard > Settings > API > service_role key.",
    );
  }
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface CreateUserPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: "SUPER_ADMIN" | "RESTAURANT_ADMIN";
  restaurantId?: string;
}

export const adminService = {
  async createUser(payload: CreateUserPayload) {
    const { name, email, phone, password, role, restaurantId } = payload;

    if (!email && !phone) {
      throw new Error("Either email or phone is required");
    }
    if (role === "RESTAURANT_ADMIN" && !restaurantId) {
      throw new Error("Restaurant is required for Restaurant Admin role");
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Create user in Supabase Auth
    const authPayload: any = {
      password,
      email_confirm: true,
      user_metadata: { name, role, restaurantId: restaurantId || null },
    };

    if (email) {
      authPayload.email = email;
    } else {
      authPayload.phone = phone;
      authPayload.phone_confirm = true;
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser(authPayload);

    if (authError) throw new Error(authError.message);

    // Step 2: Insert user profile into users table via Prisma
    try {
      const user = await prisma.user.create({
        data: {
          id: authData.user.id,
          name,
          email: email || null,
          phone: phone || null,
          password: "managed-by-supabase-auth",
          role,
          restaurantId: restaurantId || null,
          isActive: true,
        },
      });
      return user;
    } catch (dbError: any) {
      // Rollback: delete auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Database error: ${dbError.message}`);
    }
  },
};
