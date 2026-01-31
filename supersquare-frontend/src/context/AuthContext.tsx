import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';

interface User {
    _id: string;
    username: string;
    name?: string;
    email?: string;
    phone?: string;
    googleId?: string;
    avatar?: string;
    profilePicture?: string; // Base64 or URL
    elo: number;
    wins: number;
    losses: number;
    gamesPlayed: number;
    rank?: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (userData: any) => void; // Accepts user data or handles calling service internally (better to just set state here)
    logout: () => void;
    checkAuth: () => Promise<void>;
    updateUserStats: (stats: { elo: number; wins: number; losses: number; gamesPlayed: number }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const userData = await authService.getMe();
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            setUser(null);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = (userData: any) => {
        setUser(userData);
        // Token is handled by auth.service in the login/signup call before this
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const updateUserStats = (stats: { elo: number; wins: number; losses: number; gamesPlayed: number }) => {
        setUser(prev => prev ? { ...prev, ...stats } : null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, checkAuth, updateUserStats }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
