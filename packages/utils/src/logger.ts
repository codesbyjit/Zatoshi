import pino from 'pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

// ---------------------------------------------------------------------------
// Sensitive field redaction
// ---------------------------------------------------------------------------

const REDACTED_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  // 'set-cookie' is handled separately below (dashes are path separators in fast-redact).
];

const HTTP_HEADERS_TO_REDACT = REDACTED_FIELDS.map(
  (f) => `req.headers.${f}`,
);

// Bracket notation required: fast-redact interprets dashes as path separators.
const HEADER_REDACT_PATH_SET_COOKIE = 'req.headers["set-cookie"]';

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

const isDev =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;

// ---------------------------------------------------------------------------
// Child logger cache
// ---------------------------------------------------------------------------

const childLoggers = new Map<string, pino.Logger>();

// ---------------------------------------------------------------------------
// Create base logger
// ---------------------------------------------------------------------------

const baseLogger: pino.Logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      ...REDACTED_FIELDS,
      ...HTTP_HEADERS_TO_REDACT,
      HEADER_REDACT_PATH_SET_COOKIE,
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// ---------------------------------------------------------------------------
// Context / child logger helpers
// ---------------------------------------------------------------------------

/**
 * Get (or create) a child logger for a specific service/context.
 *
 * @param name - Service or module name (e.g. 'api', 'worker', 'web')
 * @returns A child logger bound to that context
 */
export function getLogger(name: string): pino.Logger {
  if (!childLoggers.has(name)) {
    childLoggers.set(
      name,
      baseLogger.child({ service: name }),
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return childLoggers.get(name)!;
}

/**
 * Create a logger with a correlation ID extracted from an incoming request
 * or generated anew.  Useful for tracing a request across services.
 *
 * @param name - Service or module name
 * @param req - Optional IncomingMessage (Express Request) to extract ID from
 * @returns A child logger with correlationId bound
 */
export function getRequestLogger(
  name: string,
  req?: IncomingMessage,
): pino.Logger {
  const correlationId =
    (req?.headers['x-request-id'] as string) || randomUUID();
  const logger = getLogger(name);
  return logger.child({ correlationId });
}

// ---------------------------------------------------------------------------
// Default export — the root logger
// ---------------------------------------------------------------------------

export default baseLogger;
