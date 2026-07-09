import { getLogger } from '@repo/utils';

const logger = getLogger('worker:retry');

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 200) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Optional label for logging */
  label?: string;
}

const defaultOptions: Required<Omit<RetryOptions, 'label'>> = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 10000,
};

/**
 * Executes an async function with exponential backoff retry logic.
 *
 * Delay formula: baseDelay * 2^attempt, capped at maxDelayMs.
 * Jitter of ±25% is added to prevent thundering herd.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @returns The result of the function if successful
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  const { maxRetries, baseDelayMs, maxDelayMs, label } = opts;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        const jitter = delay * 0.25 * (Math.random() * 2 - 1); // ±25%
        const totalDelay = Math.round(delay + jitter);

        const msg = label || 'operation';
        logger.warn(
          { attempt: attempt + 1, maxRetries, delay: totalDelay, err },
          `${msg} failed, retrying in ${totalDelay}ms`,
        );

        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      } else {
        const msg = label || 'operation';
        logger.error(
          { attempt: attempt + 1, maxRetries, err },
          `${msg} failed after ${maxRetries} retries`,
        );
      }
    }
  }

  throw lastError;
}
