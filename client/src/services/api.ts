import axios, { AxiosResponse, AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const ENV = process.env.REACT_APP_ENV || 'development';

// Create axios instance with withCredentials so the httpOnly auth cookie
// is automatically included in every request.
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: ENV === 'production' ? 5000 : 10000,
});

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        // Handle 401 Unauthorized — clear any stale client state and redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            const errorMessage = (error.response?.data as { error?: string })?.error || 'Your session has expired';
            sessionStorage.setItem('authError', errorMessage);
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
