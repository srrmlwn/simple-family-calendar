import api from './api';
import { Capacitor } from '@capacitor/core';

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
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        level,
        message,
        ...data
    };
    
    if (level === 'error') {
        console.error(JSON.stringify(logData));
    } else {
        console.log(JSON.stringify(logData));
    }
};

const authService = {
    // Login user
    login: async (email: string, password: string): Promise<AuthResponse> => {
        try {
            log('info', 'Attempting login for user:', { email });
            
            const response = await api.post<AuthResponse>('/auth/login', {
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
            
            const response = await api.post<AuthResponse>('/auth/register', {
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

    // Google login
    loginWithGoogle: async (code: string): Promise<AuthResponse> => {
        try {
            log('info', 'Attempting Google login with authorization code');
            
            const response = await api.post<AuthResponse>('/auth/google', {
                code,
            });
            
            log('info', 'Google login successful:', { 
                userId: response.data.user.id 
            });
            
            return response.data;
        } catch (error) {
            log('error', 'Google login failed:', { 
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to login with Google');
        }
    },

    // Get current user info
    getCurrentUser: async (): Promise<User> => {
        try {
            log('info', 'Fetching current user information');
            
            const response = await api.get<User>('/auth/me');
            
            log('info', 'Current user info retrieved:', { 
                userId: response.data.id,
                email: response.data.email 
            });
            
            return response.data;
        } catch (error) {
            log('error', 'Failed to get user information:', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            throw new Error('Failed to get user information');
        }
    },
};

export default authService;