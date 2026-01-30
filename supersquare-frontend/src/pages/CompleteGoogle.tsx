import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { motion } from 'framer-motion';
import { MobileContainer } from '../components/MobileContainer';

const CompleteGoogle: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!token) return;
        if (!name || !username) {
            setError("Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            // Note: service method signature needs update or we pass object
            // Using existing pattern but sending name instead of phone for now, needs service update too
            // Actually, I should check auth.service.ts next.
            // For now assuming I will update service to accept (name, username, token)
            await authService.completeGoogleSignup(name, username, token); // Changed args
            const me = await authService.getMe(); // Re-fetch or rely on return? Service usually returns user.
            // Relying on service internal token handling or updated return.
            // Let's assume completeGoogleSignup returns { token, user } like login.

            // Re-login to be sure context is updated
            const data = await authService.getMe();
            login(data);

            navigate('/lobby');
        } catch (err: any) {
            console.error("Complete Google Error", err);
            setError(err.response?.data?.message || "Failed to complete signup");
        } finally {
            setLoading(false);
        }
    };

    if (!token) return <div>Invalid Session</div>;

    return (
        <MobileContainer style={{ justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ position: 'relative', zIndex: 10, width: '100%' }}
            >
                <Card>
                    <CardContent style={{ padding: '2rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                                Finish Setup
                            </h1>
                            <p style={{ color: '#A1A1AA', fontSize: '0.875rem' }}>
                                Continue as <strong style={{ color: 'white' }}>{email}</strong>
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', color: '#A1A1AA', marginLeft: '0.25rem' }}>User ID</label>
                                <Input
                                    placeholder="Choose unique user ID (e.g. @yourname)"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', color: '#A1A1AA', marginLeft: '0.25rem' }}>Display Name</label>
                                <Input
                                    placeholder="Your display name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div style={{ color: '#EF4444', fontSize: '0.875rem', textAlign: 'center' }}>
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{ width: '100%', backgroundColor: '#2563EB', color: 'white', fontWeight: 600 }}
                            >
                                {loading ? 'Creating Account...' : 'Complete Signup'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </MobileContainer>
    );
};

export default CompleteGoogle;
