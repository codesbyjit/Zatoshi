import { z } from 'zod';

// ──────────────────────────────────────────
// Outbox Schema — collection: outbox
// ──────────────────────────────────────────

export const OutboxStatusSchema = z.enum(['pending', 'published', 'failed']);
export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;

export const OutboxSchema = z.object({
  _id: z.string(),
  eventType: z.string().min(1).max(100),
  eventId: z.string().uuid(),
  aggregateId: z.string(),
  payload: z.record(z.unknown()),
  status: OutboxStatusSchema,
  retryCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(1).default(3),
  lastError: z.string().optional(),
  createdAt: z.date(),
  publishedAt: z.date().optional(),
});

export type Outbox = z.infer<typeof OutboxSchema>;

export const CreateOutboxInputSchema = OutboxSchema.omit({
  _id: true,
  status: true,
  retryCount: true,
  createdAt: true,
  publishedAt: true,
  lastError: true,
});
export type CreateOutboxInput = z.infer<typeof CreateOutboxInputSchema>;

// ──────────────────────────────────────────
// MongoDB metadata
// ──────────────────────────────────────────

export const OUTBOX_COLLECTION = 'outbox';

export const OUTBOX_INDEXES = [
  { key: { eventId: 1 }, unique: true },
  { key: { status: 1, createdAt: 1 } },
] as const;
