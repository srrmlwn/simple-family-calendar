import { Request, Response, NextFunction } from 'express';

/**
 * Security middleware to set various security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self';" +
        "script-src 'self' https://accounts.google.com https://apis.google.com https://www.gstatic.com 'unsafe-inline' 'unsafe-eval' https://*.google.com;" +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
        "font-src 'self' https://fonts.gstatic.com data:;" +
        "img-src 'self' data: https:;" +
        "connect-src 'self' https://famcal.ai https://simple-family-calendar-8282627220c3.herokuapp.com https://accounts.google.com https://www.googleapis.com https://oauth2.googleapis.com https://*.google.com;" +
        "frame-src 'self' https://accounts.google.com https://*.google.com;" +
        "worker-src 'self' blob:;" +
        "object-src 'none';" +
        "base-uri 'self';" +
        "form-action 'self';" +
        "frame-ancestors 'none';" +
        "upgrade-insecure-requests;"
    );

    // Other security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    next();
}; 