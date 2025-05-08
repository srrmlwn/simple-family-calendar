// src/controllers/authController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { validateOrReject } from 'class-validator';
import { User } from '../entities/User';
import bcrypt from "bcrypt";

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
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await this.authService.getUserById(userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.json({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            });
        } catch (error) {
            console.error('Error getting current user:', error);
            return res.status(500).json({ error: 'Failed to get user information' });
        }
    };

    /**
     * Login with Google OAuth
     */
    public loginWithGoogle = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({ error: 'Authorization code is required' });
            }

            const result = await this.authService.loginWithGoogle(code);

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
            console.error('Error logging in with Google:', error);
            return res.status(500).json({ error: 'Failed to login with Google' });
        }
    };
}

export default new AuthController();