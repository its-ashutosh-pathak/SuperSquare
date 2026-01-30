import api from './api';
import { Capacitor } from '@capacitor/core';

export interface AuthResponse {
    token?: string;
    user?: any;
    message?: string;
}

export const authService = {
    async requestOtp(identifier: string, purpose: 'signup' | 'reset' | 'phone_verify'): Promise<{ message: string }> {
        const response = await api.post('/api/auth/request-otp', { identifier, purpose });
        return response.data;
    },

    async verifyOtp(identifier: string, otp: string, purpose: 'signup' | 'reset' | 'phone_verify'): Promise<{ message: string }> {
        const response = await api.post('/api/auth/verify-otp', { identifier, otp, purpose });
        return response.data;
    },

    async identify(identifier: string): Promise<{ exists: boolean; provider: string | null; verified: boolean }> {
        const response = await api.post('/api/auth/identify', { identifier });
        return response.data;
    },

    async login(identifier: string, password: string): Promise<AuthResponse> {
        return this.continueAuth(identifier, password);
    },

    async signup(name: string, username: string, identifier: string, password: string, confirmPassword?: string): Promise<AuthResponse> {
        return this.continueAuth(identifier, password, username, confirmPassword, name);
    },

    async continueAuth(identifier: string, password?: string, username?: string, confirmPassword?: string, name?: string): Promise<AuthResponse> {
        const response = await api.post('/api/auth/continue', { identifier, password, username, confirmPassword, name });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    },

    async completeGoogleSignup(name: string, username: string, googleToken: string): Promise<AuthResponse> {
        const response = await api.post('/api/auth/google/complete', { name, username, googleToken });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    },

    googleLogin(mode: 'login' | 'signup' = 'login') {
        // Dynamic API URL Logic matching api.ts
        const isNative = Capacitor.isNativePlatform();
        const baseUrl = isNative ? 'http://10.0.2.2:3000' : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

        const platform = isNative ? 'android' : 'web';

        window.location.href = `${baseUrl}/api/auth/google?mode=${mode}&platform=${platform}`;
    },

    async getMe(): Promise<any> {
        const response = await api.get('/api/auth/me');
        return response.data;
    },

    async resetPassword(identifier: string, password: string, confirmPassword: string): Promise<{ message: string }> {
        const response = await api.post('/api/auth/reset-password', { identifier, password, confirmPassword });
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
    }
};
