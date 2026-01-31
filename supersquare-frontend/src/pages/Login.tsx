import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { motion } from 'framer-motion';
import { MobileContainer } from '../components/MobileContainer';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const err = params.get('error');
        if (err === 'NoAccountFoundSignupRequired') {
            setError('No account found by this Google account. Try making a new one by signing up.');
        } else if (err === 'GoogleAuthFailed') {
            setError('Google Authentication failed. Please try again.');
        }
    }, [location]);

    const handleGoogleLogin = () => {
        authService.googleLogin('login');
    };

    const handleManualLogin = async () => {
        setError('');
        if (!identifier || !password) {
            setError('Please enter all fields');
            return;
        }

        setLoading(true);
        try {
            // Using restored 'login' method which maps to 'continue'
            const data = await authService.login(identifier, password);
            login(data.user);
            navigate('/lobby');
        } catch (err: any) {
            console.error("Login failed", err);
            // If backend returns "USERNAME_REQUIRED", it implies user doesn't exist (in the unified flow logic).
            // For this UI, we treat it as "Account not found / Invalid credentials".
            if (err.response?.data?.code === 'USERNAME_REQUIRED') {
                setError('Account not found. Please Sign Up.');
            } else {
                setError(err.response?.data?.message || 'Login failed. Check credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileContainer style={{ justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>

            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ position: 'relative', zIndex: 10, width: '100%' }}
            >
                <Card>
                    <CardContent>

                        {/* Title */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem', marginBottom: '0.1rem' }}>
                            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
                                <span style={{
                                    backgroundImage: 'linear-gradient(to right, #EF4444, #FBBF24, #3B82F6)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    color: 'transparent'
                                }}>
                                    SuperSquare
                                </span>
                            </h1>
                            <p style={{ fontSize: '0.7rem', color: '#71717A', margin: '0.05rem 0 0.5rem 0' }}>
                                Made with ❤️ by <a href="https://www.linkedin.com/in/its-ashutosh-pathak" target="_blank" rel="noopener noreferrer" style={{ color: '#71717A', textDecoration: 'none' }}>Ashutosh Pathak</a>
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#A1A1AA', margin: 0 }}>Login</p>
                        </div>

                        {/* Google Login */}
                        <Button
                            style={{
                                width: '100%',
                                height: '2.75rem',
                                borderRadius: '0.75rem',
                                backgroundColor: 'white',
                                color: 'black',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            onClick={handleGoogleLogin}
                        >
                            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.23 9.22 3.25l6.9-6.9C35.9 2.02 30.3 0 24 0 14.64 0 6.52 5.38 2.56 13.22l8.04 6.25C12.6 13.6 17.9 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.5 24.5c0-1.67-.15-3.27-.43-4.83H24v9.14h12.7c-.55 2.96-2.19 5.46-4.65 7.14l7.52 5.83c4.4-4.06 6.93-10.04 6.93-17.28z" />
                                <path fill="#FBBC05" d="M10.6 28.47a14.5 14.5 0 0 1 0-8.94l-8.04-6.25A23.97 23.97 0 0 0 0 24c0 3.87.93 7.53 2.56 10.72l8.04-6.25z" />
                                <path fill="#34A853" d="M24 48c6.3 0 11.6-2.08 15.47-5.67l-7.52-5.83c-2.08 1.4-4.74 2.23-7.95 2.23-6.1 0-11.4-4.1-13.4-9.97l-8.04 6.25C6.52 42.62 14.64 48 24 48z" />
                            </svg>
                            Login with Google
                        </Button>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.1rem 0' }}>
                            <div style={{ flexGrow: 1, borderTop: '1px solid #27272A' }} />
                            <span style={{ fontSize: '0.75rem', color: '#71717A' }}>OR</span>
                            <div style={{ flexGrow: 1, borderTop: '1px solid #27272A' }} />
                        </div>

                        {/* Credentials */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.07rem' }}>
                            <Input
                                placeholder="UserID or Email"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />

                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            {error && <div style={{ color: '#EF4444', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

                            <div style={{ textAlign: 'right' }}>
                                <button
                                    onClick={() => navigate('/forgot-password')}
                                    style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '0.75rem', cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>

                        {/* Login Button */}
                        <Button
                            style={{
                                width: '100%',
                                height: '2.75rem',
                                borderRadius: '0.75rem',
                                backgroundColor: '#D97706',
                                color: 'black',
                                fontWeight: 600,
                                boxShadow: '0 0 20px rgba(217,119,6,0.35)',
                                marginTop: '0.07rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b45309'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                            onClick={handleManualLogin}
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>

                        {/* Footer */}
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#A1A1AA', marginTop: '0.1rem' }}>
                            Don’t have an account?{' '}
                            <span
                                onClick={() => navigate('/signup')}
                                style={{ color: '#FACC15', cursor: 'pointer' }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                                Sign Up
                            </span>
                        </div>

                    </CardContent>
                </Card>
            </motion.div>
        </MobileContainer>
    );
};

export default Login;
