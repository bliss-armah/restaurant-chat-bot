import { Router } from "express";
import { AdminController } from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const controller = new AdminController();

// All admin routes require a valid Supabase JWT.
router.use(authenticate);

// ── User Management ──────────────────────────────────────────────────────────

// POST /admin/users — Create a new platform user (super admin only)
router.post("/users", requireRole("SUPER_ADMIN"), (req, res, next) =>
  controller.createUser(req, res, next),
);

// GET /admin/users — List all users (super admin only)
router.get("/users", requireRole("SUPER_ADMIN"), (req, res, next) =>
  controller.listUsers(req, res, next),
);

// PATCH /admin/users/:id/role — Update a user's role (super admin only)
router.patch("/users/:id/role", requireRole("SUPER_ADMIN"), (req, res, next) =>
  controller.updateUserRole(req, res, next),
);

export default router;
