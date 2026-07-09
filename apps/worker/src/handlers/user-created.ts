import { getLogger } from '@repo/utils';
import { sendEmail, welcomeEmail } from '../services/email.service';
import { withRetry } from '../utils/retry';

const logger = getLogger('worker:handler:user-created');

export interface UserCreatedPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Handle a user.created event.
 *
 * Responsibilities:
 * 1. Send a welcome email to the new user
 *
 * @param payload - The user created event payload
 */
export async function handleUserCreated(payload: UserCreatedPayload): Promise<void> {
  const { userId, email, name } = payload;

  logger.info({ userId, email }, 'Processing user.created event');

  try {
    await withRetry(
      async () => {
        const { subject, body } = welcomeEmail(name);
        await sendEmail(email, subject, body);
      },
      {
        maxRetries: 2,
        baseDelayMs: 500,
        label: 'welcome-email',
      },
    );
    logger.info({ userId, email }, 'Welcome email sent');
  } catch (err) {
    logger.error({ userId, email, err }, 'Failed to send welcome email');
    throw err; // Re-throw so the consumer can handle DLQ logic
  }

  logger.info({ userId }, 'User created handler completed');
}
