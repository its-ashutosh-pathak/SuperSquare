import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import AuthCallback from './pages/AuthCallback';
import CompleteGoogle from './pages/CompleteGoogle';
import { GameLayout } from './components/GameLayout';
import OnlineLobby from './pages/OnlineLobby';
import { ErrorBoundary } from './components/ErrorBoundary';

import { MultiplayerProvider } from './context/MultiplayerContext';

// Deep Link Handler
const AppUrlListener = () => {
    const navigate = useNavigate();

    useEffect(() => {
        CapacitorApp.addListener('appUrlOpen', (data: any) => {
            try {
                // Example url: com.supersquare.game://auth?token=XYZ
                const url = new URL(data.url);
                if (url.host === 'auth') {
                    const token = url.searchParams.get('token');
                    if (token) {
                        navigate(`/auth-success?token=${token}`);
                    }
                }
            } catch (error) {
                console.error('Error handling deep link:', error);
            }
        });
    }, [navigate]);

    return null;
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" />;
    return children;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppUrlListener />
                <ErrorBoundary>
                    <MultiplayerProvider>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/auth-success" element={<AuthCallback />} />
                            <Route path="/complete-google" element={<CompleteGoogle />} />

                            {/* Offline Play - No Auth Required */}
                            <Route path="/play/offline" element={<GameLayout initialMode="LOCAL" />} />

                            {/* Online Lobby - Hub */}
                            <Route path="/lobby" element={
                                <ProtectedRoute>
                                    <OnlineLobby />
                                </ProtectedRoute>
                            } />

                            {/* Online Play - Active Game Session */}
                            <Route path="/play/online" element={
                                <ProtectedRoute>
                                    <GameLayout initialMode="ONLINE" />
                                </ProtectedRoute>
                            } />
                        </Routes>
                    </MultiplayerProvider>
                </ErrorBoundary>
            </Router>
        </AuthProvider>
    );
}

export default App;
