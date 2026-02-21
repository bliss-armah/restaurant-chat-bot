import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";
import { prisma } from "../config/database.js";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Admin Client (singleton)
// Uses the service_role key — NEVER expose this on the client.
// ─────────────────────────────────────────────────────────────────────────────

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  if (
    !config.supabase.serviceRoleKey ||
    config.supabase.serviceRoleKey === "your-service-role-key-here"
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Get it from Supabase Dashboard → Settings → API → service_role.",
    );
  }

  _supabaseAdmin = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  return _supabaseAdmin;
}
