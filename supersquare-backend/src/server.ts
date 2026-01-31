import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { state } from './state';
import { getInitialState, makeMove, isValidMove } from './engine/rules';
import { v4 as uuidv4 } from 'uuid';
import connectDB from './config/db';
import authRoutes from './routes/auth.routes';
import User from './models/User';

const MOVE_TIME_LIMIT_MS = 60000; // 60 Seconds

// Helper to handle Game Over and Stats
const handleGameOver = async (roomId: string, winnerId: string | null, draw: boolean = false, reason: string = 'CHECKMATE') => {
    const room = state.rooms.get(roomId);
    if (!room) return;

    // Clear timer
    if (room.timer) clearTimeout(room.timer);

    const { X: pX, O: pO } = room.players;
    if (!pO) return; // Should not happen in game

    console.log(`[GAME OVER] Room: ${roomId}, Winner: ${winnerId}, Draw: ${draw}, Reason: ${reason}`);

    // Update DB Stats
    try {
        if (draw) {
            await User.updateOne({ username: pX }, { $inc: { gamesPlayed: 1, elo: 5 } });
            await User.updateOne({ username: pO }, { $inc: { gamesPlayed: 1, elo: 5 } });
        } else if (winnerId) {
            const loserId = winnerId === pX ? pO : pX;
            await User.updateOne({ username: winnerId }, { $inc: { gamesPlayed: 1, wins: 1, elo: 10 } });
            await User.updateOne({ username: loserId }, { $inc: { gamesPlayed: 1, losses: 1, elo: -10 } });
        }

        // Fetch updated stats and notify players of their profile updates
        const pXUpdated = await User.findOne({ username: pX }).select('elo wins losses gamesPlayed');
        const pOUpdated = await User.findOne({ username: pO }).select('elo wins losses gamesPlayed');

        const pXSocket = state.getUser(pX)?.socketId;
        const pOSocket = state.getUser(pO)?.socketId;

        if (pXSocket && pXUpdated) {
            io.to(pXSocket).emit('PROFILE_UPDATED', {
                elo: pXUpdated.elo,
                wins: pXUpdated.wins,
                losses: pXUpdated.losses,
                gamesPlayed: pXUpdated.gamesPlayed
            });
        }

        if (pOSocket && pOUpdated) {
            io.to(pOSocket).emit('PROFILE_UPDATED', {
                elo: pOUpdated.elo,
                wins: pOUpdated.wins,
                losses: pOUpdated.losses,
                gamesPlayed: pOUpdated.gamesPlayed
            });
        }
    } catch (err) {
        console.error("Error updating stats:", err);
    }

    // Notify Players
    const pXSocket = state.getUser(pX)?.socketId;
    const pOSocket = state.getUser(pO)?.socketId;

    const payload = {
        winnerId,
        isDraw: draw,
        reason
    };

    // We'll emit GAME_OVER. Client should handle showing modal and returning to lobby.
    if (pXSocket) io.to(pXSocket).emit('GAME_OVER', payload);
    if (pOSocket) io.to(pOSocket).emit('GAME_OVER', payload);

    // Clean up room
    state.deleteRoom(roomId);
};

// Helper to reset timer
const resetTimer = (roomId: string) => {
    const room = state.rooms.get(roomId);
    if (!room) return;

    if (room.timer) clearTimeout(room.timer);

    // Track when timer was reset
    room.timerStartTime = Date.now();

    room.timer = setTimeout(() => {
        // Timeout! Active player loses.
        const activeSymbol = room.gameState.activePlayer;
        const activeUserId = activeSymbol === 'X' ? room.players.X : room.players.O;
        const winnerId = activeSymbol === 'X' ? room.players.O : room.players.X;

        console.log(`[TIMEOUT] Room: ${roomId}. Player ${activeUserId} ran out of time.`);

        // Notify specifically about timeout? Or just Game Over with winner?
        // Let's pass 'TIMEOUT' as reason if we modify handleGameOver signature or payload
        // For now, reuse handleGameOver but we might want to send reason.

        // Let's modify handleGameOver to verify reason or just emit specific event first?
        // Actually, let's just modify the payload in handleGameOver to accept reason.
        // For strictness, I'll inline the specific emit here or update handleGameOver. 
        // Let's update handleGameOver to accept reason.

        handleGameOver(roomId, winnerId, false, 'TIMEOUT');

    }, MOVE_TIME_LIMIT_MS);
};

// Helper to get remaining time for a room
const getRemainingTime = (roomId: string): number => {
    const room = state.rooms.get(roomId);
    if (!room || !room.timerStartTime) return 60; // Default to 60 if no timer

    const elapsed = Date.now() - room.timerStartTime;
    const remaining = Math.max(0, Math.ceil((MOVE_TIME_LIMIT_MS - elapsed) / 1000));
    return remaining;
};


const app = express();
app.use(express.json({ limit: '10mb' })); // Enable JSON body parsing with increased limit for Base64 images
app.use(cors());

app.use('/api/auth', authRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for prod
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket: Socket) => {
    console.log('New connection:', socket.id);

    // AUTH
    socket.on('LOGIN', async ({ userId }) => {
        const safeUserId = userId || `Guest_${socket.id.substr(0, 4)}`;

        // Fetch persistent data
        let dbUser = await User.findOne({ username: safeUserId });
        if (!dbUser && !safeUserId.startsWith('Guest_')) {
            // Should verify token ideally, but reusing ID for now
        }

        const name = dbUser?.name || safeUserId;
        const persistentFriends = dbUser?.friends || [];
        const persistentRequests = dbUser?.incomingRequests || [];

        const user = state.createUser(safeUserId, name, socket.id, persistentFriends, persistentRequests);
        console.log(`User Logged In: ${user.id} (${user.name})`);

        // Construct Rich Friend List with Status
        const richFriends = await Promise.all(persistentFriends.map(async (fid: string) => {
            const activeFriend = state.getUser(fid);
            const fDb = await User.findOne({ username: fid }).select('name profilePicture lastActiveAt elo wins losses gamesPlayed');

            // Calculate Rank: Count users with higher ELO (or same ELO but more wins)
            // For simplicity/speed, let's just do ELO for now, or match leaderboard logic strictly if needed.
            // Leaderboard sort: { elo: -1, wins: -1 }
            // Rank = count({ elo: > f.elo }) + count({ elo: f.elo, wins: > f.wins }) + 1
            let rank = 0;
            if (fDb) {
                const betterElo = await User.countDocuments({ elo: { $gt: fDb.elo } });
                const sameEloBetterWins = await User.countDocuments({ elo: fDb.elo, wins: { $gt: fDb.wins } });
                rank = betterElo + sameEloBetterWins + 1;
            }

            if (activeFriend && activeFriend.status !== 'OFFLINE') {
                return {
                    id: fid,
                    name: activeFriend.name,
                    status: activeFriend.status,
                    profilePicture: fDb?.profilePicture,
                    elo: fDb?.elo, wins: fDb?.wins, losses: fDb?.losses, gamesPlayed: fDb?.gamesPlayed,
                    rank
                };
            } else {
                return {
                    id: fid,
                    name: fDb?.name || fid,
                    status: 'OFFLINE',
                    lastActiveAt: fDb?.lastActiveAt,
                    profilePicture: fDb?.profilePicture,
                    elo: fDb?.elo, wins: fDb?.wins, losses: fDb?.losses, gamesPlayed: fDb?.gamesPlayed,
                    rank
                };
            }
        }));

        // Construct Rich Requests
        const richRequests = await Promise.all(persistentRequests.map(async (rid: string) => {
            const rDb = await User.findOne({ username: rid }).select('name profilePicture');
            return { id: rid, name: rDb?.name || rid, profilePicture: rDb?.profilePicture };
        }));

        socket.emit('LOGIN_SUCCESS', {
            user: { id: user.id, name: user.name, status: user.status },
            friends: richFriends, // Send rich objects
            requests: richRequests // Send rich objects
        });

        // Notify friends
        user.friends.forEach(fid => {
            const friend = state.getUser(fid);
            if (friend && friend.socketId && friend.status !== 'OFFLINE') {
                io.to(friend.socketId).emit('FRIEND_STATUS', { userId: user.id, status: 'ONLINE' });
            }
        });
    });

    // SOCIAL
    socket.on('SEARCH_USERS', async ({ query }) => {
        if (!query || query.length < 3) return;

        try {
            const users = await User.find({
                $or: [
                    { username: { $regex: query, $options: 'i' } },
                    { name: { $regex: query, $options: 'i' } }
                ]
            }).limit(10).select('name username profilePicture elo wins losses gamesPlayed');

            const results = await Promise.all(users.map(async (u) => {
                let rank = 0;
                const betterElo = await User.countDocuments({ elo: { $gt: u.elo } });
                const sameEloBetterWins = await User.countDocuments({ elo: u.elo, wins: { $gt: u.wins } });
                rank = betterElo + sameEloBetterWins + 1;

                // Check friendship status
                const requestingUser = state.getUserBySocket(socket.id);
                let isFriend = false;
                let isRequested = false;

                if (requestingUser) {
                    isFriend = requestingUser.friends.includes(u.username);
                    // We need to check DB for outgoing requests or keep it simple.
                    // Ideally, we'd check if `u.id` is in `requestingUser.outgoingRequests` if we tracked it,
                    // OR check if `requestingUser.id` is in `u.incomingRequests`.
                    // For now, let's just return basic info. Friendship status can be computed on frontend if friends list is available.
                }

                return {
                    id: u.username,
                    name: u.name,
                    profilePicture: u.profilePicture,
                    elo: u.elo,
                    wins: u.wins,
                    losses: u.losses,
                    gamesPlayed: u.gamesPlayed,
                    rank
                };
            }));

            socket.emit('SEARCH_RESULTS', { results });
        } catch (error) {
            console.error("Search Error:", error);
        }
    });

    socket.on('SEND_FRIEND_REQ', async ({ targetUserId }) => {
        const sender = state.getUserBySocket(socket.id);
        console.log(`[DEBUG] SEND_FRIEND_REQ from ${sender?.id} to ${targetUserId}`);

        if (!sender) return;

        if (sender.friends.includes(targetUserId)) {
            console.log(`[DEBUG] Already friends with ${targetUserId}`);
            return;
        }
        if (sender.id === targetUserId) {
            console.log(`[DEBUG] Cannot send request to self`);
            return;
        }

        // Check if target exists in DB
        const targetDb = await User.findOne({ username: targetUserId });
        if (!targetDb) {
            console.log(`[DEBUG] User ${targetUserId} not found in DB`);
            socket.emit('ERROR', { message: 'User not found' });
            return;
        }

        // Check if sender already has incoming request from target (MUTUAL REQUEST)
        const senderDb = await User.findOne({ username: sender.id });
        if (senderDb && senderDb.incomingRequests.includes(targetUserId)) {
            console.log(`[DEBUG] MUTUAL FRIEND REQUEST DETECTED! Auto-accepting friendship.`);

            // Remove requests from both users
            senderDb.incomingRequests = senderDb.incomingRequests.filter((id: string) => id !== targetUserId);
            targetDb.incomingRequests = targetDb.incomingRequests.filter((id: string) => id !== sender.id);

            // Add to friends list for both
            if (!senderDb.friends.includes(targetUserId)) senderDb.friends.push(targetUserId);
            if (!targetDb.friends.includes(sender.id)) targetDb.friends.push(sender.id);

            // Save both to DB
            await senderDb.save();
            await targetDb.save();

            // Update in-memory state  
            sender.incomingRequests = sender.incomingRequests.filter(id => id !== targetUserId);
            if (!sender.friends.includes(targetUserId)) sender.friends.push(targetUserId);

            const targetActive = state.getUser(targetUserId);
            if (targetActive) {
                targetActive.incomingRequests = targetActive.incomingRequests.filter(id => id !== sender.id);
                if (!targetActive.friends.includes(sender.id)) targetActive.friends.push(sender.id);
            }

            // Notify both users with FRIEND_ADDED
            const senderDbData = await User.findOne({ username: sender.id }).select('profilePicture elo wins losses gamesPlayed');
            const targetDbData = await User.findOne({ username: targetUserId }).select('profilePicture elo wins losses gamesPlayed');

            let senderRank = 0;
            if (senderDbData) {
                const betterElo = await User.countDocuments({ elo: { $gt: senderDbData.elo } });
                const sameEloBetterWins = await User.countDocuments({ elo: senderDbData.elo, wins: { $gt: senderDbData.wins } });
                senderRank = betterElo + sameEloBetterWins + 1;
            }

            let targetRank = 0;
            if (targetDbData) {
                const betterElo = await User.countDocuments({ elo: { $gt: targetDbData.elo } });
                const sameEloBetterWins = await User.countDocuments({ elo: targetDbData.elo, wins: { $gt: targetDbData.wins } });
                targetRank = betterElo + sameEloBetterWins + 1;
            }

            // Notify sender
            socket.emit('FRIEND_ADDED', {
                userId: targetUserId,
                name: targetDb.name,
                status: targetActive ? targetActive.status : 'OFFLINE',
                profilePicture: targetDbData?.profilePicture,
                elo: targetDbData?.elo,
                wins: targetDbData?.wins,
                losses: targetDbData?.losses,
                gamesPlayed: targetDbData?.gamesPlayed,
                rank: targetRank
            });

            // Notify target
            if (targetActive && targetActive.socketId && targetActive.status !== 'OFFLINE') {
                io.to(targetActive.socketId).emit('FRIEND_ADDED', {
                    userId: sender.id,
                    name: sender.name,
                    status: sender.status,
                    profilePicture: senderDbData?.profilePicture,
                    elo: senderDbData?.elo,
                    wins: senderDbData?.wins,
                    losses: senderDbData?.losses,
                    gamesPlayed: senderDbData?.gamesPlayed,
                    rank: senderRank
                });
            }

            console.log(`[DEBUG] Mutual friendship created between ${sender.id} and ${targetUserId}`);
            return; // Exit - don't create a new request
        }

        const targetActive = state.getUser(targetUserId);
        console.log(`[DEBUG] Target Active State:`, targetActive ? 'Found' : 'Not Found', targetActive?.status);

        // Check persistence
        if (!targetDb.incomingRequests.includes(sender.id) && !targetDb.friends.includes(sender.id)) {
            console.log(`[DEBUG] Adding request to DB`);
            targetDb.incomingRequests.push(sender.id);
            try {
                await targetDb.save();
                console.log(`[DEBUG] DB Save Success`);
            } catch (err) {
                console.error("Error saving targetDb:", err);
                return; // Stop processing if save fails
            }

            // Update in-memory if active
            if (targetActive) {
                if (!targetActive.incomingRequests.includes(sender.id)) {
                    targetActive.incomingRequests.push(sender.id);
                }
                if (targetActive.socketId && targetActive.status !== 'OFFLINE') {
                    console.log(`[DEBUG] Emitting FRIEND_REQ_RECEIVED to ${targetActive.socketId}`);

                    // Fetch sender's full profile data
                    const senderFullData = await User.findOne({ username: sender.id }).select('name profilePicture elo wins losses gamesPlayed');
                    let rank = 0;
                    if (senderFullData) {
                        const betterElo = await User.countDocuments({ elo: { $gt: senderFullData.elo } });
                        const sameEloBetterWins = await User.countDocuments({ elo: senderFullData.elo, wins: { $gt: senderFullData.wins } });
                        rank = betterElo + sameEloBetterWins + 1;
                    }

                    io.to(targetActive.socketId).emit('FRIEND_REQ_RECEIVED', {
                        fromUser: sender.id,
                        fromUserName: sender.name,
                        profilePicture: senderFullData?.profilePicture,
                        elo: senderFullData?.elo,
                        wins: senderFullData?.wins,
                        losses: senderFullData?.losses,
                        gamesPlayed: senderFullData?.gamesPlayed,
                        rank
                    });
                } else {
                    console.log(`[DEBUG] Target offline or no socket. Status: ${targetActive.status}, Socket: ${targetActive.socketId}`);
                }
            } else {
                console.log(`[DEBUG] Target not active in memory`);
            }
        } else {
            console.log(`[DEBUG] Request already exists or already friends`);
        }
    });

    socket.on('RESPOND_FRIEND_REQ', async ({ targetUserId, accept }) => {
        const responder = state.getUserBySocket(socket.id);
        console.log(`[DEBUG] RESPOND_FRIEND_REQ from ${responder?.id} to ${targetUserId}. Accept: ${accept}`);
        if (!responder) return;

        // DB Updates
        const responderDb = await User.findOne({ username: responder.id });
        const requesterDb = await User.findOne({ username: targetUserId });

        if (responderDb) {
            responderDb.incomingRequests = responderDb.incomingRequests.filter((id: string) => id !== targetUserId);
            if (accept && requesterDb) {
                if (!responderDb.friends.includes(targetUserId)) responderDb.friends.push(targetUserId);
                if (!requesterDb.friends.includes(responder.id)) requesterDb.friends.push(responder.id);
                try {
                    await requesterDb.save();
                } catch (err) {
                    console.error("Error saving requesterDb:", err);
                }
            }
            try {
                await responderDb.save();
            } catch (err) {
                console.error("Error saving responderDb:", err);
            }
        }

        // Memory Updates
        const idx = responder.incomingRequests.indexOf(targetUserId);
        if (idx !== -1) {
            responder.incomingRequests.splice(idx, 1); // Remove request

            if (accept) {
                const requesterActive = state.getUser(targetUserId);
                console.log(`[DEBUG] Requester Active State:`, requesterActive ? 'Found' : 'Not Found', requesterActive?.status, requesterActive?.socketId);

                // Update responder memory
                if (!responder.friends.includes(targetUserId)) responder.friends.push(targetUserId);

                // Update requester memory if online
                if (requesterActive) {
                    if (!requesterActive.friends.includes(responder.id)) requesterActive.friends.push(responder.id);

                    // Notify Requester (Target)
                    if (requesterActive.socketId && requesterActive.status !== 'OFFLINE') {
                        console.log(`[DEBUG] Emitting FRIEND_ADDED to Requester ${requesterActive.socketId}`);
                        const respDb = await User.findOne({ username: responder.id }).select('profilePicture elo wins losses gamesPlayed');
                        let rank = 0;
                        if (respDb) {
                            const betterElo = await User.countDocuments({ elo: { $gt: respDb.elo } });
                            const sameEloBetterWins = await User.countDocuments({ elo: respDb.elo, wins: { $gt: respDb.wins } });
                            rank = betterElo + sameEloBetterWins + 1;
                        }
                        io.to(requesterActive.socketId).emit('FRIEND_ADDED', {
                            userId: responder.id,
                            name: responder.name,
                            status: responder.status,
                            profilePicture: respDb?.profilePicture,
                            elo: respDb?.elo, wins: respDb?.wins, losses: respDb?.losses, gamesPlayed: respDb?.gamesPlayed,
                            rank
                        });
                    } else {
                        console.log(`[DEBUG] Requester offline or no socket.`);
                    }
                }

                // Notify Responder (Self) - Send back details of new friend
                const reqName = requesterDb?.name || targetUserId;
                const reqStatus = requesterActive ? requesterActive.status : 'OFFLINE';
                const targDb = await User.findOne({ username: targetUserId }).select('profilePicture elo wins losses gamesPlayed');
                let rank = 0;
                if (targDb) {
                    const betterElo = await User.countDocuments({ elo: { $gt: targDb.elo } });
                    const sameEloBetterWins = await User.countDocuments({ elo: targDb.elo, wins: { $gt: targDb.wins } });
                    rank = betterElo + sameEloBetterWins + 1;
                }
                socket.emit('FRIEND_ADDED', {
                    userId: targetUserId,
                    name: reqName,
                    status: reqStatus,
                    profilePicture: targDb?.profilePicture,
                    elo: targDb?.elo, wins: targDb?.wins, losses: targDb?.losses, gamesPlayed: targDb?.gamesPlayed,
                    rank
                });
            }
        } else {
            console.log(`[DEBUG] Request not found in responder's memory list`);
        }
    });

    // GAME INVITES
    socket.on('SEND_GAME_INVITE', async ({ targetUserId }) => {
        const sender = state.getUserBySocket(socket.id);
        if (!sender) return;

        const target = state.getUser(targetUserId);
        if (!target || !target.socketId || target.status === 'OFFLINE') {
            socket.emit('ERROR', { message: 'User is offline' });
            return;
        }

        io.to(target.socketId).emit('GAME_INVITE_RECEIVED', {
            fromUser: sender.id,
            fromUserName: sender.name,
            fromUserProfilePicture: (await User.findOne({ username: sender.id }).select('profilePicture'))?.profilePicture
        });
    });

    socket.on('RESPOND_GAME_INVITE', async ({ targetUserId, accept }) => {
        const responder = state.getUserBySocket(socket.id); // The one who accepted/rejected
        if (!responder) return;

        const requester = state.getUser(targetUserId); // The original sender

        if (!accept) {
            // Rejected
            if (requester && requester.socketId) {
                io.to(requester.socketId).emit('GAME_INVITE_REJECTED', {
                    targetUserName: responder.name
                });
            }
            return;
        }

        // Accepted -> Create Game
        if (!requester || !requester.socketId) {
            socket.emit('ERROR', { message: 'User is no longer available' });
            return;
        }

        const roomId = uuidv4();
        // Requester is X (Host logic generally), Responder is O
        const room = state.createRoom(roomId, requester.id, responder.id, getInitialState());

        // Fetch User details
        const requesterDb = await User.findOne({ username: requester.id });
        const responderDb = await User.findOne({ username: responder.id });

        if (room) {
            // Notify Requester (X)
            io.to(requester.socketId).emit('GAME_START', {
                roomId,
                opponentId: responder.id,
                opponentName: responder.name,
                opponentUsername: responder.id,
                opponentProfilePicture: responderDb?.profilePicture,
                symbol: 'X',
                initialState: room.gameState,
                timeLeft: 60
            });

            // Notify Responder (O)
            io.to(responder.socketId).emit('GAME_START', {
                roomId,
                opponentId: requester.id,
                opponentName: requester.name,
                opponentUsername: requester.id,
                opponentProfilePicture: requesterDb?.profilePicture,
                symbol: 'O',
                initialState: room.gameState,
                timeLeft: 60
            });

            resetTimer(roomId);
        }
    });

    // MATCHMAKING
    socket.on('FIND_MATCH', async () => {
        const user = state.getUserBySocket(socket.id);
        if (!user) return;

        // Check if opponent available
        const queue = Array.from(state.matchmakingQueue);
        if (queue.length > 0) {
            // Match found!
            const opponentId = queue[0];

            // Prevent matching with self (though user shouldn't be in queue if connected twice, logic handles distinct users)
            if (opponentId === user.id) return;

            state.matchmakingQueue.delete(opponentId);

            const opponent = state.getUser(opponentId);
            if (!opponent) {
                // Stale?
                state.matchmakingQueue.add(user.id);
                return;
            }

            const roomId = uuidv4();
            // Randomize start
            const isUserX = Math.random() > 0.5;
            const pX = isUserX ? user.id : opponent.id;
            const pO = isUserX ? opponent.id : user.id;

            const room = state.createRoom(roomId, pX, pO, getInitialState());

            // Notify Players
            const pXSocket = state.getUser(pX)?.socketId;
            const pOSocket = state.getUser(pO)?.socketId;

            // Fetch player names from DB
            const pXUser = await User.findOne({ username: pX });
            const pOUser = await User.findOne({ username: pO });
            const pXName = pXUser?.name || pX;
            const pOName = pOUser?.name || pO;

            if (room) {
                if (pXSocket) {
                    io.to(pXSocket).emit('GAME_START', {
                        roomId,
                        opponentId: pO,
                        opponentName: pOName,
                        opponentUsername: pO,
                        opponentProfilePicture: pOUser?.profilePicture,
                        symbol: 'X',
                        initialState: room.gameState,
                        timeLeft: 60
                    });
                    // state.getUser(pX)!.socketId = pXSocket; 
                }
                if (pOSocket) {
                    io.to(pOSocket).emit('GAME_START', {
                        roomId,
                        opponentId: pX,
                        opponentName: pXName,
                        opponentUsername: pX,
                        opponentProfilePicture: pXUser?.profilePicture,
                        symbol: 'O',
                        initialState: room.gameState,
                        timeLeft: 60
                    });
                }

                // Start Timer
                resetTimer(roomId);
            }

        } else {
            // No one waiting, join queue
            state.matchmakingQueue.add(user.id);
            socket.emit('QUEUE_JOINED');
        }
    });

    // PRIVATE ROOMS
    socket.on('CREATE_ROOM', () => {
        const user = state.getUserBySocket(socket.id);
        if (!user) return;

        // Generate short 6-char code
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

        state.createRoom(roomId, user.id, null, getInitialState());
        socket.emit('ROOM_CREATED', { roomId });
    });

    socket.on('JOIN_ROOM', async ({ roomId }) => {
        const user = state.getUserBySocket(socket.id);
        if (!user) return;

        // Clean input
        const safeRoomId = (roomId || '').trim().toUpperCase();

        if (state.joinRoom(safeRoomId, user.id)) {
            const room = state.rooms.get(safeRoomId);
            if (room) {
                // Fetch player names
                const pXUser = await User.findOne({ username: room.players.X });
                const joinerUser = await User.findOne({ username: user.id });
                const pXName = pXUser?.name || room.players.X;
                const joinerName = joinerUser?.name || user.id;

                // Notify Creator (X)
                const pX = state.getUser(room.players.X);
                if (pX && pX.socketId) {
                    io.to(pX.socketId).emit('GAME_START', {
                        roomId: safeRoomId,
                        opponentId: user.id,
                        opponentName: joinerName,
                        opponentUsername: user.id,
                        opponentProfilePicture: joinerUser?.profilePicture,
                        symbol: 'X',
                        initialState: room.gameState,
                        timeLeft: 60
                    });
                }
                // Notify Joiner (O)
                socket.emit('GAME_START', {
                    roomId: safeRoomId,
                    opponentId: room.players.X,
                    opponentName: pXName,
                    opponentUsername: room.players.X,
                    opponentProfilePicture: pXUser?.profilePicture,
                    symbol: 'O',
                    initialState: room.gameState,
                    timeLeft: 60
                });

                // Start Timer
                resetTimer(safeRoomId);
            }
        } else {
            socket.emit('ERROR', { message: 'Room not found or full' });
        }
    });

    // GAMEPLAY
    socket.on('MAKE_MOVE', ({ roomId, move }) => {
        const user = state.getUserBySocket(socket.id);
        if (!user || !user.currentRoomId || user.currentRoomId !== roomId) return;

        const room = state.rooms.get(roomId);
        if (!room) {
            socket.emit('ERROR', { message: 'Room not found' });
            return;
        }

        const symbol = room.players.X === user.id ? 'X' : (room.players.O === user.id ? 'O' : null);
        if (!symbol) return; // Spectator trying to play?

        // Validate turn
        if (room.gameState.activePlayer !== symbol) {
            socket.emit('ERROR', { message: 'Not your turn' });
            return;
        }

        const { mainRow, mainCol, subRow, subCol } = move;

        try {
            const newState = makeMove(room.gameState, mainRow, mainCol, subRow, subCol);
            room.gameState = newState; // Update server state

            // Broadcast to room players
            const pX = state.getUser(room.players.X);
            const pO = room.players.O ? state.getUser(room.players.O) : undefined;

            const updatePayload = { gameState: newState, timeLeft: 60 };
            if (pX && pX.socketId) io.to(pX.socketId).emit('GAME_UPDATE', updatePayload);
            if (pO && pO.socketId) io.to(pO.socketId).emit('GAME_UPDATE', updatePayload);

            // Check Win Condition (Engine should return winner?)
            // engine/rules.ts makeMove returns new state. Does it check win?
            // Checking makeMove implementation (via previous knowledge or needs view): 
            // Usually makeMove just updates board. We need `checkWin(newState)`.
            // Assuming `makeMove` updates `winner` field in `gameState` if implemented, 
            // OR we need to import `checkWin` or similar. 
            // Let's assume newState has `winner` property if the engine supports it.
            // Looking at state.ts import: import { GameState } from './engine/types';
            // Types usually have winner.

            // IF newState.winner is set (X, O, or DRAW)
            if (newState.winner) {
                if (newState.winner === 'DRAW') {
                    handleGameOver(roomId, null, true, 'DRAW');
                } else {
                    const winnerId = newState.winner === 'X' ? room.players.X : room.players.O!;
                    handleGameOver(roomId, winnerId, false, 'CHECKMATE');
                }
            } else {
                // Next turn, reset timer
                resetTimer(roomId);
            }

            // Check IDLE/Disconnect win technically logic handled in disconnect

        } catch (e) {
            socket.emit('ERROR', { message: 'Invalid move' });
        }
    });

    // MESSAGING
    socket.on('SEND_MESSAGE', ({ roomId, message }) => {
        // console.log(`[DEBUG] SEND_MESSAGE received from ${socket.id} for room ${roomId}`); // Optional Log

        const user = state.getUserBySocket(socket.id);
        if (!user) {
            socket.emit('ERROR', { message: "User not found" });
            return;
        }

        if (!user.currentRoomId || user.currentRoomId !== roomId) {
            socket.emit('ERROR', { message: "Room mismatch" });
            return;
        }

        const room = state.rooms.get(roomId);
        if (!room) {
            socket.emit('ERROR', { message: "Room not found" });
            return;
        }

        // 1. Validate Length (101 chars)
        if (!message || typeof message !== 'string' || message.length > 101) {
            return; // Ignore invalid
        }

        // 2. Validate Cooldown (5s)
        const now = Date.now();
        if (user.lastMessageAt && now - user.lastMessageAt < 5000) {
            socket.emit('ERROR', { message: "Cooldown active" });
            return;
        }

        user.lastMessageAt = now;

        const payload = {
            senderId: user.id,
            message: message,
            timestamp: now
        };

        const result = {
            roomId,
            ...payload
        };

        const pX = state.getUser(room.players.X);
        const pO = room.players.O ? state.getUser(room.players.O) : undefined;

        // Broadcast to Opponent (and self via broadcast usually, but adding direct echo for reliability)
        if (pX && pX.socketId && pX.socketId !== socket.id) io.to(pX.socketId).emit('MESSAGE_RECEIVED', result);
        if (pO && pO.socketId && pO.socketId !== socket.id) io.to(pO.socketId).emit('MESSAGE_RECEIVED', result);

        // Direct Echo to Sender (Guaranteed Receipt)
        socket.emit('MESSAGE_RECEIVED', result);
    });

    // DISCONNECT
    socket.on('disconnect', () => {
        const user = state.getUserBySocket(socket.id);
        if (user) {
            console.log(`User Disconnected: ${user.id}`);

            // Persist Last Active
            const now = new Date();
            User.updateOne({ username: user.id }, { lastActiveAt: now }).exec().catch(err => console.error("Error updating lastActive:", err));

            state.removeUserSocket(socket.id);

            // Handle In Case of Game
            if (user.currentRoomId) {
                const room = state.rooms.get(user.currentRoomId);
                if (room) {
                    // Identify opponent first
                    const opponentId = room.players.X === user.id ? room.players.O : room.players.X;

                    // Emit specific event for UI toast if needed, but GAME_OVER is key for win
                    if (opponentId) {
                        const opponent = state.getUser(opponentId);
                        if (opponent && opponent.socketId) {
                            io.to(opponent.socketId).emit('OPPONENT_DISCONNECTED');
                        }

                        // Declare opponent as winner
                        handleGameOver(user.currentRoomId, opponentId, false, 'DISCONNECT');
                    } else {
                        // No opponent? Just close room
                        state.deleteRoom(user.currentRoomId);
                    }
                }
            }

            // Notify Friends
            user.friends.forEach(fid => {
                const friend = state.getUser(fid);
                if (friend && friend.socketId && friend.status !== 'OFFLINE') {
                    io.to(friend.socketId).emit('FRIEND_STATUS', {
                        userId: user.id,
                        status: 'OFFLINE',
                        lastActiveAt: now
                    });
                }
            });
        }
    });
});

const PORT = process.env.PORT || 3000;

// Connect to DB
// STARTUP
const startServer = async () => {
    try {
        await connectDB();
        console.log('MongoDB Connected');

        // Fix indexes to allow multiple null/undefined values using Partial Indexes
        try {
            const User = require('./models/User').default;

            // Email
            await User.collection.dropIndex('email_1').catch(() => { });
            await User.collection.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });

            // Phone
            await User.collection.dropIndex('phone_1').catch(() => { });
            await User.collection.createIndex({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });

            // GoogleId
            await User.collection.dropIndex('googleId_1').catch(() => { });
            await User.collection.createIndex({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });

            console.log('✅ Auth indexes verified with partial filters');
        } catch (err: any) {
            console.log('Index setup warning:', err.message);
        }

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
