import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { t, publicProcedure, protectedProcedure } from '../trpc/trpc';
import * as authService from '../services/auth.service';

// ── Cookie helpers ───────────────────────────────────────────

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;        // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,            // Allow HTTP in dev; set to true in production
  sameSite: 'lax' as const,
  path: '/',
};

function setAuthCookies(res: any, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

function clearAuthCookies(res: any) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
}

function getRefreshTokenFromCookies(req: any): string | null {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
}

/**
 * Auth router — handles register, login, refresh, logout, and me.
 */
export const authRouter = t.router({
  /**
   * Register a new user account.
   * Sets httpOnly JWT cookies on success.
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8).max(128),
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await authService.register(input);
      setAuthCookies(ctx.res, result.tokens.accessToken, result.tokens.refreshToken);
      return result;
    }),

  /**
   * Login with email and password.
   * Sets httpOnly JWT cookies on success.
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await authService.login(input);
      setAuthCookies(ctx.res, result.tokens.accessToken, result.tokens.refreshToken);
      return result;
    }),

  /**
   * Refresh access token using refresh token.
   * Reads refreshToken from cookie or request body.
   * Sets new httpOnly cookies on success.
   */
  refresh: publicProcedure
    .input(
      z.object({
        refreshToken: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Read from cookie if not provided in body
      const token = input.refreshToken || getRefreshTokenFromCookies(ctx.req);
      if (!token) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Refresh token is required',
        });
      }
      const result = await authService.refreshToken(token);
      setAuthCookies(ctx.res, result.accessToken, result.refreshToken);
      return result;
    }),

  /**
   * Logout — blacklist the refresh token, clear cookies.
   * Reads refreshToken from cookie or request body.
   */
  logout: protectedProcedure
    .input(
      z.object({
        refreshToken: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const token = input.refreshToken || getRefreshTokenFromCookies(ctx.req);
      if (token) {
        await authService.logout(token);
      }
      clearAuthCookies(ctx.res);
      return { success: true };
    }),

  /**
   * Get the currently authenticated user.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await authService.getUser(ctx.user!.userId);
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return user;
  }),
});
