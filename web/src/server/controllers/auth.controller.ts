import "server-only";
import { withAuth, withPublic } from "../middlewares/auth.middleware";
import { noContent, ok } from "../lib/response";
import { authService } from "../services/auth.service";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resendSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "../validators/auth.validator";
import { readJson } from "../validators/common";

export const authController = {
  signup: withPublic(async (req) => ok(await authService.signup(await readJson(req, signupSchema)), 201)),

  verifyEmail: withPublic(async (req) => ok(await authService.verifyEmail(await readJson(req, verifyEmailSchema)))),

  resend: withPublic(async (req) => ok(await authService.resendVerification(await readJson(req, resendSchema)))),

  login: withPublic(async (req) => ok(await authService.login(await readJson(req, loginSchema)))),

  logout: withPublic(async () => {
    await authService.logout();
    return noContent();
  }),

  forgotPassword: withPublic(async (req) =>
    ok(await authService.forgotPassword(await readJson(req, forgotPasswordSchema))),
  ),

  resetPassword: withPublic(async (req) =>
    ok(await authService.resetPassword(await readJson(req, resetPasswordSchema))),
  ),

  changePassword: withAuth("any", async (req) => {
    await authService.changePassword(await readJson(req, changePasswordSchema));
    return noContent();
  }),

  me: withAuth("any", async (_req, auth) => ok({ user: authService.toSessionUser(auth.profile) })),
};
