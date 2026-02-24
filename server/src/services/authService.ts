// src/services/authService.ts
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { FamilyAccess } from '../entities/FamilyAccess';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';
import fetch from 'node-fetch';
import { Request } from 'express';
import { randomBytes } from 'crypto';

/**
 * Thrown when a sign-in or registration attempt is made from an email address
 * that is not on the ALLOWED_EMAILS allowlist.
 */
export class AccessDeniedError extends Error {
    constructor(message = 'famcal.ai is currently in private beta. Your email is not on the access list.') {
        super(message);
        this.name = 'AccessDeniedError';
    }
}

/**
 * If the ALLOWED_EMAILS env var is set, throw AccessDeniedError for any email
 * not in the comma-separated list. If the var is not set, all emails are allowed
 * (useful for local development and open deployments).
 */
export function checkEmailAllowed(email: string): void {
    const raw = process.env.ALLOWED_EMAILS;
    if (!raw?.trim()) return; // no restriction configured

    const allowed = raw
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);

    if (!allowed.includes(email.trim().toLowerCase())) {
        throw new AccessDeniedError();
    }
}

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
        checkEmailAllowed(user.email);

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
        const token = await this.generateToken(savedUser);

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
        checkEmailAllowed(email);

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
        const token = await this.generateToken(user);

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
     * Generate JWT token for user.
     * If the user is a co-manager, injects managingFamilyId / managingFamilyName
     * into the payload so downstream controllers can use effectiveUserId().
     */
    public async generateToken(user: User & { profileImage?: string }): Promise<string> {
        const accessRepo = AppDataSource.getRepository(FamilyAccess);
        const access = await accessRepo.findOne({
            where: { coManagerUserId: user.id },
            relations: ['owner'],
        });

        const payload: Record<string, string | undefined> = {
            id: user.id,
            email: user.email,
            profileImage: user.profileImage,
        };

        if (access) {
            payload.managingFamilyId = access.ownerUserId;
            const owner = access.owner;
            payload.managingFamilyName = (`${owner.firstName} ${owner.lastName}`).trim() || owner.email;
        }

        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: '24h'
        });
    }

    /**
     * Verify Google OAuth token and get/create user
     */
    public async verifyGoogleToken(accessToken: string, _req?: Request): Promise<User> {
        try {
            // Verify the token was issued to OUR Google client, not any other app.
            // tokeninfo returns azp (authorized party) and aud which must match GOOGLE_CLIENT_ID.
            const tokenInfoRes = await fetch(
                `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
            );

            if (!tokenInfoRes.ok) {
                throw new Error('Google token validation failed');
            }

            const tokenInfo = await tokenInfoRes.json();
            const googleClientId = process.env.GOOGLE_CLIENT_ID;

            if (googleClientId) {
                const issuedTo = tokenInfo.azp || tokenInfo.aud;
                if (issuedTo !== googleClientId) {
                    throw new Error('Google token audience mismatch — token not issued for this app');
                }
            }

            // Token is valid and belongs to this app — fetch user info
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user info from Google');
            }

            const userInfo = await response.json();

            if (!userInfo.email) {
                throw new Error('Invalid Google user info');
            }

            checkEmailAllowed(userInfo.email);

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
                // Google OAuth users never log in with a password; store a bcrypt-hashed
                // random token so the field is always a valid hash and cannot be brute-forced.
                user.passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
                
                user = await userRepository.save(user);
            }

            return user;
        } catch (error) {
            if (error instanceof AccessDeniedError) throw error; // propagate as-is
            console.error('Google token verification error:', error);
            throw new Error('Failed to verify Google token');
        }
    }
}

export default new AuthService();