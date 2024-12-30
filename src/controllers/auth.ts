import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { AuthenticatedRequest } from "src/types/requests";
import logger from "../logger"; // Import logger

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    logger.info("Signup request received", { email, role });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn("Signup failed: Email already registered", { email });
      res.status(400).json({ message: "Email already registered" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    logger.info("Password hashed successfully", { email });

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || "USER",
      },
    });

    logger.info("User created successfully", {
      userId: user.id,
      email: user.email,
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env["JWT_SECRET"]!,
      { expiresIn: "24h" }
    );

    logger.info("Token generated successfully", { userId: user.id });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error: any) {
    logger.error("Signup error", { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Failed to create account" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    logger.info("Login request received", { email });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn("Login failed: User not found", { email });
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn("Login failed: Invalid password", { email });
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env["JWT_SECRET"]!,
      { expiresIn: "24h" }
    );

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error: any) {
    logger.error("Login error", { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Failed to log in" });
  }
};

export const getUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    logger.info("Get user request received", { userId: req.user?.id });

    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      logger.warn("Get user failed: User not found", { userId: req.user?.id });
      res.status(404).json({ message: "User not found" });
      return;
    }

    logger.info("User data retrieved successfully", { userId: user.id });
    res.json(user);
  } catch (error: any) {
    logger.error("Get user error", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Failed to get user information" });
  }
};
