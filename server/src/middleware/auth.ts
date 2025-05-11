// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Authentication token required' });
        return;
    }

    try {
        const user = jwt.verify(token, config.jwt.secret) as { id: string; email: string };
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
 * Optional JWT authentication middleware
 * Verifies token if present but doesn't reject the request if missing
 */
export const optionalJWT = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        if (token) {
            try {
                const user = jwt.verify(token, config.jwt.secret) as { id: string; email: string };
                req.user = user;
            } catch (error) {
                // Token invalid, but we continue anyway
                console.warn('Invalid token provided for optional authentication');
            }
        }
    }

    next();
};