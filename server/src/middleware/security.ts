import { Request, Response, NextFunction } from 'express';

/**
 * Security middleware to set various security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self';" +
        "script-src 'self';" +
        "style-src 'self' 'unsafe-inline';" +
        "img-src 'self' data: https:;" +
        "connect-src 'self';" +
        "frame-src 'self';"
    );

    // Other security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    next();
}; 