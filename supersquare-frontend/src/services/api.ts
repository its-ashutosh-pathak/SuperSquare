import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Determine API URL based on platform
// Native Android (Emulator) -> http://10.0.2.2:3000
// Native Android (Device) -> would need real IP, but assuming emulator for now or production URL in future
// Web -> http://localhost:3000 (or VITE_API_URL)

const getBaseUrl = () => {
    if (Capacitor.isNativePlatform()) {
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
