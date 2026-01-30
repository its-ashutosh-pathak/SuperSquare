import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Determine API URL based on platform
const getBaseUrl = () => {
    // Only use Emulator IP in Development mode
    if (Capacitor.isNativePlatform() && import.meta.env.DEV) {
        return 'http://10.0.2.2:3000';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
