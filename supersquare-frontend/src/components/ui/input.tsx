import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input: React.FC<InputProps> = ({ className, style, ...props }) => {
    const baseStyle: React.CSSProperties = {
        height: '3rem', // h-12
        borderRadius: '0.75rem', // rounded-xl
        backgroundColor: '#0B0B0B',
        border: '1px solid #27272A',
        color: 'white',
        padding: '0 1rem',
        fontSize: '1rem',
        width: '100%',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s',
        ...style
    };

    return (
        <input
            style={baseStyle}
            className={className}
            onFocus={(e) => e.target.style.borderColor = '#3F3F46'}
            onBlur={(e) => e.target.style.borderColor = '#27272A'}
            {...props}
        />
    );
};
