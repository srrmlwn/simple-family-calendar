// src/routes/auth.ts
import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { AuthController } from '../controllers/authController';
import passport from 'passport';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();
const authController = new AuthController();

// Google OAuth routes
router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email', 'openid'],
        prompt: 'select_account'
    })
);

router.get('/google/callback',
    passport.authenticate('google', { 
        failureRedirect: process.env.CLIENT_URL + '/login?error=auth_failed',
        session: false 
    }),
    asyncHandler(authController.handleGoogleCallback)
);

// Token verification route (for existing token-based auth)
router.post('/google/verify', asyncHandler(authController.verifyGoogleToken));

// Regular auth routes
router.post('/login', asyncHandler(authController.login));
router.post('/register', asyncHandler(authController.register));
router.get('/me', authenticateJWT, asyncHandler(authController.getCurrentUser));

export default router;