import { GameState } from './engine/types';

export interface User {
    id: string; // Username
    name: string; // Display Name
    socketId: string;
    status: 'ONLINE' | 'IN_GAME' | 'OFFLINE';
    friends: string[];
    currentRoomId?: string;
    // Requests received by this user
    incomingRequests: string[];
    lastMessageAt?: number; // Timestamp for cooldown tracking
}

export interface GameRoom {
    roomId: string;
    players: {
        X: string; // User ID
        O: string | null; // User ID, null if waiting
    };
    gameState: GameState;
    spectators: string[];
    timer?: NodeJS.Timeout; // For 60s move timer
    timerStartTime?: number; // Timestamp when timer was reset
}

class StateManager {
    users: Map<string, User> = new Map();
    rooms: Map<string, GameRoom> = new Map();
    // Map socketId -> userId
    socketUserMap: Map<string, string> = new Map();
    // Simple random matchmaking queue (Set of User IDs)
    matchmakingQueue: Set<string> = new Set();

    getUser(userId: string) {
        return this.users.get(userId);
    }

    getUserBySocket(socketId: string) {
        const userId = this.socketUserMap.get(socketId);
        if (!userId) return undefined;
        return this.users.get(userId);
    }

    createUser(userId: string, name: string, socketId: string, friends: string[] = [], incomingRequests: string[] = []): User {
        // If user exists (reconnect?), update socket
        let user = this.users.get(userId);
        if (user) {
            user.socketId = socketId;
            user.status = 'ONLINE';
            // Update name in case it changed
            user.name = name;
        } else {
            user = {
                id: userId,
                name: name,
                socketId,
                status: 'ONLINE',
                friends: friends,
                incomingRequests: incomingRequests
            };
            this.users.set(userId, user);
        }
        this.socketUserMap.set(socketId, userId);
        return user;
    }

    removeUserSocket(socketId: string) {
        const userId = this.socketUserMap.get(socketId);
        if (userId) {
            const user = this.users.get(userId);
            if (user) {
                // Only set offline if the disconnecting socket is the ACTIVE socket
                // Prevent race condition where new socket connects before old one disconnects
                if (user.socketId === socketId) {
                    user.status = 'OFFLINE';
                    // Remove from queue
                    this.matchmakingQueue.delete(userId);
                }
            }
            this.socketUserMap.delete(socketId);
        }
    }

    createRoom(roomId: string, playerX: string, playerO: string | null, initialState: GameState) {
        this.rooms.set(roomId, {
            roomId,
            players: { X: playerX, O: playerO },
            gameState: initialState,
            spectators: []
        });

        // Update players
        const uX = this.users.get(playerX);
        if (uX) { uX.status = 'IN_GAME'; uX.currentRoomId = roomId; this.matchmakingQueue.delete(playerX); }

        if (playerO) {
            const uO = this.users.get(playerO);
            if (uO) { uO.status = 'IN_GAME'; uO.currentRoomId = roomId; this.matchmakingQueue.delete(playerO); }
        }

        return this.rooms.get(roomId);
    }

    joinRoom(roomId: string, playerO: string) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        if (room.players.O) return false; // Already full

        room.players.O = playerO;

        const uO = this.users.get(playerO);
        if (uO) {
            uO.status = 'IN_GAME';
            uO.currentRoomId = roomId;
            this.matchmakingQueue.delete(playerO);
        }

        return true;
    }

    deleteRoom(roomId: string) {
        const room = this.rooms.get(roomId);
        if (room) {
            const uX = this.users.get(room.players.X);
            if (uX && uX.currentRoomId === roomId) { uX.status = 'ONLINE'; uX.currentRoomId = undefined; }

            const uO = room.players.O ? this.users.get(room.players.O) : undefined;
            if (uO && uO.currentRoomId === roomId) { uO.status = 'ONLINE'; uO.currentRoomId = undefined; }

            this.rooms.delete(roomId);
        }
    }
}

export const state = new StateManager();
