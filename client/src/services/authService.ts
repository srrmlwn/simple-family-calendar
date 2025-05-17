import api from './api';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface AuthResponse {
    user: User;
    token: string;
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
                userId: response.data.user.id 
            });
            
            return response.data;
        } catch (error) {
            log('error', 'Login failed:', { 
                email,
                error: error instanceof Error ? error.message : 'Unknown error',
                errorDetails: JSON.stringify(error)
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
            log('info', 'Attempting user registration:', { 
                email,
                firstName,
                lastName 
            });
            
            const response = await api.post<AuthResponse>('/api/auth/register', {
                firstName,
                lastName,
                email,
                password,
            });
            
            log('info', 'Registration successful:', { 
                email,
                userId: response.data.user.id 
            });
            
            return response.data;
        } catch (error) {
            log('error', 'Registration failed:', { 
                email,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to register');
        }
    },

    // Get current user info
    getCurrentUser: async (token: string): Promise<User> => {
        try {
            const response = await api.get<User>('/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            log('error', 'Failed to get current user:', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to get user information');
        }
    },

    // Handle Google OAuth callback
    handleGoogleCallback: async (token: string): Promise<AuthResponse> => {
        try {
            log('info', 'Handling Google OAuth callback', { token: token.substring(0, 10) + '...' });
            
            // Get user info using the token
            const response = await api.get<User>('/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            log('info', 'Google OAuth callback successful', { 
                userId: response.data.id,
                email: response.data.email 
            });

            return {
                user: response.data,
                token
            };
        } catch (error) {
            log('error', 'Google OAuth callback failed:', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to complete Google authentication');
        }
    },

    // Verify Google OAuth token
    verifyGoogleToken: async (accessToken: string): Promise<AuthResponse> => {
        try {
            log('info', 'Verifying Google OAuth token');
            
            const response = await api.post<AuthResponse>('/api/auth/google/verify', {
                accessToken
            });
            
            log('info', 'Google token verification successful', { 
                userId: response.data.user.id,
                email: response.data.user.email 
            });
            
            return response.data;
        } catch (error) {
            log('error', 'Google token verification failed:', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new Error('Failed to verify Google token');
        }
    },
};

export default authService;