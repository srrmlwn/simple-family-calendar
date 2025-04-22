import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {response} from "express";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const ENV = process.env.REACT_APP_ENV || 'development';

console.log('API URL configured as:', API_URL);
console.log('Environment:', ENV);

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
        console.log("API Request:", {
            url: config.url,
            method: config.method,
            baseURL: config.baseURL,
            headers: config.headers,
            data: config.data,
            environment: ENV
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
            data: response.data,
            environment: ENV
        });
        return response;
    },
    (error: AxiosError) => {
        if (ENV === 'development') {
            console.error('API Response Error:', error.response?.data || error);
        }
        return Promise.reject(error);
    }
);

export default api;