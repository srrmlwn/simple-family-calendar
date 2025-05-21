// src/controllers/authController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { validateOrReject } from 'class-validator';
import { User } from '../entities/User';
import bcrypt from "bcrypt";
import passport from 'passport';
import { NextFunction } from 'express';

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

            // Basic password validation
            if (!password || password.length < 8) {
                return res.status(400).json({
                    error: 'Password must be at least 8 characters long'
                });
            }

            // Create user entity
            const user = new User();
            user.email = email;
            user.firstName = firstName;
            user.lastName = lastName;

            // Validate user data (excluding password which we already checked)
            await validateOrReject(user);
            console.log("Validated user - " + JSON.stringify(user));

            // Register user - password hashing will be done in the service
            const result = await this.authService.register(user, password);

            return res.status(201).json({
                user: {
                    id: result.id,
                    email: result.email,
                    firstName: result.firstName,
                    lastName: result.lastName
                },
                token: result.token
            });
        } catch (error) {
            console.error('Error registering user:', error);

            if (error instanceof Error) {
                // Check if it's a duplicate email error
                if (error.message.includes('duplicate key value violates unique constraint')) {
                    return res.status(409).json({ error: 'Email already in use' });
                }

                // Validation error
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

            return res.json({
                user: {
                    id: result.id,
                    email: result.email,
                    firstName: result.firstName,
                    lastName: result.lastName
                },
                token: result.token
            });
        } catch (error) {
            console.error('Error logging in:', error);
            return res.status(500).json({ error: 'Failed to login' });
        }
    };

    /**
     * Get current user
     */
    public getCurrentUser = async (req: Request, res: Response): Promise<Response> => {
        try {
            console.log('[AuthController] Getting current user');
            const userId = (req.user as any)?.id;
            console.log('[AuthController] User ID from request:', userId);

            if (!userId) {
                console.log('[AuthController] No user ID found in request');
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await this.authService.getUserById(userId);
            console.log('[AuthController] User from database:', {
                id: user?.id,
                email: user?.email
            });

            if (!user) {
                console.log('[AuthController] User not found in database');
                return res.status(404).json({ error: 'User not found' });
            }

            // Get the profile image from the JWT token
            const profileImage = (req.user as any)?.profileImage;
            console.log('[AuthController] Profile image from JWT:', profileImage);

            const response = {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImage: profileImage || undefined
            };
            console.log('[AuthController] Sending response:', {
                id: response.id,
                email: response.email,
                hasProfileImage: !!response.profileImage
            });

            return res.json(response);
        } catch (error) {
            console.error('[AuthController] Error getting current user:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            return res.status(500).json({ error: 'Failed to get user information' });
        }
    };

    /**
     * Verify Google OAuth token and create/update user
     */
    public verifyGoogleToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { accessToken } = req.body;
            
            if (!accessToken) {
                res.status(400).json({ error: 'Access token is required' });
                return;
            }

            // Verify token and get user info from Google
            const user = await this.authService.verifyGoogleToken(accessToken, req);
            
            // Generate JWT token
            const token = this.authService.generateToken(user);
            
            res.json({ user, token });
        } catch (error) {
            console.error('Google token verification error:', error);
            res.status(401).json({ error: 'Failed to verify Google token' });
        }
    };

    /**
     * Handle Google OAuth callback
     * This method is called after successful Google authentication
     * It generates a JWT token and redirects to the client with the token
     */
    public handleGoogleCallback = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('[AuthController] Starting Google callback handling');
            console.log('[AuthController] Request user:', {
                id: (req.user as User)?.id,
                email: (req.user as User)?.email,
                hasProfileImage: !!(req.user as any)?.profileImage,
                profileImageUrl: (req.user as any)?.profileImage
            });

            if (!req.user) {
                throw new Error('No user found after Google authentication');
            }

            const user = req.user as User & { profileImage?: string };
            console.log('[AuthController] User from request:', {
                id: user.id,
                email: user.email,
                hasProfileImage: !!user.profileImage,
                profileImageUrl: user.profileImage
            });

            // Generate JWT token
            const token = this.authService.generateToken(user);
            console.log('[AuthController] Generated JWT token');
            
            // Log environment variables
            console.log('[AuthController] Environment variables:', {
                CLIENT_URL: process.env.CLIENT_URL,
                NODE_ENV: process.env.NODE_ENV,
                API_URL: process.env.API_URL
            });
            
            // Redirect to client with token and profile image
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            console.log('[AuthController] Using client URL:', clientUrl);
            
            const redirectUrl = new URL(clientUrl);
            redirectUrl.pathname = '/auth/callback';
            redirectUrl.searchParams.set('token', token);
            if (user.profileImage) {
                console.log('[AuthController] Adding profile image to redirect URL:', user.profileImage);
                redirectUrl.searchParams.set('profileImage', user.profileImage);
            } else {
                console.log('[AuthController] No profile image available for user');
            }
            
            console.log('[AuthController] Final redirect URL:', redirectUrl.toString());
            res.redirect(redirectUrl.toString());
        } catch (error) {
            console.error('[AuthController] Google callback error:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            res.redirect(`${clientUrl}/login?error=auth_failed`);
        }
    };
}

export default new AuthController();