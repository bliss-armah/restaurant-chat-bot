import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /auth/login
router.post("/login", authController.login);

// GET /auth/me  (requires valid token)
router.get("/me", authenticate, authController.me);

export default router;
