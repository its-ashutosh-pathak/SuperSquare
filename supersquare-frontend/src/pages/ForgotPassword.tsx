import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { motion } from 'framer-motion';
import { MobileContainer } from '../components/MobileContainer';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: Contact, 1: OTP, 2: New Password
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [contact, setContact] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const sendOtp = async () => {
        if (!contact) { setError("Please enter Email"); return; }
        setLoading(true); setError('');
        try {
            await authService.requestOtp(contact, 'reset');
            setStep(1);
        } catch (err: any) {
            // Backend now returns 404 for User Not Found
            setError(err.response?.data?.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp) { setError("Enter OTP"); return; }
        setLoading(true); setError('');
        try {
            await authService.verifyOtp(contact, otp, 'reset');
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) { setError("Enter new password"); return; }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match"); return;
        }

        setLoading(true); setError('');
        try {
            await authService.resetPassword(contact, newPassword, confirmPassword);
            alert('Password Reset Successful! Please Login.');
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to reset password");
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
                            <p style={{ fontSize: '0.875rem', color: '#A1A1AA', margin: 0 }}>Reset Password</p>
                        </div>

                        {/* Step 0: Enter Contact */}
                        {step === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
                                    Enter your email to receive a reset code.
                                </p>
                                <Input
                                    placeholder="Email"
                                    value={contact}
                                    onChange={e => setContact(e.target.value)}
                                />
                                {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

                                <Button
                                    style={{ width: '100%', backgroundColor: '#D97706', color: 'black', fontWeight: 600 }}
                                    onClick={sendOtp}
                                    disabled={loading}
                                >
                                    {loading ? 'Sending...' : 'Send Code'}
                                </Button>
                            </div>
                        )}

                        {/* Step 1: Verify OTP */}
                        {step === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
                                    Enter 6-digit OTP sent to {contact}
                                </p>
                                <Input
                                    placeholder="Enter OTP"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    maxLength={6}
                                />
                                {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

                                <Button
                                    style={{ width: '100%', backgroundColor: '#D97706', color: 'black', fontWeight: 600 }}
                                    onClick={verifyOtp}
                                    disabled={loading}
                                >
                                    {loading ? 'Verifying...' : 'Verify'}
                                </Button>
                                <Button
                                    onClick={() => setStep(0)}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#1F1F1F',
                                        border: '1px solid #3F3F46',
                                        color: '#FACC15',
                                        fontWeight: 600
                                    }}
                                >
                                    Change Email
                                </Button>
                            </div>
                        )}

                        {/* Step 2: New Password */}
                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Input
                                    type="password"
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                                <Input
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                                {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

                                <Button
                                    style={{ width: '100%', backgroundColor: '#D97706', color: 'black', fontWeight: 600 }}
                                    onClick={handleResetPassword}
                                    disabled={loading}
                                >
                                    {loading ? 'Updating...' : 'Update Password'}
                                </Button>
                            </div>
                        )}

                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <span
                                onClick={() => navigate('/login')}
                                style={{ color: '#71717A', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'none' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#A1A1AA'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#71717A'}
                            >
                                Back to Login
                            </span>
                        </div>

                    </CardContent>
                </Card>
            </motion.div>
        </MobileContainer>
    );
};
