import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { menuItemController } from "../controllers/menuItemController.js";

const router = Router();

router.use(authenticate, requireRole("SUPER_ADMIN", "RESTAURANT_ADMIN"));

router.get("/", menuItemController.list);
router.post("/", menuItemController.create);
router.patch("/:id", menuItemController.update);
router.patch("/:id/toggle", menuItemController.toggleAvailable);
router.delete("/:id", menuItemController.remove);

export default router;
