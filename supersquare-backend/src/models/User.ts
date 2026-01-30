import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
        sparse: true // Allows null/undefined to not conflict
    },
    phone: {
        type: String,
        unique: true,
        sparse: true
    },
    passwordHash: {
        type: String,
        required: false // Optional for Google/OTP only flows if we allow that
    },
    otpHash: {
        type: String,
        sparse: true
    },
    otpExpiresAt: {
        type: Date,
        sparse: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    profilePicture: {
        type: String, // Base64 string
        default: null
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    elo: {
        type: Number,
        default: 100
    },
    gamesPlayed: {
        type: Number,
        default: 0
    },
    wins: {
        type: Number,
        default: 0
    },
    losses: {
        type: Number,
        default: 0
    },
    lastActiveAt: {
        type: Date,
        default: Date.now
    },
    friends: [{
        type: String // Usernames
    }],
    incomingRequests: [{
        type: String // Usernames
    }]
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
