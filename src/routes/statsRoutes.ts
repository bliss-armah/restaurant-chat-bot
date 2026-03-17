import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { statsController } from "../controllers/statsController.js";

const router = Router();

router.get("/", authenticate, requireRole("SUPER_ADMIN", "RESTAURANT_ADMIN"), statsController.get);

export default router;
