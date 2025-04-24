// src/routes/auth.ts
import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import authController from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Wrapper function to handle async route handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

console.log("ARE LOGS WORKING FOR AUTH?");

// Public routes
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/google', asyncHandler(authController.loginWithGoogle));

// Protected routes
router.get('/me', authenticateJWT, asyncHandler(authController.getCurrentUser));

export default router;