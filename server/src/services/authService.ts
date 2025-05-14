// src/services/authService.ts
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';
import fetch from 'node-fetch';
import { Request } from 'express';

export class AuthService {
    /**
     * Register a new user
     */
    public async register(user: User, plainPassword: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        token: string;
    }> {
        console.log("Registering user - " + JSON.stringify(user));
        const userRepository = AppDataSource.getRepository(User);

        // Check if user with this email already exists
        const existingUser = await userRepository.findOne({
            where: { email: user.email }
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash the password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

        user.passwordHash = passwordHash;

        // Save the user
        const savedUser = await userRepository.save(user);

        // Generate JWT token
        const token = this.generateToken(savedUser);

        return {
            id: savedUser.id,
            email: savedUser.email,
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            token
        };
    }

    /**
     * Login user with email and password
     */
    public async login(email: string, password: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        token: string;
    } | null> {
        const userRepository = AppDataSource.getRepository(User);

        // Find user by email
        const user = await userRepository.findOne({
            where: { email }
        });

        if (!user) {
            return null;
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return null;
        }

        // Generate JWT token
        const token = this.generateToken(user);

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            token
        };
    }

    /**
     * Get user by ID
     */
    public async getUserById(id: string): Promise<User | null> {
        const userRepository = AppDataSource.getRepository(User);

        const user = await userRepository.findOne({
            where: { id }
        });

        return user || null;
    }

    /**
     * Generate JWT token for a user
     */
    public generateToken(user: User): string {
        const payload = {
            id: user.id,
            email: user.email
        };

        // Convert config values to the specific types expected by jwt.sign
        const secret: jwt.Secret = String(config.jwt.secret);
        const options: jwt.SignOptions = {
            expiresIn: "1 day"
        };

        return jwt.sign(payload, secret, options);
    }

    /**
     * Verify Google OAuth token and get/create user
     */
    public async verifyGoogleToken(accessToken: string, req?: Request): Promise<User> {
        try {
            console.log('Verifying Google token from request:', {
                origin: req?.headers.origin,
                referer: req?.headers.referer,
                host: req?.headers.host,
                userAgent: req?.headers['user-agent']
            });

            // Use the access token to get user info from Google
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                console.error('Google API response not OK:', {
                    status: response.status,
                    statusText: response.statusText,
                    origin: req?.headers.origin
                });
                throw new Error('Failed to fetch user info from Google');
            }

            const userInfo = await response.json();
            
            if (!userInfo.email) {
                throw new Error('Invalid Google user info');
            }

            const userRepository = AppDataSource.getRepository(User);
            
            // Check if user exists
            let user = await userRepository.findOne({
                where: { email: userInfo.email }
            });

            if (!user) {
                // Create new user if doesn't exist
                user = new User();
                user.email = userInfo.email;
                user.firstName = userInfo.given_name || '';
                user.lastName = userInfo.family_name || '';
                // For Google users, we'll set a random password since they'll use Google to login
                user.passwordHash = 'google-oauth-' + Math.random().toString(36).slice(-8);
                
                user = await userRepository.save(user);
            }

            return user;
        } catch (error) {
            console.error('Google token verification error:', error);
            throw new Error('Failed to verify Google token');
        }
    }
}

export default new AuthService();