import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wrapper for async route handlers to catch errors
 * This eliminates the need for try-catch blocks in route handlers
 */
export const asyncHandler = (fn: AsyncFunction) => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    Promise.resolve(fn(req, res, next)).catch(next);
}; 