import pino from 'pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

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
];

const HTTP_HEADERS_TO_REDACT = REDACTED_FIELDS.map(
  (f) => `req.headers.${f}`,
);

const HEADER_REDACT_PATH_SET_COOKIE = 'req.headers["set-cookie"]';
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
const childLoggers = new Map<string, pino.Logger>();
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

export function getLogger(name: string): pino.Logger {
  if (!childLoggers.has(name)) {
    childLoggers.set(name, baseLogger.child({ service: name }));
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return childLoggers.get(name)!;
}

export function getRequestLogger(name: string, req?: IncomingMessage): pino.Logger {
  const correlationId = (req?.headers['x-request-id'] as string) || randomUUID();
  const logger = getLogger(name);
  return logger.child({ correlationId });
}

export default baseLogger;
