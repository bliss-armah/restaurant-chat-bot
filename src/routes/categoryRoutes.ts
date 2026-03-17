import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { categoryController } from "../controllers/categoryController.js";

const router = Router();

router.use(authenticate, requireRole("SUPER_ADMIN", "RESTAURANT_ADMIN"));

router.get("/", categoryController.list);
router.post("/", categoryController.create);
router.patch("/:id", categoryController.update);
router.patch("/:id/toggle", categoryController.toggleActive);
router.delete("/:id", categoryController.remove);

export default router;
