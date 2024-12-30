import { type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
// @ts-ignore
import { type AuthenticatedRequest } from "@types/requests";
import logger from "../logger"; // Import the logger

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    logger.warn("Authentication failed: No token provided", { ip: req.ip });
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env["JWT_SECRET"]!
    ) as jwt.JwtPayload;

    req.user = {
      id: decoded["id"],
      email: decoded["email"],
      role: decoded["role"],
    };

    logger.info("Token authenticated successfully", {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      ip: req.ip,
    });

    next();
  } catch (error: any) {
    logger.error("Token authentication failed", {
      error: error.message,
      ip: req.ip,
    });
    res.status(403).json({ message: "Invalid or expired token" });
    return;
  }
};

export const authorizeRoles = (
  roles: ("ADMIN" | "USER")[]
): ((req: AuthenticatedRequest, res: Response, next: NextFunction) => void) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      logger.warn("Authorization failed: No user information in request", {
        ip: req.ip,
      });
      res.status(401).json({ message: "Authentication required" });
      return; // Explicitly return to terminate execution
    }

    if (!roles.includes(req.user.role)) {
      logger.warn("Authorization failed: Unauthorized role", {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
      });
      res.status(403).json({ message: "Unauthorized access" });
      return; // Explicitly return to terminate execution
    }

    logger.info("Authorization successful", {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      ip: req.ip,
    });

    next(); // Pass control to the next middleware
  };
};
