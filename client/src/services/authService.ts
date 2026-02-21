import api from './api';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

// Server no longer returns a token — auth is managed via httpOnly cookie.
interface AuthResponse {
    user: User;
}

// Logging utility
const log = (level: 'info' | 'error', message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[AuthService] ${level.toUpperCase()}: ${message}`, data || '');
    }
};

const authService = {
    // Login user
    login: async (email: string, password: string): Promise<AuthResponse> => {
        try {
            log('info', 'Attempting login for user:', { email });

            const response = await api.post<AuthResponse>('/api/auth/login', {
                email,
                password,
            });

            log('info', 'Login successful for user:', {
                email,
                userId: response.data.user.id,
            });

            return response.data;
        } catch (error) {
            log('error', 'Login failed:', {
                email,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to login');
        }
    },

    // Register user
    register: async (
        firstName: string,
        lastName: string,
        email: string,
        password: string
    ): Promise<AuthResponse> => {
        try {
            log('info', 'Attempting user registration:', { email, firstName, lastName });

            const response = await api.post<AuthResponse>('/api/auth/register', {
                firstName,
                lastName,
                email,
                password,
            });

            log('info', 'Registration successful:', {
                email,
                userId: response.data.user.id,
            });

            return response.data;
        } catch (error) {
            log('error', 'Registration failed:', {
                email,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to register');
        }
    },

    // Get current user info — auth cookie is automatically included by axios (withCredentials)
    getCurrentUser: async (): Promise<User> => {
        try {
            const response = await api.get<User>('/api/auth/me');
            return response.data;
        } catch (error) {
            throw new Error('Failed to get user information');
        }
    },

    // Handle Google OAuth redirect callback.
    // The JWT is already in the httpOnly cookie set by the server redirect.
    // Fetch /me to get the user object; pick up profileImage from URL params if present.
    handleGoogleCallback: async (): Promise<AuthResponse> => {
        try {
            log('info', 'Completing Google OAuth callback');

            const response = await api.get<User>('/api/auth/me');

            // The server passes profileImage as a URL param (not sensitive — it's a public URL)
            const urlParams = new URLSearchParams(window.location.search);
            const profileImage = urlParams.get('profileImage');

            return {
                user: {
                    ...response.data,
                    profileImage: profileImage || response.data.profileImage || undefined,
                },
            };
        } catch (error) {
            log('error', 'Google OAuth callback failed:', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error('Failed to complete Google authentication');
        }
    },

    // Verify Google GIS credential token (alternative login flow)
    verifyGoogleToken: async (accessToken: string): Promise<AuthResponse> => {
        try {
            log('info', 'Verifying Google OAuth token');

            const response = await api.post<AuthResponse>('/api/auth/google/verify', {
                accessToken,
            });

            log('info', 'Google token verification successful', {
                userId: response.data.user.id,
                email: response.data.user.email,
            });

            return response.data;
        } catch (error) {
            log('error', 'Google token verification failed:', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new Error('Failed to verify Google token');
        }
    },

    // Logout — clears the httpOnly cookie server-side
    logout: async (): Promise<void> => {
        try {
            await api.post('/api/auth/logout');
        } catch {
            // Best-effort — even if this fails, client state will be cleared
        }
    },
};

export default authService;
