import React, { useEffect, useState } from 'react';
import { useGame } from '../hooks/useGame';
import { MainBoard } from './MainBoard';
import { GameInfo } from './GameInfo';
import { useMultiplayerContext } from '../context/MultiplayerContext';
import { useNavigate } from 'react-router-dom';
import { MobileContainer } from './MobileContainer';
import { useAuth } from '../context/AuthContext';

interface GameLayoutProps {
    initialMode: 'LOCAL' | 'ONLINE';
}

export const GameLayout: React.FC<GameLayoutProps> = ({ initialMode }) => {
    const navigate = useNavigate();

    // Contexts
    const mp = useMultiplayerContext();
    const localGame = useGame();
    const { user } = useAuth();

    // Determine State
    const isOnline = initialMode === 'ONLINE';
    const currentGameState = isOnline ? (mp.mpGameState || localGame.gameState) : localGame.gameState;
    // Fallback to local just to prevent crash if null, but explicit check preferred

    // Messaging State
    const [messageInput, setMessageInput] = useState("");
    const [lastSentTime, setLastSentTime] = useState(0);
    const [showMessageCard, setShowMessageCard] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showNewGameModal, setShowNewGameModal] = useState(false);

    // Monitor Incoming Messages
    useEffect(() => {
        if (mp.lastMessage) {
            setShowMessageCard(true);
            const timer = setTimeout(() => setShowMessageCard(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [mp.lastMessage]);

    // Dynamic Scale for Board to prevent cropping
    const [boardScale, setBoardScale] = useState(1.28);

    useEffect(() => {
        const handleResize = () => {
            // Base width of board container approx 350px (300px min-width + padding/borders)
            // We want to keep 1.28 scale if space permits, otherwise shrink.
            // Safe margin: 32px (1rem padding on each side)
            const availableWidth = window.innerWidth - 32;
            const requiredWidthForMaxScale = 350 * 1.28;

            if (availableWidth < requiredWidthForMaxScale) {
                // Determine new scale to fit
                const newScale = Math.min(1.28, availableWidth / 350);
                setBoardScale(newScale);
            } else {
                setBoardScale(1.28);
            }
        };

        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;
        if (messageInput.length > 101) return;

        const now = Date.now();
        if (now - lastSentTime < 5000) return; // Cooldown Check Frontend

        mp.sendMessage(messageInput);
        setMessageInput("");
        setLastSentTime(now);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };


    const handleMove = (mr: number, mc: number, sr: number, sc: number) => {
        if (!isOnline) {
            localGame.makeMove(mr, mc, sr, sc);
        } else {
            if (mp.mpGameState && mp.mySymbol === mp.mpGameState.activePlayer) {
                mp.makeMpMove(mr, mc, sr, sc);
            }
        }
    };

    const handleExit = () => {
        setShowExitModal(true);
    };

    const confirmExit = () => {
        setShowExitModal(false);
        if (isOnline) {
            mp.leaveRoom();
            navigate('/lobby');
        } else {
            navigate('/');
        }
    };

    const handleNewGameRequest = () => {
        setShowNewGameModal(true);
    };

    const confirmNewGame = () => {
        setShowNewGameModal(false);
        localGame.resetGame();
    };

    // If online and no room, redirect to lobby (safety)
    useEffect(() => {
        if (isOnline && !mp.roomId) {
            navigate('/lobby');
        }
    }, [isOnline, mp.roomId, navigate]);

    // Auto-redirect to lobby after game over (Online only)
    useEffect(() => {
        if (isOnline && currentGameState?.winner) {
            const timer = setTimeout(() => {
                mp.leaveRoom(); // Clean up room state
                navigate('/lobby');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, currentGameState?.winner, mp, navigate]);

    return (
        <MobileContainer>
            <div className="app-container" style={{
                width: '100%',
                height: '100%',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                position: 'relative'
            }}>
                {/* Header / Nav */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    alignItems: 'center',
                    height: '3rem',
                    width: 'calc(100% + 1rem)',
                    marginLeft: '-0.5rem',
                    padding: '0 0.75rem',
                    boxSizing: 'border-box'
                }}>
                    {/* Logo (Top Left - Wrapped in Column) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', marginLeft: '0.5rem' }}>
                        <h1 style={{
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            margin: 0,
                            padding: 0,
                            letterSpacing: '-0.05em',
                            backgroundImage: 'linear-gradient(to right, #EF4444, #FBBF24, #3B82F6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            color: 'transparent',
                            lineHeight: 1
                        }}>
                            SuperSquare
                        </h1>
                        <p style={{ fontSize: '0.7rem', color: '#A1A1AA', margin: '0.2rem 0 0 0.2rem' }}>
                            Made with ❤️ by Ashutosh Pathak
                        </p>
                    </div>

                    {/* Home Button (Top Right) */}
                    <button
                        onClick={handleExit}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#D97706',
                            border: 'none',
                            color: 'white',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            whiteSpace: 'nowrap',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FACC15'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                    >
                        Home
                    </button>
                </div>

                {/* Game Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    {isOnline && mp.opponentName && (
                        <div style={{ display: 'flex', gap: '0.05rem', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                            {/* Opponent */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.225rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '5rem' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FAFAFA' }}>
                                        {mp.opponentName}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#71717A' }}>
                                        @{mp.opponentUsername}
                                    </div>
                                </div>
                                <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#18181B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #71717A', boxShadow: '0 0 15px rgba(113, 113, 122, 0.5)' }}>
                                    {mp.opponentProfilePicture ? (
                                        <img src={mp.opponentProfilePicture} alt={mp.opponentName} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#FAFAFA' }}>
                                            {mp.opponentName?.charAt(0).toUpperCase() || 'I'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <img src="/vs-icon.png" alt="VS" style={{ width: '5rem', height: '5rem', objectFit: 'contain', margin: '0 0.25rem' }} />

                            {/* You */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.225rem' }}>
                                <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#18181B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #FACC15', boxShadow: '0 0 15px rgba(250, 204, 21, 0.5)' }}>
                                    {user?.profilePicture ? (
                                        <img src={user.profilePicture} alt="You" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '2.25rem', fontWeight: 700, color: '#FACC15' }}>
                                            {user?.name?.charAt(0).toUpperCase() || 'S'}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '5rem' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FACC15' }}>
                                        {user?.name || 'Super'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#71717A' }}>
                                        @{user?.username}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {isOnline && !mp.mpGameState ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                        Loading Game State...
                    </div>
                ) : (
                    <>
                        <GameInfo
                            gameState={currentGameState}
                            timeLeft={isOnline ? mp.timeLeft : localGame.timeLeft}
                            isOnline={isOnline}
                            mySymbol={mp.mySymbol}
                        />

                        {/* Game Board & Messaging */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', width: '100%', position: 'relative' }}>
                            <div className="game-board-container" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: `scale(${boardScale}) translateY(${isOnline ? '-10%' : '-20%'})`,
                                marginBottom: isOnline ? '4rem' : '0' // Make space for input if online
                            }}>
                                <MainBoard gameState={currentGameState} onMove={handleMove} />
                            </div>

                            {/* Messaging Interface (Online Only) */}
                            {isOnline && (
                                <div style={{
                                    width: '90%',
                                    position: 'absolute',
                                    bottom: '1rem',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 50
                                }}>
                                    {/* Message Card (Pops up above input) */}
                                    {showMessageCard && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: 0,
                                            right: 0,
                                            marginBottom: '0.5rem',
                                            backgroundColor: '#18181B',
                                            border: '1px solid #27272A',
                                            borderRadius: '0.75rem',
                                            padding: '0.75rem',
                                            maxHeight: '100px',
                                            overflowY: 'auto',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                            animation: 'fadeIn 0.2s ease-out',
                                            zIndex: 60
                                        }}>
                                            {mp.errorMsg ? (
                                                <div style={{ fontSize: '0.8rem', color: '#EF4444', textAlign: 'center', fontWeight: 'bold' }}>
                                                    {mp.errorMsg}
                                                </div>
                                            ) : mp.lastMessage ? (
                                                <>
                                                    <div style={{ fontSize: '0.75rem', color: '#A1A1AA', marginBottom: '0.25rem' }}>
                                                        {mp.lastMessage.senderId === user?.username ? 'You' : mp.lastMessage.senderId}
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', color: '#FAFAFA', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        {mp.lastMessage.message}
                                                    </div>
                                                </>
                                            ) : (
                                                <div style={{ fontSize: '0.8rem', color: '#71717A', fontStyle: 'italic', textAlign: 'center' }}>
                                                    No recent messages
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Input Bar Container */}
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            placeholder="Type a message..."
                                            maxLength={101}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={Date.now() - lastSentTime < 5000}
                                            onFocus={() => setShowMessageCard(true)}
                                            onClick={() => setShowMessageCard(true)}
                                            // onBlur removed to prevent closing when clicking Send button
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem 1rem',
                                                borderRadius: '0.75rem',
                                                backgroundColor: '#18181B',
                                                border: '1px solid #27272A',
                                                color: '#FAFAFA',
                                                fontSize: '0.95rem',
                                                outline: 'none',
                                                opacity: (Date.now() - lastSentTime < 5000) ? 0.5 : 1,
                                                cursor: (Date.now() - lastSentTime < 5000) ? 'not-allowed' : 'text',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!messageInput.trim() || Date.now() - lastSentTime < 5000}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '0.75rem',
                                                backgroundColor: '#3B82F6',
                                                border: 'none',
                                                color: 'white',
                                                cursor: (!messageInput.trim() || Date.now() - lastSentTime < 5000) ? 'not-allowed' : 'pointer',
                                                opacity: (!messageInput.trim() || Date.now() - lastSentTime < 5000) ? 0.5 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Offline Reset Button */}
                {!isOnline && (
                    <div style={{
                        position: 'absolute',
                        bottom: '10%',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        zIndex: 20,
                        pointerEvents: 'none'
                    }}>
                        <button
                            className="reset-btn"
                            onClick={handleNewGameRequest}
                            style={{
                                pointerEvents: 'auto',
                                background: '#D97706',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                width: 'auto',
                                minWidth: '140px',
                                borderRadius: '16px',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FACC15'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                        >
                            New Game
                        </button>
                    </div>
                )}
                {/* Exit Confirmation Modal */}
                {showExitModal && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            width: '85%',
                            backgroundColor: '#18181B',
                            border: '1px solid #27272A',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.5rem',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                        }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FAFAFA', textAlign: 'center' }}>
                                Do you wanna leave the match?
                            </h3>

                            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                <button
                                    onClick={confirmExit}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#EF4444', // Red
                                        color: 'white',
                                        fontWeight: 700,
                                        border: 'none',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setShowExitModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#D97706', // Amber
                                        color: 'white',
                                        fontWeight: 700,
                                        border: 'none',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Game Confirmation Modal */}
                {showNewGameModal && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            width: '85%',
                            backgroundColor: '#18181B',
                            border: '1px solid #27272A',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.5rem',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                        }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FAFAFA', textAlign: 'center' }}>
                                Start a new game?
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: '#A1A1AA', textAlign: 'center', margin: '-0.5rem 0 0 0' }}>
                                Current progress will be lost.
                            </p>

                            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                <button
                                    onClick={confirmNewGame}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#EF4444', // Red
                                        color: 'white',
                                        fontWeight: 700,
                                        border: 'none',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setShowNewGameModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#D97706', // Amber
                                        color: 'white',
                                        fontWeight: 700,
                                        border: 'none',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MobileContainer>
    );
};
