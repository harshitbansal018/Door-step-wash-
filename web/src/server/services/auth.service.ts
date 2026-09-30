import "server-only";
import type { AuthError } from "@supabase/supabase-js";
import { HOME_FOR_ROLE } from "@/lib/roles";
import { AppError, forbidden, unauthorized, unprocessable } from "../lib/errors";
import { env } from "../lib/env";
import { createUserClient } from "../lib/supabase";
import { userModel } from "../models/user.model";
import type { ProfileRow } from "../types/db";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: ProfileRow["role"];
}

const toSessionUser = (p: ProfileRow): SessionUser => ({
  id: p.id,
  email: p.email,
  fullName: p.full_name,
  role: p.role,
});

const tooManyRequests = () =>
  new AppError(429, "RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");

function isRateLimited(error: AuthError) {
  return error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit";
}

function invalidCode() {
  return unprocessable("That code is invalid or has expired. Request a new one.", "INVALID_OTP");
}

async function loadActiveProfile(userId: string) {
  const db = await createUserClient();
  const profile = await userModel.findById(db, userId);
  if (!profile) throw unauthorized();
  if (profile.is_blocked) {
    await db.auth.signOut();
    throw forbidden("Your account has been blocked. Please contact support.");
  }
  return profile;
}

export const authService = {
  /**
   * Creates the account and emails a 6-digit verification code.
   * The response is the same whether or not the email is already registered,
   * so the endpoint can't be used to discover who has an account.
   */
  async signup(input: { fullName: string; email: string; password: string }) {
    const db = await createUserClient();
    const { error } = await db.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: `${env().NEXT_PUBLIC_SITE_URL}/login`,
      },
    });
    if (error) {
      if (isRateLimited(error)) throw tooManyRequests();
      if (error.code === "weak_password") throw unprocessable(error.message, "WEAK_PASSWORD");
      if (error.code !== "user_already_exists" && error.code !== "email_exists") {
        console.error("[auth] signup failed", error.code, error.message);
        throw new AppError(502, "AUTH_PROVIDER_ERROR", "Could not create your account. Please try again.");
      }
    }
    return { email: input.email };
  },

  /** Verifies the signup code and signs the user in. */
  async verifyEmail(input: { email: string; token: string }) {
    const db = await createUserClient();
    const { data, error } = await db.auth.verifyOtp({ email: input.email, token: input.token, type: "email" });
    if (error || !data.user) {
      if (error && isRateLimited(error)) throw tooManyRequests();
      throw invalidCode();
    }
    const profile = await loadActiveProfile(data.user.id);
    return { user: toSessionUser(profile), redirectTo: HOME_FOR_ROLE[profile.role] };
  },

  async resendVerification(input: { email: string }) {
    const db = await createUserClient();
    const { error } = await db.auth.resend({ type: "signup", email: input.email });
    if (error && isRateLimited(error)) throw tooManyRequests();
    return { email: input.email };
  },

  async login(input: { email: string; password: string }) {
    const db = await createUserClient();
    const { data, error } = await db.auth.signInWithPassword(input);
    if (error) {
      if (isRateLimited(error)) throw tooManyRequests();
      if (error.code === "email_not_confirmed") {
        await db.auth.resend({ type: "signup", email: input.email });
        throw new AppError(
          403,
          "EMAIL_NOT_VERIFIED",
          "Please verify your email first. We've sent a new code to your inbox.",
        );
      }
      throw unauthorized("Incorrect email or password.");
    }
    const profile = await loadActiveProfile(data.user.id);
    return { user: toSessionUser(profile), redirectTo: HOME_FOR_ROLE[profile.role] };
  },

  async logout() {
    const db = await createUserClient();
    await db.auth.signOut();
  },

  /** Emails a reset code. Always succeeds from the caller's point of view. */
  async forgotPassword(input: { email: string }) {
    const db = await createUserClient();
    const { error } = await db.auth.resetPasswordForEmail(input.email);
    if (error) {
      if (isRateLimited(error)) throw tooManyRequests();
      console.warn("[auth] reset email not sent", error.code);
    }
    return { email: input.email };
  },

  /** Verifies the reset code, sets the new password and signs the user in. */
  async resetPassword(input: { email: string; token: string; password: string }) {
    const db = await createUserClient();
    const { data, error } = await db.auth.verifyOtp({ email: input.email, token: input.token, type: "recovery" });
    if (error || !data.user) {
      if (error && isRateLimited(error)) throw tooManyRequests();
      throw invalidCode();
    }

    const { error: updateError } = await db.auth.updateUser({ password: input.password });
    if (updateError) {
      if (updateError.code === "same_password")
        throw unprocessable("Your new password must be different from the old one.", "SAME_PASSWORD");
      if (updateError.code === "weak_password") throw unprocessable(updateError.message, "WEAK_PASSWORD");
      throw new AppError(502, "AUTH_PROVIDER_ERROR", "Could not update your password. Please try again.");
    }

    // Sign out every other device that was using the old password.
    await db.auth.signOut({ scope: "others" });

    const profile = await loadActiveProfile(data.user.id);
    return { user: toSessionUser(profile), redirectTo: HOME_FOR_ROLE[profile.role] };
  },

  async changePassword(input: { password: string }) {
    const db = await createUserClient();
    const { error } = await db.auth.updateUser({ password: input.password });
    if (error) {
      if (error.code === "same_password")
        throw unprocessable("Your new password must be different from the old one.", "SAME_PASSWORD");
      throw unprocessable(error.message, "PASSWORD_NOT_UPDATED");
    }
    await db.auth.signOut({ scope: "others" });
  },

  toSessionUser,
};
