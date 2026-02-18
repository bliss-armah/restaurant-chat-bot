import { Router } from "express";
import { AdminController } from "../controllers/adminController.js";

const router = Router();
const controller = new AdminController();

// POST /admin/users - Create a new user
router.post("/users", (req, res, next) =>
  controller.createUser(req, res, next),
);

export default router;
