import { z } from 'zod';

// ──────────────────────────────────────────
// User Schema — collection: users
// ──────────────────────────────────────────

export const UserRoleSchema = z.enum(['customer', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  name: z.string().min(1).max(100),
  role: UserRoleSchema,
  avatarUrl: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

/** Input schema for creating a new user (system assigns _id, createdAt, updatedAt) */
export const CreateUserInputSchema = UserSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

/** Input schema for updating an existing user */
export const UpdateUserInputSchema = UserSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
}).partial();
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

// ──────────────────────────────────────────
// MongoDB metadata
// ──────────────────────────────────────────

export const USER_COLLECTION = 'users';

export const USER_INDEXES = [
  { key: { email: 1 }, unique: true },
  { key: { role: 1 } },
] as const;
