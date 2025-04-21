// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/logger';

/**
 * Global error handling middleware
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log the error using our logging utility
    logError(err);

    // Differentiate between different types of errors
    if (err.name === 'ValidationError') {
        res.status(400).json({
            error: 'Validation Error',
            details: err.message
        });
        return;
    }

    if (err.name === 'UnauthorizedError') {
        res.status(401).json({
            error: 'Authentication Error',
            details: 'Invalid or expired token'
        });
        return;
    }

    if (err.name === 'ForbiddenError') {
        res.status(403).json({
            error: 'Forbidden',
            details: 'You do not have permission to access this resource'
        });
        return;
    }

    // Default to 500 server error
    res.status(500).json({
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
};