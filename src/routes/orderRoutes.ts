import { Router } from "express";
import { OrderController } from "../controllers/orderController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const controller = new OrderController();

// All order routes require a valid Supabase JWT + a recognised role.
router.use(authenticate);
router.use(requireRole("RESTAURANT_ADMIN", "SUPER_ADMIN"));

// GET /orders — List orders for the authed admin's restaurant
router.get("/", (req, res, next) => controller.listOrders(req, res, next));

// PATCH /orders/:id/status — Approve / reject / advance an order
router.patch("/:id/status", (req, res, next) =>
  controller.updateOrderStatus(req, res, next),
);

export default router;
