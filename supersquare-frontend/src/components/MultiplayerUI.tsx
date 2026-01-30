import React, { useState } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer';

interface MultiplayerUIProps {
    mpHook: ReturnType<typeof useMultiplayer>;
    onLogin: (id: string) => void;
}

export const MultiplayerUI: React.FC<MultiplayerUIProps> = ({ mpHook, onLogin }) => {
    const [inputUserId, setInputUserId] = useState('');
    const [friendInput, setFriendInput] = useState('');

    const {
        isConnected, userProfile, friends, incomingRequests,
        sendFriendRequest, respondFriendRequest, findMatch, isSearching, errorMsg, clearError
    } = mpHook;

    if (!isConnected || !userProfile) {
        return (
            <div className="mp-login">
                <h2>Online Multiplayer</h2>
                <input
                    value={inputUserId}
                    onChange={e => setInputUserId(e.target.value)}
                    placeholder="Enter Username"
                />
                <button onClick={() => onLogin(inputUserId)}>Connect</button>
            </div>
        );
    }

    return (
        <div className="mp-dashboard">
            <div className="mp-header">
                <h3>Welcome, {userProfile.id}</h3>
                <div className="mp-status">Status: <span className="online-dot">●</span> Online</div>
            </div>

            {errorMsg && (
                <div className="mp-error">
                    {errorMsg}
                    <button onClick={clearError}>x</button>
                </div>
            )}

            <div className="mp-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <button
                    className={`match-btn ${isSearching ? 'searching' : ''}`}
                    onClick={findMatch}
                    disabled={isSearching}
                    style={{ gridColumn: 'span 2' }}
                >
                    {isSearching ? 'Finding Match...' : 'Find Random Match'}
                </button>

                <button className="secondary-btn" onClick={mpHook.createRoom}>
                    Create Private Room
                </button>
                <button className="secondary-btn" onClick={() => {
                    const code = prompt("Enter Room Code:");
                    if (code) mpHook.joinRoom(code);
                }}>
                    Join Room
                </button>
            </div>

            {mpHook.roomId && !mpHook.mpGameState && (
                <div className="mp-waiting" style={{ textAlign: 'center', marginTop: '20px', padding: '20px', background: 'var(--board-bg)', border: '1px solid var(--board-lines)', borderRadius: '8px' }}>
                    <h3>Waiting for Opponent</h3>
                    <p style={{ fontSize: '1.25rem', margin: '10px 0' }}>Room Code: <strong style={{ color: 'var(--active-highlight)', letterSpacing: '2px' }}>{mpHook.roomId}</strong></p>
                    <p style={{ fontSize: '0.9rem', color: '#888' }}>Share this code with a friend.</p>
                </div>
            )}

            <div className="mp-actions-grid" style={{ display: 'none' }}> {/* Keeping structure clean, moved buttons up */}

                <button className="tertiary-btn" style={{ gridColumn: 'span 2', textAlign: 'center' }} onClick={() => alert('Leaderboard coming soon!')}>
                    🏆 Leaderboard
                </button>
            </div>

            <div className="mp-social">
                <h4>Friends</h4>
                <div className="add-friend">
                    <input
                        value={friendInput}
                        onChange={e => setFriendInput(e.target.value)}
                        placeholder="Friend ID"
                    />
                    <button onClick={() => { sendFriendRequest(friendInput); setFriendInput(''); }}>+</button>
                </div>

                {(incomingRequests || []).length > 0 && (
                    <div className="friend-requests">
                        <h5>Requests</h5>
                        {(incomingRequests || []).map(reqId => (
                            <div key={reqId} className="request-item">
                                <span>{reqId}</span>
                                <button onClick={() => respondFriendRequest(reqId, true)}>✓</button>
                                <button onClick={() => respondFriendRequest(reqId, false)}>✗</button>
                            </div>
                        ))}
                    </div>
                )}

                <ul className="friends-list">
                    {(friends || []).map(fid => (
                        <li key={fid}>{fid}</li>
                    ))}
                    {(friends || []).length === 0 && <li className="empty-msg">No friends yet</li>}
                </ul>
            </div>

            <style>{`
                .mp-actions-grid .secondary-btn {
                    background: var(--board-lines);
                    color: var(--text-color);
                    border: 1px solid var(--board-lines);
                    padding: 0.8rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                }
                .mp-actions-grid .secondary-btn:hover {
                    background: var(--cell-hover);
                }
                 .mp-actions-grid .tertiary-btn {
                    background: transparent;
                    color: var(--active-highlight);
                    border: 1px solid var(--board-lines);
                    padding: 0.6rem;
                    border-radius: 6px;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};
