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

const authService = {
    // Login user
    login: async (email: string, password: string): Promise<AuthResponse> => {
        try {
            const response = await api.post<AuthResponse>('/auth/login', {
                email,
                password,
            });
            return response.data;
        } catch (error) {
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
            const response = await api.post<AuthResponse>('/auth/register', {
                firstName,
                lastName,
                email,
                password,
            });
            return response.data;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to register');
        }
    },

    // Get current user info
    getCurrentUser: async (): Promise<User> => {
        try {
            const response = await api.get<User>('/auth/me');
            return response.data;
        } catch (error) {
            throw new Error('Failed to get user information');
        }
    },
};

export default authService;