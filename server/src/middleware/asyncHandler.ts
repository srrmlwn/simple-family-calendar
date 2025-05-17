import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper function to handle async route handlers
 * This ensures that any errors in async route handlers are properly caught and passed to Express error handling middleware
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}; 