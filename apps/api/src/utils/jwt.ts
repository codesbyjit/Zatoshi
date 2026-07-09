import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  role: 'customer' | 'admin';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Sign an access token with short expiry (15 min).
 */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiresIn,
  });
}

/**
 * Sign a refresh token with long expiry (7 days).
 */
export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });
}

/**
 * Verify an access token and return the decoded payload.
 * Throws if invalid or expired.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

/**
 * Verify a refresh token and return the decoded payload.
 * Throws if invalid or expired.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload;
}

/**
 * Generate a full token pair (access + refresh).
 */
export function generateTokenPair(payload: JwtPayload): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
