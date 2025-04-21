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

// Helper function for consistent logging
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
    
    // Use appropriate console method based on level
    switch (level) {
        case 'info':
            console.info(`[AuthService] ${logMessage}`);
            break;
        case 'warn':
            console.warn(`[AuthService] ${logMessage}`);
            break;
        case 'error':
            console.error(`[AuthService] ${logMessage}`);
            break;
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