import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { motion } from 'framer-motion';
import { MobileContainer } from '../components/MobileContainer';

const Signup: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Fields
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // State
    const [step, setStep] = useState<'DETAILS' | 'OTP' | 'VERIFIED'>('DETAILS');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [verified, setVerified] = useState(false);

    const handleGoogleSignup = () => {
        authService.googleLogin('signup');
    };

    const handleSendOtp = async () => {
        if (!identifier) { setError("Please enter Email"); return; }
        setLoading(true); setError('');
        try {
            await authService.requestOtp(identifier, 'signup');
            setOtpSent(true);
            setStep('OTP');
        } catch (e: any) {
            setError(e.response?.data?.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) { setError("Enter OTP"); return; }
        setLoading(true); setError('');
        try {
            await authService.verifyOtp(identifier, otp, 'signup');
            setVerified(true);
            setStep('VERIFIED');
        } catch (e: any) {
            setError("Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!name || !username || !password || !confirmPassword) {
            setError("All fields required"); return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match"); return;
        }

        setLoading(true); setError('');
        try {
            const data = await authService.signup(name, username, identifier, password, confirmPassword);
            login(data.user);
            navigate('/lobby');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileContainer style={{ justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ position: 'relative', zIndex: 10, width: '100%' }}
            >
                <Card>
                    <CardContent>

                        {/* Title */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', marginBottom: '0.7rem' }}>
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
                                Made with ❤️ by Ashutosh Pathak
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#A1A1AA', margin: 0 }}>Sign Up</p>
                        </div>

                        {/* Google Signup Button */}
                        {!otpSent && !verified && (
                            <>
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
                                    onClick={handleGoogleSignup}
                                >
                                    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.23 9.22 3.25l6.9-6.9C35.9 2.02 30.3 0 24 0 14.64 0 6.52 5.38 2.56 13.22l8.04 6.25C12.6 13.6 17.9 9.5 24 9.5z" />
                                        <path fill="#4285F4" d="M46.5 24.5c0-1.67-.15-3.27-.43-4.83H24v9.14h12.7c-.55 2.96-2.19 5.46-4.65 7.14l7.52 5.83c4.4-4.06 6.93-10.04 6.93-17.28z" />
                                        <path fill="#FBBC05" d="M10.6 28.47a14.5 14.5 0 0 1 0-8.94l-8.04-6.25A23.97 23.97 0 0 0 0 24c0 3.87.93 7.53 2.56 10.72l8.04-6.25z" />
                                        <path fill="#34A853" d="M24 48c6.3 0 11.6-2.08 15.47-5.67l-7.52-5.83c-2.08 1.4-4.74 2.23-7.95 2.23-6.1 0-11.4-4.1-13.4-9.97l-8.04 6.25C6.52 42.62 14.64 48 24 48z" />
                                    </svg>
                                    Sign up with Google
                                </Button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                                    <div style={{ flexGrow: 1, borderTop: '1px solid #333' }} />
                                    <span style={{ fontSize: '0.75rem', color: '#777' }}>OR</span>
                                    <div style={{ flexGrow: 1, borderTop: '1px solid #333' }} />
                                </div>
                            </>
                        )}

                        {/* Step 1: Identifier */}
                        {!otpSent && !verified && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Input
                                    placeholder="Email"
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                />
                                {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

                                <Button
                                    style={{ width: '100%', backgroundColor: '#D97706', color: 'black', fontWeight: 600 }}
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                >
                                    {loading ? 'Sending...' : 'Send OTP'}
                                </Button>

                                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#A1A1AA' }}>
                                    Already have an account?{' '}
                                    <span onClick={() => navigate('/login')} style={{ color: '#FACC15', cursor: 'pointer' }}>
                                        Login
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Step 2: OTP */}
                        {otpSent && !verified && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>Code sent to {identifier}</p>
                                <Input placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
                                {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
                                <Button
                                    style={{ width: '100%', backgroundColor: '#D97706', color: 'black', fontWeight: 600 }}
                                    onClick={handleVerifyOtp}
                                    disabled={loading}
                                >
                                    {loading ? 'Verifying...' : 'Verify'}
                                </Button>
                                <Button
                                    onClick={() => setOtpSent(false)}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#1F1F1F',
                                        border: '1px solid #3F3F46',
                                        color: '#FACC15',
                                        fontWeight: 600
                                    }}
                                >
                                    Back
                                </Button>
                            </div>
                        )}

                        {/* Step 3: Details */}
                        {verified && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ textAlign: 'center', color: '#10B981', fontWeight: 600, fontSize: '0.9rem' }}>Verified!</div>

                                <Input placeholder="User ID (e.g. @yourname)" value={username} onChange={e => setUsername(e.target.value)} />
                                <Input placeholder="Display Name" value={name} onChange={e => setName(e.target.value)} />
                                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                                <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />

                                {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

                                <Button
                                    style={{ width: '100%', backgroundColor: '#D97706', color: 'black', fontWeight: 600 }}
                                    onClick={handleSignup}
                                    disabled={loading}
                                >
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </div>
                        )}

                    </CardContent>
                </Card>
            </motion.div>
        </MobileContainer>
    );
};

export default Signup;
