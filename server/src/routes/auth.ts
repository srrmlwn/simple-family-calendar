// src/routes/auth.ts
import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { AuthController } from '../controllers/authController';
import passport from 'passport';
import { authenticateJWT } from '../middleware/auth';
import { authLimiter, oauthLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const authController = new AuthController();

// Apply rate limiters to specific routes
router.post('/register', registerLimiter, asyncHandler(authController.register));
router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/google/verify', authLimiter, asyncHandler(authController.verifyGoogleToken));

// Google OAuth routes with rate limiting
router.get('/google',
    oauthLimiter,
    passport.authenticate('google', { 
        scope: ['profile', 'email', 'openid'],
        prompt: 'select_account'
    })
);

router.get('/google/callback',
    oauthLimiter,
    passport.authenticate('google', { session: false }),
    asyncHandler(authController.handleGoogleCallback)
);

// Protected routes
router.get('/me', authenticateJWT, asyncHandler(authController.getCurrentUser));

export default router;