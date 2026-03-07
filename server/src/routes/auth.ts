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
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, asyncHandler(authController.forgotPassword));
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
    (req, res, next) => {
        passport.authenticate('google', { session: false }, (err: Error | null, user: Express.User | false) => {
            if (err) return next(err);
            if (!user) {
                const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
                return res.redirect(`${clientUrl}/login?error=access_denied`);
            }
            req.user = user;
            next();
        })(req, res, next);
    },
    asyncHandler(authController.handleGoogleCallback)
);

// Protected routes
router.get('/me', authenticateJWT, asyncHandler(authController.getCurrentUser));
router.delete('/account', authenticateJWT, asyncHandler(authController.deleteAccount));

export default router;