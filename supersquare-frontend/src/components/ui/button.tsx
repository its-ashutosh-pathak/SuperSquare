import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, className, style, variant = 'primary', ...props }) => {
    const baseStyle: React.CSSProperties = {
        padding: '0 1.5rem',
        height: '3rem', // h-12
        borderRadius: '1rem', // rounded-2xl
        border: 'none',
        fontWeight: 600,
        fontSize: '1rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        width: '100%', // Default to full width as per usage, or can be overridden
        ...style
    };

    return (
        <button
            style={baseStyle}
            className={className} // Pass through for potential CSS file usage if needed
            {...props}
        >
            {children}
        </button>
    );
};
