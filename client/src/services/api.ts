import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {response} from "express";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

console.log('API URL configured as:', API_URL);

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Add timeout to prevent hanging requests
    timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log("API Request:", {
            url: config.url,
            method: config.method,
            baseURL: config.baseURL,
            headers: config.headers,
            data: config.data
        });
        
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
        console.log("API Response:", {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data
        });
        return response;
    },
    (error: AxiosError) => {
        console.error('API Response Error:', JSON.stringify({
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                baseURL: error.config?.baseURL,
                headers: error.config?.headers,
                data: error.config?.data
            }
        }));
        
        // Handle session expiration
        if (error.response?.status === 401) {
            // localStorage.removeItem('token');
            // localStorage.removeItem('user');

            // Redirect to login if not already there
            /*if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }*/
        }
        return Promise.reject(error);
    }
);

export default api;