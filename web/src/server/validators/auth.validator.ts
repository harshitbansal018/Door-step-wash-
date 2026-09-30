import "server-only";
import { z } from "zod";

const email = z.email("Enter a valid email address.").trim().toLowerCase().max(254);

export const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[a-z]/i, "Password must contain a letter.")
  .regex(/\d/, "Password must contain a number.");

const otp = z.string().trim().regex(/^\d{6,8}$/, "Enter the code from your email.");

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const verifyEmailSchema = z.object({ email, token: otp });

export const resendSchema = z.object({ email });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ email, token: otp, password });

export const changePasswordSchema = z.object({ password });
