import React from 'react';
import { GameState } from '../engine';

interface GameInfoProps {
    gameState: GameState;
    timeLeft?: number;
    isOnline?: boolean;
    mySymbol?: 'X' | 'O' | null;
}

export const GameInfo: React.FC<GameInfoProps> = ({ gameState, timeLeft, isOnline, mySymbol }) => {
    const { activePlayer, winner, activeBoard } = gameState;

    // Helper for winner text
    const getWinnerText = () => {
        if (winner === 'DRAW') return "It's a Draw!";
        if (!isOnline) return <>Player <span className={`player-${winner}`} style={{ fontSize: '2.5rem', verticalAlign: 'middle' }}>{winner}</span> Wins!</>;

        if (winner === mySymbol) {
            return <span style={{ color: '#FACC15' }}>You Win!</span>;
        } else {
            return <span style={{ color: '#EF4444' }}>You Lose!</span>;
        }
    };

    return (
        <div className="game-info">


            <div className="status-panel">
                {winner ? (
                    <div className="winner-banner" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                        {getWinnerText()}
                    </div>
                ) : (
                    <div className="turn-indicator">
                        Turn: <span className={`player-badge player-${activePlayer}`}>
                            {isOnline ? (
                                activePlayer === mySymbol ? "Your" : "Rival"
                            ) : (
                                activePlayer
                            )}
                        </span>
                        {activeBoard === null && <span className="free-move-badge"> (Free Move!)</span>}
                        {timeLeft !== undefined && (
                            <span className="timer-badge" style={{
                                marginLeft: '1rem',
                                color: timeLeft <= 10 ? '#EF4444' : '#FAFAFA',
                                fontWeight: 'bold'
                            }}>
                                ⏱ {timeLeft}s
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="rules-hint">
                <p>Win 3 small boards in a row to win the game.</p>
            </div>
        </div>
    );
};
