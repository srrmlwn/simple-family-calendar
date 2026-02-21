import axios, { AxiosResponse, AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const ENV = process.env.REACT_APP_ENV || 'development';

const isDev = process.env.NODE_ENV !== 'production';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Add timeout to prevent hanging requests
    timeout: ENV === 'production' ? 5000 : 10000, // Shorter timeout in production
});

// Add request interceptor to include auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (isDev) {
            console.log("API Request:", { url: config.url, method: config.method });
        }
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response: AxiosResponse) => {
        if (isDev) {
            console.log("API Response:", { status: response.status, url: response.config.url });
        }
        return response;
    },
    (error: AxiosError) => {
        if (isDev) {
            console.error('API Response Error:', error.response?.data || error);
        }

        // Handle 401 Unauthorized responses
        if (error.response?.status === 401) {
            // Clear auth data from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Get the error message from the response or use a default
            const errorMessage = (error.response?.data as { error?: string })?.error || 'Your session has expired';
            
            // Store the error message in sessionStorage (will be cleared on page refresh)
            sessionStorage.setItem('authError', errorMessage);
            // Log the unauthorized error
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;