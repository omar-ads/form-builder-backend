import { Router } from "express";

import { authenticateToken } from "@middleware/auth";
import { signup, login, getUser } from "@controllers/auth.ts";
const router = Router();

// Sign up
router.post("/signup", signup);

// Login
router.post("/login", login);

// Get current user
router.get("/me", authenticateToken, getUser);

export default router;
