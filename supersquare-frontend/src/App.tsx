import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
