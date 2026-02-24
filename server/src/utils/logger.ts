import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

const REDACTED_FIELDS = new Set(['password', 'passwordHash', 'token', 'accessToken', 'secret', 'credential']);

function redactBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([k, v]) =>
      REDACTED_FIELDS.has(k) ? [k, '[REDACTED]'] : [k, v]
    )
  );
}

export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  logger.info('Incoming Request', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: redactBody(req.body),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body: unknown) {
    const duration = Date.now() - start;
    
    // Log response
    logger.info('Outgoing Response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      body: body
    });

    return originalSend.call(this, body);
  };

  next();
};

export const logError = (error: unknown) => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error('Error occurred', {
    error: {
      message: err.message,
      stack: err.stack,
    }
  });
};

export default logger; 