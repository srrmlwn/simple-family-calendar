// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

/**
 * Middleware to authenticate JWT tokens from httpOnly cookie.
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies?.token;

    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    try {
        const user = jwt.verify(token, config.jwt.secret) as {
            id: string;
            email: string;
            profileImage?: string;
        };
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
};

/**
 * Optional JWT authentication middleware.
 * Verifies token if present in cookie but doesn't reject the request if missing.
 */
export const optionalJWT = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies?.token;

    if (token) {
        try {
            const user = jwt.verify(token, config.jwt.secret) as {
                id: string;
                email: string;
                profileImage?: string;
            };
            req.user = user;
        } catch {
            // Token invalid, but we continue anyway
        }
    }

    next();
};
