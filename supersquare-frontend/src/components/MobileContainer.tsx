import React, { ReactNode } from 'react';

interface MobileContainerProps {
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children, className, style }) => {
    // Responsive Mobile Container
    const containerStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '420px', // Wider Modern Android Standard (e.g. Pixel/Samsung Ultra) to prevent cramping
        height: '100%',
        maxHeight: '920px', // Taller aspect ratio
        margin: '0 auto',
        position: 'relative',
        backgroundColor: '#0B0B0B',
        color: '#FAFAFA',
        overflow: 'hidden', // Default hidden, overridden by style prop if needed
        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
        border: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
        ...style
    };

    const gridOverlayStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(to right, #27272A 1px, transparent 1px), linear-gradient(to bottom, #27272A 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        opacity: 0.06,
        pointerEvents: 'none',
        zIndex: 0
    };

    // Viewport wrapper
    const wrapperStyle: React.CSSProperties = {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050505',
        backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 0)',
        backgroundSize: '20px 20px',
        padding: '0.5rem', // Minimal padding to maximize app size on small screens
        boxSizing: 'border-box',
        overflow: 'hidden' // Prevent body scroll
    };

    return (
        <div style={wrapperStyle}>
            <div style={containerStyle} className={className}>
                <div style={gridOverlayStyle} />
                {children}
            </div>
        </div>
    );
};
