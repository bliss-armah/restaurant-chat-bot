import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { restaurantController } from "../controllers/restaurantController.js";

const router = Router();

router.use(authenticate, requireRole("SUPER_ADMIN", "RESTAURANT_ADMIN"));

// GET  /restaurants        — list (all for SUPER_ADMIN, own for RESTAURANT_ADMIN)
router.get("/", restaurantController.list);

// GET  /restaurants/me     — get own restaurant (RESTAURANT_ADMIN)
router.get("/me", restaurantController.getOwn);

// POST /restaurants        — create (SUPER_ADMIN only, enforced in controller)
router.post("/", restaurantController.create);

// PATCH /restaurants/:id   — update (SUPER_ADMIN any, RESTAURANT_ADMIN own)
router.patch("/:id", restaurantController.update);

// PATCH /restaurants/:id/open-status
router.patch("/:id/open-status", restaurantController.setOpenStatus);

export default router;
