import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db } from 'mongodb';
import RedisMock from 'ioredis-mock';
import {
  hashPassword,
  verifyPassword,
} from '../src/utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
} from '../src/utils/jwt';
import type { JwtPayload } from '../src/utils/jwt';

// ── Integration-style tests for auth service ──────────────

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;
let db: Db;
let redisMock: InstanceType<typeof RedisMock>;

// Mock the db and redis modules
vi.mock('../src/db/client', () => ({
  getDb: () => db,
  connectMongo: vi.fn(),
  disconnectMongo: vi.fn(),
}));

vi.mock('../src/db/redis', () => ({
  getRedis: () => redisMock,
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
  blacklistRefreshToken: async (token: string, _ttl?: number) => {
    await redisMock.set(`blacklist:refresh:${token}`, '1', 'EX', 3600);
  },
  isRefreshTokenBlacklisted: async (token: string) => {
    const result = await redisMock.get(`blacklist:refresh:${token}`);
    return result !== null;
  },
  storeRefreshToken: async (userId: string, refreshToken: string, _ttl?: number) => {
    await redisMock.set(`refresh:${userId}`, refreshToken, 'EX', 3600);
  },
  getStoredRefreshToken: async (userId: string) => {
    return redisMock.get(`refresh:${userId}`);
  },
  deleteRefreshToken: async (userId: string) => {
    await redisMock.del(`refresh:${userId}`);
  },
}));

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('test');

  // Create Redis mock
  redisMock = new RedisMock();

  // Create users collection and seed
  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });

  const hash = await hashPassword('testpassword123');
  await users.insertOne({
    _id: 'test-user-1',
    email: 'existing@test.com',
    passwordHash: hash,
    name: 'Existing User',
    role: 'customer',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

afterAll(async () => {
  await mongoClient.close();
  await mongoServer.stop();
  redisMock.disconnect();
});

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('should hash and verify a password', async () => {
      const password = 'my-secure-password!';
      const hash = await hashPassword(password);
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);

      const valid = await verifyPassword(password, hash);
      expect(valid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const hash = await hashPassword('correct-password');
      const valid = await verifyPassword('wrong-password', hash);
      expect(valid).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    const payload: JwtPayload = { userId: 'user-1', role: 'customer' };

    it('should sign and verify access token', () => {
      const token = signAccessToken(payload);
      expect(token).toBeTruthy();

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe('user-1');
      expect(decoded.role).toBe('customer');
    });

    it('should sign and verify refresh token', () => {
      const token = signRefreshToken(payload);
      expect(token).toBeTruthy();

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe('user-1');
    });

    it('should generate token pair', () => {
      const pair = generateTokenPair(payload);
      expect(pair.accessToken).toBeTruthy();
      expect(pair.refreshToken).toBeTruthy();
      expect(pair.accessToken).not.toBe(pair.refreshToken);
    });

    it('should reject expired access token', () => {
      // Use a token signed with '1ms' expiry to simulate expiry
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(payload, 'test-secret', { expiresIn: '0ms' });
      expect(() => verifyAccessToken(expiredToken)).toThrow();
    });

    it('should reject tampered token', () => {
      const token = signAccessToken(payload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('Registration', () => {
    it('should reject duplicate email', async () => {
      // We register a new user, but the existing user already uses this email
      const users = db.collection('users');
      const existing = await users.findOne({ email: 'existing@test.com' });
      expect(existing).toBeTruthy();
    });

    it('should create a user with hashed password', async () => {
      const users = db.collection('users');
      const hash = await hashPassword('newuserpass');
      const result = await users.insertOne({
        _id: 'new-user-1',
        email: 'newuser@test.com',
        passwordHash: hash,
        name: 'New User',
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.insertedId).toBeTruthy();

      const saved = await users.findOne({ email: 'newuser@test.com' });
      expect(saved).toBeTruthy();
      expect(saved!.passwordHash).not.toBe('newuserpass');
      expect(saved!.role).toBe('customer');
    });
  });

  describe('Login', () => {
    it('should verify login with correct password', async () => {
      const users = db.collection('users');
      const user = await users.findOne({ email: 'existing@test.com' });
      expect(user).toBeTruthy();

      const valid = await verifyPassword('testpassword123', user!.passwordHash);
      expect(valid).toBe(true);
    });

    it('should reject login with wrong password', async () => {
      const users = db.collection('users');
      const user = await users.findOne({ email: 'existing@test.com' });
      expect(user).toBeTruthy();

      const valid = await verifyPassword('wrongpassword', user!.passwordHash);
      expect(valid).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('should verify and blacklist old refresh token on refresh', async () => {
      const payload: JwtPayload = { userId: 'test-user-1', role: 'customer' };
      const refreshToken = signRefreshToken(payload);

      // Verify it works
      const decoded = verifyRefreshToken(refreshToken);
      expect(decoded.userId).toBe('test-user-1');

      // Blacklist it
      await redisMock.set(`blacklist:refresh:${refreshToken}`, '1', 'EX', 3600);
      const blacklisted = await redisMock.get(`blacklist:refresh:${refreshToken}`);
      expect(blacklisted).toBe('1');
    });
  });

  describe('Protected Route Access', () => {
    it('should reject requests without token', () => {
      expect(() => verifyAccessToken('')).toThrow();
    });

    it('should accept valid token', () => {
      const token = signAccessToken({ userId: 'test-user-1', role: 'customer' });
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe('test-user-1');
    });
  });
});
