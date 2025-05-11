// src/routes/auth.ts
import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import authController from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';
import passport from 'passport';

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

// Protected routes
router.get('/me', authenticateJWT, asyncHandler(authController.getCurrentUser));

// Remove old Google OAuth routes and add new token verification route
router.post('/google/verify', asyncHandler(authController.verifyGoogleToken));

export default router;