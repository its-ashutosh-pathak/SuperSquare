import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export const Card: React.FC<CardProps> = ({ children, style, className, ...props }) => {
    const baseStyle: React.CSSProperties = {
        backgroundColor: '#111111',
        border: '1px solid #27272A',
        borderRadius: '1.5rem', // rounded-3xl
        boxShadow: '0 0 40px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        ...style
    };

    return (
        <div style={baseStyle} className={className} {...props}>
            {children}
        </div>
    );
};

export const CardContent: React.FC<CardProps> = ({ children, style, className, ...props }) => {
    return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', ...style }} className={className} {...props}>
            {children}
        </div>
    );
};
