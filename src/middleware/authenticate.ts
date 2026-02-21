import { Request, Response, NextFunction } from "express";
import { getSupabaseAdmin } from "../services/supabaseAdmin.js";

/**
 * Validates the Supabase JWT from the Authorization header.
 * Attaches the decoded user to req.user.
 *
 * All admin routes must use this middleware — the WhatsApp webhook
 * routes are NOT gated here (they use WhatsApp's own verification).
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: missing token" });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const supabase = getSupabaseAdmin();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Unauthorized: invalid or expired token" });
      return;
    }

    // Attach the verified Supabase user to the request
    (req as any).user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal auth error" });
  }
}
