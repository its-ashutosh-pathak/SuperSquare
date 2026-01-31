import React, { useState, useEffect } from 'react'; // Added useEffect
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { LAYOUT, Z_INDEX } from '../constants/layout';
import { useMultiplayerContext } from '../context/MultiplayerContext'; // Added import
import { compressImage, getCroppedImg } from '../utils/imageUtils';
import Cropper from 'react-easy-crop';
import { useRef } from 'react';

// Define types manually to avoid import issues
type Point = { x: number; y: number };
type Area = { x: number; y: number; width: number; height: number };

const OnlineLobby: React.FC = () => {
    const [tab, setTab] = useState("home");
    const [joinModalOpen, setJoinModalOpen] = useState(false);
    const [joinCodeInput, setJoinCodeInput] = useState("");
    const [isJoinHovered, setIsJoinHovered] = useState(false);
    const [isJoinPressed, setIsJoinPressed] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);

    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
    // Leaderboard state
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    const { user, logout, login } = useAuth(); // Destructure login to update user
    const {
        isConnected, isSearching, findMatch, createRoom, joinRoom,
        friends, incomingRequests, sendFriendRequest, respondFriendRequest,
        searchResults, searchUsers, clearSearchResults, leaveRoom, mpGameState, roomId,
        incomingGameInvites, sendGameInvite, respondGameInvite, errorMsg, clearError
    } = useMultiplayerContext();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Cropper State
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);

    // Edit Profile Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);

    // Auto-clear error message
    useEffect(() => {
        if (errorMsg) {
            const timer = setTimeout(() => clearError(), 3000);
            return () => clearTimeout(timer);
        }
    }, [errorMsg, clearError]);

    const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setSelectedImage(reader.result as string);
                setIsCropModalOpen(true);
            };
        }
    };

    const handleCropSave = async () => {
        if (!selectedImage || !croppedAreaPixels) return;
        try {
            setIsUploading(true);
            setIsCropModalOpen(false); // Close modal UI immediately

            // 1. Crop
            const croppedImageBase64 = await getCroppedImg(selectedImage, croppedAreaPixels);

            // 2. Compress (Need to convert Base64 back to File or handle Base64 in compressImage? 
            // compressImage expects File. Let's make a small helper or just re-use compress logic if needed.
            // Actually, getCroppedImg returns a high-qual Base64. We can send that if size is okay, 
            // OR fetch it -> Blob -> File -> compressImage.

            const res = await fetch(croppedImageBase64);
            const blob = await res.blob();
            const file = new File([blob], "profile.jpg", { type: "image/jpeg" });

            // 3. Compress
            const compressedBase64 = await compressImage(file);

            // 4. Upload
            const response = await api.put('/api/auth/profile-picture', { image: compressedBase64 });
            // api.put returns response object, response.data is the body


            if (response.status === 200) {
                const data = response.data;
                if (user) {
                    login({ ...user, profilePicture: data.profilePicture });
                }
            } else {
                console.error("Upload failed");
            }

        } catch (e) {
            console.error("Error cropping/uploading", e);
        } finally {
            setIsUploading(false);
            setSelectedImage(null);
        }
    };

    const handleCropCancel = () => {
        setIsCropModalOpen(false);
        setSelectedImage(null);
    };

    const handleEditProfile = () => {
        setEditName(user?.name || "");
        setIsEditModalOpen(true);
    };

    const handleSaveName = async () => {
        if (!editName.trim()) return;
        try {
            setIsSavingName(true);
            const response = await api.put('/api/auth/display-name', { name: editName.trim() });
            if (response.status === 200 && user) {
                login({ ...user, name: editName.trim() });
                setIsEditModalOpen(false);
            }
        } catch (e) {
            console.error("Error updating name", e);
        } finally {
            setIsSavingName(false);
        }
    };

    /* OLD HANDLE FILE SELECT REMOVED/REPLACED ABOVE */

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Auto-navigate ONLY when Game State is active (Match started)
    useEffect(() => {
        if (roomId && mpGameState) {
            navigate('/play/online');
        }
    }, [roomId, mpGameState, navigate]);

    // Search Debounce (Socket based)
    useEffect(() => {
        const performSearch = () => {
            if (searchQuery.trim().length < 3) {
                // Context will keep old results if we don't clear, but let's assume empty query clears results?
                // Or we can manually clear if needed, but context doesn't expose a clear method yet.
                // For now, assume searchUsers('') won't do anything or server handles it.
                // Actually the server check is `length < 3`.
                clearSearchResults();
                return;
            }
            setIsSearchingUsers(true);
            searchUsers(searchQuery);
            setIsSearchingUsers(false); // Immediate, results come async
        };

        const debounceTimer = setTimeout(performSearch, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, searchUsers]);

    // Fetch Leaderboard on Home Tab
    useEffect(() => {
        if (tab === "home") {
            const fetchLeaderboard = async () => {
                try {
                    // Public endpoint, no token needed if configured public, but strict mode might require it.
                    // Let's try without Authorization first as per route definition attempt, 
                    // BUT I commented out the public one and seemingly likely went with protected or public?
                    // But to be safe and consistent with "Offline Lobby is protected" context (though this is OnlineLobby),
                    // I'll send token if available.
                    const res = await api.get('/api/auth/leaderboard');
                    if (res.status === 200) {
                        const data = res.data;
                        setLeaderboard(data.users || []);
                    }
                } catch (e) {
                    console.error("Failed to fetch leaderboard", e);
                }
            };
            fetchLeaderboard();
        }
    }, [tab]);

    // Helper for relative time
    const timeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    const handleSendFriendRequest = (userId: string) => {
        if (sentRequests.has(userId)) return;
        sendFriendRequest(userId);
        setSentRequests(prev => {
            const newSet = new Set(prev);
            newSet.add(userId);
            return newSet;
        });
    };

    // ... (Styles remain the same, omitting from diff for brevity if unmodified, but I must provide full content for the chunk replacement)
    // Actually, I should just replace the component body logic.

    const styles = {
        // Container now fills MobileContainer
        container: {
            height: '100%',
            width: '100%',
            backgroundColor: '#0B0B0B',
            color: '#FAFAFA',
            position: 'relative' as const,
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
            display: 'flex',
            flexDirection: 'column' as const
        },
        // Top App Bar
        topBar: {
            height: LAYOUT.HEADER_HEIGHT,
            zIndex: Z_INDEX.HEADER,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #27272A',
            flexShrink: 0,
            backgroundColor: '#0B0B0B',
            position: 'relative' as const,
            padding: `0 ${LAYOUT.SCREEN_PADDING_X}`
        },
        logoText: {
            fontSize: '1.5rem',
            fontWeight: 800,
            margin: '1rem 0 0 0'
        },
        logoGradient: {
            backgroundImage: 'linear-gradient(to right, #ef4444, #fbbf24, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
        },
        connStatus: {
            position: 'absolute' as const,
            right: LAYOUT.SCREEN_PADDING_X,
            fontSize: '0.7rem',
            color: isConnected ? '#10B981' : '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
        },
        // Scrollable Content
        mainContent: {
            position: 'relative' as const,
            zIndex: Z_INDEX.CONTENT,
            flex: 1,
            overflowY: 'auto' as const,
            // Strict Spacing Application
            paddingTop: LAYOUT.SCREEN_PADDING_TOP,
            paddingBottom: LAYOUT.SCREEN_PADDING_BOTTOM,
            paddingLeft: LAYOUT.SCREEN_PADDING_X,
            paddingRight: LAYOUT.SCREEN_PADDING_X,
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: LAYOUT.SECTION_GAP,
        },
        contentWrapper: {
            width: '100%',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: LAYOUT.SECTION_GAP
        },
        sectionTitle: {
            fontSize: '1rem',
            fontWeight: 600,
            color: '#FACC15',
            margin: '0 0 0.5rem 0'
        },
        // Components
        actionButton: {
            width: '100%',
            height: '3.5rem',
            borderRadius: '1rem',
            backgroundColor: isSearching ? '#4B5563' : '#D97706',
            color: 'black',
            fontWeight: 600,
            boxShadow: isSearching ? 'none' : '0 0 20px rgba(217,119,6,0.35)',
            border: 'none',
            cursor: isSearching ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
        },
        secondaryButton: {
            height: '3.25rem',
            borderRadius: '0.75rem',
            backgroundColor: '#1F1F1F',
            border: '1px solid #3F3F46',
            color: '#FACC15',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            fontSize: '0.9rem'
        },
        // Modal Overlay Style
        modalOverlay: {
            position: 'absolute' as const,
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: Z_INDEX.MODAL + 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        },
        modalContent: {
            width: '85%',
            backgroundColor: '#18181B',
            border: '1px solid #27272A',
            borderRadius: '1rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        },
        // Fixed Bottom Navigation
        bottomNav: {
            height: LAYOUT.NAV_HEIGHT,
            backgroundColor: '#0B0B0B',
            borderTop: '1px solid #27272A',
            zIndex: Z_INDEX.NAV_BAR,
            position: 'absolute' as const,
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        navInner: {
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `0 ${LAYOUT.SCREEN_PADDING_X}`
        },
        navButton: (isActive: boolean) => ({
            flex: 1,
            height: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isActive ? '#FACC15' : '#71717A',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: isActive ? 600 : 500,
            padding: 0
        })
    };

    return (
        <MobileContainer>
            <div style={styles.container}>

                {/* WAITING FOR OPPONENT MODAL (HOST) */}
                {roomId && !mpGameState && !isSearching && (
                    <div style={styles.modalOverlay}>
                        {/* ... Room Waiting Content ... */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={styles.modalContent}
                        >
                            {/* ... existing wait modal content ... */}
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⏳</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Waiting for Opponent</h3>
                            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#A1A1AA' }}>
                                Share this room code with your friend:
                            </p>

                            <div style={{
                                backgroundColor: '#000',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #333',
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                letterSpacing: '0.1em',
                                color: '#FACC15',
                                margin: '0.5rem 0'
                            }}>
                                {roomId}
                            </div>

                            <Button
                                onClick={leaveRoom}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid #EF4444',
                                    color: '#EF4444',
                                    width: '100%'
                                }}
                            >
                                Cancel
                            </Button>
                        </motion.div>
                    </div>
                )}

                {/* CROPPER MODAL */}
                {isCropModalOpen && selectedImage && (
                    <div style={{ ...styles.modalOverlay, zIndex: 9999 }}>
                        <div style={{
                            width: '90%',
                            height: '80%',
                            backgroundColor: '#18181B',
                            borderRadius: '1rem',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                        }}>
                            <div style={{ position: 'relative', flex: 1, backgroundColor: '#000' }}>
                                <Cropper
                                    image={selectedImage}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div style={{ padding: '1rem', display: 'flex', gap: '1rem', borderTop: '1px solid #27272A', backgroundColor: '#18181B' }}>
                                <Button
                                    onClick={handleCropCancel}
                                    style={{ flex: 1, backgroundColor: '#27272A', color: '#FFF' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCropSave}
                                    style={{ flex: 1, backgroundColor: '#FACC15', color: '#000', fontWeight: 'bold' }}
                                >
                                    Save & Upload
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EDIT PROFILE MODAL */}
                {isEditModalOpen && (
                    <div style={styles.modalOverlay}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={styles.modalContent}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Edit Display Name</h3>
                            <p style={{ fontSize: '0.9rem', color: '#A1A1AA', marginBottom: '1.5rem' }}>Update your display name.</p>

                            {/* Display Name Input */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#A1A1AA', marginBottom: '0.5rem', fontWeight: 600 }}>Display Name</label>
                                <input
                                    autoFocus
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter your name"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        backgroundColor: '#000',
                                        border: '1px solid #333',
                                        borderRadius: '0.5rem',
                                        color: '#FFF',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Button
                                    onClick={() => setIsEditModalOpen(false)}
                                    style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid #333', color: '#FFF' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveName}
                                    disabled={isSavingName || !editName.trim()}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#FACC15',
                                        color: '#000',
                                        fontWeight: 'bold',
                                        opacity: (!editName.trim() || isSavingName) ? 0.5 : 1
                                    }}
                                >
                                    {isSavingName ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* JOIN GAME MODAL */}
                {joinModalOpen && (
                    <div style={styles.modalOverlay}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={styles.modalContent}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Join Private Game</h3>
                            <p style={{ fontSize: '0.9rem', color: '#A1A1AA' }}>Enter the room code shared by your friend.</p>

                            <input
                                autoFocus
                                value={joinCodeInput}
                                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                                placeholder="ROOM CODE"
                                style={{
                                    width: '100%',
                                    height: '3rem',
                                    textAlign: 'center',
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    borderRadius: '0.5rem',
                                    border: '1px solid #3F3F46',
                                    backgroundColor: '#09090B',
                                    color: 'white',
                                    letterSpacing: '0.1em',
                                    outline: 'none'
                                }}
                            />

                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                <Button
                                    onClick={() => {
                                        setJoinModalOpen(false);
                                        setJoinCodeInput("");
                                    }}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#27272A',
                                        color: '#A1A1AA'
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onMouseEnter={() => setIsJoinHovered(true)}
                                    onMouseLeave={() => { setIsJoinHovered(false); setIsJoinPressed(false); }}
                                    onMouseDown={() => setIsJoinPressed(true)}
                                    onMouseUp={() => setIsJoinPressed(false)}
                                    onTouchStart={() => setIsJoinPressed(true)}
                                    onTouchEnd={() => setIsJoinPressed(false)}
                                    onClick={() => {
                                        if (joinCodeInput.length >= 2) {
                                            joinRoom(joinCodeInput);
                                            setJoinModalOpen(false);
                                        }
                                    }}
                                    disabled={!joinCodeInput}
                                    style={{
                                        flex: 1,
                                        backgroundColor: (isJoinHovered || isJoinPressed) ? '#FACC15' : '#D97706', // Yellow if Hover OR Press
                                        color: (isJoinHovered || isJoinPressed) ? 'black' : 'white',
                                        transition: 'all 0.1s',
                                        transform: isJoinPressed ? 'scale(0.98)' : 'scale(1)' // Subtle press effect
                                    }}
                                >
                                    Join
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Top Bar */}
                <div style={styles.topBar}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h1 style={styles.logoText}>
                            <span style={styles.logoGradient}>SuperSquare</span>
                        </h1>
                        <p style={{ fontSize: '0.7rem', color: '#A1A1AA', margin: '0 0 1.5rem 0' }}>
                            Made with ❤️ by Ashutosh Pathak
                        </p>
                    </div>
                    {/* Connection Indicator */}
                    <div style={styles.connStatus}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isConnected ? '#10B981' : '#EF4444' }} />
                        {isConnected ? 'LIVE' : 'OFFLINE'}
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={styles.mainContent}>
                    <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        style={styles.contentWrapper}
                    >
                        {tab === "home" && (
                            <>
                                {/* Hero Action */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Play Now</h2>
                                    <p style={{ fontSize: '0.875rem', color: '#A1A1AA', margin: 0 }}>Join the battle arena</p>
                                </div>

                                <Button
                                    style={styles.actionButton}
                                    onClick={() => !isSearching && findMatch()}
                                    disabled={isSearching}
                                >
                                    {isSearching ? (
                                        <>Searching...</>
                                    ) : (
                                        <>Random Matchmaking</>
                                    )}
                                </Button>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <Button style={styles.secondaryButton} onClick={() => setJoinModalOpen(true)}>
                                        Join Game
                                    </Button>
                                    <Button style={styles.secondaryButton} onClick={createRoom}>
                                        Create Game
                                    </Button>
                                </div>

                                {/* Divider */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                                    <div style={{ flexGrow: 1, borderTop: '1px solid #27272A' }} />
                                </div>

                                {/* Play Offline Button */}
                                <Button
                                    style={{
                                        ...styles.secondaryButton,
                                        color: '#FACC15'
                                    }}
                                    onClick={() => navigate('/play/offline')}
                                >
                                    Offline Play (Local)
                                </Button>

                                <Card style={{ backgroundColor: '#111111', border: '1px solid #27272A', borderRadius: '1rem', marginTop: '1rem' }}>
                                    <CardContent style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <h2 style={styles.sectionTitle}>Leaderboard</h2>
                                        {leaderboard.length === 0 ? (
                                            <div style={{ fontSize: '0.8rem', color: '#52525B', marginTop: '0.5rem', textAlign: 'center' }}>Loading rankings...</div>
                                        ) : (
                                            leaderboard.map((player, index) => (
                                                <div key={player.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: index < 3 ? '#18181B' : 'transparent', border: index < 3 ? '1px solid #27272A' : 'none' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                        <div style={{ width: '1.5rem', textAlign: 'center', fontWeight: 800, color: index === 0 ? '#FACC15' : index === 1 ? '#94A3B8' : index === 2 ? '#B45309' : '#52525B', fontSize: '0.9rem' }}>
                                                            #{index + 1}
                                                        </div>
                                                        <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#27272A', overflow: 'hidden', flexShrink: 0 }}>
                                                            {player.profilePicture ? (
                                                                <img src={player.profilePicture} alt={player.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A1A1AA', fontSize: '0.8rem', fontWeight: 700 }}>
                                                                    {(player.name || player.username).charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                                                            <div style={{ fontSize: '0.9rem', color: '#E5E7EB', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#52525B' }}>@{player.username}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#A1A1AA', marginTop: '0.2rem' }}>
                                                                <div title="Games Played"><span style={{ color: '#FACC15', fontWeight: 600 }}>{player.gamesPlayed || 0}</span> G</div>
                                                                <div title="Wins"><span style={{ color: '#F59E0B', fontWeight: 600 }}>{player.wins}</span> W</div>
                                                                <div title="Losses"><span style={{ color: '#EF4444', fontWeight: 600 }}>{player.losses}</span> L</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ fontWeight: 700, color: '#FACC15', fontSize: '0.9rem', minWidth: '4.5rem', textAlign: 'right' }}>
                                                            {player.elo} <span style={{ fontSize: '0.7rem', color: '#52525B', fontWeight: 400 }}>Rating</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {tab === "friends" && (
                            <>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>My Friends</h2>

                                {/* Friend Requests -- Using Context Data */}
                                {incomingRequests.length > 0 && (
                                    <Card style={{ backgroundColor: '#111111', border: '1px solid #27272A', borderRadius: '1rem' }}>
                                        <CardContent style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <h3 style={styles.sectionTitle}>Requests</h3>
                                            {incomingRequests.map((req) => (
                                                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #27272A' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#3F3F46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', overflow: 'hidden' }}>
                                                            {req.profilePicture ? (
                                                                <img src={req.profilePicture} alt={req.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                req.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '0.9rem', color: '#E5E7EB', fontWeight: 500 }}>{req.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#71717A' }}>@{req.id}</div>
                                                            {req.elo !== undefined && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#A1A1AA', marginTop: '0.2rem' }}>
                                                                    {req.rank && <div title="Rank"><span style={{ color: '#F59E0B', fontWeight: 600 }}>#{req.rank}</span> Rank</div>}
                                                                    <div title="Games Played"><span style={{ color: '#FACC15', fontWeight: 600 }}>{req.gamesPlayed || 0}</span> G</div>
                                                                    <div title="Wins"><span style={{ color: '#F59E0B', fontWeight: 600 }}>{req.wins || 0}</span> W</div>
                                                                    <div title="Losses"><span style={{ color: '#EF4444', fontWeight: 600 }}>{req.losses || 0}</span> L</div>
                                                                    <div title="Rating"><span style={{ color: '#FACC15', fontWeight: 600 }}>{req.elo}</span> Rating</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <Button
                                                            style={{ height: '2rem', padding: '0 1rem', backgroundColor: '#10B981', color: 'black', fontSize: '0.75rem', borderRadius: '0.5rem' }}
                                                            onClick={() => respondFriendRequest(req.id, true)}
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            style={{ height: '2rem', padding: '0 1rem', backgroundColor: '#EF4444', color: 'white', fontSize: '0.75rem', borderRadius: '0.5rem' }}
                                                            onClick={() => respondFriendRequest(req.id, false)}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                <Card style={{ backgroundColor: '#111111', border: '1px solid #27272A', borderRadius: '1rem' }}>
                                    <CardContent style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <h3 style={{ ...styles.sectionTitle, color: '#F59E0B' }}>Online Friends</h3>
                                        {friends.filter(f => f.status !== 'OFFLINE').length === 0 ? (
                                            <div style={{ color: '#52525B', fontSize: '0.8rem' }}>No friends online.</div>
                                        ) : (
                                            friends.filter(f => f.status !== 'OFFLINE').map((friend) => (
                                                <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#27272A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A1A1AA', fontSize: '0.8rem', overflow: 'hidden' }}>
                                                            {friend.profilePicture ? (
                                                                <img src={friend.profilePicture} alt={friend.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                friend.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.9rem', color: '#E5E7EB' }}>{friend.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#A1A1AA' }}>@{friend.id}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#A1A1AA', marginTop: '0.2rem' }}>
                                                                <div title="Rank"><span style={{ color: '#F59E0B', fontWeight: 600 }}>#{friend.rank || '-'}</span> Rank</div>
                                                                <div title="Games Played"><span style={{ color: '#FACC15', fontWeight: 600 }}>{friend.gamesPlayed || 0}</span> G</div>
                                                                <div title="Wins"><span style={{ color: '#F59E0B', fontWeight: 600 }}>{friend.wins || 0}</span> W</div>
                                                                <div title="Losses"><span style={{ color: '#EF4444', fontWeight: 600 }}>{friend.losses || 0}</span> L</div>
                                                                <div title="Rating"><span style={{ color: '#FACC15', fontWeight: 600 }}>{friend.elo}</span> Rating</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button onClick={() => sendGameInvite(friend.id)} style={{ width: 'auto', height: '1.75rem', padding: '0 0.75rem', backgroundColor: '#D97706', color: 'black', fontSize: '0.75rem', borderRadius: '0.5rem', fontWeight: 600 }}>Play</Button>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                <Card style={{ backgroundColor: '#111111', border: '1px solid #27272A', borderRadius: '1rem' }}>
                                    <CardContent style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <h3 style={{ ...styles.sectionTitle, color: '#EAB308' }}>Offline Friends</h3>
                                        {friends.filter(f => f.status === 'OFFLINE').length === 0 ? (
                                            <div style={{ color: '#52525B', fontSize: '0.8rem' }}>No offline friends.</div>
                                        ) : (
                                            friends.filter(f => f.status === 'OFFLINE').map((friend) => (
                                                <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.6 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#27272A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525B', fontSize: '0.8rem', overflow: 'hidden' }}>
                                                            {friend.profilePicture ? (
                                                                <img src={friend.profilePicture} alt={friend.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                friend.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.9rem', color: '#A1A1AA' }}>{friend.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#52525B' }}>@{friend.id} <span style={{ margin: '0 4px' }}>•</span> {friend.lastActiveAt ? `Last seen ${timeAgo(new Date(friend.lastActiveAt))}` : 'Offline'}</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#52525B', marginTop: '0.2rem' }}>
                                                                <div title="Rank"><span style={{ color: '#71717A', fontWeight: 600 }}>#{friend.rank || '-'}</span> Rank</div>
                                                                <div title="Games Played"><span style={{ color: '#71717A', fontWeight: 600 }}>{friend.gamesPlayed || 0}</span> G</div>
                                                                <div title="Wins"><span style={{ color: '#71717A', fontWeight: 600 }}>{friend.wins || 0}</span> W</div>
                                                                <div title="Losses"><span style={{ color: '#71717A', fontWeight: 600 }}>{friend.losses || 0}</span> L</div>
                                                                <div title="Rating"><span style={{ color: '#71717A', fontWeight: 600 }}>{friend.elo}</span> Rating</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Search and Profile Tabs remain largely same in structure but can trigger sends */}
                        {tab === "search" && (
                            <>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Find Players</h2>
                                <input
                                    placeholder="Search by username or name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: '3.25rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#18181B',
                                        border: '1px solid #27272A',
                                        padding: '0 1rem',
                                        fontSize: '0.95rem',
                                        color: 'white',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />

                                {/* Search Results */}
                                {isSearchingUsers && (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#A1A1AA' }}>
                                        Searching...
                                    </div>
                                )}

                                {!isSearchingUsers && searchQuery && searchResults.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#52525B' }}>
                                        No players found
                                    </div>
                                )}

                                {!isSearchingUsers && !searchQuery && (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#52525B', fontSize: '0.85rem' }}>
                                        Start typing to search for players by username or name
                                    </div>
                                )}

                                {!isSearchingUsers && searchResults.length > 0 && (
                                    <Card style={{ backgroundColor: '#111111', border: '1px solid #27272A', borderRadius: '1rem', marginTop: '1rem' }}>
                                        <CardContent style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {searchResults.map((user: any) => {
                                                const isSent = sentRequests.has(user.id);
                                                const isFriend = friends.some(f => f.id === user.id);

                                                return (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => !isFriend && handleSendFriendRequest(user.id)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.75rem',
                                                            borderRadius: '0.5rem',
                                                            backgroundColor: '#18181B',
                                                            border: '1px solid #27272A',
                                                            cursor: (isSent || isFriend) ? 'default' : 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isSent && !isFriend) {
                                                                e.currentTarget.style.backgroundColor = '#1F1F1F';
                                                                e.currentTarget.style.borderColor = '#3F3F46';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#18181B';
                                                            e.currentTarget.style.borderColor = '#27272A';
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{
                                                                width: '2.5rem',
                                                                height: '2.5rem',
                                                                borderRadius: '50%',
                                                                background: '#27272A',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#FACC15',
                                                                fontSize: '0.9rem',
                                                                fontWeight: 600,
                                                                overflow: 'hidden'
                                                            }}>
                                                                {user.profilePicture ? (
                                                                    <img src={user.profilePicture} alt={user.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    (user.name || user.id).charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.95rem', color: '#E5E7EB', fontWeight: 500 }}>
                                                                    {user.name || user.id}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: '#71717A' }}>
                                                                    @{user.id}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#52525B', marginTop: '0.2rem' }}>
                                                                    <div title="Rank"><span style={{ color: '#FACC15', fontWeight: 600 }}>#{user.rank || '-'}</span> Rank</div>
                                                                    <div title="Games Played"><span style={{ color: '#FACC15', fontWeight: 600 }}>{user.gamesPlayed || 0}</span> G</div>
                                                                    <div title="Wins"><span style={{ color: '#F59E0B', fontWeight: 600 }}>{user.wins || 0}</span> W</div>
                                                                    <div title="Losses"><span style={{ color: '#EF4444', fontWeight: 600 }}>{user.losses || 0}</span> L</div>
                                                                    <div title="Rating"><span style={{ color: '#FACC15', fontWeight: 600 }}>{user.elo}</span> Rating</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isFriend ? (
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="9" cy="7" r="4"></circle>
                                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                            </svg>
                                                        ) : isSent ? (
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                                <polyline points="17 11 19 13 23 9"></polyline>
                                                            </svg>
                                                        ) : (
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                                                <line x1="23" y1="11" x2="17" y2="11"></line>
                                                            </svg>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}

                        {tab === "profile" && (
                            <>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>My Profile</h2>
                                <Card style={{ backgroundColor: '#111111', border: '1px solid #27272A', borderRadius: '1rem' }}>
                                    <CardContent style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', position: 'relative' }}>
                                        {/* Rank & Rating Badges */}
                                        <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</div>
                                            <div style={{ fontSize: '1.1rem', color: '#F59E0B', fontWeight: 700 }}>#{user?.rank || '-'}</div>
                                        </div>
                                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</div>
                                            <div style={{ fontSize: '1.1rem', color: '#F59E0B', fontWeight: 700 }}>{user?.elo}</div>
                                        </div>

                                        {/* Profile Picture - CLICK TO CHANGE */}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                width: 'min(9rem, 35vw)',
                                                height: 'min(9rem, 35vw)',
                                                borderRadius: '50%',
                                                backgroundColor: '#18181B',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '3px solid #FACC15',
                                                boxShadow: '0 0 20px rgba(250, 204, 21, 0.15)',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                flexShrink: 0
                                            }}>
                                            {/* Hidden Input */}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                style={{ display: 'none' }}
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                            />

                                            {/* Image or Initials */}
                                            {user?.profilePicture ? (
                                                <img
                                                    src={user.profilePicture}
                                                    alt="Profile"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', color: '#FAFAFA', fontWeight: 700 }}>
                                                    {user?.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                                                </span>
                                            )}

                                            {/* Upload Overlay */}
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundColor: 'rgba(0,0,0,0.5)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0,
                                                transition: 'opacity 0.2s',
                                                color: 'white',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                                            >
                                                {isUploading ? 'Uploading...' : 'Change'}
                                            </div>
                                        </div>

                                        {/* User Info - Centered */}
                                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%', maxWidth: '300px', padding: '0 1rem' }}>
                                            <div style={{ fontSize: 'clamp(0.85rem, 4vw, 1rem)', color: '#FAFAFA', fontWeight: 500, display: 'flex', alignItems: 'flex-start' }}>
                                                <span style={{ color: '#A1A1AA', fontWeight: 400, flexShrink: 0, marginRight: '0.5rem' }}>Name: </span>
                                                <span style={{ wordBreak: 'break-word', flex: 1, lineHeight: '1.2' }}>{user?.name || "N/A"}</span>
                                                {/* Small Pencil Icon */}
                                                <div
                                                    onClick={handleEditProfile}
                                                    style={{
                                                        width: '1.3rem',
                                                        height: '1.3rem',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#FACC15',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        border: '1.5px solid #000',
                                                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                                        transition: 'transform 0.2s',
                                                        flexShrink: 0,
                                                        marginLeft: '0.5rem'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 20h9"></path>
                                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 'clamp(0.85rem, 4vw, 1rem)', color: '#FAFAFA', fontWeight: 500, display: 'flex', alignItems: 'flex-start' }}>
                                                <span style={{ color: '#A1A1AA', fontWeight: 400, flexShrink: 0, marginRight: '0.5rem' }}>User ID: </span>
                                                <span style={{ wordBreak: 'break-word', flex: 1, lineHeight: '1.2' }}>@{user?.username}</span>
                                            </div>
                                            <div style={{ fontSize: 'clamp(0.85rem, 4vw, 1rem)', color: '#FAFAFA', fontWeight: 500, display: 'flex', alignItems: 'flex-start' }}>
                                                <span style={{ color: '#A1A1AA', fontWeight: 400, flexShrink: 0, marginRight: '0.5rem' }}>Contact: </span>
                                                <span style={{ wordBreak: 'break-word', flex: 1, lineHeight: '1.2' }}>{user?.phone || user?.email || "N/A"}</span>
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-evenly', // Changed from center gap to space-evenly
                                            marginTop: '0rem',
                                            paddingTop: '1rem',
                                            borderTop: '1px solid #27272A',
                                            width: '100%',
                                        }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FACC15' }}>{user?.gamesPlayed || 0}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#A1A1AA' }}>Games</div>
                                            </div>
                                            <div style={{ width: '1px', height: '2.5rem', backgroundColor: '#3F3F46' }}></div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E0B' }}>{user?.wins || 0}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#A1A1AA' }}>Wins</div>
                                            </div>
                                            <div style={{ width: '1px', height: '2.5rem', backgroundColor: '#3F3F46' }}></div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444' }}>{user?.losses || 0}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#A1A1AA' }}>Losses</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Button onClick={handleLogout} style={{ ...styles.actionButton, backgroundColor: '#EF4444', marginTop: '0.5rem', boxShadow: 'none' }}>
                                    Logout
                                </Button>
                            </>
                        )}
                    </motion.div>
                </div>

                {/* Bottom Nav */}
                <div style={styles.bottomNav}>
                    <div style={styles.navInner}>
                        <button onClick={() => setTab("home")} style={styles.navButton(tab === "home")}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            Home
                        </button>
                        <button onClick={() => setTab("friends")} style={styles.navButton(tab === "friends")}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Friends
                        </button>
                        <button onClick={() => setTab("search")} style={styles.navButton(tab === "search")}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            Search
                        </button>
                        <button onClick={() => setTab("profile")} style={styles.navButton(tab === "profile")}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* Game Invite Modal */}
            {incomingGameInvites.length > 0 && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    zIndex: Z_INDEX.MODAL + 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: '#18181B',
                        border: '1px solid #3F3F46',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        width: '100%',
                        maxWidth: '320px',
                        textAlign: 'center',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#FACC15', fontSize: '1.5rem', fontWeight: 700 }}>Game Invite!</h3>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '5rem', height: '5rem', borderRadius: '50%', backgroundColor: '#27272A',
                                margin: '0 auto 1rem auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '3px solid #FACC15', boxShadow: '0 0 15px rgba(250, 204, 21, 0.3)'
                            }}>
                                {incomingGameInvites[0].fromUserProfilePicture ? (
                                    <img src={incomingGameInvites[0].fromUserProfilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '2rem', color: '#FAFAFA', fontWeight: 700 }}>{incomingGameInvites[0].fromUserName.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div style={{ color: '#FAFAFA', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.25rem' }}>{incomingGameInvites[0].fromUserName}</div>
                            <div style={{ color: '#A1A1AA', fontSize: '0.9rem' }}>wants to play a game with you.</div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Button
                                onClick={() => respondGameInvite(incomingGameInvites[0].fromUser, false)}
                                style={{ flex: 1, backgroundColor: '#3F3F46', color: '#FAFAFA', height: '3rem', fontSize: '1rem' }}
                            >
                                Decline
                            </Button>
                            <Button
                                onClick={() => respondGameInvite(incomingGameInvites[0].fromUser, true)}
                                style={{ flex: 1, backgroundColor: '#D97706', color: '#000000', fontWeight: '800', height: '3rem', fontSize: '1rem' }}
                            >
                                Accept
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {errorMsg && (
                <div style={{
                    position: 'fixed',
                    bottom: '5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    zIndex: Z_INDEX.MODAL + 20,
                    fontWeight: 600,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                    {errorMsg}
                </div>
            )}

        </MobileContainer>
    );
};

export default OnlineLobby;
