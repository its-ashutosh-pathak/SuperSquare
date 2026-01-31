import { io, Socket } from 'socket.io-client';
import { GameState } from '../engine/types';

// Events we emit
export interface ClientToServerEvents {
    LOGIN: (payload: { userId: string }) => void;
    SEND_FRIEND_REQ: (payload: { targetUserId: string }) => void;
    RESPOND_FRIEND_REQ: (payload: { targetUserId: string, accept: boolean }) => void;
    FIND_MATCH: () => void;
    CREATE_ROOM: () => void;
    JOIN_ROOM: (payload: { roomId: string }) => void;
    MAKE_MOVE: (payload: { roomId: string, move: { mainRow: number, mainCol: number, subRow: number, subCol: number } }) => void;
    SEARCH_USERS: (payload: { query: string }) => void;
    SEND_GAME_INVITE: (payload: { targetUserId: string }) => void;
    RESPOND_GAME_INVITE: (payload: { targetUserId: string, accept: boolean }) => void;
    SEND_MESSAGE: (payload: { roomId: string, message: string }) => void;
}

// Events we listen to
export interface ServerToClientEvents {
    LOGIN_SUCCESS: (payload: { user: UserProfile, friends: string[], requests: string[] }) => void;
    FRIEND_STATUS: (payload: { userId: string, status: string }) => void;
    FRIEND_REQ_RECEIVED: (payload: { fromUser: string }) => void;
    FRIEND_REQ_REMOVED: (payload: { userId: string }) => void;
    FRIEND_ADDED: (payload: { userId: string, status: string }) => void;
    PROFILE_UPDATED: (payload: { elo: number, wins: number, losses: number, gamesPlayed: number }) => void;
    GAME_START: (payload: { roomId: string, opponentId: string, opponentName: string, opponentUsername: string, opponentProfilePicture?: string, symbol: 'X' | 'O', initialState: GameState, timeLeft: number }) => void;
    GAME_UPDATE: (payload: { gameState: GameState, timeLeft: number }) => void;
    ROOM_CREATED: (payload: { roomId: string }) => void;
    OPPONENT_DISCONNECTED: () => void;
    SEARCH_RESULTS: (payload: { results: any[] }) => void;
    GAME_OVER: (payload: { winnerId: string | null, isDraw: boolean, reason: string }) => void;
    GAME_INVITE_RECEIVED: (payload: { fromUser: string, fromUserName: string, fromUserProfilePicture?: string }) => void;
    GAME_INVITE_REJECTED: (payload: { targetUserName: string }) => void;
    ERROR: (payload: { message: string }) => void;
    MESSAGE_RECEIVED: (payload: { senderId: string, message: string, timestamp: number }) => void;
}

export interface UserProfile {
    id: string;
    status: string;
    friends: string[];
}

class SocketService {
    public socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

    connect(userId: string) {
        // In dev, assuming localhost:3000. In prod, use relative or env var
        this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000'); // Adjust for prod

        this.socket.on('connect', () => {
            console.log('Connected to server, logging in...');
            this.socket?.emit('LOGIN', { userId });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
