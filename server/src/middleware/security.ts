import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security middleware to set various security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Set Cross-Origin-Opener-Policy header for Google Sign-In
    res.setHeader(
        'Cross-Origin-Opener-Policy',
        'same-origin, same-origin-allow-popups'
    );

    // Set Cross-Origin-Resource-Policy header for Google profile images
    res.setHeader(
        'Cross-Origin-Resource-Policy',
        'cross-origin'
    );

    // Set security headers using Helmet with consolidated CSP
    helmet({
        crossOriginEmbedderPolicy: false, // Required for Google Sign-In
        crossOriginResourcePolicy: { policy: "cross-origin" }, // Required for Google profile images
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", "https://accounts.google.com/gsi/"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://accounts.google.com/gsi/client",
                    "https://apis.google.com",
                    "https://www.gstatic.com",
                    "https://*.google.com"
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                    "https://accounts.google.com/gsi/style"
                ],
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com",
                    "data:"
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    "https:",
                    "https://*.googleusercontent.com", // Allow Google profile images
                    "https://lh3.googleusercontent.com" // Allow Google profile images
                ],
                connectSrc: [
                    "'self'",
                    "https://accounts.google.com/gsi/",
                    "https://famcal.ai",
                    "https://simple-family-calendar-8282627220c3.herokuapp.com",
                    "https://www.googleapis.com",
                    "https://oauth2.googleapis.com",
                    "https://*.google.com"
                ],
                frameSrc: [
                    "'self'",
                    "https://accounts.google.com/gsi/",
                    "https://accounts.google.com",
                    "https://*.google.com"
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