import winston from 'winston';

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

export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming Request', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[REDACTED]' : undefined
    }
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body: any) {
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

export const logError = (error: any) => {
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      ...error
    }
  });
};

export default logger; 