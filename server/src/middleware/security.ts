import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security middleware to set various security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    console.log("CSP is disabled for now!!");
    // Content Security Policy - Temporarily disabled for testing
    /*
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
    */

    // Set Cross-Origin-Opener-Policy header for Google Sign-In
    res.setHeader(
        'Cross-Origin-Opener-Policy',
        'same-origin-allow-popups'
    );

    // Set other security headers using Helmet
    helmet({
        crossOriginEmbedderPolicy: false, // Required for Google Sign-In
        crossOriginResourcePolicy: { policy: "cross-origin" }, // Required for Google Sign-In
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", "https://accounts.google.com/gsi/"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://accounts.google.com/gsi/client", // Google Identity Services client library
                    "https://apis.google.com"
                ],
                frameSrc: [
                    "'self'",
                    "https://accounts.google.com/gsi/" // Required for One Tap and Sign In With Google button iframes
                ],
                connectSrc: [
                    "'self'",
                    "https://accounts.google.com/gsi/", // Required for Google Identity Services server-side endpoints
                    "https://famcal.ai",
                    "https://simple-family-calendar-8282627220c3.herokuapp.com",
                    "https://www.googleapis.com",
                    "https://oauth2.googleapis.com"
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                    "https://accounts.google.com/gsi/style" // Required for Google Identity Services stylesheets
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    "https:"
                ],
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com"
                ],
                workerSrc: ["'self'", "blob:"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: []
            }
        }
    })(req, res, next);
}; 