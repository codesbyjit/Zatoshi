import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/client';
import { getRedis, blacklistRefreshToken, isRefreshTokenBlacklisted, storeRefreshToken, getStoredRefreshToken, deleteRefreshToken } from '../db/redis';
import {
  generateTokenPair,
  verifyRefreshToken,
  type JwtPayload,
  type TokenPair,
} from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { getLogger } from '@repo/utils';
import {
  USER_COLLECTION,
  type User,
} from '@repo/types';

const logger = getLogger('api:auth-service');

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  tokens: TokenPair;
}

/**
 * Register a new user account.
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const db = getDb();
  const users = db.collection<User>(USER_COLLECTION);

  // Check if email already exists
  const existing = await users.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'An account with this email already exists',
    });
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  const now = new Date();
  const user: User = {
    _id: randomUUID(),
    email: input.email.toLowerCase(),
    passwordHash,
    name: input.name,
    role: 'customer',
    createdAt: now,
    updatedAt: now,
  };

  await users.insertOne(user);

  const tokens = generateTokenPair({ userId: user._id, role: user.role });

  // Store refresh token in Redis for rotation/enforcement
  await storeRefreshToken(user._id, tokens.refreshToken);

  logger.info({ userId: user._id }, 'User registered');

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}

/**
 * Login with email and password.
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const db = getDb();
  const users = db.collection<User>(USER_COLLECTION);

  const user = await users.findOne({ email: input.email.toLowerCase() });
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    });
  }

  const tokens = generateTokenPair({ userId: user._id, role: user.role });

  // Store refresh token in Redis for rotation/enforcement
  await storeRefreshToken(user._id, tokens.refreshToken);

  logger.info({ userId: user._id }, 'User logged in');

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}

/**
 * Refresh an expired access token using a valid refresh token.
 */
export async function refreshToken(
  refreshToken: string,
): Promise<TokenPair> {
  // Check blacklist first
  const blacklisted = await isRefreshTokenBlacklisted(refreshToken);
  if (blacklisted) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Refresh token has been revoked',
    });
  }

  // Verify the refresh token
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired refresh token',
    });
  }

  // Verify the refresh token matches what we have stored in Redis
  const storedToken = await getStoredRefreshToken(payload.userId);
  if (storedToken && storedToken !== refreshToken) {
    // Token mismatch — possible token reuse attack, revoke all tokens for this user
    await blacklistRefreshToken(refreshToken);
    await deleteRefreshToken(payload.userId);
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Refresh token has been revoked (token reuse detected)',
    });
  }

  // Blacklist the old refresh token (rotation)
  await blacklistRefreshToken(refreshToken);

  // Generate new token pair
  const tokens = generateTokenPair({
    userId: payload.userId,
    role: payload.role,
  });

  // Store the new refresh token in Redis
  await storeRefreshToken(payload.userId, tokens.refreshToken);

  logger.info({ userId: payload.userId }, 'Tokens refreshed');

  return tokens;
}

/**
 * Logout by blacklisting the refresh token and removing from Redis.
 */
export async function logout(refreshToken: string): Promise<void> {
  // Even if the token is invalid, blacklist it to be safe
  try {
    const payload = verifyRefreshToken(refreshToken);
    await blacklistRefreshToken(refreshToken);
    await deleteRefreshToken(payload.userId);
    logger.info({ userId: payload.userId }, 'User logged out');
  } catch {
    // Token was already invalid — just ensure it's blacklisted
    await blacklistRefreshToken(refreshToken);
  }
}

/**
 * Convert a string ID to ObjectId if it matches MongoDB's 24-hex-char format.
 * This allows querying users seeded with ObjectIds as well as those created
 * as string UUIDs via `randomUUID()`.
 */
function toObjectId(id: string): ObjectId | string {
  if (/^[a-f0-9]{24}$/i.test(id)) {
    return new ObjectId(id);
  }
  return id;
}

/** Helper to build a filter match for `_id` that accepts both string and ObjectId. */
function idFilter(id: string): Record<string, unknown> {
  return { _id: toObjectId(id) };
}

/**
 * Get a user by ID (without password hash).
 */
export async function getUser(
  userId: string,
): Promise<Omit<User, 'passwordHash'> | null> {
  const db = getDb();
  const users = db.collection<User>(USER_COLLECTION);

  const user = await users.findOne(idFilter(userId));
  if (!user) return null;

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}
