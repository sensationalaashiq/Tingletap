import React, { useState, useEffect } from 'react';
import { getRoleDisplayLabel, getStoredGuestGender, getDefaultAvatarUrl } from '../utils/roleUtils';
import { auth, db } from '../firebase/config';
import { doc, updateDoc, getDocs, query, collection, where, writeBatch, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import StatusModal from './StatusModal';
import EditProfileModal from './EditProfileModal';
import ChangeUsernameModal from './ChangeUsernameModal';
import WarningAnnouncementModal from './WarningAnnouncementModal';
import WarningAnnouncementManager from './WarningAnnouncementManager';
import './SettingsSidebar.css';

const OtherGenderIconSVG = () => (
    <svg width="14" height="14" id="Layer_1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1">
        <defs>
            <linearGradient id="GradientFill_1_Settings" gradientUnits="userSpaceOnUse" x1="10.291" x2="501.771" y1="255.997" y2="255.997">
                <stop offset="0" stopColor="#58c8df"/>
                <stop offset="1" stopColor="#53a7dd"/>
            </linearGradient>
        </defs>
        <path d="m367.353 157.494c-1.593 12.6-20.2 31.412-36.384 43.042-16.188-11.63-34.79-30.447-36.391-43.042-.378-3.007.344-4.986 2.651-7.3a10.415 10.415 0 0 1 14.688 0c.721.721 1.564 1.764 2.543 2.971 1.307 1.622 2.929 3.629 4.993 5.765a16 16 0 0 0 23.025 0c2.064-2.136 3.693-4.143 4.993-5.765.979-1.207 1.822-2.25 2.536-2.971a10.416 10.416 0 0 1 14.695 0c2.308 2.314 3.029 4.286 2.651 7.308zm-36.384-33.125a42.454 42.454 0 0 0 -56.365 3.207c-9.322 9.323-13.394 21.06-11.766 33.94 4.094 32.333 44.692 62.88 59.98 71.932a16.055 16.055 0 0 0 16.3 0c15.3-9.052 55.894-39.6 59.987-71.932 1.629-12.88-2.443-24.617-11.773-33.947a42.452 42.452 0 0 0 -56.358-3.2zm-158.85 137.418c-1.586 12.58-20.2 31.4-36.391 43.027-16.188-11.63-34.79-30.447-36.383-43.034-.379-3.015.343-4.994 2.657-7.3a10.417 10.417 0 0 1 14.688 0c.721.721 1.557 1.757 2.536 2.972 1.315 1.614 2.929 3.629 4.994 5.758a16.013 16.013 0 0 0 23.031 0c2.058-2.129 3.679-4.144 4.987-5.751.978-1.214 1.821-2.258 2.543-2.979a10.4 10.4 0 0 1 14.688 0c2.314 2.307 3.029 4.286 2.65 7.308zm-36.376-33.14a42.478 42.478 0 0 0 -56.372 3.208c-9.323 9.322-13.395 21.059-11.759 33.94 4.079 32.333 44.677 62.88 59.979 71.931a16.036 16.036 0 0 0 16.288 0c15.3-9.051 55.9-39.6 59.98-71.931 1.629-12.881-2.443-24.618-11.759-33.94a42.444 42.444 0 0 0 -56.357-3.208zm261.335 10.108a93.495 93.495 0 1 0 -132.225 0 92.893 92.893 0 0 0 132.225 0zm-195.226 101.186a93.5 93.5 0 1 0 -132.233 0 93.625 93.625 0 0 0 132.233 0zm40.377-256.041a124.609 124.609 0 0 0 -36.72 85.6c-48.756-32.626-115.5-27.439-158.522 15.581a125.435 125.435 0 0 0 72.753 213.16v25.433h-40.334a16 16 0 0 0 0 32h40.334v40.326a16 16 0 1 0 32 0v-40.322h40.319a16 16 0 0 0 0-32h-40.321v-25.437a125.277 125.277 0 0 0 109.4-121.316 125.509 125.509 0 0 0 168.362-182.032l40.27-40.263v35.477a16 16 0 0 0 32 0v-74.107a16.008 16.008 0 0 0 -16-16h-74.11a16 16 0 0 0 0 32h35.476l-40.507 40.5c-49.142-37.172-119.616-33.379-164.4 11.4z" fill="url(#GradientFill_1_Settings)" fillRule="evenodd"/>
    </svg>
);

const SettingsSidebar = ({ 
    isOpen, 
    onClose, 
    loggedInUserProfile, 
    blockedUsers, 
    onUnblockUser,
    onOpenProfile,
    friendRequests = []
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    const [blockedUserProfiles, setBlockedUserProfiles] = useState([]);
    const [friendsProfiles, setFriendsProfiles] = useState([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [showWarningManager, setShowWarningManager] = useState(false);
    const [settings, setSettings] = useState({
        // General Settings
        autoScrollChat: true,
        showTimestamps: true,
        compactMode: false,
        darkMode: false,
        selectedTheme: 'light',

        // Notification Settings
        soundEnabled: true,
        messageNotifications: true,
        whisperNotifications: true,
        privateMessageNotifications: true,
        incomingCallNotifications: true,
        friendRequestNotifications: true,
        roomEntryNotifications: true,
        mentionNotifications: true,
        notificationVolume: 70,

        // Privacy Settings
        showOnlineStatus: true,
        allowPrivateMessages: true,
        allowPrivateMessagesLevel: 'all',
        allowWhisperMessages: true,
        showTyping: true,
        showLastSeen: false,
        showInSearch: true,
        allowFriendRequests: true,
        allowVoiceCalls: true,
        allowVideoCalls: true,
        readReceipts: true,
        saveChatHistory: true,
        anonymizeAnalytics: false,
        twoFactorAuth: false,
        contentFilterLevel: 'medium',
        blockExplicitContent: false,

        // Additional Notification Settings
        desktopNotifications: false,
        popupNotifications: false,
        emailNotifications: false,
        doNotDisturb: false,
        quietHours: false,
        notificationDelay: 0,

        // Audio Settings
        micVolume: 80,
        speakerVolume: 80,
        echoCancellation: true,
        noiseSuppression: true,

        // Username Font Settings
        usernameFontSize: '12px',
        usernameFontColor: '#000000',
        usernameFontFamily: 'inherit',
        usernameIsBold: false,
        usernameIsItalic: false,
        usernameIsUnderline: false,
        usernameIsStrikethrough: false,
        usernameTextShadow: 'none',
        usernameGradientEnabled: false,
        usernameGradientStart: '#ff0000',
        usernameGradientEnd: '#0000ff',
        usernameGradientDirection: 'to right',
        usernameOutlineEnabled: false,
        usernameOutlineColor: '#000000',
        usernameOutlineSize: '1px',
        usernameLetterSpacing: '0px',
        usernameAnimationEnabled: false,
        usernameAnimationType: 'pulse',
        usernameAnimationDuration: '2s',

    });

    // Load settings from Firebase profile on component mount
    useEffect(() => {
        const loadUserSettings = async () => {
            if (!auth.currentUser) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userSettings = userData.settings || {};

                    // Merge Firebase settings with localStorage fallback and defaults
                    const mergedSettings = {
                        // General Settings
                        autoScrollChat: userSettings.autoScrollChat !== undefined ? userSettings.autoScrollChat : (localStorage.getItem('autoScrollChat') !== 'false'),
                        showTimestamps: userSettings.showTimestamps !== undefined ? userSettings.showTimestamps : (localStorage.getItem('showTimestamps') !== 'false'),
                        compactMode: userSettings.compactMode !== undefined ? userSettings.compactMode : (localStorage.getItem('compactMode') === 'true'),
                        darkMode: userSettings.darkMode !== undefined ? userSettings.darkMode : (localStorage.getItem('darkMode') === 'true'),
                        selectedTheme: userSettings.selectedTheme || userData.selectedTheme || localStorage.getItem('selectedTheme') || 'light',

                        // Notification Settings
                        soundEnabled: userSettings.soundEnabled !== undefined ? userSettings.soundEnabled : (localStorage.getItem('soundEnabled') !== 'false'),
                        messageNotifications: userSettings.messageNotifications !== undefined ? userSettings.messageNotifications : (localStorage.getItem('messageNotifications') !== 'false'),
                        whisperNotifications: userSettings.whisperNotifications !== undefined ? userSettings.whisperNotifications : (localStorage.getItem('whisperNotifications') !== 'false'),
                        privateMessageNotifications: userSettings.privateMessageNotifications !== undefined ? userSettings.privateMessageNotifications : (localStorage.getItem('privateMessageNotifications') !== 'false'),
                        incomingCallNotifications: userSettings.incomingCallNotifications !== undefined ? userSettings.incomingCallNotifications : (localStorage.getItem('incomingCallNotifications') !== 'false'),
                        friendRequestNotifications: userSettings.friendRequestNotifications !== undefined ? userSettings.friendRequestNotifications : (localStorage.getItem('friendRequestNotifications') !== 'false'),
                        roomEntryNotifications: userSettings.roomEntryNotifications !== undefined ? userSettings.roomEntryNotifications : (localStorage.getItem('roomEntryNotifications') !== 'false'),
                        mentionNotifications: userSettings.mentionNotifications !== undefined ? userSettings.mentionNotifications : (localStorage.getItem('mentionNotifications') !== 'false'),
                        notificationVolume: userSettings.notificationVolume !== undefined ? userSettings.notificationVolume : parseInt(localStorage.getItem('notificationVolume') || '70'),

                        // Privacy Settings
                        showOnlineStatus: userSettings.showOnlineStatus !== undefined ? userSettings.showOnlineStatus : (localStorage.getItem('showOnlineStatus') !== 'false'),
                        allowPrivateMessages: userSettings.allowPrivateMessages !== undefined ? userSettings.allowPrivateMessages : (localStorage.getItem('allowPrivateMessages') !== 'false'),
                        allowPrivateMessagesLevel: userSettings.allowPrivateMessagesLevel || localStorage.getItem('allowPrivateMessagesLevel') || 'all',
                        allowWhisperMessages: userSettings.allowWhisperMessages !== undefined ? userSettings.allowWhisperMessages : (localStorage.getItem('allowWhisperMessages') !== 'false'),
                        showTyping: userSettings.showTyping !== undefined ? userSettings.showTyping : (localStorage.getItem('showTyping') !== 'false'),
                        showLastSeen: userSettings.showLastSeen !== undefined ? userSettings.showLastSeen : (localStorage.getItem('showLastSeen') === 'true'),
                        showInSearch: userSettings.showInSearch !== undefined ? userSettings.showInSearch : (localStorage.getItem('showInSearch') !== 'false'),
                        allowFriendRequests: userSettings.allowFriendRequests !== undefined ? userSettings.allowFriendRequests : (localStorage.getItem('allowFriendRequests') !== 'false'),
                        allowVoiceCalls: userSettings.allowVoiceCalls !== undefined ? userSettings.allowVoiceCalls : (localStorage.getItem('allowVoiceCalls') !== 'false'),
                        allowVideoCalls: userSettings.allowVideoCalls !== undefined ? userSettings.allowVideoCalls : (localStorage.getItem('allowVideoCalls') !== 'false'),
                        readReceipts: userSettings.readReceipts !== undefined ? userSettings.readReceipts : (localStorage.getItem('readReceipts') !== 'false'),
                        saveChatHistory: userSettings.saveChatHistory !== undefined ? userSettings.saveChatHistory : (localStorage.getItem('saveChatHistory') !== 'false'),
                        anonymizeAnalytics: userSettings.anonymizeAnalytics !== undefined ? userSettings.anonymizeAnalytics : (localStorage.getItem('anonymizeAnalytics') === 'true'),
                        twoFactorAuth: userSettings.twoFactorAuth !== undefined ? userSettings.twoFactorAuth : (localStorage.getItem('twoFactorAuth') === 'true'),
                        contentFilterLevel: userSettings.contentFilterLevel || localStorage.getItem('contentFilterLevel') || 'medium',
                        blockExplicitContent: userSettings.blockExplicitContent !== undefined ? userSettings.blockExplicitContent : (localStorage.getItem('blockExplicitContent') === 'true'),

                        // Additional Notification Settings
                        desktopNotifications: userSettings.desktopNotifications !== undefined ? userSettings.desktopNotifications : (localStorage.getItem('desktopNotifications') === 'true'),
                        popupNotifications: userSettings.popupNotifications !== undefined ? userSettings.popupNotifications : (localStorage.getItem('popupNotifications') === 'true'),
                        emailNotifications: userSettings.emailNotifications !== undefined ? userSettings.emailNotifications : (localStorage.getItem('emailNotifications') === 'true'),
                        doNotDisturb: userSettings.doNotDisturb !== undefined ? userSettings.doNotDisturb : (localStorage.getItem('doNotDisturb') === 'true'),
                        quietHours: userSettings.quietHours !== undefined ? userSettings.quietHours : (localStorage.getItem('quietHours') === 'true'),
                        notificationDelay: userSettings.notificationDelay !== undefined ? userSettings.notificationDelay : parseInt(localStorage.getItem('notificationDelay') || '0'),

                        // Audio Settings
                        micVolume: userSettings.micVolume !== undefined ? userSettings.micVolume : parseInt(localStorage.getItem('micVolume') || '80'),
                        speakerVolume: userSettings.speakerVolume !== undefined ? userSettings.speakerVolume : parseInt(localStorage.getItem('speakerVolume') || '80'),
                        echoCancellation: userSettings.echoCancellation !== undefined ? userSettings.echoCancellation : (localStorage.getItem('echoCancellation') !== 'false'),
                        noiseSuppression: userSettings.noiseSuppression !== undefined ? userSettings.noiseSuppression : (localStorage.getItem('noiseSuppression') !== 'false'),

                        // Username Font Settings
                        usernameFontSize: userSettings.usernameFontSize || localStorage.getItem('usernameFontSize') || '12px',
                        usernameFontColor: userSettings.usernameFontColor || localStorage.getItem('usernameFontColor') || '#000000',
                        usernameFontFamily: userSettings.usernameFontFamily || localStorage.getItem('usernameFontFamily') || 'inherit',
                        usernameIsBold: userSettings.usernameIsBold !== undefined ? userSettings.usernameIsBold : (localStorage.getItem('usernameIsBold') === 'true'),
                        usernameIsItalic: userSettings.usernameIsItalic !== undefined ? userSettings.usernameIsItalic : (localStorage.getItem('usernameIsItalic') === 'true'),
                        usernameIsUnderline: userSettings.usernameIsUnderline !== undefined ? userSettings.usernameIsUnderline : (localStorage.getItem('usernameIsUnderline') === 'true'),
                        usernameIsStrikethrough: userSettings.usernameIsStrikethrough !== undefined ? userSettings.usernameIsStrikethrough : (localStorage.getItem('usernameIsStrikethrough') === 'true'),
                        usernameTextShadow: userSettings.usernameTextShadow || localStorage.getItem('usernameTextShadow') || 'none',
                        usernameGradientEnabled: userSettings.usernameGradientEnabled !== undefined ? userSettings.usernameGradientEnabled : (localStorage.getItem('usernameGradientEnabled') === 'true'),
                        usernameGradientStart: userSettings.usernameGradientStart || localStorage.getItem('usernameGradientStart') || '#ff0000',
                        usernameGradientEnd: userSettings.usernameGradientEnd || localStorage.getItem('usernameGradientEnd') || '#0000ff',
                        usernameGradientDirection: userSettings.usernameGradientDirection || localStorage.getItem('usernameGradientDirection') || 'to right',
                        usernameOutlineEnabled: userSettings.usernameOutlineEnabled !== undefined ? userSettings.usernameOutlineEnabled : (localStorage.getItem('usernameOutlineEnabled') === 'true'),
                        usernameOutlineColor: userSettings.usernameOutlineColor || localStorage.getItem('usernameOutlineColor') || '#000000',
                        usernameOutlineSize: userSettings.usernameOutlineSize || localStorage.getItem('usernameOutlineSize') || '1px',
                        usernameLetterSpacing: userSettings.usernameLetterSpacing || localStorage.getItem('usernameLetterSpacing') || '0px',
                        usernameAnimationEnabled: userSettings.usernameAnimationEnabled !== undefined ? userSettings.usernameAnimationEnabled : (localStorage.getItem('usernameAnimationEnabled') === 'true'),
                        usernameAnimationType: userSettings.usernameAnimationType || localStorage.getItem('usernameAnimationType') || 'pulse',
                        usernameAnimationDuration: userSettings.usernameAnimationDuration || localStorage.getItem('usernameAnimationDuration') || '2s',

                    };

                    setSettings(mergedSettings);

                    // Update localStorage with Firebase values
                    Object.entries(mergedSettings).forEach(([key, value]) => {
                        localStorage.setItem(key, value.toString());
                    });
                }
            } catch (error) {
                console.error('Error loading user settings:', error);
            }
        };

        loadUserSettings();
    }, []);

    // Removed laggy theme initialization - handled by App.jsx

    // Load blocked users directly from Firestore so it's always up-to-date
    const loadBlockedUserProfiles = async () => {
        if (!auth.currentUser) return;
        try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (!userDoc.exists()) return;
            const blockedIds = userDoc.data()?.blockedUsers || [];
            if (blockedIds.length === 0) { setBlockedUserProfiles([]); return; }
            const userPromises = blockedIds.map(uid => getDoc(doc(db, 'users', uid)));
            const userDocs = await Promise.all(userPromises);
            const profiles = userDocs
                .filter(d => d.exists())
                .map(d => ({ id: d.id, ...d.data() }));
            setBlockedUserProfiles(profiles);
        } catch (error) {
            console.error("Error loading blocked user profiles:", error);
        }
    };

    useEffect(() => {
        loadBlockedUserProfiles();
    }, [blockedUsers]);

    // Reload when blocked tab becomes active
    useEffect(() => {
        if (activeTab === 'blocked') {
            loadBlockedUserProfiles();
        }
    }, [activeTab]);

    // Load friends profiles
    useEffect(() => {
        const loadFriendsProfiles = async () => {
            if (!auth.currentUser) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const friendsList = userData.friends || [];

                    if (friendsList.length > 0) {
                        const friendProfiles = await Promise.all(
                            friendsList.map(async (friendId) => {
                                try {
                                    const friendDoc = await getDoc(doc(db, 'users', friendId));
                                    if (friendDoc.exists()) {
                                        return { id: friendDoc.id, ...friendDoc.data() };
                                    }
                                    return null;
                                } catch (error) {
                                    console.error(`Error loading friend profile ${friendId}:`, error);
                                    return null;
                                }
                            })
                        );
                        setFriendsProfiles(friendProfiles.filter(profile => profile !== null));
                    } else {
                        setFriendsProfiles([]);
                    }
                }
            } catch (error) {
                console.error("Error loading friends profiles:", error);
                setFriendsProfiles([]);
            }
        };

        loadFriendsProfiles();
    }, []);

    const handleSettingChange = async (key, value) => {
        try {
            // Update local state
            setSettings(prev => ({
                ...prev,
                [key]: value
            }));

            // Save to localStorage immediately
            localStorage.setItem(key, value.toString());

            // Handle theme changes with instant synchronous application
            if (key === 'selectedTheme') {
                // Synchronous theme switching - no delays, no awaits
                const themeClasses = ['theme-light', 'theme-dark', 'theme-nord', 'theme-tokyo', 'theme-monokai', 'theme-dracula', 'theme-cyberpunk', 'theme-ocean', 'theme-sunset', 'dark-mode'];

                const htmlElement = document.documentElement;
                const bodyElement = document.body;

                // Remove all theme classes instantly
                themeClasses.forEach(cls => {
                    htmlElement.classList.remove(cls);
                    bodyElement.classList.remove(cls);
                });

                // Add new theme classes immediately
                const newThemeClass = `theme-${value}`;
                const isDarkTheme = ['dark', 'nord', 'tokyo', 'monokai', 'dracula', 'cyberpunk', 'ocean', 'sunset'].includes(value);

                htmlElement.classList.add(newThemeClass);
                bodyElement.classList.add(newThemeClass);

                if (isDarkTheme) {
                    htmlElement.classList.add('dark-mode');
                    bodyElement.classList.add('dark-mode');
                }

                // Force immediate DOM update
                document.documentElement.offsetHeight;
                console.log(`🎨 Theme changed to ${value.charAt(0).toUpperCase() + value.slice(1)}`);
            }

            // Apply immediate UI changes for various settings
            if (key === 'compactMode') {
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer) {
                    if (value) {
                        chatContainer.classList.add('compact-mode');
                    } else {
                        chatContainer.classList.remove('compact-mode');
                    }
                }
                console.log(value ? '📱 Compact mode enabled' : '📱 Normal mode enabled');
            }

            if (key === 'showTimestamps') {
                const messages = document.querySelectorAll('.message-timestamp');
                messages.forEach(timestamp => {
                    timestamp.style.display = value ? 'block' : 'none';
                });
                console.log(value ? '⏰ Timestamps shown' : '🕐 Timestamps hidden');
            }

            if (key === 'soundEnabled') {
                console.log(value ? '🔊 Sounds enabled' : '🔇 Sounds disabled');
            }

            if (key === 'notificationVolume') {
                console.log(`🔊 Notification volume set to ${value}%`);
            }

            if (key === 'micVolume') {
                toast.success(`🎤 Microphone volume set to ${value}%`);
            }

            if (key === 'speakerVolume') {
                toast.success(`🔊 Speaker volume set to ${value}%`);
            }

            // For non-guest users, save to Firebase asynchronously (don't block UI)
            if (auth.currentUser && !auth.currentUser.isAnonymous) {
                const userRef = doc(db, 'users', auth.currentUser.uid);

                // Update settings in Firebase asynchronously
                updateDoc(userRef, {
                    [`settings.${key}`]: value
                }).catch(error => {
                    console.error('Error updating setting in Firebase:', error);
                });

                // Also update top-level theme property for compatibility
                if (key === 'selectedTheme') {
                    updateDoc(userRef, {
                        selectedTheme: value
                    }).catch(error => {
                        console.error('Error updating theme in Firebase:', error);
                    });
                }

                // For username styling settings, apply changes immediately and globally
                if (key.startsWith('username')) {
                    console.log('🎨 SettingsSidebar: Updating USERNAME ONLY styles (message text NOT affected)');

                    // Import the username styling functions
                    import('../utils/usernamePreferences').then(({ saveUsernameFontPreferences, applyGlobalUsernameStyles }) => {
                        // Get current username preferences
                        const currentUsernamePrefs = {
                            usernameFontSize: settings.usernameFontSize,
                            usernameFontColor: settings.usernameFontColor,
                            usernameFontFamily: settings.usernameFontFamily,
                            usernameIsBold: settings.usernameIsBold,
                            usernameIsItalic: settings.usernameIsItalic,
                            usernameIsUnderline: settings.usernameIsUnderline,
                            usernameIsStrikethrough: settings.usernameIsStrikethrough,
                            usernameGradientEnabled: settings.usernameGradientEnabled,
                            usernameGradientStart: settings.usernameGradientStart,
                            usernameGradientEnd: settings.usernameGradientEnd,
                            usernameGradientDirection: settings.usernameGradientDirection,
                            usernameTextShadow: settings.usernameTextShadow,
                            usernameLetterSpacing: settings.usernameLetterSpacing,
                            usernameAnimationEnabled: settings.usernameAnimationEnabled,
                            usernameAnimationType: settings.usernameAnimationType,
                            usernameAnimationDuration: settings.usernameAnimationDuration,
                            usernameOutlineEnabled: settings.usernameOutlineEnabled,
                            usernameOutlineColor: settings.usernameOutlineColor,
                            usernameOutlineSize: settings.usernameOutlineSize,
                            [key]: value // Include the new value
                        };

                        // Save username preferences
                        saveUsernameFontPreferences(currentUsernamePrefs);

                        // Apply username styles immediately - visible to ALL users
                        setTimeout(() => {
                            applyGlobalUsernameStyles();
                            updatePreviewElement();

                            // Force update all username elements in DOM
                            const usernameElements = document.querySelectorAll('.message-displayname, .message-username, .displayname, .username, .user-name, .sidebar-username, .dropdown-username, .friend-name, .blocked-user-name, .modern-profile-name');
                            usernameElements.forEach(element => {
                                const userName = element.textContent?.trim();
                                if (userName && auth.currentUser && userName === auth.currentUser.displayName) {
                                    element.setAttribute('data-user-id', auth.currentUser.uid);
                                    element.setAttribute('data-user-uid', auth.currentUser.uid);
                                    element.setAttribute('data-username', userName);
                                }
                            });

                            console.log('✅ Username styles applied immediately for all users to see (message text NOT affected)');
                        }, 100);
                    }).catch(error => {
                        console.error('❌ Error importing username styling functions:', error);
                    });
                }
            }

        } catch (error) {
            console.error('Error updating setting:', error);
            toast.error('❌ Failed to update setting');
        }
    };

    const handleClearAllData = () => {
        const confirmClear = window.confirm(
            'Are you sure you want to clear all your local data? This will reset all your preferences.'
        );

        if (confirmClear) {
            // Clear all localStorage items related to settings
            const settingsKeys = [
                'autoScrollChat', 'showTimestamps', 'compactMode', 'darkMode', 'selectedTheme',
                'soundEnabled', 'messageNotifications', 'whisperNotifications', 
                'privateMessageNotifications', 'incomingCallNotifications', 'friendRequestNotifications',
                'roomEntryNotifications', 'mentionNotifications', 'notificationVolume',
                'showOnlineStatus', 'allowPrivateMessages', 'allowWhisperMessages', 'showTyping', 'micVolume', 
                'speakerVolume', 'echoCancellation', 'noiseSuppression',
                'usernameFontSize', 'usernameFontColor', 'usernameFontFamily', 'usernameIsBold', 'usernameIsItalic',
                'usernameIsUnderline', 'usernameTextShadow', 'usernameGradientEnabled', 'usernameGradientStart',
                'usernameGradientEnd', 'usernameGradientDirection'
            ];

            settingsKeys.forEach(key => localStorage.removeItem(key));

            // Reset state to defaults
            setSettings({
                autoScrollChat: true,
                showTimestamps: true,
                compactMode: false,
                darkMode: false,
                selectedTheme: 'light',
                soundEnabled: true,
                messageNotifications: true,
                whisperNotifications: true,
                privateMessageNotifications: true,
                incomingCallNotifications: true,
                friendRequestNotifications: true,
                roomEntryNotifications: true,
                mentionNotifications: true,
                notificationVolume: 70,
                showOnlineStatus: true,
                allowPrivateMessages: true,
                allowWhisperMessages: true,
                showTyping: true,
                micVolume: 80,
                speakerVolume: 80,
                echoCancellation: true,
                noiseSuppression: true,
                usernameFontSize: '12px',
                usernameFontColor: '#333333',
                usernameFontFamily: 'inherit',
                usernameIsBold: false,
                usernameIsItalic: false,
                usernameIsUnderline: false,
                usernameTextShadow: 'none',
                usernameGradientEnabled: false,
                usernameGradientStart: '#ff0000',
                usernameGradientEnd: '#0000ff',
                usernameGradientDirection: 'linear'
            });

            // Also reset font preferences to 12px default
            if (window.setFontPreference) {
                window.setFontPreference('fontSize', '12px');
                window.setFontPreference('fontColor', '#333333');
                window.setFontPreference('fontFamily', 'inherit');
                window.setFontPreference('isBold', false);
                window.setFontPreference('isItalic', false);
                window.setFontPreference('isUnderline', false);
                window.setFontPreference('isStrikethrough', false);
            }

            toast.success('All settings have been reset to defaults!');
        }
    };

    const handleLogout = async () => {
        try {
            // Cleanup all Firestore listeners before logging out
            if (window.cleanupFirestoreListeners) {
                window.cleanupFirestoreListeners();
            }
            if (window.cleanupHomePageListeners) {
                window.cleanupHomePageListeners();
            }

            // Small delay to ensure cleanup completes
            await new Promise(resolve => setTimeout(resolve, 100));

            await signOut(auth);
            onClose();
            navigate('/login');
            toast.success('Logged out successfully!');
        } catch (error) {
            console.error('Error logging out:', error);
            toast.error('Failed to logout. Please try again.');
        }
    };

    const handleRemoveFriend = async (friend) => {
        const confirmRemove = window.confirm(`Are you sure you want to remove ${friend.displayName} from your friends list?`);

        if (confirmRemove) {
            try {
                const currentUserRef = doc(db, 'users', auth.currentUser.uid);
                const friendUserRef = doc(db, 'users', friend.id);

                // Get current user's data
                const currentUserDoc = await getDoc(currentUserRef);
                const currentUserData = currentUserDoc.data();
                const currentFriends = currentUserData.friends || [];

                // Get friend's data
                const friendUserDoc = await getDoc(friendUserRef);
                const friendUserData = friendUserDoc.data();
                const friendFriends = friendUserData.friends || [];

                // Remove friend from current user's friends list
                const updatedCurrentFriends = currentFriends.filter(id => id !== friend.id);

                // Remove current user from friend's friends list
                const updatedFriendFriends = friendFriends.filter(id => id !== auth.currentUser.uid);

                // Update both users' friends lists
                await updateDoc(currentUserRef, {
                    friends: updatedCurrentFriends
                });

                await updateDoc(friendUserRef, {
                    friends: updatedFriendFriends
                });

                // Update local state
                setFriendsProfiles(prev => prev.filter(f => f.id !== friend.id));

                toast.success(`🚫 Removed ${friend.displayName} from friends list`);
            } catch (error) {
                console.error('Error removing friend:', error);
                toast.error('Failed to remove friend. Please try again.');
            }
        }
    };

    const handleBlockFriend = async (friend) => {
        const confirmBlock = window.confirm(`Are you sure you want to block ${friend.displayName}? This will also remove them from your friends list.`);

        if (confirmBlock) {
            try {
                const currentUserRef = doc(db, 'users', auth.currentUser.uid);
                const friendUserRef = doc(db, 'users', friend.id);

                // Get current user's data
                const currentUserDoc = await getDoc(currentUserRef);
                const currentUserData = currentUserDoc.data();
                const currentFriends = currentUserData.friends || [];
                const currentBlocked = currentUserData.blockedUsers || [];

                // Get friend's data
                const friendUserDoc = await getDoc(friendUserRef);
                const friendUserData = friendUserDoc.data();
                const friendFriends = friendUserData.friends || [];

                // Remove friend from friends list and add to blocked list
                const updatedCurrentFriends = currentFriends.filter(id => id !== friend.id);
                const updatedCurrentBlocked = [...currentBlocked, friend.id];

                // Remove current user from friend's friends list
                const updatedFriendFriends = friendFriends.filter(id => id !== auth.currentUser.uid);

                // Update both users
                await updateDoc(currentUserRef, {
                    friends: updatedCurrentFriends,
                    blockedUsers: updatedCurrentBlocked
                });

                await updateDoc(friendUserRef, {
                    friends: updatedFriendFriends
                });

                // Update local state
                setFriendsProfiles(prev => prev.filter(f => f.id !== friend.id));

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
                                <span style={{ fontWeight: 700, color: '#b91c1c' }}>{friend.displayName}</span> has been blocked
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
            } catch (error) {
                console.error('Error blocking friend:', error);
                toast.error('Failed to block user. Please try again.');
            }
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="settings-tab-content">
                        <h3>General Preferences</h3>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    <line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/>
                                </svg>
                                CHAT PREFERENCES
                            </h4>

                            <div className="modern-setting-item">
                                <div className="modern-setting-info">
                                    <span>Auto-scroll Chat</span>
                                    <small>Automatically scroll to new messages in the chat window</small>
                                </div>
                                <label className="modern-toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoScrollChat}
                                        onChange={(e) => handleSettingChange('autoScrollChat', e.target.checked)}
                                    />
                                    <span className="modern-toggle-slider"></span>
                                </label>
                            </div>

                            <div className="modern-setting-item">
                                <div className="modern-setting-info">
                                    <span>Show Timestamps</span>
                                    <small>Display message timestamps for all chat messages</small>
                                </div>
                                <label className="modern-toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.showTimestamps}
                                        onChange={(e) => handleSettingChange('showTimestamps', e.target.checked)}
                                    />
                                    <span className="modern-toggle-slider"></span>
                                </label>
                            </div>

                            <div className="modern-setting-item">
                                <div className="modern-setting-info">
                                    <span>Compact Mode</span>
                                    <small>Reduce spacing between messages for a denser chat view</small>
                                </div>
                                <label className="modern-toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.compactMode}
                                        onChange={(e) => handleSettingChange('compactMode', e.target.checked)}
                                    />
                                    <span className="modern-toggle-slider"></span>
                                </label>
                            </div>

                            </div>

                    </div>
                );

            case 'notifications':
                return (
                    <div className="settings-tab-content">
                        <h3>Notification Settings</h3>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                </svg>
                                AUDIO NOTIFICATIONS
                            </h4>

                            <div className="modern-setting-item">
                                <div className="modern-setting-info">
                                    <span>Master Sound</span>
                                    <small>Enable or disable all notification sounds globally</small>
                                </div>
                                <label className="modern-toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.soundEnabled}
                                        onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                                    />
                                    <span className="modern-toggle-slider"></span>
                                </label>
                            </div>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Message Notifications</span>
                                    <small>Sound for new chat messages</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.messageNotifications}
                                        onChange={(e) => handleSettingChange('messageNotifications', e.target.checked)}
                                        disabled={!settings.soundEnabled}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Whisper Notifications</span>
                                    <small>Sound for whispers directed to you</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.whisperNotifications}
                                        onChange={(e) => handleSettingChange('whisperNotifications', e.target.checked)}
                                        disabled={!settings.soundEnabled}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Private Message Notifications</span>
                                    <small>Sound for private messages</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.privateMessageNotifications}
                                        onChange={(e) => handleSettingChange('privateMessageNotifications', e.target.checked)}
                                        disabled={!settings.soundEnabled}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Friend Request Notifications</span>
                                    <small>Sound for new friend requests</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.friendRequestNotifications}
                                        onChange={(e) => handleSettingChange('friendRequestNotifications', e.target.checked)}
                                        disabled={!settings.soundEnabled}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>User Mention Notifications</span>
                                    <small>Sound when someone mentions you (@username)</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.mentionNotifications}
                                        onChange={(e) => handleSettingChange('mentionNotifications', e.target.checked)}
                                        disabled={!settings.soundEnabled}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <div className="modern-setting-item">
                                <div className="modern-setting-info">
                                    <span>Notification Volume</span>
                                    <small>Adjust the volume level for all notification sounds</small>
                                </div>
                                <div className="modern-volume-control">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={settings.notificationVolume}
                                        onChange={(e) => handleSettingChange('notificationVolume', parseInt(e.target.value))}
                                        className="modern-volume-slider"
                                        disabled={!settings.soundEnabled}
                                    />
                                    <span className="modern-volume-value">{settings.notificationVolume}%</span>
                                </div>
                            </div>
                        </div>

                    </div>
                );

            case 'privacy':
                return (
                    <div className="settings-tab-content">
                        <h3>Privacy Settings</h3>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                VISIBILITY SETTINGS
                            </h4>
                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Show Online Status</span>
                                    <small>Let others see when you're online</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.showOnlineStatus}
                                        onChange={(e) => handleSettingChange('showOnlineStatus', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Show Typing Indicator</span>
                                    <small>Show when you're typing</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.showTyping}
                                        onChange={(e) => handleSettingChange('showTyping', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Show Last Seen</span>
                                    <small>Let others see when you were last active</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.showLastSeen || false}
                                        onChange={(e) => handleSettingChange('showLastSeen', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Show Profile in Search</span>
                                    <small>Allow others to find you in user search</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.showInSearch || true}
                                        onChange={(e) => handleSettingChange('showInSearch', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                        </div>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    <path d="M8 10h8M8 14h5"/>
                                </svg>
                                COMMUNICATION SETTINGS
                            </h4>

                            {auth.currentUser?.isAnonymous ? (
                                /* Guest: only simple On/Off private message toggle */
                                <label className="setting-item">
                                    <div className="setting-info">
                                        <span>Allow Private Messages</span>
                                        <small>On for All — Off for All (Owners can always message you)</small>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.allowPrivateMessages !== false}
                                            onChange={(e) => handleSettingChange('allowPrivateMessages', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </label>
                            ) : (
                                /* Registered users: full options */
                                <>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <span>Allow Private Messages</span>
                                            <small>Control who can send you private messages</small>
                                        </div>
                                        <select
                                            className="privacy-select"
                                            value={settings.allowPrivateMessagesLevel || 'all'}
                                            onChange={(e) => handleSettingChange('allowPrivateMessagesLevel', e.target.value)}
                                        >
                                            <option value="all">Everyone</option>
                                            <option value="friends">Friends Only</option>
                                            <option value="none">No One</option>
                                        </select>
                                    </div>

                                    <label className="setting-item">
                                        <div className="setting-info">
                                            <span>Allow Whisper Messages</span>
                                            <small>Let users send you whisper messages</small>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.allowWhisperMessages}
                                                onChange={(e) => handleSettingChange('allowWhisperMessages', e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </label>

                                    <label className="setting-item">
                                        <div className="setting-info">
                                            <span>Allow Friend Requests</span>
                                            <small>Let others send you friend requests</small>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.allowFriendRequests || true}
                                                onChange={(e) => handleSettingChange('allowFriendRequests', e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </label>
                                </>
                            )}

                        </div>
                    </div>
                );

            case 'blocked':
                return (
                    <div className="settings-tab-content">
                        <h3>Blocked Users</h3>

                        {blockedUserProfiles.length === 0 ? (
                            <div className="empty-state">
                                <svg viewBox="0 0 24 24" width="48" height="48" fill="#9ca3af">
                                    <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V9M12,19C8.13,19 5,15.87 5,12C5,8.13 8.13,5 12,5C15.87,5 19,8.13 19,12C19,15.87 15.87,19 12,19M7.5,12C7.5,15.04 9.96,17.5 13,17.5V6.5C9.96,6.5 7.5,8.96 7.5,12Z"/>
                                </svg>
                                <p>No blocked users</p>
                                <small>Users you block will appear here</small>
                            </div>
                        ) : (
                            <div className="blocked-users-list">
                                {blockedUserProfiles.map(user => (
                                    <div key={user.id} className="blocked-user-item" data-user-id={user.id}>
                                        <div className="blocked-user-info">
                                            <img 
                                                src={user.photoURL || `${getDefaultAvatarUrl(user.uid, user.gender)}`}
                                                alt="avatar"
                                                className="blocked-user-avatar"
                                            />
                                            <div className="blocked-user-details">
                                                <span className="blocked-user-name">{user.displayName}</span>
                                                <small className="blocked-user-role">{user.role || 'user'}</small>
                                            </div>
                                        </div>
                                        <button
                                            className="unblock-btn"
                                            onClick={() => onUnblockUser(user.id || user.uid)}
                                        >
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                                            </svg>
                                            Unblock
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );


            case 'friends': {
                const _frRole = loggedInUserProfile?.role?.toLowerCase();
                const _frBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                const _frAccess = _frBadge || ['admin','owner','moderator'].includes(_frRole);
                if (!_frAccess) {
                    return (
                        <div className="settings-tab-content">
                            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'14px',padding:'28px 16px',textAlign:'center'}}>
                                <div style={{width:'68px',height:'68px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(99,102,241,.35)'}}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                    </svg>
                                </div>
                                <div>
                                    <div style={{fontSize:'1rem',fontWeight:800,color:'#1a1a2e',marginBottom:'5px'}}>Friends — Locked</div>
                                    <p style={{fontSize:'0.8rem',color:'#6b7280',lineHeight:1.55,margin:0}}>
                                        Register an account or get a badge to access your friends list and manage connections.
                                    </p>
                                </div>
                                <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.07),rgba(139,92,246,.05))',border:'1px solid rgba(99,102,241,.18)',borderRadius:'12px',padding:'12px 14px',width:'100%',boxSizing:'border-box',textAlign:'left'}}>
                                    <div style={{fontSize:'10px',fontWeight:800,color:'#6366f1',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:'7px',display:'flex',alignItems:'center',gap:'5px'}}>
                                        <svg viewBox="0 0 24 24" width="10" height="10"><path fill="#6366f1" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                                        Requires
                                    </div>
                                    {[
                                        {icon:<svg viewBox="0 0 24 24" width="10" height="10"><path fill="#6366f1" d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/></svg>, text:'Registered account'},
                                        {icon:<svg viewBox="0 0 24 24" width="10" height="10"><path fill="#6366f1" d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 17l-6.18 3.02L7 13.14 2 8.27l6.91-1.01z"/></svg>, text:'Badge holder or Staff role'},
                                    ].map((item,i)=>(
                                        <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',color:'#4b5563',marginBottom:'3px'}}>{item.icon}{item.text}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="settings-tab-content" style={{display:'flex',flexDirection:'column',gap:'14px',minHeight:0}}>

                        {/* ── MY FRIENDS ── */}
                        <div className="sf-section">
                            <div className="sf-section-header">
                                <div className="sf-section-icon" style={{background:'linear-gradient(135deg,#6366f1,#7c3aed)'}}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                    </svg>
                                </div>
                                <span className="sf-section-title">My Friends</span>
                                <span className="sf-section-badge">{friendsProfiles.length}</span>
                            </div>
                            <div className="sf-friends-list">
                                {friendsProfiles.length > 0 ? (
                                    friendsProfiles.map(friend => (
                                        <div key={friend.id} className="sf-friend-item">
                                            <img
                                                src={friend.photoURL || `${getDefaultAvatarUrl(friend.id, friend.gender)}`}
                                                alt="avatar"
                                                className="sf-friend-avatar"
                                            />
                                            <div className="sf-friend-info">
                                                <div className="sf-friend-name">{friend.displayName}</div>
                                                <div className="sf-friend-role">{friend.role || 'Member'}</div>
                                            </div>
                                            <div className="sf-friend-btns">
                                                <button className="sf-btn sf-btn-msg" title="Message"
                                                    onClick={() => { if (window.handlePrivateMessageFromSidebar) window.handlePrivateMessageFromSidebar(friend); onClose(); }}>
                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                                                    </svg>
                                                </button>
                                                <button className="sf-btn sf-btn-remove" title="Remove"
                                                    onClick={() => handleRemoveFriend(friend)}>
                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                                    </svg>
                                                </button>
                                                <button className="sf-btn sf-btn-block" title="Block"
                                                    onClick={() => handleBlockFriend(friend)}>
                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.68L5.68 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.68L18.32 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="sf-empty">
                                        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                            <circle cx="9" cy="7" r="4"/>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                        </svg>
                                        <div className="sf-empty-title">No friends yet</div>
                                        <div className="sf-empty-sub">Click someone's name in chat to add them</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── FRIEND REQUESTS ── */}
                        <div className="sf-section">
                            <div className="sf-section-header">
                                <div className="sf-section-icon" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                                        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                    </svg>
                                </div>
                                <span className="sf-section-title">Friend Requests</span>
                                {friendRequests && friendRequests.length > 0 && (
                                    <span className="sf-section-badge sf-badge-green">{friendRequests.length}</span>
                                )}
                            </div>
                            <div className="sf-friends-list">
                                {friendRequests && friendRequests.length > 0 ? (
                                    friendRequests.map(req => (
                                        <div key={req.id} className="sf-friend-item sf-request-item">
                                            <img
                                                src={req.senderPhotoURL || `${getDefaultAvatarUrl(req.senderId, req.senderGender)}`}
                                                alt="avatar"
                                                className="sf-friend-avatar"
                                            />
                                            <div className="sf-friend-info">
                                                <div className="sf-friend-name">{req.senderName || 'Unknown'}</div>
                                                <div className="sf-friend-role" style={{color:'#10b981'}}>wants to be friends</div>
                                            </div>
                                            <div className="sf-friend-btns">
                                                <button className="sf-btn sf-btn-accept" title="Accept"
                                                    onClick={() => { if (window.handleAcceptFriendRequestFromSettings) window.handleAcceptFriendRequestFromSettings(req); else toast.success(`Accepted ${req.senderName}'s request!`); }}>
                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                    </svg>
                                                </button>
                                                <button className="sf-btn sf-btn-decline" title="Decline"
                                                    onClick={() => { if (window.handleDeclineFriendRequestFromSettings) window.handleDeclineFriendRequestFromSettings(req); else toast.info(`Declined ${req.senderName}'s request`); }}>
                                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="sf-empty">
                                        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                            <circle cx="8.5" cy="7" r="4"/>
                                            <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                                        </svg>
                                        <div className="sf-empty-title">No pending requests</div>
                                        <div className="sf-empty-sub">Incoming friend requests appear here</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                                </svg>
                                FRIEND SETTINGS
                            </h4>
                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Allow Friend Requests</span>
                                    <small>Let others send you friend requests</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.allowFriendRequests || true}
                                        onChange={(e) => handleSettingChange('allowFriendRequests', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Friend Request Notifications</span>
                                    <small>Get notified when someone sends you a friend request</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.friendRequestNotifications}
                                        onChange={(e) => handleSettingChange('friendRequestNotifications', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                        </div>
                    </div>
                );
            }

            case 'username-font':
                // Check access permissions
                const userRole = loggedInUserProfile?.role?.toLowerCase();
                const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                const hasAccess = hasBadge || ['admin', 'owner', 'moderator'].includes(userRole);

                if (!hasAccess) {
                    return (
                        <div className="settings-tab-content">
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.06))',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: '10px',
                                padding: '14px',
                                textAlign: 'center',
                                color: '#dc2626',
                                margin: '8px 0'
                            }}>
                                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style={{ marginBottom: '8px' }}>
                                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/>
                                </svg>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '700' }}>Premium — Restricted</h3>
                                <p style={{ margin: '0 0 8px 0', fontSize: '11px', lineHeight: '1.4' }}>
                                    For <strong>Badge Holders</strong>, <strong>Admins</strong>, <strong>Owners</strong> &amp; <strong>Mods</strong> only.
                                </p>
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '6px',
                                    padding: '8px',
                                    marginTop: '8px',
                                    textAlign: 'left'
                                }}>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: '700' }}>🎨 Includes:</p>
                                    <ul style={{ 
                                        margin: '0', 
                                        padding: '0 0 0 14px',
                                        fontSize: '10px',
                                        lineHeight: '1.5'
                                    }}>
                                        <li>Custom fonts & sizes</li>
                                        <li>Gradient & shadow effects</li>
                                        <li>Animations — visible to all</li>
                                    </ul>
                                </div>
                                <p style={{ margin: '8px 0 0 0', fontSize: '10px', fontStyle: 'italic', opacity: '0.8' }}>
                                    Contact an admin to get access.
                                </p>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="st3-wrap">

                        {/* ── HEADER: preview + reset ── */}
                        <div className="st3-header">
                            <div className="st3-preview-box">
                                <span className="st3-live-dot" />
                                <span className="username-preview-text" id="username-preview">
                                    {loggedInUserProfile?.displayName || 'YourUsername'}
                                </span>
                            </div>
                            <button className="st3-reset-btn" title="Reset to Default" onClick={() => {
                                const d = { usernameFontSize:'12px', usernameFontColor:'#333333', usernameFontFamily:'inherit', usernameIsBold:false, usernameIsItalic:false, usernameIsUnderline:false, usernameIsStrikethrough:false, usernameGradientEnabled:false, usernameGradientStart:'#667eea', usernameGradientEnd:'#764ba2', usernameGradientDirection:'to right', usernameTextShadow:'none', usernameOutlineEnabled:false, usernameOutlineColor:'#000000', usernameOutlineSize:'1px', usernameAnimationEnabled:false, usernameAnimationType:'pulse', usernameAnimationDuration:'1s', usernameLetterSpacing:'0px' };
                                Object.entries(d).forEach(([k,v]) => handleSettingChange(k,v));
                                setTimeout(applyUsernameStyles, 100);
                            }}>
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Reset
                            </button>
                        </div>

                        {/* ── PRESETS ── */}
                        <div className="st3-presets-row">
                            {[
                                { name:'Default', s:{color:'#555'}, p:{usernameFontSize:'12px',usernameFontColor:'#333333',usernameFontFamily:'inherit',usernameIsBold:false,usernameIsItalic:false,usernameIsUnderline:false,usernameIsStrikethrough:false,usernameGradientEnabled:false,usernameTextShadow:'none',usernameOutlineEnabled:false,usernameAnimationEnabled:false,usernameLetterSpacing:'0px'} },
                                { name:'Violet', s:{background:'linear-gradient(to right,#667eea,#764ba2)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontWeight:700}, p:{usernameFontSize:'13px',usernameFontFamily:'inherit',usernameIsBold:true,usernameGradientEnabled:true,usernameGradientStart:'#667eea',usernameGradientEnd:'#764ba2',usernameGradientDirection:'to right',usernameTextShadow:'none',usernameLetterSpacing:'0.5px',usernameAnimationEnabled:false} },
                                { name:'Fire', s:{background:'linear-gradient(45deg,#ff4500,#ff8c00)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontWeight:700}, p:{usernameFontSize:'13px',usernameFontFamily:'inherit',usernameIsBold:true,usernameGradientEnabled:true,usernameGradientStart:'#ff4500',usernameGradientEnd:'#ff8c00',usernameGradientDirection:'45deg',usernameTextShadow:'0 0 8px rgba(255,69,0,0.7)',usernameAnimationEnabled:true,usernameAnimationType:'glow',usernameAnimationDuration:'2s'} },
                                { name:'Neon', s:{color:'#00e5ff',textShadow:'0 0 8px rgba(0,229,255,0.9)',fontWeight:700}, p:{usernameFontSize:'13px',usernameFontFamily:'inherit',usernameIsBold:true,usernameGradientEnabled:false,usernameFontColor:'#00e5ff',usernameTextShadow:'0 0 10px rgba(0,229,255,0.8)',usernameAnimationEnabled:true,usernameAnimationType:'glow',usernameAnimationDuration:'1.5s',usernameLetterSpacing:'1px'} },
                                { name:'Elegant', s:{fontFamily:'Georgia',fontStyle:'italic',background:'linear-gradient(135deg,#a18cd1,#fbc2eb)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}, p:{usernameFontSize:'13px',usernameFontFamily:'Georgia',usernameIsItalic:true,usernameIsBold:false,usernameGradientEnabled:true,usernameGradientStart:'#a18cd1',usernameGradientEnd:'#fbc2eb',usernameGradientDirection:'135deg',usernameTextShadow:'none',usernameLetterSpacing:'1px',usernameAnimationEnabled:false} },
                                { name:'Gold', s:{background:'linear-gradient(to right,#f7971e,#ffd200)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontWeight:700}, p:{usernameFontSize:'13px',usernameFontFamily:'inherit',usernameIsBold:true,usernameGradientEnabled:true,usernameGradientStart:'#f7971e',usernameGradientEnd:'#ffd200',usernameGradientDirection:'to right',usernameTextShadow:'0 0 10px rgba(255,215,0,0.8)',usernameAnimationEnabled:false,usernameLetterSpacing:'0.5px'} },
                            ].map(p => (
                                <button key={p.name} className="st3-preset" onClick={() => { Object.entries(p.p).forEach(([k,v]) => handleSettingChange(k,v)); setTimeout(applyUsernameStyles,100); }}>
                                    <span className="st3-preset-aa" style={p.s}>Aa</span>
                                    <span className="st3-preset-name">{p.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* ── CONTROLS CARD ── */}
                        <div className="st3-card">

                            {/* Font */}
                            <div className="st3-row">
                                <span className="st3-label">Font</span>
                                <div className="st3-sel-wrap">
                                    <select className="st3-sel" value={settings.usernameFontFamily} onChange={e => { handleSettingChange('usernameFontFamily', e.target.value); updatePreviewElement(); }}>
                                        <option value="inherit">Default</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Great Vibes">Great Vibes</option>
                                        <option value="Dancing Script">Dancing Script</option>
                                        <option value="Allura">Allura</option>
                                        <option value="Pacifico">Pacifico</option>
                                        <option value="Satisfy">Satisfy</option>
                                        <option value="Lobster">Lobster</option>
                                        <option value="Caveat">Caveat</option>
                                        <option value="Indie Flower">Indie Flower</option>
                                        <option value="Permanent Marker">Permanent Marker</option>
                                        <option value="Nunito">Nunito</option>
                                        <option value="Raleway">Raleway</option>
                                        <option value="Merriweather">Merriweather</option>
                                        <option value="Courgette">Courgette</option>
                                        <option value="Sacramento">Sacramento</option>
                                        <option value="Ubuntu">Ubuntu</option>
                                    </select>
                                    <svg className="st3-chev" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10Z"/></svg>
                                </div>
                            </div>

                            <div className="st3-divider" />

                            {/* Size */}
                            <div className="st3-row">
                                <span className="st3-label">Size</span>
                                <div className="st3-chips">
                                    {['8','10','11','12','13','14','15','16'].map(sz => (
                                        <button key={sz} className={`st3-chip ${settings.usernameFontSize === sz+'px' ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameFontSize', sz+'px'); updatePreviewElement(); }}>{sz}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="st3-divider" />

                            {/* Style + Spacing */}
                            <div className="st3-row" style={{flexWrap:'wrap',gap:'4px 6px'}}>
                                <span className="st3-label">Style</span>
                                <div className="st3-chips">
                                    <button className={`st3-chip st3-fmt ${settings.usernameIsBold ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameIsBold', !settings.usernameIsBold); setTimeout(applyUsernameStyles,50); }}><b>B</b></button>
                                    <button className={`st3-chip st3-fmt ${settings.usernameIsItalic ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameIsItalic', !settings.usernameIsItalic); setTimeout(applyUsernameStyles,50); }}><i>I</i></button>
                                    <button className={`st3-chip st3-fmt ${settings.usernameIsUnderline ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameIsUnderline', !settings.usernameIsUnderline); setTimeout(applyUsernameStyles,50); }}><u>U</u></button>
                                    <button className={`st3-chip st3-fmt ${settings.usernameIsStrikethrough ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameIsStrikethrough', !settings.usernameIsStrikethrough); setTimeout(applyUsernameStyles,50); }}><s>S</s></button>
                                </div>
                                <span className="st3-label" style={{marginLeft:'4px'}}>Space</span>
                                <div className="st3-chips">
                                    {[{v:'-0.5px',l:'−'},{v:'0px',l:'·'},{v:'0.5px',l:'+'},{v:'1px',l:'++'},{v:'2px',l:'MAX'}].map(s => (
                                        <button key={s.v} className={`st3-chip ${settings.usernameLetterSpacing === s.v ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameLetterSpacing', s.v); setTimeout(applyUsernameStyles,50); }}>{s.l}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="st3-divider" />

                            {/* Color mode */}
                            <div className="st3-row">
                                <span className="st3-label">Color</span>
                                <button className={`st3-mode-btn ${!settings.usernameGradientEnabled ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameGradientEnabled', false); setTimeout(applyUsernameStyles,50); }}>Solid</button>
                                <button className={`st3-mode-btn ${settings.usernameGradientEnabled ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameGradientEnabled', true); setTimeout(applyUsernameStyles,50); }}>Gradient</button>
                            </div>

                            {!settings.usernameGradientEnabled ? (
                                <div className="st3-row">
                                    <span className="st3-label">Pick</span>
                                    <input type="color" className="st3-color-input" value={settings.usernameFontColor} onChange={e => { handleSettingChange('usernameFontColor', e.target.value); setTimeout(applyUsernameStyles,50); }} />
                                    <span className="st3-hex">{settings.usernameFontColor}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="st3-row">
                                        <span className="st3-label">From</span>
                                        <input type="color" className="st3-color-input" value={settings.usernameGradientStart} onChange={e => { handleSettingChange('usernameGradientStart', e.target.value); setTimeout(applyUsernameStyles,50); }} />
                                        <span className="st3-hex">{settings.usernameGradientStart}</span>
                                        <span className="st3-label" style={{marginLeft:'4px'}}>To</span>
                                        <input type="color" className="st3-color-input" value={settings.usernameGradientEnd} onChange={e => { handleSettingChange('usernameGradientEnd', e.target.value); setTimeout(applyUsernameStyles,50); }} />
                                        <span className="st3-hex">{settings.usernameGradientEnd}</span>
                                    </div>
                                    <div className="st3-row">
                                        <span className="st3-label">Dir</span>
                                        <div className="st3-chips">
                                            {[{v:'to right',l:'→'},{v:'to left',l:'←'},{v:'to bottom',l:'↓'},{v:'45deg',l:'↗'},{v:'135deg',l:'↘'},{v:'225deg',l:'↙'},{v:'315deg',l:'↖'},{v:'radial',l:'●'}].map(d => (
                                                <button key={d.v} className={`st3-chip ${settings.usernameGradientDirection === d.v ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameGradientDirection', d.v); setTimeout(applyUsernameStyles,50); }}>{d.l}</button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="st3-divider" />

                            {/* Shadow */}
                            <div className="st3-row" style={{flexWrap:'wrap',alignItems:'flex-start'}}>
                                <span className="st3-label" style={{paddingTop:'2px'}}>Shadow</span>
                                <div className="st3-chips" style={{flexWrap:'wrap'}}>
                                    {[{v:'none',l:'—'},{v:'1px 1px 2px rgba(0,0,0,0.3)',l:'Soft'},{v:'2px 2px 4px rgba(0,0,0,0.5)',l:'Dark'},{v:'0 0 8px rgba(255,255,255,0.8)',l:'White'},{v:'0 0 10px rgba(0,255,255,0.8)',l:'Cyan'},{v:'0 0 10px rgba(255,0,255,0.8)',l:'Pink'},{v:'0 0 10px rgba(255,215,0,0.8)',l:'Gold'},{v:'2px 2px 0px #000,4px 4px 0px #333',l:'3D'}].map(s => (
                                        <button key={s.v} className={`st3-chip ${settings.usernameTextShadow === s.v ? 'on' : ''}`} style={s.v!=='none'?{textShadow:s.v}:{}} onClick={() => { handleSettingChange('usernameTextShadow', s.v); setTimeout(applyUsernameStyles,50); }}>{s.l}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="st3-divider" />

                            {/* Outline */}
                            <div className="st3-row">
                                <span className="st3-label">Outline</span>
                                <label className="st3-toggle">
                                    <input type="checkbox" checked={settings.usernameOutlineEnabled} onChange={e => { handleSettingChange('usernameOutlineEnabled', e.target.checked); setTimeout(applyUsernameStyles,50); }} />
                                    <span className="st3-track" />
                                </label>
                                {settings.usernameOutlineEnabled && (
                                    <>
                                        <input type="color" className="st3-color-input" value={settings.usernameOutlineColor} onChange={e => { handleSettingChange('usernameOutlineColor', e.target.value); setTimeout(applyUsernameStyles,50); }} />
                                        <div className="st3-sel-wrap" style={{flex:'none',width:'76px'}}>
                                            <select className="st3-sel" value={settings.usernameOutlineSize} onChange={e => { handleSettingChange('usernameOutlineSize', e.target.value); setTimeout(applyUsernameStyles,50); }}>
                                                <option value="0.5px">Thin</option>
                                                <option value="1px">Normal</option>
                                                <option value="1.5px">Medium</option>
                                                <option value="2px">Thick</option>
                                            </select>
                                            <svg className="st3-chev" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10Z"/></svg>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="st3-divider" />

                            {/* Animation */}
                            <div className="st3-row" style={{flexWrap:'wrap',gap:'4px 6px'}}>
                                <span className="st3-label">Anim</span>
                                <label className="st3-toggle">
                                    <input type="checkbox" checked={settings.usernameAnimationEnabled} onChange={e => { handleSettingChange('usernameAnimationEnabled', e.target.checked); setTimeout(applyUsernameStyles,50); }} />
                                    <span className="st3-track" />
                                </label>
                                {settings.usernameAnimationEnabled && (
                                    <div className="st3-chips" style={{flexWrap:'wrap'}}>
                                        {[{v:'pulse',l:'Pulse'},{v:'bounce',l:'Bounce'},{v:'shake',l:'Shake'},{v:'glow',l:'Glow'},{v:'fadeInOut',l:'Fade'},{v:'rainbow',l:'🌈'}].map(a => (
                                            <button key={a.v} className={`st3-chip ${settings.usernameAnimationType === a.v ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameAnimationType', a.v); setTimeout(applyUsernameStyles,50); }}>{a.l}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {settings.usernameAnimationEnabled && (
                                <div className="st3-row">
                                    <span className="st3-label">Speed</span>
                                    <div className="st3-chips">
                                        {[{v:'0.5s',l:'Fast'},{v:'1s',l:'Normal'},{v:'2s',l:'Slow'},{v:'3s',l:'Slower'}].map(sp => (
                                            <button key={sp.v} className={`st3-chip ${settings.usernameAnimationDuration === sp.v ? 'on' : ''}`} onClick={() => { handleSettingChange('usernameAnimationDuration', sp.v); setTimeout(applyUsernameStyles,50); }}>{sp.l}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                    </div>
                );

            case 'account':
                return (
                    <div className="settings-tab-content">
                        <h3>Account Settings</h3>

                        {/* Modern Profile Card */}
                        <div className="modern-account-card" data-user-id={auth.currentUser?.uid}>
                            <div className="modern-profile-section">
                                <div className="modern-avatar-container">
                                    <img 
                                        src={loggedInUserProfile?.photoURL || `${getDefaultAvatarUrl(auth.currentUser?.uid, loggedInUserProfile?.gender)}`}
                                        alt="avatar"
                                        className="modern-account-avatar"
                                    />
                                    <div className="modern-status-indicator"></div>
                                </div>
                                <div className="modern-profile-info">
                                    <h4 className="modern-profile-name">{
                                        loggedInUserProfile?.displayName ||
                                        auth.currentUser?.displayName ||
                                        (() => { try { return JSON.parse(localStorage.getItem('guestUser') || '{}').displayName || null; } catch { return null; } })() ||
                                        (auth.currentUser?.isAnonymous ? 'Guest' : 'Anonymous')
                                    }</h4>
                                    <p className="modern-profile-email">{
                                        auth.currentUser?.isAnonymous
                                            ? 'Guest Account (Temporary)'
                                            : (auth.currentUser?.email || '')
                                    }</p>
                                    <span className="modern-role-badge" data-role={loggedInUserProfile?.badge ? 'badge_holder' : (loggedInUserProfile?.role || (auth.currentUser?.isAnonymous ? 'guest' : 'user'))}>
                                        {getRoleDisplayLabel({
                                            role: loggedInUserProfile?.role || (auth.currentUser?.isAnonymous ? 'guest' : 'user'),
                                            gender: loggedInUserProfile?.gender || getStoredGuestGender(),
                                            isGuest: loggedInUserProfile?.isGuest || auth.currentUser?.isAnonymous || false,
                                            badge: loggedInUserProfile?.badge
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Management Section — locked for guests, full access for registered */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                STATUS MANAGEMENT
                            </h4>

                            {auth.currentUser?.isAnonymous ? (
                                /* ── LOCKED for guest users (Spotify-style) ── */
                                <div style={{
                                    position:'relative', borderRadius:'14px', overflow:'hidden',
                                    background:'linear-gradient(135deg,rgba(99,102,241,.06),rgba(139,92,246,.08))',
                                    border:'1.5px solid rgba(99,102,241,.18)', padding:'18px 16px'
                                }}>
                                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                                        <div style={{width:'38px',height:'38px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 12px rgba(99,102,241,.35)'}}>
                                            <svg viewBox="0 0 24 24" width="19" height="19" fill="white">
                                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <div style={{fontSize:'13px',fontWeight:800,color:'#1e1b4b',lineHeight:1.2}}>Status — Guest Locked</div>
                                            <div style={{fontSize:'11px',color:'#6b7280',marginTop:'2px'}}>Register to unlock this feature</div>
                                        </div>
                                    </div>
                                    <p style={{margin:'0 0 10px',fontSize:'11.5px',color:'#6b7280',lineHeight:1.55}}>
                                        Set your mood, activity, and style with custom animated status messages. Available to registered members.
                                    </p>
                                    <div style={{display:'flex',flexDirection:'column',gap:'5px',background:'rgba(255,255,255,.6)',borderRadius:'9px',padding:'10px 12px',border:'1px solid rgba(99,102,241,.12)'}}>
                                        <div style={{fontSize:'10px',fontWeight:800,color:'#6366f1',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:'3px'}}>What you unlock:</div>
                                        {[
                                            {icon:<svg viewBox="0 0 24 24" width="10" height="10"><path fill="#10b981" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>, text:'Custom status messages'},
                                            {icon:<svg viewBox="0 0 24 24" width="10" height="10"><path fill="#10b981" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>, text:'Gold, Neon, Royal premium styles'},
                                            {icon:<svg viewBox="0 0 24 24" width="10" height="10"><path fill="#10b981" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>, text:'Animated & gradient text effects'},
                                        ].map((item,i) => (
                                            <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',color:'#4b5563'}}>
                                                {item.icon}{item.text}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Lock shimmer overlay */}
                                    <div style={{position:'absolute',top:0,right:0,bottom:0,width:'40px',background:'linear-gradient(270deg,rgba(255,255,255,.18),transparent)',pointerEvents:'none'}}/>
                                </div>
                            ) : (
                                <>
                                    {/* Current Status Display */}
                                    {loggedInUserProfile?.status && (
                                        <div className="current-status-display">
                                            <div className="status-label">CURRENT STATUS</div>
                                            <div className="current-status-text">{loggedInUserProfile.status}</div>
                                        </div>
                                    )}

                                    <div className="modern-button-grid">
                                        {(() => {
                                            const userRole = loggedInUserProfile?.role?.toLowerCase();
                                            const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                                            const hasAccess = hasBadge || ['admin', 'owner', 'moderator'].includes(userRole);

                                            return hasAccess ? (
                                                <button
                                                    className="modern-nav-btn rectangular feature"
                                                    onClick={() => setShowStatusModal(true)}
                                                    title="Change Status"
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                    </svg>
                                                    <span>CHANGE STATUS</span>
                                                </button>
                                            ) : (
                                                <div style={{background:'linear-gradient(135deg,rgba(239,68,68,.08),rgba(220,38,38,.06))',border:'1px solid rgba(239,68,68,.22)',borderRadius:'10px',padding:'12px 14px',textAlign:'center',color:'#dc2626'}}>
                                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{marginBottom:'6px',opacity:.7}}>
                                                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                                    </svg>
                                                    <div style={{fontSize:'12px',fontWeight:700,margin:'0 0 4px'}}>Premium Feature</div>
                                                    <div style={{fontSize:'11px',opacity:.8}}>For badge holders and staff only.</div>
                                                </div>
                                            );
                                        })()}

                                        {loggedInUserProfile?.status && (
                                            <button
                                                className="modern-nav-btn warning"
                                                onClick={async () => {
                                                    const confirmClear = window.confirm('Are you sure you want to clear your status?');
                                                    if (confirmClear) {
                                                        try {
                                                            await updateDoc(doc(db, 'users', auth.currentUser.uid), { status: '', updatedAt: new Date().toISOString() });
                                                            toast.success('Status cleared!');
                                                        } catch (error) {
                                                            toast.error('Failed to clear status.');
                                                        }
                                                    }
                                                }}
                                                title="Clear Status"
                                            >
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                                </svg>
                                                <span>CLEAR STATUS</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Cover Media Section */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                COVER MEDIA
                            </h4>

                            {/* Access Check for Cover Features */}
                            {(() => {
                                const userRole = loggedInUserProfile?.role?.toLowerCase();
                                const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                                const hasAccess = hasBadge || ['admin', 'owner', 'moderator'].includes(userRole);

                                if (!hasAccess) {
                                    return (
                                        <div style={{
                                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            textAlign: 'center',
                                            color: '#dc2626'
                                        }}>
                                            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style={{ marginBottom: '8px' }}>
                                                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/>
                                            </svg>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Premium Feature</h4>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.4' }}>
                                                Cover media features are restricted to Badge Holders, Admins, Owners, and Moderators only.
                                            </p>
                                            <p style={{ margin: '0', fontSize: '12px', opacity: '0.8' }}>
                                                Contact an admin to get access to these features.
                                            </p>
                                        </div>
                                    );
                                }

                                return null;
                            })()}

                            {/* Access-Controlled Cover Media Options */}
                            {(() => {
                                const userRole = loggedInUserProfile?.role?.toLowerCase();
                                const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                                const hasAccess = hasBadge || ['admin', 'owner', 'moderator'].includes(userRole);

                                if (!hasAccess) return null;

                                return (
                                    <>
                                        {/* Cover Photo Upload */}
                                        <div className="modern-button-grid">
                                            <button 
                                                className="modern-nav-btn rectangular feature"
                                                onClick={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = 'image/*';
                                                    input.onchange = async (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            if (file.size > 10 * 1024 * 1024) {
                                                                toast.error('Cover photo must be less than 10MB');
                                                                return;
                                                            }
                                                            try {
                                                                toast.info('📸 Uploading cover photo...');
                                                                const formData = new FormData();
                                                                formData.append('image', file);
                                                                formData.append('key', 'bec822839da595fbbc6ffafddca80839');

                                                                const response = await fetch('https://api.imgbb.com/1/upload', {
                                                                    method: 'POST',
                                                                    body: formData
                                                                });

                                                                const result = await response.json();

                                                                if (result.success) {
                                                                    // Save cover photo URL and remove video/spotify to Firebase
                                                                    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                                                                        coverPhotoURL: result.data.url,
                                                                        coverVideoURL: null, // Remove video when setting photo
                                                                        coverVideoType: null,
                                                                        spotifyTrackURL: null, // Remove Spotify when setting photo
                                                                        spotifyTrackData: null,
                                                                        updatedAt: new Date().toISOString()
                                                                    });

                                                                    toast.success('✅ Cover photo uploaded successfully!');

                                                                    // Force immediate refresh
                                                                    setTimeout(() => {
                                                                        window.location.reload();
                                                                    }, 1000);
                                                                } else {
                                                                    toast.error('❌ Upload failed. Please try again.');
                                                                }
                                                            } catch (error) {
                                                                console.error('Cover photo upload error:', error);
                                                                toast.error('❌ Upload failed. Please try again.');
                                                            }
                                                        }
                                                    };
                                                    input.click();
                                                }}
                                                title="Upload Cover Photo"
                                            >
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                                    <polyline points="21 15 16 10 5 21"/>
                                                </svg>
                                                <span>UPLOAD COVER PHOTO</span>
                                            </button>
                                        </div>

                                        {/* YouTube Cover Video Section */}
                                        <div className="youtube-cover-section">
                                            <label className="youtube-cover-label">
                                                <svg viewBox="0 0 24 24" width="24" height="24" className="youtube-icon">
                                                    <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                                                    <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                                </svg>
                                                YouTube Cover Video
                                            </label>

                                            <div className="youtube-input-container">
                                                <input
                                                    type="url"
                                                    placeholder="https://www.youtube.com/watch?v=..."
                                                    className="youtube-url-input"
                                                />

                                                <button
                                                    className="youtube-set-button"
                                                    onClick={async (e) => {
                                                        const input = e.target.closest('.youtube-input-container').querySelector('input[type="url"]');
                                                        const youtubeUrl = input.value.trim();

                                                        if (!youtubeUrl) {
                                                            toast.error('Please enter a YouTube URL');
                                                            return;
                                                        }

                                                        // Extract YouTube video ID with improved regex
                                                        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
                                                        const match = youtubeUrl.match(youtubeRegex);

                                                        if (!match) {
                                                            toast.error('❌ Invalid YouTube URL. Please enter a valid YouTube video URL.');
                                                            return;
                                                        }

                                                        const videoId = match[1];

                                                        // Validate video exists by checking if we can access it
                                                        try {
                                                            const testUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                                                            const response = await fetch(testUrl);
                                                            if (!response.ok) {
                                                                toast.error('❌ This YouTube video is not available or may be private/restricted.');
                                                                return;
                                                            }
                                                        } catch (error) {
                                                            console.warn('Could not validate video availability:', error);
                                                            // Continue anyway as the validation might fail due to CORS
                                                        }

                                                        // Convert to embed URL with proper parameters for modal display
                                                        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&modestbranding=1&showinfo=0&fs=1&cc_load_policy=0&iv_load_policy=3&origin=${window.location.origin}`;

                                                        try {
                                                            toast.info('🎥 Setting YouTube cover video...');

                                                            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                                                                coverVideoURL: embedUrl,
                                                                coverVideoType: 'youtube',
                                                                coverPhotoURL: null, // Remove photo when setting video
                                                                spotifyTrackURL: null, // Remove Spotify when setting YouTube
                                                                spotifyTrackData: null,
                                                                updatedAt: new Date().toISOString()
                                                            });

                                                            input.value = '';

                                                            toast.success('✅ YouTube cover video set successfully!');

                                                            // Force immediate refresh
                                                            setTimeout(() => {
                                                                window.location.reload();
                                                            }, 1000);

                                                        } catch (error) {
                                                            console.error('Error setting cover video:', error);
                                                            toast.error('❌ Failed to set cover video. Please try again.');
                                                        }
                                                    }}
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                    </svg>
                                                    Set Video
                                                </button>
                                            </div>

                                            <div className="youtube-help-text">
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                                </svg>
                                                Paste any YouTube video URL to set as your profile cover
                                            </div>
                                        </div>

                                        {/* Spotify Cover Song Section */}
                                        <div className="spotify-cover-section">
                                            <label className="spotify-cover-label">
                                                <svg viewBox="0 0 24 24" width="24" height="24" className="spotify-icon">
                                                    <circle cx="12" cy="12" r="12" fill="#1DB954"/>
                                                    <path fill="#FFFFFF" d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75c-.5.15-1-.15-1.15-.6-.15-.5.15-1 .6-1.15 3.55-1.05 9.4-.85 13.1 1.35.45.25.6.85.35 1.3-.25.35-.85.5-1.3.25zm1.1-2.8c-.25-.45-.85-.6-1.3-.35-3.8-2.25-9.55-2.9-14.1-1.6-.55.15-1.1-.25-1.25-.8-.15-.55.25-1.1.8-1.25 5.2-1.5 11.7-.8 16.15 1.85.45.25.6.85.35 1.3-.25.45-.85.6-1.3.35zm-13.35 3.95c-.45.1-.9-.2-1-.65-.1-.45.2-.9.65-1 2.3-.55 4.75-.55 7.05 0 .45.1.75.55.65 1-.1.45-.55-1 .65-1.95-.45-4.2-.45-6.15 0z"/>
                                                </svg>
                                                Spotify Song Cover
                                            </label>

                                            <div className="spotify-input-container">
                                                <input
                                                    type="url"
                                                    placeholder="https://open.spotify.com/track/..."
                                                    className="spotify-url-input"
                                                />

                                                <button
                                                    className="spotify-set-button"
                                                    onClick={async (e) => {
                                                        const input = e.target.closest('.spotify-input-container').querySelector('input[type="url"]');
                                                        const spotifyUrl = input.value.trim();

                                                        if (!spotifyUrl) {
                                                            toast.error('Please enter a Spotify URL');
                                                            return;
                                                        }

                                                        // Extract Spotify track ID with improved regex
                                                        const spotifyRegex = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/track\/([a-zA-Z0-9]{22})/;
                                                        const match = spotifyUrl.match(spotifyRegex);

                                                        if (!match) {
                                                            toast.error('❌ Invalid Spotify URL. Please enter a valid Spotify track URL.');
                                                            return;
                                                        }

                                                        const trackId = match[1];
                                                        // Generate Spotify embed URL with compact theme
                                                        const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&view=coverart&show-cover=0`;

                                                        try {
                                                            toast.info('🎵 Setting Spotify cover song...');

                                                            // Prepare Spotify track data
                                                            const spotifyTrackData = {
                                                                id: trackId,
                                                                url: spotifyUrl,
                                                                embedUrl: embedUrl,
                                                                setAt: new Date().toISOString()
                                                            };

                                                            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                                                                spotifyTrackURL: embedUrl,
                                                                spotifyTrackData: spotifyTrackData,
                                                                coverPhotoURL: null, // Remove photo when setting Spotify
                                                                coverVideoURL: null, // Remove YouTube when setting Spotify
                                                                coverVideoType: null,
                                                                updatedAt: new Date().toISOString()
                                                            });

                                                            input.value = '';

                                                            toast.success('✅ Spotify cover song set successfully!');

                                                            // Force immediate refresh
                                                            setTimeout(() => {
                                                                window.location.reload();
                                                            }, 1000);

                                                        } catch (error) {
                                                            console.error('Error setting Spotify cover song:', error);
                                                            toast.error('❌ Failed to set Spotify cover song. Please try again.');
                                                        }
                                                    }}
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                    </svg>
                                                    Set Song
                                                </button>
                                            </div>

                                            <div className="spotify-help-text">
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                                </svg>
                                                Paste any Spotify track URL to set as your profile cover
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}



                            {/* Stylish Remove Cover Media Button */}
                            {(() => {
                                const userRole = loggedInUserProfile?.role?.toLowerCase();
                                const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                                const hasAccess = hasBadge || ['admin', 'owner', 'moderator'].includes(userRole);
                                const hasAnyMedia = loggedInUserProfile?.coverPhotoURL || loggedInUserProfile?.coverVideoURL || loggedInUserProfile?.spotifyTrackURL;

                                if (!hasAccess || !hasAnyMedia) return null;

                                return (
                                    <div style={{ 
                                        marginTop: '24px', 
                                        display: 'flex', 
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}>
                                        <button 
                                            className="stylish-remove-cover-btn"
                                            onClick={async () => {
                                                // Use a custom confirm dialog since window.confirm is blocked
                                                const userConfirmed = await new Promise((resolve) => {
                                                    const confirmDialog = document.createElement('div');
                                                    confirmDialog.style.cssText = `
                                                        position: fixed;
                                                        top: 0;
                                                        left: 0;
                                                        width: 100%;
                                                        height: 100%;
                                                        background: rgba(0, 0, 0, 0.8);
                                                        display: flex;
                                                        align-items: center;
                                                        justify-content: center;
                                                        z-index: 100000;
                                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                    `;
                                                    
                                                    confirmDialog.innerHTML = `
                                                        <div style="
                                                            background: white;
                                                            padding: 30px;
                                                            border-radius: 12px;
                                                            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                                                            max-width: 400px;
                                                            width: 90%;
                                                            text-align: center;
                                                        ">
                                                            <div style="
                                                                font-size: 48px;
                                                                margin-bottom: 16px;
                                                            ">🗑️</div>
                                                            <h3 style="
                                                                margin: 0 0 16px 0;
                                                                color: #1f2937;
                                                                font-size: 18px;
                                                                font-weight: 600;
                                                            ">Remove Cover Media</h3>
                                                            <p style="
                                                                margin: 0 0 24px 0;
                                                                color: #6b7280;
                                                                font-size: 14px;
                                                                line-height: 1.5;
                                                            ">Are you sure you want to permanently remove your cover media? This action cannot be undone.</p>
                                                            <div style="
                                                                display: flex;
                                                                gap: 12px;
                                                                justify-content: center;
                                                            ">
                                                                <button id="cancelBtn" style="
                                                                    background: #f3f4f6;
                                                                    color: #374151;
                                                                    border: none;
                                                                    padding: 10px 20px;
                                                                    border-radius: 8px;
                                                                    font-weight: 500;
                                                                    cursor: pointer;
                                                                ">Cancel</button>
                                                                <button id="confirmBtn" style="
                                                                    background: #ef4444;
                                                                    color: white;
                                                                    border: none;
                                                                    padding: 10px 20px;
                                                                    border-radius: 8px;
                                                                    font-weight: 500;
                                                                    cursor: pointer;
                                                                ">Remove</button>
                                                            </div>
                                                        </div>
                                                    `;
                                                    
                                                    document.body.appendChild(confirmDialog);
                                                    
                                                    const cancelBtn = confirmDialog.querySelector('#cancelBtn');
                                                    const confirmBtn = confirmDialog.querySelector('#confirmBtn');
                                                    
                                                    cancelBtn.onclick = () => {
                                                        document.body.removeChild(confirmDialog);
                                                        resolve(false);
                                                    };
                                                    
                                                    confirmBtn.onclick = () => {
                                                        document.body.removeChild(confirmDialog);
                                                        resolve(true);
                                                    };
                                                    
                                                    confirmDialog.onclick = (e) => {
                                                        if (e.target === confirmDialog) {
                                                            document.body.removeChild(confirmDialog);
                                                            resolve(false);
                                                        }
                                                    };
                                                });

                                                if (userConfirmed) {
                                                    try {
                                                        toast.info('🔄 Removing cover media...');

                                                        // Delete all cover media data from Firebase
                                                        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                                                            coverPhotoURL: null,
                                                            coverVideoURL: null,
                                                            coverVideoType: null,
                                                            spotifyTrackURL: null,
                                                            spotifyTrackData: null,
                                                            updatedAt: new Date().toISOString()
                                                        });

                                                        // Clear from localStorage if exists
                                                        localStorage.removeItem('coverPhotoURL');
                                                        localStorage.removeItem('coverVideoURL');
                                                        localStorage.removeItem('spotifyTrackURL');
                                                        localStorage.removeItem('coverVideoType');
                                                        localStorage.removeItem('spotifyTrackData');

                                                        toast.success('✅ Cover media removed successfully!');

                                                        // Close settings modal
                                                        onClose();

                                                        // Force immediate page reload to reflect changes
                                                        setTimeout(() => {
                                                            window.location.reload();
                                                        }, 500);

                                                    } catch (error) {
                                                        console.error('Error removing cover media:', error);
                                                        toast.error('❌ Failed to remove cover media. Please try again.');
                                                    }
                                                }
                                            }}
                                            title="Remove Cover Media"
                                        >
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="#FFFFFF" stroke="#FFFFFF">
                                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                            </svg>
                                            <span>Remove Cover</span>
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Navigation Section */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                                </svg>
                                NAVIGATION
                            </h4>
                            <div className="modern-button-grid">
                                {!auth.currentUser?.isAnonymous && (
                                <button 
                                    className="modern-nav-btn navigation"
                                    onClick={() => {
                                        try {
                                            setShowEditProfileModal(true);
                                        } catch (error) {
                                            console.error('Modal error:', error);
                                            toast.error('Failed to open Edit Profile modal');
                                        }
                                    }}
                                    title="Edit Profile"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                    <span>EDIT PROFILE</span>
                                </button>
                                )}

                                {!auth.currentUser?.isAnonymous && (
                                <button 
                                    className="modern-nav-btn navigation"
                                    onClick={() => {
                                        try {
                                            setShowChangeUsernameModal(true);
                                        } catch (error) {
                                            console.error('Modal error:', error);
                                        }
                                    }}
                                    title="Change Username"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" opacity="0"/>
                                        <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                                    </svg>
                                    <span>CHANGE USERNAME</span>
                                </button>
                                )}

                                <button 
                                    className="modern-nav-btn navigation"
                                    onClick={() => {
                                        try {
                                            navigate('/rooms');
                                            onClose();
                                            toast.success('🏠 Going to Rooms!');
                                        } catch (error) {
                                            console.error('Navigation error:', error);
                                            toast.error('Failed to navigate to Rooms');
                                        }
                                    }}
                                    title="Rooms"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9 22 9 12 15 12 15 22"/>
                                    </svg>
                                    <span>ROOMS</span>
                                </button>

                                <button 
                                    className="modern-nav-btn navigation"
                                    onClick={() => {
                                        try {
                                            navigate('/welcome');
                                            onClose();
                                            toast.success('🏠 Going to Dashboard!');
                                        } catch (error) {
                                            console.error('Navigation error:', error);
                                            toast.error('Failed to navigate to Dashboard');
                                        }
                                    }}
                                    title="Dashboard"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                                        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                                    </svg>
                                    <span>DASHBOARD</span>
                                </button>

                                <button 
                                    className="modern-nav-btn rectangular feature"
                                    onClick={() => {
                                        try {
                                            if (window.handleViewProfile && typeof window.handleViewProfile === 'function') {
                                                window.handleViewProfile(loggedInUserProfile);
                                                onClose();
                                                toast.success('👤 Profile modal opened!');
                                                return;
                                            }
                                            if (window.setProfileUser && typeof window.setProfileUser === 'function') {
                                                window.setProfileUser(loggedInUserProfile);
                                                onClose();
                                                toast.success('👤 Profile modal opened!');
                                                return;
                                            }
                                            if (onOpenProfile && typeof onOpenProfile === 'function') {
                                                onOpenProfile(loggedInUserProfile);
                                                onClose();
                                                toast.success('👤 Profile modal opened!');
                                                return;
                                            }
                                            console.warn('Profile modal function not found');
                                            toast.info(`👤 ${loggedInUserProfile?.displayName || 'User'} - ${loggedInUserProfile?.role || 'user'} from ${loggedInUserProfile?.country || 'Unknown'}`);
                                        } catch (error) {
                                            console.error('Error opening profile:', error);
                                            toast.error('Failed to open profile modal');
                                        }
                                    }}
                                    title="View Profile"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    <span>VIEW MY PROFILE</span>
                                </button>

                                {(['owner', 'admin'].includes(loggedInUserProfile?.role)) && (
                                    <button 
                                        className="modern-nav-btn admin"
                                        onClick={() => {
                                            try {
                                                navigate('/admin-panel');
                                                onClose();
                                                toast.success('🛡️ Opening Admin Panel!');
                                            } catch (error) {
                                                console.error('Navigation error:', error);
                                                toast.error('Failed to open Admin Panel');
                                            }
                                        }}
                                        title="Admin Panel"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        </svg>
                                        <span>ADMIN PANEL</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Settings Section */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                </svg>
                                QUICK SETTINGS
                            </h4>
                            <div className="modern-quick-settings">
                                <button 
                                    className="modern-quick-btn"
                                    onClick={() => {
                                        handleSettingChange('soundEnabled', !settings.soundEnabled);
                                        toast.success(settings.soundEnabled ? '🔇 Sounds disabled' : '🔊 Sounds enabled');
                                    }}
                                    title={settings.soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        {settings.soundEnabled ? (
                                            <>
                                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                            </>
                                        ) : (
                                            <>
                                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                                <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                                            </>
                                        )}
                                    </svg>
                                    <span>{settings.soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
                                </button>

                                <button 
                                    className="modern-quick-btn"
                                    onClick={() => {
                                        handleSettingChange('compactMode', !settings.compactMode);
                                        toast.success(settings.compactMode ? '📱 Normal view enabled' : '🔥 Compact mode enabled');
                                    }}
                                    title={settings.compactMode ? 'Normal View' : 'Compact View'}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="8" y1="6" x2="21" y2="6"/>
                                        <line x1="8" y1="12" x2="21" y2="12"/>
                                        <line x1="8" y1="18" x2="21" y2="18"/>
                                        <line x1="3" y1="6" x2="3.01" y2="6"/>
                                        <line x1="3" y1="12" x2="3.01" y2="12"/>
                                        <line x1="3" y1="18" x2="3.01" y2="18"/>
                                    </svg>
                                    <span>{settings.compactMode ? 'NORMAL' : 'COMPACT'}</span>
                                </button>

                                <button 
                                    className="modern-quick-btn rectangular"
                                    onClick={() => {
                                        handleSettingChange('autoScrollChat', !settings.autoScrollChat);
                                        toast.success(settings.autoScrollChat ? '📜 Auto-scroll disabled' : '🚀 Auto-scroll enabled');
                                    }}
                                    title={settings.autoScrollChat ? 'Disable Auto Scroll' : 'Enable Auto Scroll'}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2L12 22M2 12l10 10 10-10"/>
                                    </svg>
                                    <span>{settings.autoScrollChat ? 'AUTO SCROLL ON' : 'AUTO SCROLL OFF'}</span>
                                </button>

                                <button 
                                    className="modern-quick-btn"
                                    onClick={() => {
                                        handleSettingChange('showTimestamps', !settings.showTimestamps);
                                        toast.success(settings.showTimestamps ? '🕐 Timestamps hidden' : '⏰ Timestamps shown');
                                    }}
                                    title={settings.showTimestamps ? 'Hide Timestamps' : 'Show Timestamps'}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    <span>{settings.showTimestamps ? 'TIME ON' : 'TIME OFF'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Account Management Section */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3"/>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                                </svg>
                                ACCOUNT MANAGEMENT
                            </h4>
                            <div className="modern-management-buttons">
                                <button 
                                    className="modern-management-btn warning"
                                    onClick={handleClearAllData}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                        <path d="M3 3v5h5"/>
                                    </svg>
                                    <span>RESET SETTINGS</span>
                                </button>

                                <button 
                                    className="modern-management-btn danger"
                                    onClick={handleLogout}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                        <polyline points="16 17 21 12 16 7"/>
                                        <line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                    <span>LOGOUT</span>
                                </button>
                            </div>
                        </div>

                        {/* Warning & Announcement Section (for staff and above) */}
                        {(['owner', 'admin', 'moderator'].includes(loggedInUserProfile?.role)) && (
                            <div className="modern-setting-group">
                                <h4 className="modern-section-title">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                    </svg>
                                    WARNING & ANNOUNCEMENTS
                                </h4>
                                <div className="modern-button-grid">
                                    <button 
                                        className="modern-nav-btn rectangular feature"
                                        onClick={() => {
                                            setShowWarningModal(true);
                                            toast.info('📢 Opening Warning/Announcement Creator');
                                        }}
                                        title="Create Warning or Announcement"
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                        </svg>
                                        <span>CREATE ALERT</span>
                                    </button>

                                    <button 
                                        className="modern-nav-btn admin"
                                        onClick={() => {
                                            setShowWarningManager(true);
                                            toast.info('📊 Opening Alert Manager');
                                        }}
                                        title="Manage Warnings and Announcements"
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="8" y1="6" x2="21" y2="6"/>
                                            <line x1="8" y1="12" x2="21" y2="12"/>
                                            <line x1="8" y1="18" x2="21" y2="18"/>
                                            <line x1="3" y1="6" x2="3.01" y2="6"/>
                                            <line x1="3" y1="12" x2="3.01" y2="12"/>
                                            <line x1="3" y1="18" x2="3.01" y2="18"/>
                                        </svg>
                                        <span>MANAGE ALERTS</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Admin Section (if applicable) */}
                        {(['owner', 'admin', 'moderator'].includes(loggedInUserProfile?.role)) && (
                            <div className="modern-setting-group">
                                <h4 className="modern-section-title admin-title">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    </svg>
                                    ADMIN CONTROLS
                                </h4>
                                <div className="modern-admin-buttons">
                                    {(['owner', 'admin'].includes(loggedInUserProfile?.role)) && (
                                        <button 
                                            className="modern-admin-btn admin"
                                            onClick={() => {
                                                navigate('/admin-panel');
                                                onClose();
                                            }}
                                            title="Admin Panel"
                                        >
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                                <polyline points="9 12 11 14 15 10"/>
                                            </svg>
                                            <span>ADMIN PANEL</span>
                                        </button>
                                    )}

                                    <button 
                                        className="modern-admin-btn danger"
                                        onClick={() => {
                                            const confirmed = window.confirm('⚠️ Are you sure you want to clear the entire chat? This action cannot be undone!');
                                            if (confirmed) {
                                                toast.success('🧹 Chat clearing initiated...');
                                                onClose();
                                            }
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"/>
                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                            <path d="M10 11v6M14 11v6"/>
                                        </svg>
                                        <span>CLEAR CHAT</span>
                                    </button>

                                    <button 
                                        className="modern-admin-btn rectangular admin"
                                        onClick={() => {
                                            const confirmed = window.confirm('⚠️ Are you sure you want to perform advanced admin actions?');
                                            if (confirmed) {
                                                toast.info('🛠️ Advanced admin features coming soon!');
                                                onClose();
                                            }
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="3"/>
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                                        </svg>
                                        <span>ADVANCED ADMIN</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    const applyUsernameStyles = async () => {
        if (!auth.currentUser || !loggedInUserProfile) {
            console.log('❌ No current user or profile, skipping username styling');
            return;
        }

        try {
            // Import the username styling functions
            const { saveUsernameFontPreferences, applyGlobalUsernameStyles } = await import('../utils/usernamePreferences');

            console.log('🎨 SettingsSidebar: Applying USERNAME ONLY styles for:', loggedInUserProfile.displayName);

            // Get current username preferences from settings
            const currentUsernamePrefs = {
                usernameFontSize: settings.usernameFontSize,
                usernameFontColor: settings.usernameFontColor,
                usernameFontFamily: settings.usernameFontFamily,
                usernameIsBold: settings.usernameIsBold,
                usernameIsItalic: settings.usernameIsItalic,
                usernameIsUnderline: settings.usernameIsUnderline,
                usernameIsStrikethrough: settings.usernameIsStrikethrough,
                usernameGradientEnabled: settings.usernameGradientEnabled,
                usernameGradientStart: settings.usernameGradientStart,
                usernameGradientEnd: settings.usernameGradientEnd,
                usernameGradientDirection: settings.usernameGradientDirection,
                usernameTextShadow: settings.usernameTextShadow,
                usernameLetterSpacing: settings.usernameLetterSpacing,
                usernameAnimationEnabled: settings.usernameAnimationEnabled,
                usernameAnimationType: settings.usernameAnimationType,
                usernameAnimationDuration: settings.usernameAnimationDuration,
                usernameOutlineEnabled: settings.usernameOutlineEnabled,
                usernameOutlineColor: settings.usernameOutlineColor,
                usernameOutlineSize: settings.usernameOutlineSize
            };

            // Save username preferences
            await saveUsernameFontPreferences(currentUsernamePrefs);

            // Apply username styles globally
            applyGlobalUsernameStyles();

            // Update preview element
            updatePreviewElement();

            console.log('✅ SettingsSidebar: USERNAME ONLY styles applied - visible to ALL users');

        } catch (error) {
            console.error('❌ Error applying username styles:', error);
        }
    };

    // Update preview element with current settings
    const updatePreviewElement = () => {
        // Wait for DOM to be ready
        requestAnimationFrame(() => {
            const previewElement = document.getElementById('username-preview') || document.querySelector('.username-preview-text');
            if (previewElement) {
                try {
                    console.log('🎨 Updating preview element');

                    // Ensure element is visible
                    previewElement.style.visibility = 'visible';
                    previewElement.style.opacity = '1';
                    previewElement.style.display = 'inline-block';

                    const fontSize = Math.min(parseInt(settings.usernameFontSize) || 12, 16);
                    previewElement.style.setProperty('font-size', `${fontSize + 4}px`, 'important');
                    previewElement.style.setProperty('font-family', settings.usernameFontFamily === 'inherit' ? 'inherit' : settings.usernameFontFamily, 'important');
                    previewElement.style.setProperty('font-weight', settings.usernameIsBold ? 'bold' : 'normal', 'important');
                    previewElement.style.setProperty('font-style', settings.usernameIsItalic ? 'italic' : 'normal', 'important');

                    const decorations = [];
                    if (settings.usernameIsUnderline) decorations.push('underline');
                    if (settings.usernameIsStrikethrough) decorations.push('line-through');
                    previewElement.style.setProperty('text-decoration', decorations.length > 0 ? decorations.join(' ') : 'none', 'important');

                    previewElement.style.setProperty('text-shadow', settings.usernameTextShadow || 'none', 'important');

                    if (settings.usernameOutlineEnabled) {
                        previewElement.style.setProperty('-webkit-text-stroke', `${settings.usernameOutlineSize || '1px'} solid ${settings.usernameOutlineColor || '#000000'}`, 'important');
                    } else {
                        previewElement.style.setProperty('-webkit-text-stroke', 'none', 'important');
                    }

                    previewElement.style.setProperty('letter-spacing', settings.usernameLetterSpacing || '0px', 'important');

                    // Apply color or gradient
                    if (settings.usernameGradientEnabled) {
                        const gradientType = settings.usernameGradientDirection === 'radial' ? 'radial-gradient' : 'linear-gradient';
                        const direction = settings.usernameGradientDirection === 'radial' ? 'circle' : (settings.usernameGradientDirection || 'to right');
                        const gradientBackground = `${gradientType}(${direction}, ${settings.usernameGradientStart || '#ff0000'}, ${settings.usernameGradientEnd || '#0000ff'})`;

                        previewElement.style.setProperty('background', gradientBackground, 'important');
                        previewElement.style.setProperty('-webkit-background-clip', 'text', 'important');
                        previewElement.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
                        previewElement.style.setProperty('background-clip', 'text', 'important');
                    } else {
                        const color = settings.usernameFontColor || '#333333';
                        previewElement.style.setProperty('color', color, 'important');
                        previewElement.style.setProperty('-webkit-text-fill-color', color, 'important');
                        previewElement.style.removeProperty('background');
                        previewElement.style.removeProperty('-webkit-background-clip');
                        previewElement.style.removeProperty('background-clip');
                    }

                    if (settings.usernameAnimationEnabled) {
                        previewElement.style.setProperty('animation', `${settings.usernameAnimationType || 'pulse'} ${settings.usernameAnimationDuration || '2s'} infinite`, 'important');
                    } else {
                        previewElement.style.setProperty('animation', 'none', 'important');
                    }

                    console.log('✅ Preview element updated successfully');

                } catch (error) {
                    console.error('❌ Error updating preview element:', error);
                }
            } else {
                console.warn('⚠️ Preview element not found, will retry on next render');
            }
        });
    };

    // Apply styles when component mounts and whenever settings change
    React.useEffect(() => {
        if (auth.currentUser && loggedInUserProfile) {
            const timeoutId = setTimeout(() => {
                applyUsernameStyles();
                updatePreviewElement();
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [
        auth.currentUser?.uid, 
        loggedInUserProfile?.displayName,
        settings.usernameFontSize,
        settings.usernameFontColor,
        settings.usernameFontFamily,
        settings.usernameIsBold,
        settings.usernameIsItalic,
        settings.usernameIsUnderline,
        settings.usernameIsStrikethrough,
        settings.usernameTextShadow,
        settings.usernameGradientEnabled,
        settings.usernameGradientStart,
        settings.usernameGradientEnd,
        settings.usernameGradientDirection,
        settings.usernameOutlineEnabled,
        settings.usernameOutlineColor,
        settings.usernameOutlineSize,
        settings.usernameLetterSpacing,
        settings.usernameAnimationEnabled,
        settings.usernameAnimationType,
        settings.usernameAnimationDuration
    ]);

    // Also apply on settings open/close to ensure visibility
    React.useEffect(() => {
        if (isOpen && auth.currentUser && loggedInUserProfile) {
            setTimeout(() => {
                applyUsernameStyles();
                updatePreviewElement();
            }, 50);
        }
    }, [isOpen]);

    // Global utility function for professional chat-style username styling
    React.useEffect(() => {
        // Make global styling utility available
        window.applyGlobalUsernameStyles = (userId, userName, userSettings) => {
            // This function applies global styles visible to ALL users (professional chat style)
            if (!userId || !userName || !userSettings) return;

            console.log(`🎨 Applying global styles for user: ${userName} (${userId}) - visible to ALL users`);

            // Check if user has custom styles
            const hasCustomStyles = 
                userSettings.usernameFontSize !== '12px' ||
                userSettings.usernameFontColor !== '#000000' ||
                userSettings.usernameFontFamily !== 'inherit' ||
                userSettings.usernameIsBold ||
                userSettings.usernameIsItalic ||
                userSettings.usernameIsUnderline ||
                userSettings.usernameIsStrikethrough ||
                userSettings.usernameTextShadow !== 'none' ||
                userSettings.usernameGradientEnabled ||
                userSettings.usernameOutlineEnabled ||
                userSettings.usernameLetterSpacing !== '0px' ||
                userSettings.usernameAnimationEnabled;

            if (!hasCustomStyles) {
                // Using default username styles
                // Remove any existing custom styles for this user
                const existingStyle = document.getElementById(`username-styles-${userId}`);
                if (existingStyle) {
                    existingStyle.remove();
                }
                return;
            }

            // Build custom styles for this user - VISIBLE TO ALL
            let customStyles = '';
            const fontSize = Math.min(parseInt(userSettings.usernameFontSize) || 12, 16);
            const fontFamily = userSettings.usernameFontFamily === 'inherit' ? 'inherit' : userSettings.usernameFontFamily;

            customStyles += `font-size: ${fontSize}px !important;\n`;
            customStyles += `font-family: ${fontFamily} !important;\n`;
            customStyles += `font-weight: ${userSettings.usernameIsBold ? 'bold' : 'normal'} !important;\n`;
            customStyles += `font-style: ${userSettings.usernameIsItalic ? 'italic' : 'normal'} !important;\n`;

            const decorations = [];
            if (userSettings.usernameIsUnderline) decorations.push('underline');
            if (userSettings.usernameIsStrikethrough) decorations.push('line-through');
            const textDecoration = decorations.length > 0 ? decorations.join(' ') : 'none';
            customStyles += `text-decoration: ${textDecoration} !important;\n`;

            customStyles += `text-shadow: ${userSettings.usernameTextShadow || 'none'} !important;\n`;

            if (userSettings.usernameOutlineEnabled) {
                customStyles += `-webkit-text-stroke: ${userSettings.usernameOutlineSize || '1px'} solid ${userSettings.usernameOutlineColor || '#000000'} !important;\n`;
            }

            if (userSettings.usernameLetterSpacing) {
                customStyles += `letter-spacing: ${userSettings.usernameLetterSpacing} !important;\n`;
            }

            if (userSettings.usernameGradientEnabled) {
                const gradientType = userSettings.usernameGradientDirection === 'radial' ? 'radial-gradient' : 'linear-gradient';
                const direction = userSettings.usernameGradientDirection === 'radial' ? 'circle' : (userSettings.usernameGradientDirection || 'to right');
                const gradientBackground = `${gradientType}(${direction}, ${userSettings.usernameGradientStart || '#667eea'}, ${userSettings.usernameGradientEnd || '#764ba2'})`;

                customStyles += `background: ${gradientBackground} !important;\n`;
                customStyles += `-webkit-background-clip: text !important;\n`;
                customStyles += `-webkit-text-fill-color: transparent !important;\n`;
                customStyles += `background-clip: text !important;\n`;
            } else {
                const color = userSettings.usernameFontColor || '#000000';
                customStyles += `color: ${color} !important;\n`;
                customStyles += `-webkit-text-fill-color: initial !important;\n`;
            }

            if (userSettings.usernameAnimationEnabled) {
                customStyles += `animation: ${userSettings.usernameAnimationType || 'pulse'} ${userSettings.usernameAnimationDuration || '2s'} infinite !important;\n`;
            }

            // Remove existing style for this user
            const existingGlobalStyle = document.getElementById(`username-styles-${userId}`);
            if (existingGlobalStyle) {
                existingGlobalStyle.remove();
            }

            // Create global style rules for this user - visible to ALL users
            const userStyleRules = `
                /* Professional Chat Style - Global styling for ${userName} - visible to ALL users */
                [data-user-id="${userId}"] .message-displayname,
                [data-user-id="${userId}"] .user-name,
                [data-user-id="${userId}"] .displayname,
                [data-user-id="${userId}"] .username,
                [data-user-id="${userId}"] .profile-name,
                [data-user-id="${userId}"] .modern-profile-name,
                [data-user-id="${userId}"] .sidebar-username,
                [data-user-id="${userId}"] .list-username,
                [data-user-id="${userId}"] .dropdown-username,
                .message-container[data-user-id="${userId}"] .message-displayname,
                .user-item[data-user-id="${userId}"] .user-name,
                .user-item[data-user-id="${userId}"] .displayname,
                .sidebar .user-item[data-user-id="${userId}"] .user-name,
                .sidebar .user-item[data-user-id="${userId}"] .displayname,
                .user-list .user-item[data-user-id="${userId}"] .user-name,
                .user-list .user-item[data-user-id="${userId}"] .displayname {
                    ${customStyles}
                }
            `;

            const styleElement = document.createElement('style');
            styleElement.id = `username-styles-${userId}`;
            styleElement.type = 'text/css';
            styleElement.innerHTML = userStyleRules;
            document.head.appendChild(styleElement);

            // Global username styles applied
        };

        // Make global styling utility available for other components (like message bubbles) to call
        window.saveUsernameFontPreferences = async (prefs) => {
            if (auth.currentUser) {
                try {
                    await saveUsernameFontPreferences(prefs);
                    console.log('Saved username preferences globally');
                } catch (error) {
                    console.error('Error saving global username preferences:', error);
                }
            }
        };

        // Load all users' global styles on mount (professional chat style)
        const loadAllGlobalUsernameStyles = () => {
            // Loading all users global username styles

            try {
                const allGlobalStyles = JSON.parse(localStorage.getItem('allGlobalUsernameStyles') || '{}');

                Object.values(allGlobalStyles).forEach(userStyle => {
                    if (userStyle.userId && userStyle.userName && userStyle.styles) {
                        window.applyGlobalUsernameStyles(
                            userStyle.userId,
                            userStyle.userName,
                            userStyle.styles
                        );
                    }
                });

                // Loaded global username styles
            } catch (error) {
                console.error('Error loading global username styles:', error);
            }
        };

        // Load all global styles when component mounts
        loadAllGlobalUsernameStyles();

        // Also load current user's styles if available
        if (auth.currentUser && loggedInUserProfile) {
            const savedStyles = localStorage.getItem(`globalUsernameStyles_${auth.currentUser.uid}`);
            if (savedStyles) {
                try {
                    const parsedStyles = JSON.parse(savedStyles);
                    if (parsedStyles.styles) {
                        window.applyGlobalUsernameStyles(
                            auth.currentUser.uid,
                            loggedInUserProfile.displayName,
                            parsedStyles.styles
                        );
                    }
                } catch (error) {
                    console.error('Error loading current user global username styles:', error);
                }
            }
        }

        return () => {
            // Cleanup
            if (window.globalStyleObserver) {
                window.globalStyleObserver.disconnect();
            }
        };
    }, [auth.currentUser?.uid, loggedInUserProfile?.displayName]);

    if (!isOpen) return null;

    return (
        <>
            <div className="settings-sidebar-overlay" onClick={onClose} />
            <div className={`settings-sidebar ${isOpen ? 'open' : ''}`}>
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button className="settings-close-btn" onClick={onClose}>
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                        </svg>
                    </button>
                </div>

                <div className="settings-content">
                    <div className="settings-tabs">
                        <button 
                            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActiveTab('general')}
                            title="General"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                                <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
                                <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
                                <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
                            </svg>
                            <span>General</span>
                        </button>

                        <button 
                            className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                            title="Notifications"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                <circle cx="18" cy="5" r="3" fill="#f97316" stroke="none"/>
                            </svg>
                            <span>Alerts</span>
                        </button>

                        <button 
                            className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                            onClick={() => setActiveTab('privacy')}
                            title="Privacy"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <polyline points="9 12 11 14 15 10"/>
                            </svg>
                            <span>Privacy</span>
                        </button>

                        <button 
                            className={`settings-tab ${activeTab === 'blocked' ? 'active' : ''}`}
                            onClick={() => setActiveTab('blocked')}
                            title="Blocked Users"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                            <span>Blocked</span>
                        </button>

                        {(() => {
                            const userRoleForFriends = loggedInUserProfile?.role?.toLowerCase();
                            const hasBadgeForFriends = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                            const hasFriendsAccess = hasBadgeForFriends || ['admin', 'owner', 'moderator'].includes(userRoleForFriends);
                            return (
                                <button 
                                    className={`settings-tab ${activeTab === 'friends' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('friends')}
                                    title="Friends"
                                    style={{ position: 'relative' }}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    <span>Friends</span>
                                    {!hasFriendsAccess && <span style={{position:'absolute',top:'5px',right:'5px',width:'7px',height:'7px',background:'#ef4444',borderRadius:'50%',display:'block',border:'1.5px solid white'}}></span>}
                                </button>
                            );
                        })()}

                        {(() => {
                            const userRole = loggedInUserProfile?.role?.toLowerCase();
                            const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                            const hasAccess = hasBadge || ['admin', 'owner', 'moderator'].includes(userRole);

                            return (
                                <button 
                                    className={`settings-tab ${activeTab === 'username-font' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('username-font')}
                                    title="Username Style"
                                    style={{ position: 'relative' }}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/>
                                        <circle cx="6.5" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
                                        <circle cx="9.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/>
                                        <circle cx="14.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/>
                                        <circle cx="17.5" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
                                    </svg>
                                    <span>Style</span>
                                    {!hasAccess && <span style={{position:'absolute',top:'5px',right:'5px',width:'7px',height:'7px',background:'#ef4444',borderRadius:'50%',display:'block',border:'1.5px solid white'}}></span>}
                                </button>
                            );
                        })()}

                        <button 
                            className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
                            onClick={() => setActiveTab('account')}
                            title="Account"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            <span>Account</span>
                        </button>
                    </div>

                    <div className="settings-body">
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            {/* Status Modal */}
            {showStatusModal && (
                <StatusModal onClose={() => setShowStatusModal(false)} />
            )}

            {/* Edit Profile Modal */}
            {showEditProfileModal && (
                <EditProfileModal
                    isOpen={showEditProfileModal}
                    onClose={() => setShowEditProfileModal(false)}
                    onSuccess={() => {
                        setShowEditProfileModal(false);
                        toast.success('✅ Profile updated successfully!');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }}
                />
            )}

            {/* Change Username Modal */}
            {showChangeUsernameModal && (
                <ChangeUsernameModal
                    isOpen={showChangeUsernameModal}
                    onClose={() => setShowChangeUsernameModal(false)}
                    onSuccess={() => {
                        setShowChangeUsernameModal(false);
                    }}
                />
            )}

            {/* Warning Announcement Modal */}
            {showWarningModal && (
                <WarningAnnouncementModal
                    isVisible={showWarningModal}
                    onClose={() => setShowWarningModal(false)}
                    currentUserProfile={loggedInUserProfile}
                    currentRoomId="settings-sidebar"
                />
            )}

            {/* Warning Announcement Manager */}
            {showWarningManager && (
                <WarningAnnouncementManager
                    isVisible={showWarningManager}
                    onClose={() => setShowWarningManager(false)}
                    currentUserProfile={loggedInUserProfile}
                />
            )}
        </>
    );
};

export default SettingsSidebar;