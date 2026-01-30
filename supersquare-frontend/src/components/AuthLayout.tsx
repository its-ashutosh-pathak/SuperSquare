import React, { ReactNode } from 'react';
import { MobileContainer } from './MobileContainer';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
    return (
        <MobileContainer style={{ justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
            <div className="auth-card" style={{
                background: 'var(--cell-bg)',
                padding: '2rem',
                borderRadius: '12px',
                border: '1px solid var(--board-lines)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '2rem',
                    margin: 0,
                    background: 'linear-gradient(to right, #fff, #999)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>SuperSquare</h1>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 400, color: '#888', margin: 0 }}>{title}</h2>

                {children}

            </div>
        </MobileContainer>
    );
};
