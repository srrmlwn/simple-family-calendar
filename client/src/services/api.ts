import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {response} from "express";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log("Adding token to API request - " + token);
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('Request: ' + JSON.stringify(config));
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        // Handle session expiration
        if (error.response?.status === 401) {
            // localStorage.removeItem('token');
            // localStorage.removeItem('user');

            // Redirect to login if not already there
            /*if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }*/
        }
        // console.log('Response: ' +  JSON.stringify(response));
        return Promise.reject(error);
    }
);

export default api;