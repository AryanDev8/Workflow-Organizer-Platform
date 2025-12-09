// backend/routes/auth.js
import express from "express";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  emailSchema,
} from "../libs/validate-schema.js";

import {
  loginUser,
  registerUser,
  verifyEmail,
  resetPasswordRequest,
  verifyResetPasswordTokenAndResetPassword,
} from "../controllers/auth-controller.js";

const router = express.Router();

router.post(
  "/register",
  validateRequest({
    body: registerSchema,
  }),
  registerUser
);

router.post(
  "/login",
  validateRequest({
    body: loginSchema,
  }),
  loginUser
);

router.post(
  "/verify-email",
  validateRequest({
    body: verifyEmailSchema,
  }),
  verifyEmail
);

// <-- FIX: pass the Zod schema directly (emailSchema), not an object wrapper
router.post(
  "/reset-password-request",
  validateRequest({
    body: emailSchema,
  }),
  resetPasswordRequest
);

router.post(
  "/reset-password",
  validateRequest({
    body: resetPasswordSchema,
  }),
  verifyResetPasswordTokenAndResetPassword
);

export default router;
