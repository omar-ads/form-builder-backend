import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth";
import {
  getForms,
  createForm,
  getForm,
  updateForm,
  deleteForm,
  submitForm,
  getFormSubmissions,
} from "../controllers/forms";

const router = Router();

// Get all forms (filtered by role)
router.get("/", authenticateToken, getForms);

// Create form (admin only)
router.post("/", authenticateToken, authorizeRoles(["ADMIN"]), createForm);

// Get form by ID
router.get("/:id", authenticateToken, getForm);

// Update form (admin only)
router.put("/:id", authenticateToken, authorizeRoles(["ADMIN"]), updateForm);

// Delete form (admin only)
router.delete("/:id", authenticateToken, authorizeRoles(["ADMIN"]), deleteForm);

// Submit form response
router.post("/:id/submit", authenticateToken, submitForm);

// Get form submissions (admin only)
router.get(
  "/:id/submissions",
  authenticateToken,
  authorizeRoles(["ADMIN"]),
  getFormSubmissions
);

export default router;
