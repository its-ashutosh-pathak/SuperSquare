import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import User from '../models/User';
import OTPVerification from '../models/OTPVerification';
import { AuthRequest } from '../middleware/auth.middleware';

// --- HELPER: Generate Secure OTP ---
const generateOTP = (): string => {
    return crypto.randomInt(100000, 999999).toString();
};

// --- ENDPOINT: Identify User ---
export const identifyUser = async (req: Request, res: Response) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ message: "Identifier required" });

        const isEmail = identifier.includes('@');
        const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

        const user = await User.findOne(query);

        if (user) {
            return res.json({
                exists: true,
                provider: user.authProvider,
                verified: true
            });
        } else {
            return res.json({
                exists: false,
                provider: null,
                verified: false
            });
        }
    } catch (e: any) {
        console.error("Identify Error", e);
        res.status(500).json({ message: "Identification Failed" });
    }
};

// --- ENDPOINT: Request OTP ---
import { sendEmail } from '../utils/email';

export const requestOtp = async (req: Request, res: Response) => {
    try {
        const { identifier, purpose } = req.body; // purpose: 'signup' or 'reset'
        if (!identifier) return res.status(400).json({ message: "Identifier is required" });
        if (!identifier.includes('@')) return res.status(400).json({ message: "Only Email supported for OTP" });

        // [SECURITY] For Password Reset, check if user exists
        if (purpose === 'reset') {
            const user = await User.findOne({ email: identifier.toLowerCase() });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
        }

        // Generate Secure OTP
        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        // Invalidate previous OTPs
        await OTPVerification.deleteMany({ identifier });

        // Save new OTP
        await OTPVerification.create({
            identifier,
            otpHash,
            purpose,
            expiresAt,
            verified: false
        });

        // Send Email
        const subject = purpose === 'signup' ? 'SuperSquare Verification Code' : 'SuperSquare Password Reset';
        const text = `Your SuperSquare OTP is: ${otp}. It expires in 5 minutes.`;
        const html = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>${subject}</h2>
                <p>Your One-Time Password (OTP) is:</p>
                <h1 style="color: #D97706; letter-spacing: 5px;">${otp}</h1>
                <p>This code expires in 5 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `;

        await sendEmail(identifier, subject, text, html);

        res.json({ message: "OTP sent to your email" });
    } catch (error) {
        console.error("Request OTP Error", error);
        res.status(500).json({ message: "Failed to send OTP" });
    }
};

// --- ENDPOINT: Verify OTP ---
export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { identifier, otp } = req.body;
        if (!identifier || !otp) return res.status(400).json({ message: "Identifier and OTP required" });

        // Find latest OTP
        const record = await OTPVerification.findOne({ identifier }).sort({ createdAt: -1 });

        if (!record) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Check Expiry (Strict 5 min)
        if (record.expiresAt < new Date()) {
            // Auto-delete expired
            await OTPVerification.deleteOne({ _id: record._id });
            return res.status(400).json({ message: "OTP expired" });
        }

        // Check Hash
        const isValid = await bcrypt.compare(otp, record.otpHash);
        if (!isValid) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Mark as verified
        record.verified = true;
        await record.save();

        res.json({ message: "OTP verified successfully", success: true });
    } catch (error) {
        console.error("Verify OTP Error", error);
        res.status(500).json({ message: "Verification failed" });
    }
};

// --- ENDPOINT: Unified Auth (Login + Signup) ---
export const continueAuth = async (req: Request, res: Response) => {
    try {
        const { identifier, password, username, confirmPassword } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: "Identifier and password are required" });
        }

        const isEmail = identifier.includes('@');
        const query = isEmail ? { email: identifier.toLowerCase() } : { $or: [{ phone: identifier }, { username: identifier }] };

        const user = await User.findOne(query);

        if (user) {
            // --- LOGIN FLOW ---
            if (!user.passwordHash) {
                return res.status(400).json({ message: "This account uses Google/External auth. Please login with that method." });
            }

            const isMatch = await bcrypt.compare(password, user.passwordHash || '');
            if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

            const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

            return res.json({
                token,
                user: {
                    _id: user._id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    profilePicture: user.profilePicture,
                    elo: user.elo,
                    wins: user.wins,
                    losses: user.losses,
                    gamesPlayed: user.gamesPlayed
                }
            });

        } else {
            // --- SIGNUP FLOW ---
            const { name } = req.body; // Extract name
            if (!username) {
                return res.status(400).json({ code: 'USERNAME_REQUIRED', message: "Username required for new account" });
            }
            if (!name) {
                return res.status(400).json({ message: "Display Name is required" });
            }

            // Check username uniqueness
            const existingUsername = await User.findOne({ username });
            if (existingUsername) return res.status(409).json({ message: "Username taken" });

            // [SECURITY FIX] Password Confirmation
            if (confirmPassword && password !== confirmPassword) {
                return res.status(400).json({ message: "Passwords do not match" });
            }

            // [SECURITY FIX] Check for VERIFIED OTP
            // We ensure that a verified OTP record exists for this identifier
            const otpRecord = await OTPVerification.findOne({ identifier, verified: true });

            // STRICT BLOCK: IF not verified, REJECT
            if (!otpRecord) {
                return res.status(403).json({ message: "Email/Phone not verified. Please request OTP." });
            }

            // Create User
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const newUser = new User({
                name,
                username,
                passwordHash,
                authProvider: 'local',
                // Explicitly set email or phone
                email: isEmail ? identifier.toLowerCase() : undefined,
                phone: !isEmail ? identifier : undefined,
                googleId: undefined
            });

            await newUser.save();

            const token = jwt.sign({ userId: newUser._id, username: newUser.username }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

            // Cleanup OTP
            await OTPVerification.deleteMany({ identifier });

            return res.status(201).json({
                token,
                user: {
                    _id: newUser._id,
                    username: newUser.username,
                    name: newUser.name,
                    email: newUser.email,
                    phone: newUser.phone,
                    profilePicture: newUser.profilePicture,
                    elo: newUser.elo,
                    wins: newUser.wins,
                    losses: newUser.losses,
                    gamesPlayed: newUser.gamesPlayed
                }
            });
        }

    } catch (error) {
        console.error("Auth Continue Error", error);
        res.status(500).json({ message: "Authentication failed" });
    }
};

// --- ENDPOINT: Reset Password ---
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { identifier, password, confirmPassword } = req.body;

        if (!identifier || !password || !confirmPassword) {
            return res.status(400).json({ message: "All fields required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // 1. Verify Auth Session State
        const otpRecord = await OTPVerification.findOne({ identifier, verified: true });

        // STRICT BLOCK: IF not verified, REJECT
        if (!otpRecord) {
            return res.status(403).json({ message: "OTP not verified. Cannot reset password." });
        }

        // 2. Find User
        const isEmail = identifier.includes('@');
        const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };
        const user = await User.findOne(query);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3. Update Password
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(password, salt);
        await user.save();

        // 4. Cleanup Session AND all OTPs for this user security
        await OTPVerification.deleteMany({ identifier });

        res.json({ message: "Password reset successfully. Please login." });

    } catch (error) {
        console.error("Reset Password Error", error);
        res.status(500).json({ message: "Failed to reset password" });
    }
};

// --- GOOGLE AUTH ---
export const googleAuth = (req: Request, res: Response) => {
    const mode = req.query.mode || 'login'; // 'login' or 'signup'
    const platform = req.query.platform || 'web'; // 'web' or 'android'
    const state = encodeURIComponent(JSON.stringify({ mode, platform }));

    console.log(`[Google Auth] Mode: ${mode}, Platform: ${platform}`);

    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const redirectUri = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${apiUrl}/api/auth/google/callback&response_type=code&scope=profile email&state=${state}`;
    res.redirect(redirectUri);
};

export const googleCallback = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;
        if (!code) return res.status(400).send("No code provided");

        // Parse State
        let mode = 'login';
        let platform = 'web';
        try {
            if (state) {
                const parsed = JSON.parse(decodeURIComponent(state as string));
                if (parsed.mode) mode = parsed.mode;
                if (parsed.platform) platform = parsed.platform;
            }
        } catch (e) {
            console.log("State parse error", e);
        }

        // Determine Base Redirect URL
        const isAndroid = platform === 'android';
        const clientUrl = isAndroid
            ? 'com.supersquare.game://auth'
            : (process.env.CLIENT_URL || 'http://localhost:5173');

        console.log(`[Google Callback] Platform: ${platform}, isAndroid: ${isAndroid}, clientUrl: ${clientUrl}`);

        // 1. Exchange code for token
        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: `${process.env.API_URL || 'http://localhost:3000'}/api/auth/google/callback`
        });

        const { access_token } = data;

        // 2. Get User Profile
        const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const email = profile.email;
        const googleId = profile.id;
        let picture = profile.picture;

        if (picture && picture.includes('=s')) {
            picture = picture.replace(/=s\d+(-c)?/g, '=s400-c');
        }

        // 3. Find or Create User
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            // CHECK MODE: If Login mode, REJECT new users
            if (mode === 'login') {
                return res.redirect(`${clientUrl}/login?error=NoAccountFoundSignupRequired`);
            }

            // New Google User (Signup Mode) -> Redirect to Frontend to complete profile
            const tempPayload = { googleId, email, picture, isNewGoogleUser: true };
            const tempToken = jwt.sign(tempPayload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
            return res.redirect(`${clientUrl}/complete-google?token=${tempToken}&email=${email}`);
        }

        // Existing User - Link & Login
        if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
        res.redirect(`${clientUrl}/auth-success?token=${token}`);

    } catch (e: any) {
        console.error("Google Callback Error", e.response?.data || e.message);
        const clientUrl = (req.query.state && JSON.parse(decodeURIComponent(req.query.state as string)).platform === 'android')
            ? 'com.supersquare.game://auth'
            : (process.env.CLIENT_URL || 'http://localhost:5173');

        res.redirect(`${clientUrl}/login?error=GoogleAuthFailed`);
    }
};

export const completeGoogleSignup = async (req: Request, res: Response) => {
    try {
        const { name, username, googleToken } = req.body;

        const decoded: any = jwt.verify(googleToken, process.env.JWT_SECRET as string);
        if (!decoded.isNewGoogleUser) return res.status(400).json({ message: "Invalid token type" });

        const { googleId, email } = decoded;

        // Check uniqueness of username only
        const exists = await User.findOne({ username });
        if (exists) return res.status(409).json({ message: "Username already taken" });

        const user = new User({
            name,
            username,
            email,
            profilePicture: decoded.picture, // Save profile picture from Google
            // Phone is removed from requirement
            googleId,
            authProvider: 'google'
        });

        await user.save();

        const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profilePicture: user.profilePicture
            }
        });

    } catch (e: any) {
        console.error("Complete Google Signup Error", e);
        res.status(500).json({ message: "Failed to create account" });
    }
};

// ME (Protected)
export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.userId) return res.status(401).json({ message: 'Not authenticated.' });
        const user = await User.findById(req.user.userId).select('-passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Calculate Rank
        const betterElo = await User.countDocuments({ elo: { $gt: user.elo } });
        const sameEloBetterWins = await User.countDocuments({ elo: user.elo, wins: { $gt: user.wins } });
        const rank = betterElo + sameEloBetterWins + 1;

        res.json({ ...user.toObject(), rank });
    } catch (error: any) {
        console.error("GetMe Error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// SEARCH USERS
export const searchUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ message: 'Search query is required' });
        }

        // Build search criteria
        const searchCriteria: any[] = [
            { username: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } }
        ];

        // If query looks like a MongoDB ObjectId (24 hex characters), search by ID too
        if (/^[0-9a-fA-F]{24}$/.test(query)) {
            try {
                const mongoose = require('mongoose');
                searchCriteria.push({ _id: new mongoose.Types.ObjectId(query) });
            } catch (e) {
                // Invalid ObjectId format, skip ID search
            }
        }

        const searchResults = await User.find({ $or: searchCriteria })
            .select('_id username name email profilePicture')
            .limit(10);

        res.json({ users: searchResults });
    } catch (error: any) {
        console.error("Search Users Error:", error);
        res.status(500).json({ message: 'Search failed' });
    }
};

// UPDATE PROFILE PICTURE
export const updateProfilePicture = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || !req.user.userId) return res.status(401).json({ message: 'Not authenticated.' });

        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ message: 'No image provided' });
        }

        // Basic Base64 validation (optional but good sanity check)
        if (!image.startsWith('data:image')) {
            return res.status(400).json({ message: 'Invalid image format' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        user.profilePicture = image;
        await user.save();

        res.json({ message: 'Profile picture updated', profilePicture: user.profilePicture });
    } catch (error: any) {
        console.error("Update Profile Picture Error:", error);
        res.status(500).json({ message: 'Failed to update profile picture' });
    }
};

// GET LEADERBOARD
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        // Top 50 by ELO, then Wins
        const users = await User.find({})
            .sort({ elo: -1, wins: -1 })
            .limit(50)
            .select('name username elo wins losses gamesPlayed profilePicture');

        res.json({ users });
    } catch (error: any) {
        console.error("Leaderboard Error:", error);
        res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
};
