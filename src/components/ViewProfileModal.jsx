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
            toast(
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, boxShadow: '0 2px 8px rgba(239,68,68,.4)'
                    }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e1b4b', letterSpacing: '.2px' }}>User Blocked</div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            <span style={{ fontWeight: 700, color: '#b91c1c' }}>{user.displayName}</span> has been blocked
                        </div>
                    </div>
                </div>,
                {
                    style: {
                        background: 'linear-gradient(135deg, #fff5f5, #fee2e2)',
                        border: '1.5px solid rgba(239,68,68,.3)',
                        borderRadius: '14px',
                        boxShadow: '0 8px 32px rgba(239,68,68,.15)',
                        padding: '10px 14px',
                    },
                    icon: false,
                    autoClose: 4000,
                }
            );
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

    const isOnlineNow = window.onlineUsers?.has(realTimeUser.uid) ||
        (window.userOnlineStatuses && window.userOnlineStatuses[realTimeUser.uid]?.state === 'online') ||
        realTimeUser.isOnline;

    const sStyles = realTimeUser.statusStyles || user.statusStyles || {};
    const hasStatusGradient = sStyles.gradientEnabled;
    const statusStyle = {
        fontFamily: sStyles.fontFamily || 'inherit',
        fontSize: sStyles.fontSize || '11px',
        fontWeight: sStyles.fontWeight || 'normal',
        fontStyle: 'italic',
        textDecoration: sStyles.textDecoration || 'none',
        color: hasStatusGradient ? 'transparent' : (sStyles.textColor || '#9370c8'),
        background: hasStatusGradient
            ? `linear-gradient(${sStyles.gradientDirection || 'to right'}, ${sStyles.gradientStart || '#667eea'}, ${sStyles.gradientEnd || '#764ba2'})`
            : 'none',
        WebkitBackgroundClip: hasStatusGradient ? 'text' : 'initial',
        backgroundClip: hasStatusGradient ? 'text' : 'initial',
        display: hasStatusGradient ? 'inline-block' : 'block',
        textShadow: sStyles.textShadow || 'none',
        animation: sStyles.animation || 'none',
    };

    const getTrustGradient = (s) => {
        if (s <= 20) return 'linear-gradient(90deg,#C4A882,#8B7355)';
        if (s <= 40) return 'linear-gradient(90deg,#E8E8E8,#A8A8A8)';
        if (s <= 60) return 'linear-gradient(90deg,#FFD700,#FFA500)';
        if (s <= 80) return 'linear-gradient(90deg,#9B59B6,#667eea)';
        return 'linear-gradient(90deg,#00D4FF,#7B2FBE,#FFD700)';
    };

    const getCountryFlag = (name) => {
        if (!name) return '';
        const map = {
            'India':'IN','Pakistan':'PK','Bangladesh':'BD','Nepal':'NP','Sri Lanka':'LK',
            'United States':'US','USA':'US','United Kingdom':'GB','UK':'GB',
            'Canada':'CA','Australia':'AU','Germany':'DE','France':'FR','Japan':'JP',
            'China':'CN','Russia':'RU','Brazil':'BR','Mexico':'MX','Italy':'IT',
            'Spain':'ES','South Korea':'KR','Indonesia':'ID','Saudi Arabia':'SA',
            'UAE':'AE','United Arab Emirates':'AE','Turkey':'TR','Thailand':'TH',
            'Malaysia':'MY','Singapore':'SG','Philippines':'PH','Vietnam':'VN',
            'Egypt':'EG','Nigeria':'NG','South Africa':'ZA','Kenya':'KE',
            'Argentina':'AR','Colombia':'CO','Netherlands':'NL','Sweden':'SE',
            'Norway':'NO','Denmark':'DK','Finland':'FI','Poland':'PL',
            'Portugal':'PT','Greece':'GR','Ukraine':'UA','Belgium':'BE',
            'Switzerland':'CH','Austria':'AT','Israel':'IL','Iran':'IR',
            'New Zealand':'NZ','Ireland':'IE','Morocco':'MA','Algeria':'DZ',
            'Qatar':'QA','Kuwait':'KW','Bahrain':'BH','Oman':'OM','Jordan':'JO',
            'Lebanon':'LB','Myanmar':'MM','Cambodia':'KH','Taiwan':'TW',
            'Hong Kong':'HK','Ghana':'GH','Ethiopia':'ET','Tanzania':'TZ',
            'Uganda':'UG','Rwanda':'RW','Zimbabwe':'ZW','Senegal':'SN',
            'Chile':'CL','Peru':'PE','Romania':'RO','Czech Republic':'CZ',
            'Hungary':'HU','Afghanistan':'AF','Libya':'LY','Sudan':'SD',
            'Iraq':'IQ','Syria':'SY','Yemen':'YE','Tunisia':'TN','Angola':'AO',
            'Mozambique':'MZ','Zambia':'ZM','Cameroon':'CM','Ivory Coast':'CI',
        };
        const code = map[name] || map[name.trim()];
        if (!code) return '🌍';
        return [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
    };

    const coverType = realTimeUser.spotifyTrackURL ? 'spotify'
        : realTimeUser.coverVideoURL ? 'youtube'
        : realTimeUser.coverPhotoURL ? 'image'
        : 'default';

    const roleColorMap = {
        owner: '#FFD700', admin: '#FF4500', moderator: '#32CD32',
        'badge-holder': '#9370DB', badge_holder: '#9370DB',
        user: realTimeUser.gender === 'female' ? '#E91E63' : '#4A90E2',
        guest: realTimeUser.gender === 'female' ? '#E91E63' : '#6b7280',
    };
    const avatarBorderColor = roleColorMap[realTimeUser.role?.toLowerCase()] || '#8b5cf6';

    const vpIsViewerGuest = !auth.currentUser || currentUserProfile?.isGuest === true || propsCurrentUser?.isGuest === true;
    const vpIsTargetGuest = realTimeUser?.isGuest === true;
    const vpIsTargetStaff = ['owner', 'admin', 'moderator'].includes(realTimeUser?.role?.toLowerCase());
    const vpIsLimited = vpIsViewerGuest || vpIsTargetGuest;

    return (
        <>
        <div className="vpm-overlay" onClick={onClose}>
            <div className="vpm-container" onClick={e => e.stopPropagation()}>

                {/* ── COVER ── */}
                <div className={`vpm-cover vpm-cover--${coverType}`}>
                    {coverType === 'spotify' && (
                        <div className="vpm-spotify-frame">
                            <div className="vpm-spotify-glow"/>
                            <iframe
                                key={`spotify-${realTimeUser.uid}`}
                                src={convertToSpotifyEmbedURL(realTimeUser.spotifyTrackURL)}
                                width="100%" height="152" frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                allowFullScreen title="Spotify"
                                style={{borderRadius:'0',display:'block',position:'relative',zIndex:1}}
                            />
                            <div className="vpm-cover-badge vpm-cover-badge--spotify">
                                <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1DB954"/><path fill="#fff" d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75c-.5.15-1-.15-1.15-.6-.15-.5.15-1 .6-1.15 3.55-1.05 9.4-.85 13.1 1.35.45.25.6.85.35 1.3-.25.35-.85.5-1.3.25zm1.1-2.8c-.25-.45-.85-.6-1.3-.35-3.8-2.25-9.55-2.9-14.1-1.6-.55.15-1.1-.25-1.25-.8-.15-.55.25-1.1.8-1.25 5.2-1.5 11.7-.8 16.15 1.85.45.25.6.85.35 1.3-.25.45-.85.6-1.3.35zm-13.35 3.95c-.45.1-.9-.2-1-.65-.1-.45.2-.9.65-1 2.3-.55 4.75-.55 7.05 0 .45.1.75.55.65 1-.1.45-.55.75-1 .65-1.95-.45-4.2-.45-6.15 0z"/></svg>
                                Spotify · Now Playing
                            </div>
                        </div>
                    )}
                    {coverType === 'youtube' && (
                        <div className="vpm-youtube-frame">
                            <iframe
                                key={`yt-${realTimeUser.uid}`}
                                src={convertToYouTubeEmbedURL(realTimeUser.coverVideoURL)}
                                width="100%" height="100%" frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen title="YouTube Cover"
                            />
                            <div className="vpm-youtube-cinematic"/>
                            <div className="vpm-cover-badge vpm-cover-badge--youtube">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                YouTube
                            </div>
                        </div>
                    )}
                    {coverType === 'image' && (
                        <div className="vpm-image-frame">
                            <img src={realTimeUser.coverPhotoURL} alt="Cover" className="vpm-cover-img" onError={e => e.target.style.display='none'}/>
                            <div className="vpm-image-gradient"/>
                            <div className="vpm-cover-badge vpm-cover-badge--image">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                                Cover Photo
                            </div>
                        </div>
                    )}
                    {coverType === 'default' && (
                        <div className="vpm-default-cover">
                            <div className="vpm-orb vpm-orb-1"/><div className="vpm-orb vpm-orb-2"/><div className="vpm-orb vpm-orb-3"/>
                            <span className="vpm-default-initial">{(realTimeUser.displayName || user.displayName || '?').charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                    <button className="vpm-close-btn" onClick={onClose} title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                {/* ── IDENTITY ── */}
                <div className="vpm-identity">
                    <div className="vpm-avatar-ring" style={{'--ring-color': avatarBorderColor}}>
                        <img
                            src={getAvatarUrl()}
                            alt="Profile"
                            className="vpm-avatar"
                            onClick={() => setShowFullImage(true)}
                            title="Click to enlarge"
                        />
                        <span className={`vpm-online-dot ${isOnlineNow ? 'online' : ''}`}/>
                    </div>

                    <h2 className="vpm-username modal-display-name" data-user-uid={realTimeUser.uid} data-user-id={realTimeUser.uid}>
                        {realTimeUser.displayName || user.displayName || 'Anonymous'}
                        {realTimeUser.badge && badges[realTimeUser.badge] && (
                            <span className="vpm-inline-badge" title={badges[realTimeUser.badge].name}
                                  dangerouslySetInnerHTML={{ __html: badges[realTimeUser.badge].svg }}/>
                        )}
                    </h2>

                    <div className={`vpm-role-pill vpm-role-${realTimeUser.role?.toLowerCase() || 'user'}`}>
                        <span className="vpm-role-dot"/>
                        {getRoleDisplayLabel({ role: realTimeUser.role, gender: realTimeUser.gender, isGuest: realTimeUser.isGuest, badge: realTimeUser.badge })}
                        {realTimeUser.gender && (
                            <span className="vpm-gender-chip" style={{display:'inline-flex',alignItems:'center',gap:'3px',opacity:0.75}}>
                                &nbsp;·&nbsp;
                                {realTimeUser.gender?.toLowerCase() === 'female'
                                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 18h6"/></svg>
                                    : realTimeUser.gender?.toLowerCase() === 'other'
                                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="12" r="4"/><path d="M14 8l5-5M19 3h-3M19 3v3M16 12h3"/></svg>
                                    : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="10" r="5"/><path d="M12 15v6M17 21l-5-2-5 2"/></svg>
                                }
                            </span>
                        )}
                    </div>

                    {(realTimeUser.status || realTimeUser.bio) && (
                        <p className="vpm-status user-bio" style={statusStyle}>
                            "{realTimeUser.status || realTimeUser.bio}"
                        </p>
                    )}
                </div>

                {/* ── BADGE SHOWCASE ── */}
                {realTimeUser.badge && badges[realTimeUser.badge] && (
                    <div className="vpm-badge-showcase">
                        <div className="vpm-badge-glow-ring"/>
                        <div className="vpm-badge-icon-wrap">
                            <span className="vpm-badge-svg" dangerouslySetInnerHTML={{ __html: badges[realTimeUser.badge].svg }}/>
                        </div>
                        <div className="vpm-badge-meta">
                            <span className="vpm-badge-label" style={{display:'flex',alignItems:'center',gap:'4px'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="#7c3aed"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Special Badge</span>
                            <span className="vpm-badge-name">{badges[realTimeUser.badge].name}</span>
                        </div>
                    </div>
                )}

                {/* ── ROYAL TRUST ── */}
                {!realTimeUser.isGuest && (
                    <div className="vpm-trust-section">
                        <span className="vpm-section-label" style={{display:'flex',alignItems:'center',gap:'4px'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="#7c3aed"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Royal Trust Rank</span>
                        <div className="vpm-trust-inner">
                            <RoyalTrustBadge
                                trustScore={realTimeUser.trustScore ?? 10}
                                trustRank={realTimeUser.trustRank}
                                size="sm" showLabel={true} showTooltip={true}
                            />
                            <div className="vpm-trust-bar-wrap">
                                <div className="vpm-trust-bar">
                                    <div className="vpm-trust-fill" style={{ width:`${realTimeUser.trustScore ?? 10}%`, background: getTrustGradient(realTimeUser.trustScore ?? 10) }}/>
                                </div>
                                <span className="vpm-trust-score">{realTimeUser.trustScore ?? 10}/100</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TABS ── */}
                <div className="vpm-tabs">
                    <button className={`vpm-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('info'); setTimeout(() => applyFontPreferences(), 50); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/></svg>
                        Info
                    </button>
                    <button className={`vpm-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('friends'); loadFriendsData(); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M8,4C10.21,4 12,5.79 12,8C12,10.21 10.21,12 8,12C5.79,12 4,10.21 4,8C4,5.79 5.79,4 8,4M8,14C12.42,14 16,15.79 16,18V20H0V18C0,15.79 3.58,14 8,14Z"/></svg>
                        Friends ({realTimeUser?.friends?.length || friendsData.length || 0})
                    </button>
                    <button className={`vpm-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                            onClick={() => setActiveTab('activity')}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z"/></svg>
                        Activity
                    </button>
                </div>

                {/* ── CONTENT ── */}
                <div className="vpm-content">

                    {/* INFO TAB */}
                    {activeTab === 'info' && (
                        <div className="vpm-info-grid">
                            {realTimeUser.country && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Country</span>
                                        <span className="vpm-info-value">{getCountryFlag(realTimeUser.country)} {realTimeUser.country}</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.age && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Age</span>
                                        <span className="vpm-info-value">{realTimeUser.age} years</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.gender && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon">
                                        {realTimeUser.gender?.toLowerCase()==='female'
                                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 18h6"/></svg>
                                            : realTimeUser.gender?.toLowerCase()==='other'
                                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="12" r="4"/><path d="M14 8l6-6M20 2h-4M20 2v4M16 12h4a2 2 0 1 1 0 4h-4"/></svg>
                                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="10" r="5"/><path d="M12 15v6M17 22l-5-2-5 2"/></svg>
                                        }
                                    </span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Gender</span>
                                        <span className="vpm-info-value">{realTimeUser.gender}</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.relationship && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="#f43f5e" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Relationship</span>
                                        <span className="vpm-info-value">{getRelationshipDisplay(realTimeUser.relationship)}</span>
                                    </div>
                                </div>
                            )}
                            <div className="vpm-info-card">
                                <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg></span>
                                <div className="vpm-info-text">
                                    <span className="vpm-info-label">Last Seen</span>
                                    <span className="vpm-info-value" style={{color: isOnlineNow ? '#16a34a' : undefined, display:'flex', alignItems:'center', gap:'4px'}}>
                                        {isOnlineNow ? (<><span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#22c55e',display:'inline-block',boxShadow:'0 0 0 3px rgba(34,197,94,0.25)'}}></span> Online now</>) : formatLastSeen(realTimeUser.lastSeen || realTimeUser.lastSeenAt || realTimeUser.last_seen)}
                                    </span>
                                </div>
                            </div>
                            <div className="vpm-info-card">
                                <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
                                <div className="vpm-info-text">
                                    <span className="vpm-info-label">Member Since</span>
                                    <span className="vpm-info-value">{formatJoinDate(realTimeUser.createdAt || realTimeUser.joinedAt || realTimeUser.registrationDate)}</span>
                                </div>
                            </div>
                            <div className="vpm-info-card">
                                <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                                <div className="vpm-info-text">
                                    <span className="vpm-info-label">Friends</span>
                                    <span className="vpm-info-value">{realTimeUser?.friends?.length || friendsData.length || 0} friends</span>
                                </div>
                            </div>
                            {realTimeUser.profession && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M12 12v4M10 14h4"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Profession</span>
                                        <span className="vpm-info-value">{realTimeUser.profession}</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.languages && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h5"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Languages</span>
                                        <span className="vpm-info-value">{realTimeUser.languages}</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.education && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Education</span>
                                        <span className="vpm-info-value">{realTimeUser.education}</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.interests && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Interests</span>
                                        <span className="vpm-info-value">{realTimeUser.interests}</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.hobbies && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Hobbies</span>
                                        <span className="vpm-info-value">{realTimeUser.hobbies}</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.location && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Location</span>
                                        <span className="vpm-info-value">{realTimeUser.location}</span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.website && (
                                <div className="vpm-info-card">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">Website</span>
                                        <span className="vpm-info-value">
                                            <a href={realTimeUser.website} target="_blank" rel="noopener noreferrer" style={{color:'#8b5cf6',textDecoration:'none'}}>
                                                {realTimeUser.website.replace(/^https?:\/\//,'')}
                                            </a>
                                        </span>
                                    </div>
                                </div>
                            )}
                            {realTimeUser.bio && (
                                <div className="vpm-info-card vpm-info-card--about">
                                    <span className="vpm-info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                                    <div className="vpm-info-text">
                                        <span className="vpm-info-label">About</span>
                                        <span className="vpm-info-value vpm-bio-text">{realTimeUser.bio}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FRIENDS TAB */}
                    {activeTab === 'friends' && (
                        <div className="vpm-friends-grid">
                            {friendsData.length > 0 ? friendsData.map(f => (
                                <div key={f.uid || f.id} className="vpm-friend-item" onClick={() => onOpenProfile && onOpenProfile(f)} title={f.displayName}>
                                    <img src={f.photoURL || getDefaultAvatarUrl(f.uid || f.id, f.gender)} alt={f.displayName} className="vpm-friend-avatar"/>
                                    <div className="vpm-friend-name">{f.displayName}</div>
                                </div>
                            )) : (
                                <div className="vpm-empty">
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-3-3m-2-2 3 3"/></svg>
                                    <p>No friends yet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ACTIVITY TAB */}
                    {activeTab === 'activity' && (
                        <div className="vpm-activity-grid">
                            <div className="vpm-stat-card">
                                <span className="vpm-stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
                                <span className="vpm-stat-value">{formatJoinDate(realTimeUser.createdAt || realTimeUser.joinedAt || realTimeUser.registrationDate)}</span>
                                <span className="vpm-stat-label">Joined</span>
                            </div>
                            <div className="vpm-stat-card">
                                <span className="vpm-stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg></span>
                                <span className="vpm-stat-value" style={{color: isOnlineNow ? '#16a34a' : undefined}}>
                                    {isOnlineNow ? 'Online' : formatLastSeen(realTimeUser.lastSeen || realTimeUser.lastSeenAt)}
                                </span>
                                <span className="vpm-stat-label">Last Seen</span>
                            </div>
                            <div className="vpm-stat-card">
                                <span className="vpm-stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                                <span className="vpm-stat-value">{realTimeUser?.friends?.length || friendsData.length || 0}</span>
                                <span className="vpm-stat-label">Friends</span>
                            </div>
                            {realTimeUser.role && (
                                <div className="vpm-stat-card">
                                    <span className="vpm-stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
                                    <span className="vpm-stat-value" style={{color: avatarBorderColor}}>
                                        {getRoleDisplayLabel({ role: realTimeUser.role, gender: realTimeUser.gender, isGuest: realTimeUser.isGuest, badge: realTimeUser.badge })}
                                    </span>
                                    <span className="vpm-stat-label">Role</span>
                                </div>
                            )}
                            {realTimeUser.badge && badges[realTimeUser.badge] && (
                                <div className="vpm-stat-card">
                                    <span className="vpm-stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg></span>
                                    <span className="vpm-stat-value">{badges[realTimeUser.badge].name}</span>
                                    <span className="vpm-stat-label">Badge</span>
                                </div>
                            )}
                            {realTimeUser.profileViews && (
                                <div className="vpm-stat-card">
                                    <span className="vpm-stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>
                                    <span className="vpm-stat-value">{realTimeUser.profileViews}</span>
                                    <span className="vpm-stat-label">Profile Views</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── ACTION BUTTONS ── */}
                {!isCurrentUser && (
                    <div className="vpm-actions">
                        <button className="vpm-action-btn vpm-action-view" onClick={() => onOpenProfile && onOpenProfile(realTimeUser)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
                            View Full Profile
                        </button>

                        {!vpIsLimited && (
                            isFriend ? (
                                <button className="vpm-action-btn vpm-action-friend" onClick={handleRemoveFriend}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/></svg>
                                    Remove Friend
                                </button>
                            ) : friendRequestSent ? (
                                <button className="vpm-action-btn vpm-action-friend" disabled>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                                    Request Sent
                                </button>
                            ) : (
                                <button className="vpm-action-btn vpm-action-friend" onClick={handleSendFriendRequest}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12M5,10H2V12H5V15H7V12H10V10H7V7H5V10Z"/></svg>
                                    Add Friend
                                </button>
                            )
                        )}

                        <button className="vpm-action-btn vpm-action-msg" onClick={() => {
                            if (onSendMessage) { onSendMessage(realTimeUser); onClose(); }
                            else if (window.handlePrivateMessageFromSidebar) { window.handlePrivateMessageFromSidebar(realTimeUser); onClose(); }
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/></svg>
                            Message
                        </button>

                        {!vpIsLimited && (
                            <button className="vpm-action-btn vpm-action-whisper" onClick={() => {
                                if (onWhisper) { onWhisper(realTimeUser); onClose(); }
                                else if (window.handleWhisperFromSidebar) { window.handleWhisperFromSidebar(realTimeUser); onClose(); }
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,11H11V9H13V11M13,15H11V13H13V15Z"/></svg>
                                Whisper
                            </button>
                        )}

                        {!vpIsTargetStaff && (
                            <button className="vpm-action-btn vpm-action-block" onClick={handleBlockUser}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.35 19.12,16.5 17.65,18.12L5.88,6.35C7.5,4.88 9.65,4 12,4M12,20A8,8 0 0,1 4,12C4,9.65 4.88,7.5 6.35,5.88L18.12,17.65C16.5,19.12 14.35,20 12,20Z"/></svg>
                                Block
                            </button>
                        )}
                    </div>
                )}

                {/* ── SELF DANGER ZONE ── */}
                {isCurrentUser && (
                    <div className="vpm-danger-zone">
                        <span className="vpm-danger-title" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.29 3.86-8.11 14.07A2 2 0 0 0 3.88 21h16.24a2 2 0 0 0 1.7-3.07L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Danger Zone</span>
                        <p className="vpm-danger-desc">Permanently delete your profile (3-day grace period)</p>
                        {realTimeUser?.markedForDeletion ? (
                            <>
                                <p style={{color:'#ef4444',fontSize:'12px',textAlign:'center',marginBottom:'8px'}}>
                                    Deletion scheduled for {realTimeUser.permanentDeletionDate?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                                </p>
                                <button className="vpm-action-btn vpm-action-view" onClick={handleRevertDeletion}>Cancel Deletion</button>
                            </>
                        ) : (
                            <button className="vpm-action-btn vpm-action-delete" onClick={handleDeleteProfile}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/></svg>
                                Delete Profile Permanently
                            </button>
                        )}
                    </div>
                )}

            </div>
        </div>

        {/* Full-size image overlay */}
        {showFullImage && (
            <div className="vpm-fullimg-overlay" onClick={() => setShowFullImage(false)}>
                <div style={{position:'relative',maxWidth:'90vw',maxHeight:'90vh'}}>
                    <img src={getAvatarUrl()} className="vpm-fullimg" alt="Full profile" onClick={e => e.stopPropagation()}/>
                    <button className="vpm-fullimg-close" onClick={() => setShowFullImage(false)}>✕</button>
                    <div style={{textAlign:'center',color:'rgba(255,255,255,0.7)',fontSize:'13px',marginTop:'10px'}}>
                        {realTimeUser.displayName}'s Profile Picture
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default ViewProfileModal;
