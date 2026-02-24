// src/controllers/authController.ts
import { Request, Response } from 'express';
import { AuthService, AccessDeniedError } from '../services/authService';
import { validateOrReject } from 'class-validator';
import { User } from '../entities/User';

const COOKIE_NAME = 'token';

// httpOnly cookie settings — `lax` works for same-domain (production) and
// cross-port same-host (development).  Strict is not used because the Google
// OAuth redirect crosses origins before landing on /auth/callback.
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    /**
     * Register a new user
     */
    public register = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { email, password, firstName, lastName } = req.body;

            if (!password || password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }

            const user = new User();
            user.email = email;
            user.firstName = firstName;
            user.lastName = lastName;

            await validateOrReject(user);

            const result = await this.authService.register(user, password);

            res.cookie(COOKIE_NAME, result.token, cookieOptions);

            return res.status(201).json({
                user: {
                    id: result.id,
                    email: result.email,
                    firstName: result.firstName,
                    lastName: result.lastName,
                },
            });
        } catch (error) {
            if (error instanceof AccessDeniedError) {
                return res.status(403).json({ error: error.message });
            }

            console.error('Error registering user:', error);

            if (error instanceof Error) {
                if (error.message.includes('duplicate key value violates unique constraint')) {
                    return res.status(409).json({ error: 'Email already in use' });
                }
                if (error.message.includes('validation failed')) {
                    return res.status(400).json({ error: error.message });
                }
            }

            return res.status(500).json({ error: 'Failed to register user' });
        }
    };

    /**
     * Login user
     */
    public login = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            const result = await this.authService.login(email, password);

            if (!result) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            res.cookie(COOKIE_NAME, result.token, cookieOptions);

            return res.json({
                user: {
                    id: result.id,
                    email: result.email,
                    firstName: result.firstName,
                    lastName: result.lastName,
                },
            });
        } catch (error) {
            if (error instanceof AccessDeniedError) {
                return res.status(403).json({ error: error.message });
            }
            console.error('Error logging in:', error);
            return res.status(500).json({ error: 'Failed to login' });
        }
    };

    /**
     * Logout user — clears the auth cookie
     */
    public logout = (_req: Request, res: Response): void => {
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        res.json({ message: 'Logged out' });
    };

    /**
     * Get current user
     */
    public getCurrentUser = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await this.authService.getUserById(userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const profileImage = req.user?.profileImage;

            return res.json({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImage: profileImage || undefined,
                managingFamilyId: req.user?.managingFamilyId,
                managingFamilyName: req.user?.managingFamilyName,
            });
        } catch (error) {
            console.error('Error getting current user:', error);
            return res.status(500).json({ error: 'Failed to get user information' });
        }
    };

    /**
     * Forgot password — always returns 200 to avoid email enumeration.
     * TODO: generate a reset token, store it hashed, and email the link via EmailService.
     */
    public forgotPassword = async (req: Request, res: Response): Promise<void> => {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        // Always return success to prevent email enumeration
        res.json({ message: 'If an account exists, a reset link has been sent.' });
    };

    /**
     * Verify Google OAuth token (GIS credential flow) and create/update user
     */
    public verifyGoogleToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { accessToken } = req.body;

            if (!accessToken) {
                res.status(400).json({ error: 'Access token is required' });
                return;
            }

            const user = await this.authService.verifyGoogleToken(accessToken, req);
            const token = await this.authService.generateToken(user);

            res.cookie(COOKIE_NAME, token, cookieOptions);
            res.json({ user });
        } catch (error) {
            if (error instanceof AccessDeniedError) {
                res.status(403).json({ error: (error as Error).message });
                return;
            }
            console.error('Google token verification error:', error);
            res.status(401).json({ error: 'Failed to verify Google token' });
        }
    };

    /**
     * Handle Google OAuth redirect callback.
     * Sets the JWT as an httpOnly cookie and redirects the browser to the client.
     * The token is NOT placed in the redirect URL.
     */
    public handleGoogleCallback = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.user) {
                throw new Error('No user found after Google authentication');
            }

            const user = req.user as User & { profileImage?: string };
            const token = await this.authService.generateToken(user);

            res.cookie(COOKIE_NAME, token, cookieOptions);

            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            const redirectUrl = new URL(clientUrl);
            redirectUrl.pathname = '/auth/callback';
            // Profile image URL is safe to pass as a query param (not sensitive)
            if (user.profileImage) {
                redirectUrl.searchParams.set('profileImage', user.profileImage);
            }

            res.redirect(redirectUrl.toString());
        } catch (error) {
            console.error('Google callback error:', error instanceof Error ? error.message : error);
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            res.redirect(`${clientUrl}/login?error=auth_failed`);
        }
    };
}

export default new AuthController();
