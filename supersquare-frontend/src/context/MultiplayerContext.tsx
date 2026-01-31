import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { socketService, UserProfile } from '../services/socket';
import { GameState } from '../engine/types';

export interface Friend {
    id: string;
    name: string;
    status: 'ONLINE' | 'OFFLINE' | 'IN_GAME';
    lastActiveAt?: string; // ISO date string
    profilePicture?: string;
    elo?: number;
    wins?: number;
    losses?: number;
    gamesPlayed?: number;
    rank?: number;
}

export interface FriendRequest {
    id: string;
    name: string;
    profilePicture?: string;
    elo?: number;
    wins?: number;
    losses?: number;
    gamesPlayed?: number;
    rank?: number;
}

export interface GameInvite {
    fromUser: string;
    fromUserName: string;
    fromUserProfilePicture?: string;
}

interface MultiplayerContextType {
    isConnected: boolean;
    isSearching: boolean;
    userProfile: UserProfile | null;
    friends: Friend[];
    incomingRequests: FriendRequest[];
    incomingGameInvites: GameInvite[];
    searchResults: Friend[]; // Reuse Friend type since it has the stats structure
    roomId: string | null;
    opponentId: string | null;
    opponentName: string | null;
    opponentUsername: string | null;
    opponentProfilePicture: string | null;
    mySymbol: 'X' | 'O' | null;
    mpGameState: GameState | null;
    timeLeft: number; // Timer for online mode
    lastMessage: { senderId: string, message: string, timestamp: number } | null; // Ephemeral Message
    sendMessage: (text: string) => void;
    errorMsg: string | null;

    // Actions
    findMatch: () => void;
    searchUsers: (query: string) => void;
    clearSearchResults: () => void;
    createRoom: () => void;
    joinRoom: (roomId: string) => void;
    leaveRoom: () => void;
    makeMpMove: (mainRow: number, mainCol: number, subRow: number, subCol: number) => void;
    sendFriendRequest: (targetId: string) => void;
    respondFriendRequest: (targetId: string, accept: boolean) => void;
    sendGameInvite: (targetId: string) => void;
    respondGameInvite: (targetId: string, accept: boolean) => void;
    clearError: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { updateUserStats, user } = useAuth();

    // State mirroring useMultiplayer hook logic but persistent
    const [isConnected, setIsConnected] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
    const [incomingGameInvites, setIncomingGameInvites] = useState<GameInvite[]>([]);
    const [searchResults, setSearchResults] = useState<Friend[]>([]); // New state

    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [opponentName, setOpponentName] = useState<string | null>(null);
    const [opponentUsername, setOpponentUsername] = useState<string | null>(null);
    const [opponentProfilePicture, setOpponentProfilePicture] = useState<string | null>(null);
    const [mySymbol, setMySymbol] = useState<'X' | 'O' | null>(null);
    const [mpGameState, setMpGameState] = useState<GameState | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(60); // Timer state
    const [lastMessage, setLastMessage] = useState<{ senderId: string, message: string, timestamp: number } | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Refs for accessing state in socket listeners (stale closure fix)
    const mySymbolRef = useRef(mySymbol);
    useEffect(() => { mySymbolRef.current = mySymbol; }, [mySymbol]);

    // Initialize Connection on Auth
    useEffect(() => {
        if (!user?.username) return;

        socketService.connect(user.username);
        const socket = socketService.socket;

        if (!socket) return;

        setIsConnected(true);

        const onLoginSuccess = ({ user, friends: friendsList, requests }: any) => {
            setUserProfile(user);
            setFriends(friendsList || []);
            setIncomingRequests(requests || []);
            setIsSearching(false);
        };

        const onFriendReq = ({ fromUser, fromUserName, profilePicture, elo, wins, losses, gamesPlayed, rank }: any) => {
            setIncomingRequests(prev => {
                if (prev.find(r => r.id === fromUser)) return prev;
                return [...prev, {
                    id: fromUser,
                    name: fromUserName || fromUser,
                    profilePicture,
                    elo,
                    wins,
                    losses,
                    gamesPlayed,
                    rank
                }];
            });
        };

        const onFriendAdded = ({ userId, name, status, profilePicture, elo, wins, losses, gamesPlayed, rank }: any) => {
            setFriends(prev => {
                if (prev.find(f => f.id === userId)) return prev.map(f => f.id === userId ? { ...f, status } : f);
                return [...prev, {
                    id: userId,
                    name: name || userId,
                    status: status || 'OFFLINE',
                    profilePicture,
                    elo, wins, losses, gamesPlayed, rank
                }];
            });
        };

        const onFriendStatus = ({ userId, status, lastActiveAt }: any) => {
            setFriends(prev => prev.map(f => f.id === userId ? { ...f, status, lastActiveAt } : f));
        };

        const onGameStart = ({ roomId, opponentId, opponentName, opponentUsername, opponentProfilePicture, symbol, initialState, timeLeft: initialTime }: any) => {
            setRoomId(roomId);
            setOpponentId(opponentId);
            setOpponentName(opponentName || opponentId);
            setOpponentUsername(opponentUsername || opponentId);
            setOpponentProfilePicture(opponentProfilePicture || null);
            setMySymbol(symbol);
            setMpGameState(initialState);
            setTimeLeft(initialTime || 60); // Sync timer from backend
            setIsSearching(false);
        };

        const onRoomCreated = ({ roomId }: any) => {
            setRoomId(roomId);
            setIsSearching(false);
            setMpGameState(null); // Waiting for opponent
        };

        const onGameUpdate = ({ gameState, timeLeft: newTime }: any) => {
            setMpGameState(gameState);
            setTimeLeft(newTime || 60); // Sync timer from backend
        };

        const onOpponentDisconnected = () => {
            setErrorMsg("Opponent Disconnected.");
            // Optional: Auto-leave or show modal? 
            // For now, let UI handle it, maybe reset game state after delay
        };

        const onGameOver = ({ winnerId, isDraw }: any) => {
            // Determine winner symbol
            let winnerSymbol: 'X' | 'O' | 'DRAW' | null = null;
            if (isDraw) {
                winnerSymbol = 'DRAW';
            } else {
                if (winnerId === user?.username) {
                    winnerSymbol = mySymbolRef.current;
                } else {
                    winnerSymbol = mySymbolRef.current === 'X' ? 'O' : 'X';
                }
            }

            setMpGameState(prev => prev ? { ...prev, winner: winnerSymbol as any } : null);
            setTimeLeft(0); // Stop timer visually
        };

        const onGameInviteReceived = (invite: GameInvite) => {
            setIncomingGameInvites(prev => [...prev.filter(i => i.fromUser !== invite.fromUser), invite]);
        };

        const onGameInviteRejected = ({ targetUserName }: any) => {
            setErrorMsg(`Game request to ${targetUserName} was rejected.`);
        };

        const onError = ({ message }: any) => {
            console.error("Socket Error:", message);
            setErrorMsg(message);
            setIsSearching(false);
        };

        const onSearchResults = ({ results }: any) => {
            setSearchResults(results || []);
        };

        const onMessageReceived = (payload: { senderId: string, message: string, timestamp: number }) => {
            console.log("SOCKET: MESSAGE_RECEIVED", payload);
            setLastMessage(payload);
        };

        const onProfileUpdated = ({ elo, wins, losses, gamesPlayed }: any) => {
            console.log("SOCKET: PROFILE_UPDATED", { elo, wins, losses, gamesPlayed });
            updateUserStats({ elo, wins, losses, gamesPlayed });
        };

        socket.on('LOGIN_SUCCESS', onLoginSuccess);
        socket.on('FRIEND_REQ_RECEIVED', onFriendReq);
        socket.on('FRIEND_ADDED', onFriendAdded);
        socket.on('FRIEND_STATUS', onFriendStatus);
        socket.on('PROFILE_UPDATED', onProfileUpdated);
        socket.on('GAME_START', onGameStart);
        socket.on('ROOM_CREATED', onRoomCreated);
        socket.on('GAME_UPDATE', onGameUpdate);
        socket.on('GAME_UPDATE', onGameUpdate);
        socket.on('GAME_OVER', onGameOver);
        socket.on('GAME_INVITE_RECEIVED', onGameInviteReceived);
        socket.on('GAME_INVITE_REJECTED', onGameInviteRejected);
        socket.on('OPPONENT_DISCONNECTED', onOpponentDisconnected);
        socket.on('MESSAGE_RECEIVED', onMessageReceived);
        socket.on('SEARCH_RESULTS', onSearchResults); // Listen
        socket.on('ERROR', onError);

        // Cleanup
        return () => {
            socket.off('LOGIN_SUCCESS', onLoginSuccess);
            socket.off('FRIEND_REQ_RECEIVED', onFriendReq);
            socket.off('FRIEND_ADDED', onFriendAdded);
            socket.off('FRIEND_STATUS', onFriendStatus);
            socket.off('PROFILE_UPDATED', onProfileUpdated);
            socket.off('GAME_START', onGameStart);
            socket.off('ROOM_CREATED', onRoomCreated);
            socket.off('GAME_UPDATE', onGameUpdate);
            socket.off('GAME_UPDATE', onGameUpdate);
            socket.off('GAME_OVER', onGameOver);
            socket.off('GAME_INVITE_RECEIVED', onGameInviteReceived);
            socket.off('GAME_INVITE_REJECTED', onGameInviteRejected);
            socket.off('OPPONENT_DISCONNECTED', onOpponentDisconnected);
            socket.off('MESSAGE_RECEIVED', onMessageReceived);
            socket.off('SEARCH_RESULTS', onSearchResults); // Cleanup
            socket.off('ERROR', onError);

            socketService.disconnect();
            setIsConnected(false);
        };
    }, [user?._id]);

    // Local countdown timer for smooth display between backend syncs
    useEffect(() => {
        if (!roomId || !mpGameState) return; // Only run during active game

        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [roomId, mpGameState]);


    const findMatch = useCallback(() => {
        setIsSearching(true);
        setErrorMsg(null);
        socketService.socket?.emit('FIND_MATCH');
    }, []);

    const searchUsers = useCallback((query: string) => {
        socketService.socket?.emit('SEARCH_USERS', { query });
    }, []);

    const clearSearchResults = useCallback(() => {
        setSearchResults([]);
    }, []);

    const createRoom = useCallback(() => {
        setErrorMsg(null);
        socketService.socket?.emit('CREATE_ROOM');
    }, []);

    const joinRoom = useCallback((roomId: string) => {
        setErrorMsg(null);
        socketService.socket?.emit('JOIN_ROOM', { roomId });
    }, []);

    const makeMpMove = useCallback((mainRow: number, mainCol: number, subRow: number, subCol: number) => {
        if (roomId) {
            socketService.socket?.emit('MAKE_MOVE', { roomId, move: { mainRow, mainCol, subRow, subCol } });
        }
    }, [roomId]);

    const sendFriendRequest = useCallback((targetId: string) => {
        socketService.socket?.emit('SEND_FRIEND_REQ', { targetUserId: targetId });
    }, []);

    const respondFriendRequest = useCallback((targetId: string, accept: boolean) => {
        socketService.socket?.emit('RESPOND_FRIEND_REQ', { targetUserId: targetId, accept });
        setIncomingRequests(prev => prev.filter(req => req.id !== targetId));
    }, []);

    const leaveRoom = useCallback(() => {
        // Implement leave room on server if needed, for now just reset local state
        setRoomId(null);
        setMpGameState(null);
        setOpponentId(null);
        setOpponentName(null);
        setOpponentUsername(null);
        setOpponentProfilePicture(null);
        setMySymbol(null);
    }, []);

    const sendGameInvite = useCallback((targetId: string) => {
        socketService.socket?.emit('SEND_GAME_INVITE', { targetUserId: targetId });
    }, []);

    const sendMessage = useCallback((message: string) => {
        if (roomId) {
            console.log("SOCKET: Sending Message...", message, roomId);
            socketService.socket?.emit('SEND_MESSAGE', { roomId, message });
        } else {
            console.warn("SOCKET: Attempted to send message without Room ID");
        }
    }, [roomId]);

    const respondGameInvite = useCallback((targetId: string, accept: boolean) => {
        socketService.socket?.emit('RESPOND_GAME_INVITE', { targetUserId: targetId, accept });
        // Optimistic remove
        setIncomingGameInvites(prev => prev.filter(i => i.fromUser !== targetId));
    }, []);

    const clearError = () => setErrorMsg(null);

    return (
        <MultiplayerContext.Provider value={{
            isConnected, isSearching, userProfile, friends, incomingRequests, searchResults, incomingGameInvites,
            roomId, opponentId, opponentName, opponentUsername, opponentProfilePicture, mySymbol, mpGameState, timeLeft, errorMsg,
            lastMessage,
            findMatch, searchUsers, clearSearchResults, createRoom, joinRoom, leaveRoom, makeMpMove,
            sendFriendRequest, respondFriendRequest, sendGameInvite, respondGameInvite, sendMessage, clearError
        }}>
            {children}
        </MultiplayerContext.Provider>
    );
};

export const useMultiplayerContext = () => {
    const context = useContext(MultiplayerContext);
    if (!context) {
        throw new Error("useMultiplayerContext must be used within MultiplayerProvider");
    }
    return context;
};
