import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // const { login } = useAuth(); // Unused, we reload or rely on auto-check

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('token', token);
            // We need to fetch user details to update context immediately
            // Or just force a reload, or rely on AuthContext's checkAuth.
            // Let's rely on checkAuth by "logging in" with a dummy payload or triggering a check.
            // Since `login` in context takes a User object, we might not have it yet.
            // Best way: Reload or call a "refresh" method.
            // We'll just navigation to '/' and let the App's AuthProvider check the token on mount? 
            // no, AuthProvider already mounted.
            // We should use `window.location.href = '/lobby'` to force a reload-ish state or just reload.
            window.location.href = '/lobby';
        } else {
            navigate('/login?error=AuthFailed');
        }
    }, [searchParams, navigate]);

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0B0B', color: 'white' }}>
            Processing Login...
        </div>
    );
};

export default AuthCallback;
