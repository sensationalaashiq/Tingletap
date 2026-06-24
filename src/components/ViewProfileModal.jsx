import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Badges as badges } from '../data/Badges';
import { getRoleDisplayLabel } from '../utils/roleUtils';
import RoyalTrustBadge from './RoyalTrustBadge';
import './ViewProfileModal.css';
import './RoyalTrustBadge.css';

// Helper function to convert YouTube URL to embed format
const convertToYouTubeEmbedURL = (url) => {
    if (!url) return '';

    // If already an embed URL, return as is
    if (url.includes('youtube.com/embed/')) {
        return url;
    }

    // Extract video ID from various YouTube URL formats
    let videoId = '';

    // Handle youtube.com/watch?v= format
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('youtube.com/watch?v=')[1].split('&')[0];
    }
    // Handle youtu.be/ format
    else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    // Handle youtube.com/v/ format
    else if (url.includes('youtube.com/v/')) {
        videoId = url.split('youtube.com/v/')[1].split('?')[0];
    }

    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&controls=1`;
    }

    return url; // Return original if can't convert
};

// Helper function to convert Spotify URL to embed format
const convertToSpotifyEmbedURL = (url) => {
    if (!url) return '';

    // If already an embed URL, return as is
    if (url.includes('open.spotify.com/embed/')) {
        return url;
    }

    // Extract track ID from Spotify URL
    let trackId = '';

    // Handle different Spotify URL formats
    if (url.includes('open.spotify.com/track/')) {
        trackId = url.split('open.spotify.com/track/')[1].split('?')[0];
    } else if (url.includes('spotify.com/track/')) {
        trackId = url.split('spotify.com/track/')[1].split('?')[0];
    }

    if (trackId) {
        return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
    }

    // Fallback: try to convert by replacing path
    if (url.includes('open.spotify.com/')) {
        return url.replace('open.spotify.com/', 'open.spotify.com/embed/').split('?')[0];
    }

    return url; // Return original if can't convert
};

const ViewProfileModal = ({ user, onClose, onOpenProfile, onSendMessage, onWhisper, currentUserProfile: propsCurrentUser }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [friendsData, setFriendsData] = useState([]);
    const [isCurrentUser, setIsCurrentUser] = useState(false);
    const [friendRequestSent, setFriendRequestSent] = useState(false);
    const [isFriend, setIsFriend] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [realTimeUser, setRealTimeUser] = useState(user);
    const [showFullImage, setShowFullImage] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        // Close any other profile modals that might be open
        const existingModals = document.querySelectorAll('.ultra-modern-profile-overlay, .profile-modal, .profile-modal-overlay');
        existingModals.forEach(modal => {
            if (modal && !modal.closest('.modern-profile-overlay')) {
                modal.style.display = 'none';
            }
        });

        // Check if there's a current user before comparing
        const currentUser = auth.currentUser;
        if (currentUser) {
            setIsCurrentUser(user.uid === currentUser.uid);
            loadCurrentUserData();
        }

        loadFriendsData();
        applyFontPreferences();

        // Set up real-time listener for immediate updates
        let unsubscribe = () => {};
        try {
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const updatedData = docSnap.data();

                // Check if user is currently online from multiple sources
                const isCurrentlyOnline = window.onlineUsers?.has(user.uid) || 
                                        updatedData.isOnline || 
                                        (window.userOnlineStatuses && window.userOnlineStatuses[user.uid]?.status === 'online') ||
                                        false;

                // Get the most recent lastSeen timestamp
                let lastSeenData = null;

                // Priority order for lastSeen data
                const possibleTimestamps = [
                    updatedData.lastSeenAt,
                    updatedData.lastSeen,
                    updatedData.last_seen,
                    window.userOnlineStatuses?.[user.uid]?.last_changed
                ];

                for (const timestamp of possibleTimestamps) {
                    if (timestamp) {
                        try {
                            if (timestamp.toDate) {
                                // Firestore Timestamp
                                lastSeenData = timestamp.toDate().getTime();
                                break;
                            } else if (typeof timestamp === 'number') {
                                // Unix timestamp (convert to milliseconds if needed)
                                lastSeenData = timestamp > 1000000000000 ? timestamp : timestamp * 1000;
                                break;
                            } else if (typeof timestamp === 'string') {
                                // String timestamp
                                const parsed = new Date(timestamp).getTime();
                                if (!isNaN(parsed)) {
                                    lastSeenData = parsed;
                                    break;
                                }
                            } else if (timestamp instanceof Date) {
                                // Date object
                                lastSeenData = timestamp.getTime();
                                break;
                            }
                        } catch (error) {
                            console.log('Error parsing timestamp:', timestamp, error);
                            continue;
                        }
                    }
                }

                // If user is currently online, update their last seen to now
                if (isCurrentlyOnline) {
                    lastSeenData = Date.now();
                }

                setRealTimeUser(prevUser => ({
                    ...prevUser,
                    ...updatedData,
                    lastSeen: lastSeenData,
                    lastSeenAt: lastSeenData,
                    isOnline: isCurrentlyOnline
                }));

                console.log('📸 Profile picture updated for:', updatedData.displayName, updatedData.photoURL);
            }
        }, (error) => {
            console.error('Error in real-time user updates:', error);
        });
        } catch (snapshotError) {
            console.error('Failed to set up profile listener:', snapshotError);
        }

        return () => {
            unsubscribe();
        };
    }, [user?.uid]);

    const applyFontPreferences = async () => {
        try {
            // IMPORTANT: Get the specific user's font preferences, not current user's
            let fontPrefs = null;
            const profileUserId = realTimeUser?.uid;

            // Priority 1: Try to get from global window.userUsernameStyles or allUsersUsernameStyles
            if (profileUserId && window.userUsernameStyles && window.userUsernameStyles[profileUserId]) {
                const userStyles = window.userUsernameStyles[profileUserId];
                fontPrefs = {
                    fontSize: userStyles.usernameFontSize || '16px',
                    fontColor: userStyles.usernameFontColor || '#333333',
                    fontFamily: userStyles.usernameFontFamily || 'Helvetica',
                    isBold: userStyles.usernameIsBold || false,
                    isItalic: userStyles.usernameIsItalic || false,
                    isUnderline: userStyles.usernameIsUnderline || false,
                    isStrikethrough: userStyles.usernameIsStrikethrough || false,
                    gradientEnabled: userStyles.usernameGradientEnabled || false,
                    gradientStart: userStyles.usernameGradientStart || '#667eea',
                    gradientEnd: userStyles.usernameGradientEnd || '#f093fb',
                    gradientDirection: userStyles.usernameGradientDirection || 'to right',
                    animationEnabled: userStyles.usernameAnimationEnabled || false,
                    animationType: userStyles.usernameAnimationType || 'glow',
                    animationDuration: userStyles.usernameAnimationDuration || '2s',
                    textShadow: userStyles.usernameTextShadow || '1px 1px 3px rgba(0,0,0,0.2)',
                    letterSpacing: userStyles.usernameLetterSpacing || '1px'
                };
                console.log('🎨 Using profile user specific font preferences for modal:', profileUserId, fontPrefs);
            }

            // Try from allUsersUsernameStyles if not found in userUsernameStyles
            else if (profileUserId && window.allUsersUsernameStyles && window.allUsersUsernameStyles[profileUserId]) {
                const userStyleData = window.allUsersUsernameStyles[profileUserId];
                if (userStyleData.styles) {
                    const userStyles = userStyleData.styles;
                    fontPrefs = {
                        fontSize: userStyles.usernameFontSize || '16px',
                        fontColor: userStyles.usernameFontColor || '#333333',
                        fontFamily: userStyles.usernameFontFamily || 'Helvetica',
                        isBold: userStyles.usernameIsBold || false,
                        isItalic: userStyles.usernameIsItalic || false,
                        isUnderline: userStyles.usernameIsUnderline || false,
                        isStrikethrough: userStyles.usernameIsStrikethrough || false,
                        gradientEnabled: userStyles.usernameGradientEnabled || false,
                        gradientStart: userStyles.usernameGradientStart || '#667eea',
                        gradientEnd: userStyles.usernameGradientEnd || '#f093fb',
                        gradientDirection: userStyles.usernameGradientDirection || 'to right',
                        animationEnabled: userStyles.usernameAnimationEnabled || false,
                        animationType: userStyles.usernameAnimationType || 'glow',
                        animationDuration: userStyles.usernameAnimationDuration || '2s',
                        textShadow: userStyles.usernameTextShadow || '1px 1px 3px rgba(0,0,0,0.2)',
                        letterSpacing: userStyles.usernameLetterSpacing || '1px'
                    };
                    console.log('🎨 Using profile user specific font preferences from allUsersUsernameStyles:', profileUserId, fontPrefs);
                }
            }

            // Priority 2: Try to get from Firebase directly
            else if (profileUserId && profileUserId !== auth.currentUser?.uid) {
                try {
                    const profileUserDoc = await getDoc(doc(db, 'users', profileUserId));
                    if (profileUserDoc.exists()) {
                        const profileUserData = profileUserDoc.data();

                        // Check for username preferences in settings
                        if (profileUserData.settings) {
                            const settings = profileUserData.settings;
                            fontPrefs = {
                                fontSize: settings.usernameFontSize || '16px',
                                fontColor: settings.usernameFontColor || '#333333',
                                fontFamily: settings.usernameFontFamily || 'Helvetica',
                                isBold: settings.usernameIsBold || false,
                                isItalic: settings.usernameIsItalic || false,
                                isUnderline: settings.usernameIsUnderline || false,
                                isStrikethrough: settings.usernameIsStrikethrough || false,
                                gradientEnabled: settings.usernameGradientEnabled || false,
                                gradientStart: settings.usernameGradientStart || '#667eea',
                                gradientEnd: settings.usernameGradientEnd || '#f093fb',
                                gradientDirection: settings.usernameGradientDirection || 'to right',
                                animationEnabled: settings.usernameAnimationEnabled || false,
                                animationType: settings.usernameAnimationType || 'glow',
                                animationDuration: settings.usernameAnimationDuration || '2s',
                                textShadow: settings.usernameTextShadow || '1px 1px 3px rgba(0,0,0,0.2)',
                                letterSpacing: settings.usernameLetterSpacing || '1px'
                            };
                            console.log('🎨 Using Firebase profile user preferences for modal:', profileUserId, fontPrefs);
                        }

                        // Check for direct username font preferences
                        else if (profileUserData.usernameFontPreferences) {
                            fontPrefs = profileUserData.usernameFontPreferences;
                            console.log('🎨 Using Firebase username font preferences for modal:', profileUserId, fontPrefs);
                        }
                    }
                } catch (error) {
                    console.log('ℹ️ Could not load profile user preferences from Firebase:', error.message);
                }
            }

            // Priority 3: Profile user's saved data in localStorage (if viewing own profile)
            else if (profileUserId && profileUserId === auth.currentUser?.uid) {
                const savedPrefs = localStorage.getItem('fontPreferences');
                if (savedPrefs) {
                    fontPrefs = JSON.parse(savedPrefs);
                }

                if (!fontPrefs) {
                    fontPrefs = {
                        fontSize: localStorage.getItem('usernameFontSize') || '16px',
                        fontColor: localStorage.getItem('usernameFontColor') || '#333333',
                        fontFamily: localStorage.getItem('usernameFontFamily') || 'Helvetica',
                        isBold: localStorage.getItem('usernameIsBold') === 'true',
                        isItalic: localStorage.getItem('usernameIsItalic') === 'true',
                        isUnderline: localStorage.getItem('usernameIsUnderline') === 'true',
                        isStrikethrough: localStorage.getItem('usernameIsStrikethrough') === 'true',
                        gradientEnabled: localStorage.getItem('usernameGradientEnabled') === 'true',
                        gradientStart: localStorage.getItem('usernameGradientStart') || '#667eea',
                        gradientEnd: localStorage.getItem('usernameGradientEnd') || '#f093fb',
                        gradientDirection: localStorage.getItem('usernameGradientDirection') || 'to right',
                        animationEnabled: localStorage.getItem('usernameAnimationEnabled') === 'true',
                        animationType: localStorage.getItem('usernameAnimationType') || 'glow',
                        animationDuration: localStorage.getItem('usernameAnimationDuration') || '2s',
                        textShadow: localStorage.getItem('usernameTextShadow') || '1px 1px 3px rgba(0,0,0,0.2)',
                        letterSpacing: localStorage.getItem('usernameLetterSpacing') || '1px'
                    };
                }
                console.log('🎨 Using own profile preferences for modal:', fontPrefs);
            }

            // Priority 4: Default styles for other users
            if (!fontPrefs) {
                fontPrefs = {
                    fontSize: '16px',
                    fontColor: '#333333',
                    fontFamily: 'Helvetica',
                    isBold: false,
                    isItalic: false,
                    isUnderline: false,
                    isStrikethrough: false,
                    gradientEnabled: false,
                    gradientStart: '#667eea',
                    gradientEnd: '#f093fb',
                    gradientDirection: 'to right',
                    animationEnabled: false,
                    animationType: 'glow',
                    animationDuration: '2s',
                    textShadow: '1px 1px 3px rgba(0,0,0,0.2)',
                    letterSpacing: '1px'
                };
                console.log('🎨 Using default font preferences for other user profile:', profileUserId);
            }

            console.log('🎨 Retrieved font preferences for modal (profile user specific):', fontPrefs);

            // Multiple attempts to ensure styling is applied
            const applyStylesToUsername = () => {
                const usernameElement = document.querySelector('.modal-display-name');
                if (usernameElement && fontPrefs) {
                    // Apply font preferences directly to username for better visibility
                    usernameElement.style.setProperty('color', fontPrefs.fontColor || '#333333', 'important');
                    usernameElement.style.setProperty('font-size', fontPrefs.fontSize || '16px', 'important');
                    usernameElement.style.setProperty('font-family', fontPrefs.fontFamily || 'inherit', 'important');
                    usernameElement.style.setProperty('font-weight', fontPrefs.isBold ? 'bold' : '700', 'important');
                    usernameElement.style.setProperty('font-style', fontPrefs.isItalic ? 'italic' : 'normal', 'important');

                    // Handle text decorations
                    const decorations = [];
                    if (fontPrefs.isUnderline) decorations.push('underline');
                    if (fontPrefs.isStrikethrough) decorations.push('line-through');
                    usernameElement.style.setProperty('text-decoration', decorations.length > 0 ? decorations.join(' ') : 'none', 'important');

                    // Handle gradient
                    if (fontPrefs.gradientEnabled) {
                        const gradientType = fontPrefs.gradientDirection === 'radial' ? 'radial-gradient' : 'linear-gradient';
                        const direction = fontPrefs.gradientDirection === 'radial' ? 'circle' : fontPrefs.gradientDirection;
                        usernameElement.style.setProperty('background', `${gradientType}(${direction}, ${fontPrefs.gradientStart}, ${fontPrefs.gradientEnd})`, 'important');
                        usernameElement.style.setProperty('-webkit-background-clip', 'text', 'important');
                        usernameElement.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
                        usernameElement.style.setProperty('background-clip', 'text', 'important');
                    } else {
                        usernameElement.style.setProperty('background', 'transparent', 'important');
                        usernameElement.style.setProperty('-webkit-background-clip', 'initial', 'important');
                        usernameElement.style.setProperty('-webkit-text-fill-color', 'initial', 'important');
                        usernameElement.style.setProperty('background-clip', 'initial', 'important');
                    }

                    // Handle animations
                    if (fontPrefs.animationEnabled) {
                        usernameElement.style.setProperty('animation', `${fontPrefs.animationType} ${fontPrefs.animationDuration} infinite`, 'important');
                    } else {
                        usernameElement.style.setProperty('animation', 'none', 'important');
                    }

                    // Apply text shadow and letter spacing
                    usernameElement.style.setProperty('text-shadow', fontPrefs.textShadow || 'none', 'important');
                    usernameElement.style.setProperty('letter-spacing', fontPrefs.letterSpacing || '0px', 'important');

                    // Add data attributes for user-specific styling
                    usernameElement.setAttribute('data-user-uid', user.uid);
                    usernameElement.setAttribute('data-user-id', user.uid);
                    usernameElement.setAttribute('data-profile-uid', user.uid);
                    usernameElement.setAttribute('data-username', user.displayName);

                    console.log('✅ Modal username styled with current user preferences:', user.displayName);
                    return true;
                }
                return false;
            };

            // Try multiple times to ensure application
            setTimeout(() => applyStylesToUsername(), 50);
            setTimeout(() => applyStylesToUsername(), 150);
            setTimeout(() => applyStylesToUsername(), 300);

            // Apply status styles immediately and with retries
            const applyStatusStyles = () => {
                const statusElements = document.querySelectorAll('.user-bio');
                statusElements.forEach(statusElement => {
                    if (statusElement && (user.status || realTimeUser.status)) {
                        const statusStyles = realTimeUser.statusStyles || user.statusStyles;
                        if (statusStyles) {
                            statusElement.style.setProperty('font-family', statusStyles.fontFamily || 'inherit', 'important');
                            statusElement.style.setProperty('font-size', statusStyles.fontSize || '10px', 'important');
                            statusElement.style.setProperty('font-weight', statusStyles.fontWeight || 'normal', 'important');
                            statusElement.style.setProperty('font-style', statusStyles.fontStyle || 'italic', 'important');
                            statusElement.style.setProperty('text-decoration', statusStyles.textDecoration || 'none', 'important');

                            if (statusStyles.gradientEnabled) {
                                statusElement.style.setProperty('color', 'transparent', 'important');
                                statusElement.style.setProperty('background', 
                                    `linear-gradient(${statusStyles.gradientDirection || 'to right'}, ${statusStyles.gradientStart || '#667eea'}, ${statusStyles.gradientEnd || '#764ba2'})`, 'important');
                                statusElement.style.setProperty('-webkit-background-clip', 'text', 'important');
                                statusElement.style.setProperty('background-clip', 'text', 'important');
                            } else {
                                statusElement.style.setProperty('color', statusStyles.textColor || '#6b7280', 'important');
                                statusElement.style.setProperty('background', 'transparent', 'important');
                                statusElement.style.setProperty('-webkit-background-clip', 'initial', 'important');
                                statusElement.style.setProperty('background-clip', 'initial', 'important');
                            }

                            statusElement.style.setProperty('text-shadow', statusStyles.textShadow || 'none', 'important');
                            statusElement.style.setProperty('animation', statusStyles.animation || 'none', 'important');
                            statusElement.style.setProperty('border', 'none', 'important');
                            statusElement.style.setProperty('padding', '2px 0', 'important');
                            return true;
                        }
                    }
                });
                return statusElements.length > 0;
            };

            // Apply immediately and retry multiple times
            applyStatusStyles();
            setTimeout(() => applyStatusStyles(), 0);
            setTimeout(() => applyStatusStyles(), 10);
            setTimeout(() => applyStatusStyles(), 50);
            setTimeout(() => applyStatusStyles(), 100);
            setTimeout(() => applyStatusStyles(), 200);
            setTimeout(() => applyStatusStyles(), 500);

        } catch (error) {
            console.error('Error applying font preferences:', error);
        }
    };

    const loadCurrentUserData = async () => {
        try {
            if (!auth.currentUser) return;

            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setCurrentUserProfile(userData);

                const friends = userData.friends || [];
                const blocked = userData.blockedUsers || [];
                const sentRequests = userData.sentFriendRequests || [];

                setIsFriend(friends.includes(user.uid));
                setIsBlocked(blocked.includes(user.uid));
                setFriendRequestSent(sentRequests.includes(user.uid));
            }
        } catch (error) {
            console.error('Error loading current user data:', error);
        }
    };

    const loadFriendsData = async () => {
        try {
            // Use realTimeUser data first, then fallback to user data
            const userData = realTimeUser || user;
            const friendsList = userData.friends || [];

            console.log('🔍 Loading friends for user:', userData.displayName, 'Friends list:', friendsList);

            if (!friendsList || friendsList.length === 0) {
                console.log('📭 No friends found for user');
                setFriendsData([]);
                return;
            }

            const friendProfiles = await Promise.all(
                friendsList.map(async (friendId) => {
                    try {
                        const friendDoc = await getDoc(doc(db, 'users', friendId));
                        if (friendDoc.exists()) {
                            const friendData = { id: friendDoc.id, uid: friendDoc.id, ...friendDoc.data() };
                            console.log('✅ Loaded friend:', friendData.displayName);
                            return friendData;
                        }
                        console.log('❌ Friend document not found:', friendId);
                        return null;
                    } catch (error) {
                        console.error(`Error loading friend ${friendId}:`, error);
                        return null;
                    }
                })
            );

            const validFriends = friendProfiles.filter(profile => profile !== null);
            console.log('📊 Valid friends loaded:', validFriends.length);
            setFriendsData(validFriends);
        } catch (error) {
            console.error('Error loading friends data:', error);
            setFriendsData([]);
        }
    };

    const handleSendFriendRequest = async () => {
        if (!auth.currentUser || !user || isCurrentUser) return;

        try {
            const currentUserRef = doc(db, 'users', auth.currentUser.uid);
            const targetUserRef = doc(db, 'users', user.uid);

            const currentUserDoc = await getDoc(currentUserRef);
            const currentUserData = currentUserDoc.data();
            const sentRequests = currentUserData.sentFriendRequests || [];

            const targetUserDoc = await getDoc(targetUserRef);
            const targetUserData = targetUserDoc.data();
            const receivedRequests = targetUserData.receivedFriendRequests || [];

            await updateDoc(currentUserRef, {
                sentFriendRequests: [...sentRequests, user.uid]
            });

            await updateDoc(targetUserRef, {
                receivedFriendRequests: [...receivedRequests, auth.currentUser.uid]
            });

            setFriendRequestSent(true);
            toast.success(`Friend request sent to ${user.displayName}!`);
        } catch (error) {
            console.error('Error sending friend request:', error);
            toast.error('Failed to send friend request');
        }
    };

    const handleRemoveFriend = async () => {
        if (!auth.currentUser || !user || isCurrentUser) return;

        const confirmRemove = window.confirm(`Remove ${user.displayName} from friends?`);
        if (!confirmRemove) return;

        try {
            const currentUserRef = doc(db, 'users', auth.currentUser.uid);
            const targetUserRef = doc(db, 'users', user.uid);

            const currentUserDoc = await getDoc(currentUserRef);
            const targetUserDoc = await getDoc(targetUserRef);

            const currentUserData = currentUserDoc.data();
            const targetUserData = targetUserDoc.data();

            const updatedCurrentFriends = (currentUserData.friends || []).filter(id => id !== user.uid);
            const updatedTargetFriends = (targetUserData.friends || []).filter(id => id !== auth.currentUser.uid);

            await updateDoc(currentUserRef, { friends: updatedCurrentFriends });
            await updateDoc(targetUserRef, { friends: updatedTargetFriends });

            setIsFriend(false);
            toast.success(`Removed ${user.displayName} from friends`);
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        }
    };

    const handleBlockUser = async () => {
        if (!auth.currentUser || !user || isCurrentUser) return;

        const confirmBlock = window.confirm(`Block ${user.displayName}? This will also remove them from friends.`);
        if (!confirmBlock) return;

        try {
            const currentUserRef = doc(db, 'users', auth.currentUser.uid);
            const currentUserDoc = await getDoc(currentUserRef);
            const currentUserData = currentUserDoc.data();

            const updatedBlocked = [...(currentUserData.blockedUsers || []), user.uid];
            const updatedFriends = (currentUserData.friends || []).filter(id => id !== user.uid);

            await updateDoc(currentUserRef, {
                blockedUsers: updatedBlocked,
                friends: updatedFriends
            });

            setIsBlocked(true);
            setIsFriend(false);
            toast.success(`Blocked ${user.displayName}`);
            onClose();
        } catch (error) {
            console.error('Error blocking user:', error);
            toast.error('Failed to block user');
        }
    };

    const handleDeleteProfile = async () => {
        if (!auth.currentUser || !isCurrentUser) return;

        const confirmDelete = window.confirm(`⚠️ PERMANENT DELETE WARNING ⚠️\n\nThis will mark your profile for deletion. You will have 3 days to revert this action before permanent deletion.\n\nDuring these 3 days:\n- Your profile will be hidden from other users\n- You can still log in to revert the deletion\n- After 3 days, ALL your data will be permanently deleted\n\nAre you absolutely sure you want to proceed?`);

        if (!confirmDelete) return;

        const finalConfirm = window.confirm(`🚨 FINAL CONFIRMATION 🚨\n\nType "DELETE" in the next prompt to confirm permanent profile deletion with 3-day grace period.`);

        if (!finalConfirm) return;

        const userInput = window.prompt('Type "DELETE" to confirm (case sensitive):');

        if (userInput !== 'DELETE') {
            toast.error('❌ Deletion cancelled - incorrect confirmation text');
            return;
        }

        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const deletionDate = new Date();
            const permanentDeletionDate = new Date(deletionDate.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days

            await updateDoc(userRef, {
                markedForDeletion: true,
                deletionRequestDate: deletionDate,
                permanentDeletionDate: permanentDeletionDate,
                profileHidden: true,
                deletionReason: 'user_requested',
                canRevertUntil: permanentDeletionDate
            });

            toast.success(`🗑️ Profile marked for deletion. You have until ${permanentDeletionDate.toLocaleDateString()} to revert this action.`);

            // Show revert option immediately
            setTimeout(() => {
                const showRevert = window.confirm(`Your profile is now scheduled for deletion on ${permanentDeletionDate.toLocaleDateString()}.\n\nWould you like to revert this action now?`);
                if (showRevert) {
                    handleRevertDeletion();
                }
            }, 2000);

        } catch (error) {
            console.error('Error marking profile for deletion:', error);
            toast.error('Failed to delete profile');
        }
    };

    const handleRevertDeletion = async () => {
        if (!auth.currentUser || !isCurrentUser) return;

        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);

            await updateDoc(userRef, {
                markedForDeletion: false,
                deletionRequestDate: null,
                permanentDeletionDate: null,
                profileHidden: false,
                deletionReason: null,
                canRevertUntil: null,
                deletionReverted: true,
                deletionRevertedAt: new Date()
            });

            toast.success('✅ Profile deletion cancelled successfully!');

        } catch (error) {
            console.error('Error reverting profile deletion:', error);
            toast.error('Failed to revert profile deletion');
        }
    };

    const getAvatarUrl = () => {
        if (!realTimeUser?.uid) return `${getDefaultAvatarUrl('default', 'male')}`;
        // Check cache for most recent user data
        const cachedUser = (window.userProfilesCache instanceof Map)
            ? window.userProfilesCache.get(realTimeUser.uid)
            : window.userProfilesCache?.[realTimeUser.uid];
        const latestPhotoURL = cachedUser?.photoURL || realTimeUser.photoURL;

        if (latestPhotoURL) {
            // Add timestamp for cache busting
            const timestamp = Date.now();
            const separator = latestPhotoURL.includes('?') ? '&' : '?';
            return `${latestPhotoURL}${separator}t=${timestamp}`;
        }

        const gender = cachedUser?.gender || realTimeUser.gender;
        const defaultAvatar = gender?.toLowerCase() === 'female' 
            ? `${getDefaultAvatarUrl(realTimeUser.uid, "female")}`
            : `${getDefaultAvatarUrl(realTimeUser.uid, "male")}`;

        return defaultAvatar;
    };

    const formatJoinDate = (timestamp) => {
        if (!timestamp) return 'Unknown';

        try {
            let date;
            if (timestamp.toDate) {
                // Firestore Timestamp
                date = timestamp.toDate();
            } else if (typeof timestamp === 'string') {
                // String timestamp
                date = new Date(timestamp);
            } else if (typeof timestamp === 'number') {
                // Unix timestamp (seconds or milliseconds)
                date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
            } else if (timestamp instanceof Date) {
                // Already a Date object
                date = timestamp;
            } else {
                // Try to convert whatever we have
                date = new Date(timestamp);
            }

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Unknown';
            }

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting join date:', error);
            return 'Unknown';
        }
    };

    const formatLastSeen = (timestamp) => {
        // Check if this is the current user
        const isViewingSelf = auth.currentUser && realTimeUser.uid === auth.currentUser.uid;

        // Check if user is currently online from real-time status
        const userStatus = window.userOnlineStatuses?.[realTimeUser.uid];
        const isUserOnline = userStatus?.state === 'online' || window.onlineUsers?.has(realTimeUser.uid);

        // If viewing self, always show "Active now" since current user is online
        if (isViewingSelf) {
            return 'Active now';
        }

        // If other user is currently online, show "Active now"
        if (isUserOnline) {
            return 'Active now';
        }

        // For other users who are not online, we need to show their actual last seen time
        // Try to get a valid timestamp from multiple sources
        let validTimestamp = timestamp;

        if (!validTimestamp) {
            // Try to get timestamp from global status tracking
            if (window.userOnlineStatuses && window.userOnlineStatuses[realTimeUser.uid]) {
                const userStatus = window.userOnlineStatuses[realTimeUser.uid];
                validTimestamp = userStatus.last_changed || userStatus.lastSeen || userStatus.last_seen;
            }

            // Try to get from realTimeUser object
            if (!validTimestamp) {
                validTimestamp = realTimeUser.lastSeenAt || realTimeUser.lastSeen || realTimeUser.last_seen;
            }
        }

        // If still no timestamp for other users, try to get it from user data
        if (!validTimestamp && !isViewingSelf) {
            // Check if user has any logout timestamp or last activity
            validTimestamp = realTimeUser.lastLogout || realTimeUser.lastActivity || realTimeUser.updatedAt;
        }

        // If still no timestamp, return appropriate message
        if (!validTimestamp) {
            return 'Last seen recently';
        }

        try {
            let date;
            let timestampMs;

            // Convert timestamp to milliseconds
            if (validTimestamp.toDate) {
                // Firestore Timestamp
                date = validTimestamp.toDate();
                timestampMs = date.getTime();
            } else if (typeof validTimestamp === 'number') {
                // Unix timestamp (convert to milliseconds if needed)
                timestampMs = validTimestamp > 1000000000000 ? validTimestamp : validTimestamp * 1000;
                date = new Date(timestampMs);
            } else if (typeof validTimestamp === 'string') {
                // String timestamp
                date = new Date(validTimestamp);
                timestampMs = date.getTime();
            } else if (validTimestamp instanceof Date) {
                // Already a Date object
                date = validTimestamp;
                timestampMs = date.getTime();
            } else {
                // Try to convert whatever we have
                date = new Date(validTimestamp);
                timestampMs = date.getTime();
            }

            // Check if date is valid
            if (isNaN(timestampMs)) {
                console.warn('Invalid timestamp for user:', realTimeUser.displayName, validTimestamp);
                return 'Last seen recently';
            }

            const now = Date.now();
            const diffMs = now - timestampMs;

            // If the difference is negative or very small for other users, show recent
            if (diffMs < 60000) { // Less than 1 minute
                return 'Just now';
            }

            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            const diffWeeks = Math.floor(diffDays / 7);
            const diffMonths = Math.floor(diffDays / 30);

            // More accurate time formatting with proper timestamps
            if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
            if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
            if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;

            // For very old timestamps, show the actual date
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting last seen for user:', realTimeUser.displayName, error);
            return 'Last seen recently';
        }
    };

    const getRelationshipDisplay = (status) => {
        const statusMap = {
            'single': 'Single',
            'taken': 'In a Relationship',
            'married': 'Married',
            'complicated': "It's Complicated",
            'not_saying': 'Prefer not to say'
        };
        return statusMap[status] || status;
    };

    if (!user?.uid) return null;
    if (!realTimeUser) return null;

    return (
        <div className="modern-profile-overlay" onClick={onClose}>
            <div className="modern-profile-container" onClick={e => e.stopPropagation()}>

                {/* Cover Background */}
                <div className={`cover-background ${
                    realTimeUser.spotifyTrackURL ? 'has-spotify' : 
                    realTimeUser.coverVideoURL ? 'has-video' : 
                    realTimeUser.coverPhotoURL ? 'has-photo' : ''
                }`}>
                    {realTimeUser.spotifyTrackURL ? (
                        <div className="spotify-container">
                            <iframe
                                key={`spotify-${realTimeUser.uid}-${realTimeUser.spotifyTrackURL?.slice(-10)}`}
                                src={convertToSpotifyEmbedURL(realTimeUser.spotifyTrackURL)}
                                width="100%"
                                height="152"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                allowFullScreen={true}
                                loading="lazy"
                                title="Spotify Track Player"
                                onLoad={() => {
                                    console.log('✅ Spotify track loaded successfully');
                                }}
                                onError={(e) => {
                                    console.error('❌ Spotify track failed to load:', e);
                                }}
                            />
                        </div>
                    ) : realTimeUser.coverVideoURL && realTimeUser.coverVideoURL !== "" ? (
                        <div className="video-container">
                            <iframe
                                key={`video-${realTimeUser.uid}-${realTimeUser.coverVideoURL?.slice(-10)}`}
                                src={convertToYouTubeEmbedURL(realTimeUser.coverVideoURL)}
                                width="100%"
                                height="250"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen={true}
                                loading="lazy"
                                title="YouTube Cover Video"
                                onLoad={() => {
                                    console.log('✅ Cover video loaded successfully');
                                }}
                                onError={(e) => {
                                    console.error('❌ Video failed to load:', e);
                                }}
                            />
                        </div>
                    ) : realTimeUser.coverPhotoURL && realTimeUser.coverPhotoURL !== "" ? (
                        <img
                            key={`image-${realTimeUser.coverPhotoURL}-${realTimeUser.uid}-${Date.now()}`}
                            src={realTimeUser.coverPhotoURL}
                            alt="Cover Photo"
                            className="cover-media cover-photo"
                            onLoad={() => {
                                console.log('✅ Cover photo loaded successfully');
                            }}
                            onError={(e) => {
                                console.error('❌ Cover photo failed to load');
                                e.target.style.display = 'block';
                            }}
                        />
                    ) : (
                        <div className="cover-media default-gradient">
                            <div className="default-cover-content">
                                <svg viewBox="0 0 24 24" width="48" height="48" fill="rgba(255,255,255,0.3)">
                                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                </svg>
                                <span style={{color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '8px'}}>
                                    {realTimeUser.displayName}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Cover Media Badge */}
                    {(realTimeUser.spotifyTrackURL || realTimeUser.coverVideoURL || realTimeUser.coverPhotoURL) && (
                        <div className="cover-media-badge">
                            {realTimeUser.spotifyTrackURL ? (
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <circle cx="12" cy="12" r="12" fill="#1DB954"/>
                                    <path fill="#FFFFFF" d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75c-.5.15-1-.15-1.15-.6-.15-.5.15-1 .6-1.15 3.55-1.05 9.4-.85 13.1 1.35.45.25.6.85.35 1.3-.25.35-.85.5-1.3.25zm1.1-2.8c-.25-.45-.85-.6-1.3-.35-3.8-2.25-9.55-2.9-14.1-1.6-.55.15-1.1-.25-1.25-.8-.15-.55.25-1.1.8-1.25 5.2-1.5 11.7-.8 16.15 1.85.45.25.6.85.35 1.3-.25.45-.85.6-1.3.35zm-13.35 3.95c-.45.1-.9-.2-1-.65-.1-.45.2-.9.65-1 2.3-.55 4.75-.55 7.05 0 .45.1.75.55.65 1-.1.45-.55.75-1 .65-1.95-.45-4.2-.45-6.15 0z"/>
                                </svg>
                            ) : realTimeUser.coverVideoURL && realTimeUser.coverVideoURL !== "" ? (
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                            ) : realTimeUser.coverPhotoURL && realTimeUser.coverPhotoURL !== "" ? (
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                </svg>
                            ) : null}
                        </div>
                    )}

                    {/* Close Button */}
                    <button className="close-button" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Profile Header */}
                <div className="profile-header">
                    <div className="header-content-centered">
                        <div className="avatar-section">
                            <img 
                                src={getAvatarUrl()} 
                                alt="Profile" 
                                className="profile-pic"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Profile picture clicked, opening full image');
                                    setShowFullImage(true);
                                }}
                                style={{ cursor: 'pointer' }}
                                title="Click to view full image"
                            />
                            {(() => {
                                const isOnlineNow = window.onlineUsers?.has(realTimeUser.uid) || 
                                    (window.userOnlineStatuses && window.userOnlineStatuses[realTimeUser.uid]?.state === 'online') ||
                                    realTimeUser.isOnline;
                                return (
                                    <span className={`profile-online-dot ${isOnlineNow ? 'online' : 'offline'}`}></span>
                                );
                            })()}
                            <span className="gender-badge-on-avatar">
                                {realTimeUser.gender?.toLowerCase() === 'female' ? (
                                    <svg width="14" height="14" id="Filled_Expand" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" data-name="Filled Expand">
                                        <path d="m35 38.607a11.983 11.983 0 0 0 4.477-20.983 10 10 0 1 0 -14.954 0 11.983 11.983 0 0 0 4.477 20.983v10.393h-8v6h8v8h6v-8h8v-6h-8zm-3-31.607a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm-6 20a6 6 0 1 1 6 6 6 6 0 0 1 -6-6z" fill="#f68dc1"/>
                                        <path d="m35 49v-10.393a11.983 11.983 0 0 0 4.477-20.983 9.987 9.987 0 0 0 -6.477-16.574 9.987 9.987 0 0 0 -6.477 16.574 11.969 11.969 0 0 0 -4.523 9.376c0 5.589 3.827 9.666 9 11v13h-8v4h8v8h4v-8h8v-6zm-3-42a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm0 26a6 6 0 1 1 6-6 6 6 0 0 1 -6 6z" fill="#f35faa"/>
                                    </svg>
                                ) : realTimeUser.gender?.toLowerCase() === 'other' ? (
                                    <svg width="14" height="14" id="Layer_1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1">
                                        <defs>
                                            <linearGradient id="GradientFill_1_Modal" gradientUnits="userSpaceOnUse" x1="10.291" x2="501.771" y1="255.997" y2="255.997">
                                                <stop offset="0" stopColor="#58c8df"/>
                                                <stop offset="1" stopColor="#53a7dd"/>
                                            </linearGradient>
                                        </defs>
                                        <path d="m367.353 157.494c-1.593 12.6-20.2 31.412-36.384 43.042-16.188-11.63-34.79-30.447-36.391-43.042-.378-3.007.344-4.986 2.651-7.3a10.415 10.415 0 0 1 14.688 0c.721.721 1.564 1.764 2.543 2.971 1.307 1.622 2.929 3.629 4.993 5.765a16 16 0 0 0 23.025 0c2.064-2.136 3.693-4.143 4.993-5.765.979-1.207 1.822-2.25 2.536-2.971a10.416 10.416 0 0 1 14.695 0c2.308 2.314 3.029 4.293 2.651 7.3zm-36.384-33.125a42.454 42.454 0 0 0 -56.365 3.207c-9.322 9.323-13.394 21.060-11.766 33.94 4.094 32.333 44.692 62.88 59.98 71.932a16.055 16.055 0 0 0 16.3 0c15.3-9.052 55.894-39.6 59.987-71.932 1.629-12.88-2.443-24.617-11.773-33.947a42.452 42.452 0 0 0 -56.358-3.2zm-158.85 137.418c-1.586 12.58-20.2 31.4-36.391 43.027-16.188-11.63-34.79-30.447-36.383-43.034-.379-3.015.343-4.994 2.657-7.3a10.417 10.417 0 0 1 14.688 0c.721.721 1.557 1.757 2.536 2.972 1.315 1.614 2.929 3.629 4.994 5.758a16.013 16.013 0 0 0 23.031 0c2.058-2.129 3.679-4.144 4.987-5.751.978-1.214 1.821-2.258 2.543-2.979a10.4 10.4 0 0 1 14.688 0c2.314 2.307 3.029 4.286 2.65 7.308zm-36.376-33.14a42.478 42.478 0 0 0 -56.372 3.208c-9.323 9.322-13.395 21.059-11.759 33.94 4.079 32.333 44.677 62.88 59.979 71.931a16.036 16.036 0 0 0 16.288 0c15.3-9.051 55.9-39.6 59.98-71.931 1.629-12.881-2.443-24.618-11.759-33.94a42.444 42.444 0 0 0 -56.357-3.208zm261.335 10.108a93.495 93.495 0 1 0 -132.225 0 92.893 92.893 0 0 0 132.225 0zm-195.226 101.186a93.5 93.5 0 1 0 -132.233 0 93.625 93.625 0 0 0 132.233 0zm40.377-256.041a124.609 124.609 0 0 0 -36.72 85.6c-48.756-32.626-115.5-27.439-158.522 15.581a125.435 125.435 0 0 0 72.753 213.16v25.433h-40.334a16 16 0 0 0 0 32h40.334v40.326a16 16 0 1 0 32 0v-40.322h40.319a16 16 0 0 0 0-32h-40.321v-25.437a125.277 125.277 0 0 0 109.4-121.316 125.509 125.509 0 0 0 168.362-182.032l40.27-40.263v35.477a16 16 0 0 0 32 0v-74.107a16.008 16.008 0 0 0 -16-16h-74.11a16 16 0 0 0 0 32h35.476l-40.507 40.5c-49.142-37.172-119.616-33.379-164.4 11.4z" fill="url(#GradientFill_1_Modal)" fillRule="evenodd"/>
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" clipRule="evenodd" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="maleGradientModal" gradientTransform="matrix(38.402 -29.918 29.918 38.402 879.315 261.556)" gradientUnits="userSpaceOnUse" x1="0" x2="1" y1="0" y2="0">
                                                <stop offset="0" stopColor="#0056e0"/>
                                                <stop offset=".01" stopColor="#0056e0"/>
                                                <stop offset="1" stopColor="#00e5b8"/>
                                            </linearGradient>
                                        </defs>
                                        <g transform="translate(-106 -159)">
                                            <g transform="translate(-764.321 -65.93)">
                                                <g id="ngicon">
                                                    <path d="m903.204 236.514-7.015 7.014c-4.849-3.22-11.433-2.709-15.673 1.532-4.841 4.84-4.822 12.734.06 17.617 4.883 4.882 12.777 4.901 17.617.06 4.241-4.24 4.752-10.824 1.532-15.673l7.004-7.004.014 3.371c.006 1.38 1.131 2.495 2.511 2.489s2.495-1.131 2.489-2.511l-.04-9.392c-.006-1.374-1.12-2.486-2.494-2.489l-9.374-.022c-1.38-.003-2.503 1.114-2.506 2.494s1.114 2.503 2.494 2.506zm-19.092 22.627c-2.923-2.923-2.959-7.648-.061-10.546s7.624-2.862 10.546.06c2.923 2.923 2.959 7.649.061 10.547-2.898 2.897-7.624 2.862-10.546-.061z" fill="url(#maleGradientModal)"/>
                                                </g>
                                            </g>
                                        </g>
                                    </svg>
                                )}
                            </span>
                        </div>

                        <div className="user-info-centered">
                            <div className="username-role-container">
                                <h2 className="modal-display-name">
                                    {realTimeUser.displayName || user.displayName || 'Anonymous'}
                                    {realTimeUser.badge && badges[realTimeUser.badge] && (
                                        <span
                                            className="inline-badge"
                                            title={badges[realTimeUser.badge].name}
                                            dangerouslySetInnerHTML={{ __html: badges[realTimeUser.badge].svg }}
                                            style={{
                                                width: '16px',
                                                height: '16px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginLeft: '4px'
                                            }}
                                        />
                                    )}
                                </h2>
                                <div className={`role-badge ${realTimeUser.role?.toLowerCase()}-${realTimeUser.gender?.toLowerCase()}`}>
                                    <span className="role-purple-dot"></span>
                                    {getRoleDisplayLabel({ role: realTimeUser.role, gender: realTimeUser.gender, isGuest: realTimeUser.isGuest, badge: realTimeUser.badge })}
                                </div>
                            </div>
                            {(realTimeUser.status || realTimeUser.bio) && (
                                <p 
                                    className="user-bio"
                                    style={{
                                        fontFamily: (realTimeUser.statusStyles?.fontFamily || user.statusStyles?.fontFamily) || 'inherit',
                                        fontSize: (realTimeUser.statusStyles?.fontSize || user.statusStyles?.fontSize) || '10px',
                                        fontWeight: (realTimeUser.statusStyles?.fontWeight || user.statusStyles?.fontWeight) || 'normal',
                                        fontStyle: (realTimeUser.statusStyles?.fontStyle || user.statusStyles?.fontStyle) || 'italic',
                                        textDecoration: (realTimeUser.statusStyles?.textDecoration || user.statusStyles?.textDecoration) || 'none',
                                        color: (realTimeUser.statusStyles?.gradientEnabled || user.statusStyles?.gradientEnabled) ? 'transparent' : ((realTimeUser.statusStyles?.textColor || user.statusStyles?.textColor) || '#6b7280'),
                                        background: (realTimeUser.statusStyles?.gradientEnabled || user.statusStyles?.gradientEnabled) ? 
                                            `linear-gradient(${(realTimeUser.statusStyles?.gradientDirection || user.statusStyles?.gradientDirection) || 'to right'}, ${(realTimeUser.statusStyles?.gradientStart || user.statusStyles?.gradientStart) || '#667eea'}, ${(realTimeUser.statusStyles?.gradientEnd || user.statusStyles?.gradientEnd) || '#764ba2'})` : 'transparent',
                                        WebkitBackgroundClip: (realTimeUser.statusStyles?.gradientEnabled || user.statusStyles?.gradientEnabled) ? 'text' : 'initial',
                                        backgroundClip: (realTimeUser.statusStyles?.gradientEnabled || user.statusStyles?.gradientEnabled) ? 'text' : 'initial',
                                        textShadow: (realTimeUser.statusStyles?.textShadow || user.statusStyles?.textShadow) || 'none',
                                        animation: (realTimeUser.statusStyles?.animation || user.statusStyles?.animation) || 'none',
                                        border: 'none',
                                        padding: '2px 0'
                                    }}
                                >
                                    {realTimeUser.status || realTimeUser.bio}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Royal Trust Badge Section — always show for registered users */}
                {!realTimeUser.isGuest && (
                    <div className="profile-trust-section">
                        <div className="profile-trust-header">
                            <span className="profile-trust-title">Royal Trust Rank</span>
                        </div>
                        <div className="profile-trust-badge-wrap">
                            <RoyalTrustBadge
                                trustScore={realTimeUser.trustScore ?? 10}
                                trustRank={realTimeUser.trustRank}
                                size="lg"
                                showLabel={true}
                                showTooltip={true}
                            />
                            <div className="profile-trust-bar-section">
                                <div className="profile-trust-bar-bg">
                                    <div
                                        className="profile-trust-bar-fill"
                                        style={{
                                            width: `${realTimeUser.trustScore ?? 10}%`,
                                            background: (() => {
                                                const s = realTimeUser.trustScore ?? 10;
                                                if (s <= 20) return 'linear-gradient(90deg,#C4A882,#8B7355)';
                                                if (s <= 40) return 'linear-gradient(90deg,#E8E8E8,#A8A8A8)';
                                                if (s <= 60) return 'linear-gradient(90deg,#FFD700,#FFA500)';
                                                if (s <= 80) return 'linear-gradient(90deg,#9B59B6,#667eea)';
                                                return 'linear-gradient(90deg,#00D4FF,#7B2FBE,#FFD700)';
                                            })()
                                        }}
                                    />
                                </div>
                                <div className="profile-trust-bar-label">
                                    <span>Trust Score</span>
                                    <span>{realTimeUser.trustScore ?? 10}/100</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button 
                        className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('info');
                            // Apply styles immediately when switching to info tab
                            setTimeout(() => applyFontPreferences(), 0);
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                        </svg>
                        Info
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('friends');
                            // Reload friends data when tab is clicked
                            loadFriendsData();
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M8,4C10.21,4 12,5.79 12,8C12,10.21 10.21,12 8,12C5.79,12 4,10.21 4,8C4,5.79 5.79,4 8,4M8,14C12.42,14 16,15.79 16,18V20H0V18C0,15.79 3.58,14 8,14Z"/>
                        </svg>
                        Friends ({(realTimeUser?.friends?.length || user?.friends?.length || friendsData.length)})
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z"/>
                        </svg>
                        Activity
                    </button>
                </div>

                {/* Content Area */}
                <div className={`content-section ${activeTab === 'info' ? 'info-tab' : ''}`}>
                    {activeTab === 'info' && (
                        <div className="info-content">
                            <div className="info-list smooth-scroll">
                                {realTimeUser.age && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,6A3,3 0 0,0 9,9A3,3 0 0,0 12,12A3,3 0 0,0 15,9A3,3 0 0,0 12,6M6,8.5A2.5,2.5 0 0,0 3.5,11A2.5,2.5 0 0,0 6,13.5A2.5,2.5 0 0,0 8.5,11A2.5,2.5 0 0,0 6,8.5M18,8.5A2.5,2.5 0 0,0 15.5,11A2.5,2.5 0 0,0 18,13.5A2.5,2.5 0 0,0 20.5,11A2.5,2.5 0 0,0 18,8.5M12,14C10,14 6,15 6,17V19H18V17C18,15 14,14 12,14M4.5,14.5C3.5,14.5 1.5,15 1.5,16.5V18.5H4.5V16.5C4.5,15.9 5.4,15.6 6.7,15.4C5.9,15.1 4.5,14.6 4.5,14.5M19.5,14.5C18.6,14.6 17.1,15.1 16.3,15.4C17.6,15.6 18.5,15.9 18.5,16.5V18.5H21.5V16.5C21.5,15 19.5,14.5 19.5,14.5Z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Age</span>
                                            <span className="info-value">{realTimeUser.age} years old</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.gender && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <defs>
                                                  <linearGradient id="profileGenderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#8b5cf6" />
                                                    <stop offset="50%" stopColor="#ec4899" />
                                                    <stop offset="100%" stopColor="#3b82f6" />
                                                  </linearGradient>
                                                </defs>
                                                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
                                                      fill="url(#profileGenderGradient)"/>
                                                <circle cx="12" cy="8" r="2" fill="rgba(255, 255, 255, 0.3)"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Gender</span>
                                            <span className="info-value">{realTimeUser.gender}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.country && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Country</span>
                                            <span className="info-value">{realTimeUser.country}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.languages && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Languages</span>
                                            <span className="info-value">{realTimeUser.languages}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.profession && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Profession</span>
                                            <span className="info-value">{realTimeUser.profession}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.relationship && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Relationship</span>
                                            <span className="info-value">{getRelationshipDisplay(realTimeUser.relationship)}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.interests && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Interests</span>
                                            <span className="info-value">{realTimeUser.interests}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.bio && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                                                <path d="M8 12h8v2H8zm0 4h8v2H8z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">About</span>
                                            <span className="info-value bio-text">{realTimeUser.bio}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Additional info fields */}
                                {realTimeUser.location && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Location</span>
                                            <span className="info-value">{realTimeUser.location}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.hobbies && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M7.5,13.5L9,12L7.5,10.5L12,6L16.5,10.5L15,12L16.5,13.5L12,18L7.5,13.5Z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Hobbies</span>
                                            <span className="info-value">{realTimeUser.hobbies}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.education && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Education</span>
                                            <span className="info-value">{realTimeUser.education}</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.website && (
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8Z"/>
                                            </svg>
                                        </div>
                                        <div className="info-details">
                                            <span className="info-label">Website</span>
                                            <span className="info-value">
                                                <a href={realTimeUser.website} target="_blank" rel="noopener noreferrer" 
                                                   style={{color: '#8b5cf6', textDecoration: 'none'}}>
                                                    {realTimeUser.website}
                                                </a>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            {!isCurrentUser && (() => {
                                const viewerRole = currentUserProfile?.role?.toLowerCase() || propsCurrentUser?.role?.toLowerCase() || 'guest';
                                const isViewerGuest = !auth.currentUser || currentUserProfile?.isGuest === true || propsCurrentUser?.isGuest === true;
                                const isTargetGuest = realTimeUser?.isGuest === true;
                                const isTargetStaff = ['owner', 'admin', 'moderator'].includes(realTimeUser?.role?.toLowerCase());
                                const isLimited = isViewerGuest || isTargetGuest;

                                return (
                                    <div className="action-section-pills">
                                        <button className="pill-btn pill-view-profile" onClick={() => onOpenProfile && onOpenProfile(realTimeUser)}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                            </svg>
                                            View Profile
                                        </button>

                                        {!isLimited && (
                                            isFriend ? (
                                                <button className="pill-btn pill-add-friend" onClick={handleRemoveFriend}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                                                    </svg>
                                                    Remove Friend
                                                </button>
                                            ) : friendRequestSent ? (
                                                <button className="pill-btn pill-add-friend" disabled>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                                                    </svg>
                                                    Request Sent
                                                </button>
                                            ) : (
                                                <button className="pill-btn pill-add-friend" onClick={handleSendFriendRequest}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12M5,10H2V12H5V15H7V12H10V10H7V7H5V10Z"/>
                                                    </svg>
                                                    Add Friend
                                                </button>
                                            )
                                        )}

                                        <button className="pill-btn pill-send-message" onClick={() => {
                                            if (onSendMessage) { onSendMessage(realTimeUser); onClose(); }
                                            else if (window.handlePrivateMessageFromSidebar) { window.handlePrivateMessageFromSidebar(realTimeUser); onClose(); }
                                        }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
                                            </svg>
                                            Send Message
                                        </button>

                                        {!isLimited && (
                                            <button className="pill-btn pill-whisper" onClick={() => {
                                                if (onWhisper) { onWhisper(realTimeUser); onClose(); }
                                                else if (window.handleWhisperFromSidebar) { window.handleWhisperFromSidebar(realTimeUser); onClose(); }
                                            }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,11H11V9H13V11M13,15H11V13H13V15Z"/>
                                                </svg>
                                                Whisper
                                            </button>
                                        )}

                                        {!isTargetStaff && (
                                            <button className="pill-btn pill-block" onClick={handleBlockUser}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.35 19.12,16.5 17.65,18.12L5.88,6.35C7.5,4.88 9.65,4 12,4M12,20A8,8 0 0,1 4,12C4,9.65 4.88,7.5 6.35,5.88L18.12,17.65C16.5,19.12 14.35,20 12,20Z"/>
                                                </svg>
                                                Block User
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Profile Deletion Section for Current User */}
                            {isCurrentUser && (
                                <div className="action-section" style={{marginTop: '20px', borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '15px'}}>
                                    <div style={{marginBottom: '10px', textAlign: 'center'}}>
                                        <h4 style={{color: '#ef4444', fontSize: '14px', margin: '0 0 5px 0'}}>Danger Zone</h4>
                                        <p style={{fontSize: '12px', color: '#6b7280', margin: '0'}}>Permanently delete your profile with 3-day grace period</p>
                                    </div>

                                    {realTimeUser?.markedForDeletion ? (
                                        <div style={{textAlign: 'center'}}>
                                            <p style={{color: '#ef4444', fontSize: '12px', marginBottom: '10px'}}>
                                                ⚠️ Profile scheduled for deletion on {realTimeUser.permanentDeletionDate?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                                            </p>
                                            <button className="action-button add-btn" onClick={handleRevertDeletion}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m0 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"></path>
                                                </svg>
                                                Cancel Deletion
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            className="action-button" 
                                            onClick={handleDeleteProfile}
                                            style={{
                                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                                border: '1px solid #ef4444',
                                                color: 'white'
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3,6 5,6 21,6"></polyline>
                                                <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                            </svg>
                                            Delete Profile Permanently
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'friends' && (
                        <div className="friends-content">
                            {friendsData.length > 0 ? (
                                <div className="friends-grid">
                                    {friendsData.map(friend => (
                                        <div 
                                            key={friend.uid || friend.id} 
                                            className="friend-grid-item"
                                            onClick={() => onOpenProfile && onOpenProfile(friend)}
                                            title={friend.displayName}
                                        >
                                            <img 
                                                src={friend.photoURL || `${getDefaultAvatarUrl(friend.uid || friend.id, friend.gender)}`}
                                                alt={friend.displayName}
                                                className="friend-grid-pic"
                                            />
                                            <div className="friend-name-overlay">{friend.displayName}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="m22 21-3-3"></path>
                                        <path d="m16 16 3 3"></path>
                                    </svg>
                                    <p>No friends yet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="activity-content">
                            <div className="activity-stats">
                                <div className="stat-item">
                                    <div className="stat-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H19M5,7V5H19V7H5M5,9H10V19H5V9M12,9H19V19H12V9Z"/>
                                        </svg>
                                    </div>
                                    <div className="stat-details">
                                        <span className="stat-value">{formatJoinDate(realTimeUser.createdAt || realTimeUser.joinedAt || realTimeUser.registrationDate)}</span>
                                        <span className="stat-label">Joined</span>
                                    </div>
                                </div>

                                <div className="stat-item">
                                    <div className="stat-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                                        </svg>
                                    </div>
                                    <div className="stat-details">
                                        <span className="stat-value" style={{
                                            color: (() => {
                                                const isOnline = window.onlineUsers?.has(realTimeUser.uid) || 
                                                                realTimeUser.isOnline || 
                                                                (window.userOnlineStatuses && window.userOnlineStatuses[realTimeUser.uid]?.status === 'online');
                                                return isOnline ? '#10b981' : '#6b7280';
                                            })(),
                                            fontWeight: '700'
                                        }}>
                                            {formatLastSeen(realTimeUser.lastSeen || realTimeUser.lastSeenAt || realTimeUser.last_seen)}
                                        </span>
                                        <span className="stat-label">Status</span>
                                    </div>
                                </div>

                                <div className="stat-item">
                                    <div className="stat-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M8,4C10.21,4 12,5.79 12,8C12,10.21 10.21,12 8,12C5.79,12 4,10.21 4,8C4,5.79 5.79,4 8,4M8,14C12.42,14 16,15.79 16,18V20H0V18C0,15.79 3.58,14 8,14Z"/>
                                        </svg>
                                    </div>
                                    <div className="stat-details">
                                        <span className="stat-value">{friendsData?.length || realTimeUser.friends?.length || 0}</span>
                                        <span className="stat-label">Friends</span>
                                    </div>
                                </div>

                                {realTimeUser.role && (
                                    <div className="stat-item">
                                        <div className="stat-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,1L9,9L1,9L7.5,14L5.5,22L12,17.5L18.5,22L16.5,14L23,9L15,9L12,1Z"/>
                                            </svg>
                                        </div>
                                        <div className="stat-details">
                                            <span className="stat-value" style={{
                                                color: realTimeUser.role === 'owner' ? '#FFD700' : 
                                                      realTimeUser.role === 'admin' ? '#FF4500' : 
                                                      realTimeUser.role === 'moderator' ? '#32CD32' : 
                                                      realTimeUser.role === 'badge-holder' ? '#9370DB' : '#8b5cf6',
                                                fontWeight: '700'
                                            }}>
                                                {realTimeUser.role?.charAt(0).toUpperCase() + realTimeUser.role?.slice(1)}
                                            </span>
                                            <span className="stat-label">Role</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.badge && badges[realTimeUser.badge] && (
                                    <div className="stat-item">
                                        <div className="stat-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                                            </svg>
                                        </div>
                                        <div className="stat-details">
                                            <span className="stat-value">{badges[realTimeUser.badge]?.name || 'Special Badge'}</span>
                                            <span className="stat-label">Badge</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.profileViews && (
                                    <div className="stat-item">
                                        <div className="stat-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z"/>
                                            </svg>
                                        </div>
                                        <div className="stat-details">
                                            <span className="stat-value">{realTimeUser.profileViews || 0}</span>
                                            <span className="stat-label">Profile Views</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.totalMessages && (
                                    <div className="stat-item">
                                        <div className="stat-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6V9M14,14H6V12H14V14M18,8H6V6H18V8Z"/>
                                            </svg>
                                        </div>
                                        <div className="stat-details">
                                            <span className="stat-value">{realTimeUser.totalMessages || 0}</span>
                                            <span className="stat-label">Messages Sent</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.updatedAt && (
                                    <div className="stat-item">
                                        <div className="stat-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M21,10.12H14.22L16.96,7.3C14.23,4.6 9.81,4.5 7.08,7.2C4.35,9.91 4.35,14.28 7.08,17C9.81,19.7 14.23,19.7 16.96,17C18.32,15.65 19,14.08 19,12.1H21C21,14.08 20.12,16.65 18.36,18.39C14.85,21.87 9.15,21.87 5.64,18.39C2.14,14.92 2.11,9.28 5.64,5.81C9.17,2.34 14.85,2.34 18.36,5.81L21,3V10.12M12.5,8V12.25L16,14.33L15.28,15.54L11,13V8H12.5Z"/>
                                            </svg>
                                        </div>
                                        <div className="stat-details">
                                            <span className="stat-value">{formatLastSeen(realTimeUser.updatedAt)}</span>
                                            <span className="stat-label">Profile Updated</span>
                                        </div>
                                    </div>
                                )}

                                {isCurrentUser && auth.currentUser?.email && (
                                    <div className="stat-item">
                                        <div className="stat-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
                                            </svg>
                                        </div>
                                        <div className="stat-details">
                                            <span className="stat-value" style={{fontSize: '12px'}}>{auth.currentUser.email}</span>
                                            <span className="stat-label">Email</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.accountType && (
                                    <div className="stat-item">
                                        <div className="stat-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                            </svg>
                                        </div>
                                        <div className="stat-details">
                                            <span className="stat-value">{realTimeUser.accountType}</span>
                                            <span className="stat-label">Account Type</span>
                                        </div>
                                    </div>
                                )}

                                {realTimeUser.verified && (
                                    <div className="stat-item">
                                        <div className="stat-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z"/>
                                            </svg>
                                        </div>
                                        <div className="stat-details">
                                            <span className="stat-value" style={{color: '#10b981', fontWeight: '700'}}>Verified</span>
                                            <span className="stat-label">Account Status</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Full Image Modal */}
            {showFullImage && (
                <div 
                    className="full-image-overlay" 
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            console.log('Full image overlay clicked, closing');
                            setShowFullImage(false);
                        }
                    }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999999999,
                        padding: '40px',
                        animation: 'fadeIn 0.3s ease'
                    }}
                >
                    <div 
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={getAvatarUrl()}
                            alt={`${realTimeUser.displayName}'s Profile Picture`}
                            style={{
                                width: 'auto',
                                height: 'auto',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                borderRadius: '20px',
                                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.8)',
                                border: '4px solid rgba(255, 255, 255, 0.3)',
                                objectFit: 'contain',
                                transition: 'all 0.3s ease'
                            }}
                            onLoad={(e) => {
                                console.log('✅ Full image loaded:', e.target.src);
                            }}
                            onError={(e) => {
                                console.error('❌ Full image failed to load:', e.target.src);
                            }}
                        />
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Close button clicked');
                                setShowFullImage(false);
                            }}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(255, 255, 255, 0.95)',
                                color: '#333',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
                                transition: 'all 0.3s ease',
                                zIndex: 10
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#ff4444';
                                e.target.style.color = 'white';
                                e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                                e.target.style.color = '#333';
                                e.target.style.transform = 'scale(1)';
                            }}
                        >
                            ×
                        </button>
                        <div 
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '25px',
                                fontSize: '16px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            {realTimeUser.displayName}'s Profile Picture
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewProfileModal;