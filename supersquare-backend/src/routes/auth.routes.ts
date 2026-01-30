import express from 'express';
import {
    requestOtp,
    verifyOtp,
    continueAuth,
    googleAuth,
    googleCallback,
    completeGoogleSignup,
    getMe,
    searchUsers,
    identifyUser,
    resetPassword,
    updateProfilePicture,
    getLeaderboard
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/identify', identifyUser);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/continue', continueAuth);
router.post('/reset-password', resetPassword);

// Google
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google/complete', completeGoogleSignup);

router.get('/me', authenticateToken, getMe);
router.get('/search', authenticateToken, searchUsers);
router.get('/search', authenticateToken, searchUsers);
router.put('/profile-picture', authenticateToken, updateProfilePicture);
router.get('/leaderboard', getLeaderboard); // Public or protected? Let's make it public for now or protected. Requirement didn't specify. Online Lobby is protected.
// Use protected for consistency
// router.get('/leaderboard', authenticateToken, getLeaderboard);

export default router;
