import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import { MobileContainer } from '../components/MobileContainer';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // Auth Redirect Logic
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/lobby');
        }
    }, [isAuthenticated, navigate]);

    return (
        <MobileContainer style={{ justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>

            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{ position: 'relative', zIndex: 10, width: '100%' }}
            >
                <Card>
                    <CardContent>

                        {/* Logo / Title */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.025em', lineHeight: 1 }}>
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
                            <p style={{ fontSize: '0.7rem', color: '#71717A', margin: '0.05rem 0 0 0' }}>
                                Made with ❤️ by Ashutosh Pathak
                            </p>
                        </div>

                        {/* Mode hint */}
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', marginTop: '0.05rem', marginBottom: '0.05rem' }}>
                            <p style={{ fontSize: '0.875rem', color: '#A1A1AA', letterSpacing: '0.025em', margin: 0 }}>
                                The Ultimate Tic-Tac-Toe Experience
                            </p>
                            <div style={{ fontSize: '0.75rem', color: '#71717A' }}>
                                Strategic multiplayer board game
                            </div>
                        </div>

                        {/* Primary Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Login */}
                            <Button
                                style={{
                                    backgroundColor: '#D97706',
                                    color: 'black',
                                    boxShadow: '0 0 20px rgba(217,119,6,0.35)'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b45309')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D97706')}
                                onClick={() => navigate('/login')}
                            >
                                Login
                            </Button>

                            {/* Sign Up */}
                            <Button
                                style={{
                                    backgroundColor: '#2563EB',
                                    color: 'white',
                                    boxShadow: '0 0 16px rgba(37,99,235,0.25)'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
                                onClick={() => navigate('/signup')}
                            >
                                Sign Up
                            </Button>

                            {/* Divider */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                                <div style={{ flexGrow: 1, borderTop: '1px solid #27272A' }} />
                            </div>

                            {/* Offline Play (Local) */}
                            <Button
                                style={{
                                    backgroundColor: '#1F1F1F',
                                    border: '1px solid #3F3F46',
                                    color: '#FACC15'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#262626')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1F1F1F')}
                                onClick={() => navigate('/play/offline')}
                            >
                                Offline Play (Local)
                            </Button>
                        </div>

                        {/* Footer */}
                        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#71717A' }}>
                            Play online with friends or offline on one device
                        </div>

                    </CardContent>
                </Card>
            </motion.div>

            {/* Hover logic helper since we use inline styles */}
            <style>{`
                button:hover { transform: scale(1.02); }
                button:active { transform: scale(0.98); }
            `}</style>
        </MobileContainer>
    );
};

export default Home;
