import { useEffect, useState, useCallback } from 'react';
import { socketService, UserProfile } from '../services/socket';
import { GameState } from '../engine/types';

export function useMultiplayer(userId: string) {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [friends, setFriends] = useState<string[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<string[]>([]);

    // Game State
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [mySymbol, setMySymbol] = useState<'X' | 'O' | null>(null);
    const [mpGameState, setMpGameState] = useState<GameState | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        socketService.connect(userId);
        const socket = socketService.socket;

        if (!socket) return;

        socket.on('LOGIN_SUCCESS', ({ user, friends: friendsList, requests }) => {
            setUserProfile(user);
            setFriends(friendsList || []);
            setIncomingRequests(requests || []);
            setIsSearching(false);
        });

        socket.on('FRIEND_REQ_RECEIVED', ({ fromUser }) => {
            setIncomingRequests(prev => [...prev, fromUser]);
        });

        socket.on('FRIEND_ADDED', ({ userId }) => {
            setFriends(prev => [...prev, userId]);
        });

        // Matchmaking
        socket.on('GAME_START', ({ roomId, opponentId, symbol, initialState }) => {
            setRoomId(roomId);
            setOpponentId(opponentId);
            setMySymbol(symbol);
            setMpGameState(initialState);
            setIsSearching(false);
        });

        socket.on('ROOM_CREATED', ({ roomId }) => {
            setRoomId(roomId);
            setIsSearching(false); // Created, not searching queue
            setMpGameState(null); // Waiting for start
        });

        socket.on('GAME_UPDATE', ({ gameState }) => {
            setMpGameState(gameState);
        });

        socket.on('OPPONENT_DISCONNECTED', () => {
            setErrorMsg("Opponent Disconnected. Game Over.");
            setRoomId(null); // Or keep it to show state? Let's reset for now or show modal
        });

        socket.on('ERROR', ({ message }) => {
            console.error("Server Error:", message);
            setErrorMsg(message);
        });

        return () => {
            socketService.disconnect();
        };
    }, [userId]);

    const sendFriendRequest = useCallback((targetId: string) => {
        socketService.socket?.emit('SEND_FRIEND_REQ', { targetUserId: targetId });
    }, []);

    const respondFriendRequest = useCallback((targetId: string, accept: boolean) => {
        socketService.socket?.emit('RESPOND_FRIEND_REQ', { targetUserId: targetId, accept });
        // Optimistic update
        setIncomingRequests(prev => prev.filter(id => id !== targetId));
    }, []);

    const findMatch = useCallback(() => {
        setIsSearching(true);
        setErrorMsg(null);
        socketService.socket?.emit('FIND_MATCH');
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

    return {
        isConnected: !!socketService.socket,
        userProfile,
        friends,
        incomingRequests,
        sendFriendRequest,
        respondFriendRequest,

        findMatch,
        createRoom,
        joinRoom,
        isSearching,

        roomId,
        opponentId,
        mySymbol,
        mpGameState,
        makeMpMove,

        errorMsg,
        clearError: () => setErrorMsg(null)
    };
}
