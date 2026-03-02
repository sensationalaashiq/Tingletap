import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, updateDoc, getDocs, query, collection, where, writeBatch, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import StatusModal from './StatusModal';
import EditProfileModal from './EditProfileModal';
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
    onOpenProfile 
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    const [blockedUserProfiles, setBlockedUserProfiles] = useState([]);
    const [friendsProfiles, setFriendsProfiles] = useState([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
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

    useEffect(() => {
        if (blockedUsers.length === 0) {
            setBlockedUserProfiles([]);
            return;
        }

        const loadBlockedUserProfiles = async () => {
            try {
                const userPromises = blockedUsers.map(uid => getDoc(doc(db, 'users', uid)));
                const userDocs = await Promise.all(userPromises);
                const profiles = userDocs
                    .filter(doc => doc.exists())
                    .map(doc => ({ id: doc.id, ...doc.data() }));
                setBlockedUserProfiles(profiles);
            } catch (error) {
                console.error("Error loading blocked user profiles:", error);
            }
        };

        loadBlockedUserProfiles();
    }, [blockedUsers]);

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

                toast.success(`🚫 Blocked ${friend.displayName}`);
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
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
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

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"/>
                                </svg>
                                THEME SELECTION
                            </h4>

                            <div className="modern-setting-item theme-selector">
                                <div className="modern-setting-info">
                                    <span>App Theme</span>
                                    <small>Choose your preferred visual theme for the application</small>
                                </div>
                                <div className="theme-options">
                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'light' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'light');
                                        }}
                                        title="Light Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"/>
                                        </svg>
                                        <span>Light</span>
                                    </button>

                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'dark' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'dark');
                                        }}
                                        title="Dark Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"/>
                                        </svg>
                                        <span>Dark</span>
                                    </button>

                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'nord' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'nord');
                                        }}
                                        title="Nord Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                                        </svg>
                                        <span>Nord</span>
                                    </button>

                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'tokyo' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'tokyo');
                                        }}
                                        title="Tokyo Night Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M21,10.12H14.22L16.96,7.38C14.23,4.65 9.81,4.65 7.08,7.38C4.35,10.11 4.35,14.53 7.08,17.26C9.81,19.99 14.23,19.99 16.96,17.26C17.73,16.49 18.24,15.58 18.5,14.61L21,12.84C21,15.07 20.21,17.24 18.79,18.95C15.23,23.13 8.77,23.13 5.21,18.95C1.65,14.77 1.65,8.23 5.21,4.05C8.77,-0.13 15.23,-0.13 18.79,4.05C12,8V12.25L16,14.33L15.28,15.54L11,13V8H12.5Z"/>
                                        </svg>
                                        <span>Tokyo</span>
                                    </button>

                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'monokai' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'monokai');
                                        }}
                                        title="Monokai Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6L14,12L12,18L10,12"/>
                                        </svg>
                                        <span>Monokai</span>
                                    </button>

                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'dracula' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'dracula');
                                        }}
                                        title="Dracula Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M12,3L14,6H18L16,8L17,11L12,9L7,11L8,8L6,6H10L12,3M12,10L15,8H21L18,12L19,16L12,14L5,16L6,12L3,8H9L12,10Z"/>
                                        </svg>
                                        <span>Dracula</span>
                                    </button>

                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'cyberpunk' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'cyberpunk');
                                        }}
                                        title="Cyberpunk Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M12,2C17.5,2 22,6.5 22,12C22,17.5 17.5,22 12,22C6.5,22 2,17.5 2,12C2,6.5 6.5,2 12,2M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,6L14,10H18L15,13L16,17L12,15L8,17L9,13L6,10H10L12,6Z"/>
                                        </svg>
                                        <span>Cyber</span>
                                    </button>

                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'ocean' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'ocean');
                                        }}
                                        title="Ocean Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M4,12C4,7.58 7.58,4 12,4C16.42,4 20,7.58 20,12C20,16.42 16.42,20 12,20C7.58,20 4,16.42 4,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M10,16.5L16,12L10,7.5V16.5Z"/>
                                        </svg>
                                        <span>Ocean</span>
                                    </button>

                                    <button 
                                        className={`theme-btn ${settings.selectedTheme === 'sunset' ? 'active' : ''}`}
                                        onClick={() => {
                                            handleSettingChange('selectedTheme', 'sunset');
                                        }}
                                        title="Sunset Theme"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M17,7L12,12L7,7M7,17L12,12L17,17"/>
                                        </svg>
                                        <span>Sunset</span>
                                    </button>
                                </div>
                                <div style={{
                                    marginTop: '12px',
                                    padding: '8px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    color: '#3b82f6',
                                    textAlign: 'center'
                                }}>
                                    Click any theme to apply instantly
                                </div>
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
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
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
                                    <span>Incoming Call Notifications</span>
                                    <small>Sound for incoming voice/video calls</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.incomingCallNotifications}
                                        onChange={(e) => handleSettingChange('incomingCallNotifications', e.target.checked)}
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
                                    <span>Room Entry Notifications</span>
                                    <small>Sound when entering a new room</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.roomEntryNotifications}
                                        onChange={(e) => handleSettingChange('roomEntryNotifications', e.target.checked)}
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

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19Z"/>
                                </svg>
                                DESKTOP NOTIFICATIONS
                            </h4>

                            <div className="modern-setting-item">
                                <div className="modern-setting-info">
                                    <span>Browser Notifications</span>
                                    <small>Show native desktop notifications for new messages</small>
                                </div>
                                <label className="modern-toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.desktopNotifications || false}
                                        onChange={(e) => handleSettingChange('desktopNotifications', e.target.checked)}
                                    />
                                    <span className="modern-toggle-slider"></span>
                                </label>
                            </div>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Popup Notifications</span>
                                    <small>Show in-app popup notifications</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.popupNotifications || false}
                                        onChange={(e) => handleSettingChange('popupNotifications', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Email Notifications</span>
                                    <small>Send important notifications via email</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.emailNotifications || false}
                                        onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                        </div>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12C2,6.5 6.47,2 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
                                </svg>
                                NOTIFICATION TIMING
                            </h4>
                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Do Not Disturb Mode</span>
                                    <small>Mute all notifications temporarily</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.doNotDisturb || false}
                                        onChange={(e) => handleSettingChange('doNotDisturb', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Quiet Hours</span>
                                    <small>Automatically mute notifications during certain hours</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.quietHours || false}
                                        onChange={(e) => handleSettingChange('quietHours', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <div className="setting-item">
                                <div className="setting-info">
                                    <span>Notification Delay</span>
                                    <small>Delay before showing notifications (seconds)</small>
                                </div>
                                <div className="volume-control">
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        value={settings.notificationDelay || 0}
                                        onChange={(e) => handleSettingChange('notificationDelay', parseInt(e.target.value))}
                                        className="volume-slider"
                                    />
                                    <span className="volume-value">{settings.notificationDelay || 0}s</span>
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
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
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
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6V9M14,14H6V12H14V14Z"/>
                                </svg>
                                COMMUNICATION SETTINGS
                            </h4>
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
                                    <span>Allow Private Messages (Legacy)</span>
                                    <small>Basic private message toggle</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.allowPrivateMessages}
                                        onChange={(e) => handleSettingChange('allowPrivateMessages', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

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

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Allow Voice Calls</span>
                                    <small>Allow incoming voice calls</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.allowVoiceCalls || true}
                                        onChange={(e) => handleSettingChange('allowVoiceCalls', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Allow Video Calls</span>
                                    <small>Allow incoming video calls</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.allowVideoCalls || true}
                                        onChange={(e) => handleSettingChange('allowVideoCalls', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                        </div>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/>
                                </svg>
                                DATA & SECURITY
                            </h4>
                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Read Receipts</span>
                                    <small>Show when you've read messages</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.readReceipts || true}
                                        onChange={(e) => handleSettingChange('readReceipts', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Save Chat History</span>
                                    <small>Automatically save chat messages locally</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.saveChatHistory || true}
                                        onChange={(e) => handleSettingChange('saveChatHistory', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Anonymize Analytics</span>
                                    <small>Remove personal data from usage analytics</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.anonymizeAnalytics || false}
                                        onChange={(e) => handleSettingChange('anonymizeAnalytics', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Two-Factor Authentication</span>
                                    <small>Enable 2FA for enhanced security</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.twoFactorAuth || false}
                                        onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                        </div>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L18,9.5L16.59,8.09L11,13.67L7.41,10.09L6,11.5L11,16.5Z"/>
                                </svg>
                                CONTENT FILTERING
                            </h4>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <span>Content Filter Level</span>
                                    <small>Filter inappropriate content</small>
                                </div>
                                <select 
                                    className="privacy-select"
                                    value={settings.contentFilterLevel || 'medium'}
                                    onChange={(e) => handleSettingChange('contentFilterLevel', e.target.value)}
                                >
                                    <option value="off">Off</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="strict">Strict</option>
                                </select>
                            </div>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Block Explicit Content</span>
                                    <small>Automatically hide explicit messages and media</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.blockExplicitContent || false}
                                        onChange={(e) => handleSettingChange('blockExplicitContent', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
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
                                                src={user.photoURL || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=${user.gender?.toLowerCase() === 'female' ? 'female' : 'male'}`}
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
                                            onClick={() => onUnblockUser(user.uid)}
                                        >
                                            Unblock
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'audio':
                return (
                    <div className="settings-tab-content">
                        <h3>Audio Settings</h3>

                        <div className="setting-group">
                            <div className="setting-item">
                                <div className="setting-info">
                                    <span>Microphone Volume</span>
                                    <small>Adjust your microphone input level</small>
                                </div>
                                <div className="volume-control">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={settings.micVolume}
                                        onChange={(e) => handleSettingChange('micVolume', parseInt(e.target.value))}
                                        className="volume-slider"
                                    />
                                    <span className="volume-value">{settings.micVolume}%</span>
                                </div>
                            </div>

                            <div className="setting-item">
                                <div className="setting-info">
                                    <span>Speaker Volume</span>
                                    <small>Adjust your speaker output level</small>
                                </div>
                                <div className="volume-control">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={settings.speakerVolume}
                                        onChange={(e) => handleSettingChange('speakerVolume', parseInt(e.target.value))}
                                        className="volume-slider"
                                    />
                                    <span className="volume-value">{settings.speakerVolume}%</span>
                                </div>
                            </div>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Echo Cancellation</span>
                                    <small>Reduce echo during calls</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.echoCancellation}
                                        onChange={(e) => handleSettingChange('echoCancellation', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>

                            <label className="setting-item">
                                <div className="setting-info">
                                    <span>Noise Suppression</span>
                                    <small>Reduce background noise</small>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.noiseSuppression}
                                        onChange={(e) => handleSettingChange('noiseSuppression', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </label>
                        </div>
                    </div>
                );

            case 'friends':
                return (
                    <div className="settings-tab-content">
                        <h3>Friends Management</h3>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,13C18.67,13 22,14.34 22,17V20H10V17C10,14.34 13.33,13 16,13M8,4C10.21,4 12,5.79 12,8C12,10.21 10.21,12 8,12C5.79,12 4,10.21 4,8C4,5.79 5.79,4 8,4M8,13C10.67,13 14,14.34 14,17V20H2V17C2,14.34 5.33,13 8,13Z"/>
                                </svg>
                                MY FRIENDS ({friendsProfiles.length})
                            </h4>
                            <div className="friends-list">
                                {friendsProfiles.length > 0 ? (
                                    friendsProfiles.map(friend => (
                                        <div key={friend.id} className="friend-item" data-user-id={friend.id}>
                                            <img 
                                                src={friend.photoURL || `https://api.dicebear.com/8.x/adventurer/svg?seed=${friend.id}&sex=${friend.gender?.toLowerCase() === 'female' ? 'female' : 'male'}`}
                                                alt="avatar"
                                                className="friend-avatar"
                                            />
                                            <div className="friend-info">
                                                <p className="friend-name">{friend.displayName}</p>
                                                <p className="friend-status">{friend.role || 'User'}</p>
                                            </div>
                                            <div className="friend-actions">
                                                <button 
                                                    className="friend-action-btn message-btn"
                                                    onClick={() => {
                                                        if (window.handlePrivateMessageFromSidebar) {
                                                            window.handlePrivateMessageFromSidebar(friend);
                                                        }
                                                        onClose();
                                                        toast.success(`💬 Opening chat with ${friend.displayName}`);
                                                    }}
                                                    title="Send Message"
                                                >
                                                    <svg viewBox="0 0 24 24" width="12" height="12">
                                                        <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
                                                    </svg>
                                                </button>
                                                <button 
                                                    className="friend-action-btn remove-btn"
                                                    onClick={() => handleRemoveFriend(friend)}
                                                    title="Remove Friend"
                                                >
                                                    <svg viewBox="0 0 24 24" width="12" height="12">
                                                        <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
                                                    </svg>
                                                </button>
                                                <button 
                                                    className="friend-action-btn block-btn"
                                                    onClick={() => handleBlockFriend(friend)}
                                                    title="Block User"
                                                >
                                                    <svg viewBox="0 0 24 24" width="12" height="12">
                                                        <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V9M12,19C8.13,19 5,15.87 5,12C5,8.13 8.13,5 12,5C15.87,5 19,8.13 19,12C19,15.87 15.87,19 12,19M7.5,12C7.5,15.04 9.96,17.5 13,17.5V6.5C9.96,6.5 7.5,8.96 7.5,12Z"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-friends">
                                        <svg viewBox="0 0 24 24" width="48" height="48" fill="#9ca3af">
                                            <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M6,6H4V4H6V6M10,6H8V4H10V6M6,10H4V8H6V10M10,10H8V8H10V10M6,14H4V12H6V14M10,14H8V12H10V14Z"/>
                                        </svg>
                                        <p>No friends yet</p>
                                        <small>Add friends to see them here</small>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M14,14H19.5L14,19.5V14M12,2A2,2 0 0,1 14,4V6H20A2,2 0 0,1 22,8V19A2,2 0 0,1 20,21H14C12.89,21 12,20.1 12,19V8L6,2H12Z"/>
                                </svg>
                                FRIEND REQUESTS
                            </h4>
                            <div className="friends-section">
                                <p style={{ color: '#6b7280', fontSize: '14px', margin: '10px 0' }}>
                                    Manage incoming and outgoing friend requests
                                </p>
                                <button 
                                    className="action-btn feature"
                                    onClick={() => {
                                        // This would open friend requests modal/section
                                        toast.info('📬 Check your profile modal for friend requests!');
                                        onClose();
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" width="12" height="12">
                                        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.41,10.09L6,11.5L11,16.5Z"/>
                                    </svg>
                                    View Requests
                                </button>
                            </div>
                        </div>

                        <div className="setting-group">
                            <h4>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
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

            case 'username-font':
                // Check access permissions
                const userRole = loggedInUserProfile?.role?.toLowerCase();
                const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                const hasAccess = hasBadge || ['admin', 'owner', 'moderator'].includes(userRole);

                if (!hasAccess) {
                    return (
                        <div className="settings-tab-content">
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '12px',
                                padding: '32px',
                                textAlign: 'center',
                                color: '#dc2626',
                                margin: '20px 0'
                            }}>
                                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ marginBottom: '16px' }}>
                                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/>
                                </svg>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '700' }}>Premium Feature Restricted</h3>
                                <p style={{ margin: '0 0 16px 0', fontSize: '16px', lineHeight: '1.5', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                                    Username Font customization is a premium feature restricted to <strong>Badge Holders</strong>, <strong>Admins</strong>, <strong>Owners</strong>, and <strong>Moderators</strong> only.
                                </p>
                                <p style={{ margin: '0 0 24px 0', fontSize: '14px', opacity: '0.8' }}>
                                    This feature allows users to customize their username appearance with fonts, colors, gradients, animations, and effects that are visible to ALL users in the chat.
                                </p>
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginTop: '20px'
                                }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>🎨 Premium Features Include:</h4>
                                    <ul style={{ 
                                        textAlign: 'left', 
                                        margin: '0', 
                                        padding: '0 0 0 20px',
                                        fontSize: '14px',
                                        lineHeight: '1.6'
                                    }}>
                                        <li>Custom font families & sizes</li>
                                        <li>Gradient text effects</li>
                                        <li>Text shadows & outlines</li>
                                        <li>Animation effects</li>
                                        <li>Real-time preview</li>
                                        <li>Visible to ALL users</li>
                                    </ul>
                                </div>
                                <p style={{ margin: '20px 0 0 0', fontSize: '12px', fontStyle: 'italic' }}>
                                    Contact an admin to get access to premium features or earn a badge through community participation.
                                </p>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="settings-tab-content username-font-tab">
                        <div className="username-tab-header">
                            <h3>
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                    <path d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.5,17.5H14V19H10V17.5H10.5C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z"/>
                                </svg>
                                Username Style Studio
                            </h3>
                            <p className="tab-description">Customize your username appearance - Your style will be visible to ALL users in the chat</p>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '8px',
                                padding: '12px',
                                fontSize: '12px',
                                color: '#22c55e',
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                                </svg>
                                <span><strong>Professional Chat Style:</strong> Your custom username style will be visible to ALL users in the chat - just like Discord, Slack, and other professional chat applications!</span>
                            </div>
                        </div>

                        {/* Live Preview Section - Always visible at top */}
                        <div className="stylish-setting-group preview-group">
                            <div className="group-header">
                                <div className="group-icon">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M12,18.5A6.5,6.5 0 0,1 5.5,12A6.5,6.5 0 0,1 12,5.5A6.5,6.5 0 0,1 18.5,12A6.5,6.5 0 0,1 12,18.5M12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16Z"/>
                                    </svg>
                                </div>
                                <h4>LIVE PREVIEW</h4>
                            </div>
                            <div className="enhanced-username-preview">
                                <div className="preview-stage">
                                    <div className="username-preview-text" id="username-preview">
                                        {loggedInUserProfile?.displayName || 'YourUsername'}
                                    </div>
                                </div>
                                <div className="preview-info">
                                    <span className="live-indicator">●</span>
                                    <span>Real-time preview of your username styling</span>
                                </div>
                            </div>
                        </div>

                        {/* Basic Typography */}
                        <div className="stylish-setting-group">
                            <div className="group-header">
                                <div className="group-icon">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.5,17.5H14V19H10V17.5H10.5C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z"/>
                                    </svg>
                                </div>
                                <h4>BASIC TYPOGRAPHY</h4>
                            </div>

                            <div className="stylish-setting-item">
                                <div className="setting-label">
                                    <span>Font Size</span>
                                    <small>Adjust the size of usernames (8-16px)</small>
                                </div>
                                <div className="stylish-select-wrapper">
                                    <select
                                        className="stylish-select"
                                        value={settings.usernameFontSize}
                                        onChange={(e) => {
                                            handleSettingChange('usernameFontSize', e.target.value);
                                            updatePreviewElement();
                                        }}
                                    >
                                        <option value="8px">Tiny (8px)</option>
                                        <option value="9px">Extra Small (9px)</option>
                                        <option value="10px">Small (10px)</option>
                                        <option value="11px">Medium Small (11px)</option>
                                        <option value="12px">Normal (12px)</option>
                                        <option value="13px">Medium (13px)</option>
                                        <option value="14px">Large (14px)</option>
                                        <option value="15px">Extra Large (15px)</option>
                                        <option value="16px">Maximum (16px)</option>
                                    </select>
                                    <div className="select-arrow">
                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                            <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="stylish-setting-item">
                                <div className="setting-label">
                                    <span>Font Family</span>
                                    <small>Choose the typeface for usernames</small>
                                </div>
                                <div className="stylish-select-wrapper">
                                    <select
                                        className="stylish-select font-family-select"
                                        value={settings.usernameFontFamily}
                                        onChange={(e) => {
                                            handleSettingChange('usernameFontFamily', e.target.value);
                                            updatePreviewElement();
                                        }}
                                    >
                                        <option value="inherit" style={{fontFamily: 'inherit'}}>Default Font</option>
                                        <option value="Georgia" style={{fontFamily: 'Georgia'}}>Georgia</option>
                                        <option value="Great Vibes" style={{fontFamily: 'Great Vibes'}}>Great Vibes</option>
                                        <option value="Dancing Script" style={{fontFamily: 'Dancing Script'}}>Dancing Script</option>
                                        <option value="Allura" style={{fontFamily: 'Allura'}}>Allura</option>
                                        <option value="Pacifico" style={{fontFamily: 'Pacifico'}}>Pacifico</option>
                                        <option value="Satisfy" style={{fontFamily: 'Satisfy'}}>Satisfy</option>
                                        <option value="Courgette" style={{fontFamily: 'Courgette'}}>Courgette</option>
                                        <option value="Mr De Haviland" style={{fontFamily: 'Mr De Haviland'}}>Mr De Haviland</option>
                                        <option value="Lobster" style={{fontFamily: 'Lobster'}}>Lobster</option>
                                        <option value="Kaushan Script" style={{fontFamily: 'Kaushan Script'}}>Kaushan Script</option>
                                        <option value="Amatic SC" style={{fontFamily: 'Amatic SC'}}>Amatic SC</option>
                                        <option value="Caveat" style={{fontFamily: 'Caveat'}}>Caveat</option>
                                        <option value="Indie Flower" style={{fontFamily: 'Indie Flower'}}>Indie Flower</option>
                                        <option value="Permanent Marker" style={{fontFamily: 'Permanent Marker'}}>Permanent Marker</option>
                                        <option value="Sacramento" style={{fontFamily: 'Sacramento'}}>Sacramento</option>
                                        <option value="Shadows Into Light" style={{fontFamily: 'Shadows Into Light'}}>Shadows Into Light</option>
                                        <option value="Source Sans Pro" style={{fontFamily: 'Source Sans Pro'}}>Source Sans Pro</option>
                                        <option value="Raleway" style={{fontFamily: 'Raleway'}}>Raleway</option>
                                        <option value="Merriweather" style={{fontFamily: 'Merriweather'}}>Merriweather</option>
                                        <option value="Nunito" style={{fontFamily: 'Nunito'}}>Nunito</option>
                                        <option value="Ubuntu" style={{fontFamily: 'Ubuntu'}}>Ubuntu</option>
                                        <option value="Cabin" style={{fontFamily: 'Cabin'}}>Cabin</option>
                                        <option value="Crimson Text" style={{fontFamily: 'Crimson Text'}}>Crimson Text</option>
                                    </select>
                                    <div className="select-arrow">
                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                            <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="stylish-setting-item">
                                <div className="setting-label">
                                    <span>Letter Spacing</span>
                                    <small>Adjust spacing between characters</small>
                                </div>
                                <div className="stylish-select-wrapper">
                                    <select
                                        className="stylish-select"
                                        value={settings.usernameLetterSpacing}
                                        onChange={(e) => {
                                            handleSettingChange('usernameLetterSpacing', e.target.value);
                                            setTimeout(applyUsernameStyles, 50);
                                        }}
                                    >
                                        <option value="-1px">Very Condensed</option>
                                        <option value="-0.5px">Condensed</option>
                                        <option value="0px">Normal</option>
                                        <option value="0.5px">Slightly Wide</option>
                                        <option value="1px">Wide</option>
                                        <option value="1.5px">Wider</option>
                                        <option value="2px">Widest</option>
                                        <option value="3px">Extra Wide</option>
                                    </select>
                                    <div className="select-arrow">
                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                            <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Font Style Toggles */}
                            <div className="font-style-grid">
                                <div className="style-toggle-item">
                                    <label className="stylish-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.usernameIsBold}
                                            onChange={(e) => {
                                                handleSettingChange('usernameIsBold', e.target.checked);
                                                setTimeout(applyUsernameStyles, 50);
                                            }}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">Bold</span>
                                    </label>
                                </div>

                                <div className="style-toggle-item">
                                    <label className="stylish-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.usernameIsItalic}
                                            onChange={(e) => {
                                                handleSettingChange('usernameIsItalic', e.target.checked);
                                                setTimeout(applyUsernameStyles, 50);
                                            }}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">Italic</span>
                                    </label>
                                </div>

                                <div className="style-toggle-item">
                                    <label className="stylish-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.usernameIsUnderline}
                                            onChange={(e) => {
                                                handleSettingChange('usernameIsUnderline', e.target.checked);
                                                setTimeout(applyUsernameStyles, 50);
                                            }}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">Underline</span>
                                    </label>
                                </div>

                                <div className="style-toggle-item">
                                    <label className="stylish-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.usernameIsStrikethrough}
                                            onChange={(e) => {
                                                handleSettingChange('usernameIsStrikethrough', e.target.checked);
                                                setTimeout(applyUsernameStyles, 50);
                                            }}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">Strikethrough</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Color & Gradient Effects */}
                        <div className="stylish-setting-group">
                            <div className="group-header">
                                <div className="group-icon gradient-icon">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                                    </svg>
                                </div>
                                <h4>COLOR & GRADIENTS</h4>
                            </div>

                            <div className="color-mode-toggle">
                                <div className="mode-option" onClick={() => {
                                    handleSettingChange('usernameGradientEnabled', false);
                                    setTimeout(applyUsernameStyles, 50);
                                }}>
                                    <div className={`mode-selector ${!settings.usernameGradientEnabled ? 'active' : ''}`}>
                                        <svg viewBox="0 0 24 24" width="18" height="18">
                                            <path d="M12,18.5A6.5,6.5 0 0,1 5.5,12A6.5,6.5 0 0,1 12,5.5A6.5,6.5 0 0,1 18.5,12A6.5,6.5 0 0,1 12,18.5M12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16Z"/>
                                        </svg>
                                    </div>
                                    <span>Solid Color</span>
                                </div>
                                <div className="mode-option" onClick={() => {
                                    handleSettingChange('usernameGradientEnabled', true);
                                    setTimeout(applyUsernameStyles, 50);
                                }}>
                                    <div className={`mode-selector ${settings.usernameGradientEnabled ? 'active' : ''}`}>
                                        <svg viewBox="0 0 24 24" width="18" height="18">
                                            <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                                        </svg>
                                    </div>
                                    <span>Gradient</span>
                                </div>
                            </div>

                            {!settings.usernameGradientEnabled ? (
                                <div className="color-picker-section">
                                    <div className="stylish-setting-item">
                                        <div className="setting-label">
                                            <span>Text Color</span>
                                            <small>Choose a solid color for usernames</small>
                                        </div>
                                        <div className="stylish-color-picker">
                                            <input
                                                type="color"
                                                value={settings.usernameFontColor}
                                                onChange={(e) => {
                                                    handleSettingChange('usernameFontColor', e.target.value);
                                                    setTimeout(applyUsernameStyles, 50);
                                                }}
                                                className="color-input"
                                            />
                                            <div className="color-preview" style={{backgroundColor: settings.usernameFontColor}}></div>
                                            <span className="color-code">{settings.usernameFontColor}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="gradient-section">
                                    <div className="gradient-colors">
                                        <div className="stylish-setting-item">
                                            <div className="setting-label">
                                                <span>Start Color</span>
                                                <small>First color in the gradient</small>
                                            </div>
                                            <div className="stylish-color-picker">
                                                <input
                                                    type="color"
                                                    value={settings.usernameGradientStart}
                                                    onChange={(e) => {
                                                        handleSettingChange('usernameGradientStart', e.target.value);
                                                        setTimeout(applyUsernameStyles, 50);
                                                    }}
                                                    className="color-input"
                                                />
                                                <div className="color-preview" style={{backgroundColor: settings.usernameGradientStart}}></div>
                                                <span className="color-code">{settings.usernameGradientStart}</span>
                                            </div>
                                        </div>

                                        <div className="stylish-setting-item">
                                            <div className="setting-label">
                                                <span>End Color</span>
                                                <small>Second color in the gradient</small>
                                            </div>
                                            <div className="stylish-color-picker">
                                                <input
                                                    type="color"
                                                    value={settings.usernameGradientEnd}
                                                    onChange={(e) => {
                                                        handleSettingChange('usernameGradientEnd', e.target.value);
                                                        setTimeout(applyUsernameStyles, 50);
                                                    }}
                                                    className="color-input"
                                                />
                                                <div className="color-preview" style={{backgroundColor: settings.usernameGradientEnd}}></div>
                                                <span className="color-code">{settings.usernameGradientEnd}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="stylish-setting-item">
                                        <div className="setting-label">
                                            <span>Gradient Direction</span>
                                            <small>Direction of the gradient effect</small>
                                        </div>
                                        <div className="gradient-direction-grid">
                                            {[
                                                {value: 'to right', label: '→', desc: 'Left to Right'},
                                                {value: 'to left', label: '←', desc: 'Right to Left'},
                                                {value: 'to bottom', label: '↓', desc: 'Top to Bottom'},
                                                {value: 'to top', label: '↑', desc: 'Bottom to Top'},
                                                {value: '45deg', label: '↗', desc: 'Diagonal NE'},
                                                {value: '135deg', label: '↘', desc: 'Diagonal SE'},
                                                {value: '225deg', label: '↙', desc: 'Diagonal SW'},
                                                {value: '315deg', label: '↖', desc: 'Diagonal NW'},
                                                {value: 'radial', label: '●', desc: 'Radial'}
                                            ].map((dir) => (
                                                <button
                                                    key={dir.value}
                                                    className={`gradient-direction-btn ${settings.usernameGradientDirection === dir.value ? 'active' : ''}`}
                                                    onClick={() => {
                                                        handleSettingChange('usernameGradientDirection', dir.value);
                                                        setTimeout(applyUsernameStyles, 50);
                                                    }}
                                                    title={dir.desc}
                                                >
                                                    <span className="direction-arrow">{dir.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Effects & Enhancements */}
                        <div className="stylish-setting-group">
                            <div className="group-header">
                                <div className="group-icon">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/>
                                    </svg>
                                </div>
                                <h4>EFFECTS & ENHANCEMENTS</h4>
                            </div>

                            <div className="stylish-setting-item">
                                <div className="setting-label">
                                    <span>Text Shadow</span>
                                    <small>Add shadow effects to usernames</small>
                                </div>
                                <div className="shadow-presets">
                                    {[
                                        {value: 'none', label: 'None', preview: 'Text'},
                                        {value: '1px 1px 2px rgba(0,0,0,0.3)', label: 'Soft', preview: 'Text'},
                                        {value: '2px 2px 4px rgba(0,0,0,0.5)', label: 'Medium', preview: 'Text'},
                                        {value: '3px 3px 6px rgba(0,0,0,0.7)', label: 'Strong', preview: 'Text'},
                                        {value: '0 0 8px rgba(255,255,255,0.8)', label: 'White Glow', preview: 'Text'},
                                        {value: '0 0 10px rgba(0,255,255,0.8)', label: 'Cyan Glow', preview: 'Text'},
                                        {value: '0 0 10px rgba(255,0,255,0.8)', label: 'Magenta Glow', preview: 'Text'},
                                        {value: '0 0 10px rgba(255,215,0,0.8)', label: 'Gold Glow', preview: 'Text'},
                                        {value: '2px 2px 0px #000, 4px 4px 0px #333', label: '3D Effect', preview: 'Text'},
                                    ].map((shadow) => (
                                        <button
                                            key={shadow.value}
                                            className={`shadow-preset-btn ${settings.usernameTextShadow === shadow.value ? 'active' : ''}`}
                                            onClick={() => {
                                                handleSettingChange('usernameTextShadow', shadow.value);
                                                setTimeout(applyUsernameStyles, 50);
                                            }}
                                            title={shadow.label}
                                        >
                                            <span className="shadow-preview" style={{textShadow: shadow.value === 'none' ? 'none' : shadow.value}}>
                                                {shadow.preview}
                                            </span>
                                            <span className="shadow-label">{shadow.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Text Outline */}
                            <div className="stylish-setting-item">
                                <div className="setting-label">
                                    <span>Text Outline</span>
                                    <small>Add outline border around text</small>
                                </div>
                                <div className="outline-controls">
                                    <label className="outline-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.usernameOutlineEnabled}
                                            onChange={(e) => {
                                                handleSettingChange('usernameOutlineEnabled', e.target.checked);
                                                setTimeout(applyUsernameStyles, 50);
                                            }}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-label">Enable Outline</span>
                                    </label>

                                    {settings.usernameOutlineEnabled && (
                                        <div className="outline-settings">
                                            <div className="stylish-color-picker compact">
                                                <input
                                                    type="color"
                                                    value={settings.usernameOutlineColor}
                                                    onChange={(e) => {
                                                        handleSettingChange('usernameOutlineColor', e.target.value);
                                                        setTimeout(applyUsernameStyles, 50);
                                                    }}
                                                    className="color-input"
                                                />
                                                <div className="color-preview" style={{backgroundColor: settings.usernameOutlineColor}}></div>
                                            </div>

                                            <div className="stylish-select-wrapper compact">
                                                <select
                                                    className="stylish-select"
                                                    value={settings.usernameOutlineSize}
                                                    onChange={(e) => {
                                                        handleSettingChange('usernameOutlineSize', e.target.value);
                                                        setTimeout(applyUsernameStyles, 50);
                                                    }}
                                                >
                                                    <option value="0.5px">Thin</option>
                                                    <option value="1px">Normal</option>
                                                    <option value="1.5px">Medium</option>
                                                    <option value="2px">Thick</option>
                                                    <option value="2.5px">Very Thick</option>
                                                </select>
                                                <div className="select-arrow">
                                                    <svg viewBox="0 0 24 24" width="14" height="14">
                                                        <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Animation Effects */}
                        <div className="stylish-setting-group">
                            <div className="group-header">
                                <div className="group-icon animation-icon">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16Z"/>
                                    </svg>
                                </div>
                                <h4>ANIMATION EFFECTS</h4>
                            </div>

                            <div className="stylish-setting-item">
                                <div className="setting-label">
                                    <span>Enable Animation</span>
                                    <small>Add motion effects to usernames</small>
                                </div>
                                <label className="stylish-main-toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.usernameAnimationEnabled}
                                        onChange={(e) => {
                                            handleSettingChange('usernameAnimationEnabled', e.target.checked);
                                            setTimeout(applyUsernameStyles, 50);
                                        }}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            {settings.usernameAnimationEnabled && (
                                <>
                                    <div className="animation-presets">
                                        {[
                                            {value: 'pulse', label: 'Pulse', desc: 'Gentle pulsing effect'},
                                            {value: 'bounce', label: 'Bounce', desc: 'Bouncing motion'},
                                            {value: 'shake', label: 'Shake', desc: 'Subtle shaking'},
                                            {value: 'glow', label: 'Glow', desc: 'Glowing effect'},
                                            {value: 'fadeInOut', label: 'Fade', desc: 'Fade in and out'},
                                            {value: 'rainbow', label: 'Rainbow', desc: 'Color cycling'}
                                        ].map((anim) => (
                                            <button
                                                key={anim.value}
                                                className={`animation-preset-btn ${settings.usernameAnimationType === anim.value ? 'active' : ''}`}
                                                onClick={() => {
                                                    handleSettingChange('usernameAnimationType', anim.value);
                                                    setTimeout(applyUsernameStyles, 50);
                                                }}
                                                title={anim.desc}
                                            >
                                                <span className={`animation-preview ${anim.value}`}>Aa</span>
                                                <span className="animation-label">{anim.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="stylish-setting-item">
                                        <div className="setting-label">
                                            <span>Animation Speed</span>
                                            <small>Control the speed of animation</small>
                                        </div>
                                        <div className="speed-selector">
                                            {[
                                                {value: '0.5s', label: 'Very Fast'},
                                                {value: '1s', label: 'Fast'},
                                                {value: '1.5s', label: 'Normal'},
                                                {value: '2s', label: 'Slow'},
                                                {value: '3s', label: 'Very Slow'}
                                            ].map((speed) => (
                                                <button
                                                    key={speed.value}
                                                    className={`speed-btn ${settings.usernameAnimationDuration === speed.value ? 'active' : ''}`}
                                                    onClick={() => {
                                                        handleSettingChange('usernameAnimationDuration', speed.value);
                                                        setTimeout(applyUsernameStyles, 50);
                                                    }}
                                                >
                                                    {speed.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Quick Presets */}
                        <div className="stylish-setting-group">
                            <div className="group-header">
                                <div className="group-icon">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                                    </svg>
                                </div>
                                <h4>QUICK PRESETS</h4>
                            </div>

                            <div className="preset-buttons">
                                <button 
                                    className="preset-btn classic"
                                    onClick={() => {
                                        const preset = {
                                            usernameFontSize: '12px',
                                            usernameFontColor: '#000000',
                                            usernameFontFamily: 'inherit',
                                            usernameIsBold: false,
                                            usernameIsItalic: false,
                                            usernameIsUnderline: false,
                                            usernameIsStrikethrough: false,
                                            usernameGradientEnabled: false,
                                            usernameTextShadow: 'none',
                                            usernameOutlineEnabled: false,
                                            usernameAnimationEnabled: false,
                                            usernameLetterSpacing: '0px'
                                        };
                                        Object.entries(preset).forEach(([key, value]) => {
                                            handleSettingChange(key, value);
                                        });
                                        setTimeout(applyUsernameStyles, 100);
                                    }}
                                >
                                    <span className="preset-preview" style={{fontFamily: 'inherit', fontSize: '12px'}}>Classic</span>
                                    <span className="preset-name">Default</span>
                                </button>

                                <button 
                                    className="preset-btn modern"
                                    onClick={() => {
                                        const preset = {
                                            usernameFontSize: '14px',
                                            usernameFontFamily: 'Roboto',
                                            usernameIsBold: true,
                                            usernameGradientEnabled: true,
                                            usernameGradientStart: '#667eea',
                                            usernameGradientEnd: '#764ba2',
                                            usernameGradientDirection: 'to right',
                                            usernameTextShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                                            usernameLetterSpacing: '0.5px'
                                        };
                                        Object.entries(preset).forEach(([key, value]) => {
                                            handleSettingChange(key, value);
                                        });
                                        setTimeout(applyUsernameStyles, 100);
                                    }}
                                >
                                    <span className="preset-preview" style={{
                                        fontFamily: 'Roboto', 
                                        fontSize: '12px', 
                                        fontWeight: 'bold',
                                        background: 'linear-gradient(to right, #667eea, #764ba2)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        letterSpacing: '0.5px'
                                    }}>Modern</span>
                                    <span className="preset-name">Gradient</span>
                                </button>

                                <button 
                                    className="preset-btn gaming"
                                    onClick={() => {
                                        const preset = {
                                            usernameFontSize: '15px',
                                            usernameFontFamily: 'Impact',
                                            usernameIsBold: true,
                                            usernameGradientEnabled: true,
                                            usernameGradientStart: '#ff0000',
                                            usernameGradientEnd: '#ff8c00',
                                            usernameGradientDirection: '45deg',
                                            usernameTextShadow: '0 0 10px rgba(255,0,0,0.8)',
                                            usernameOutlineEnabled: true,
                                            usernameOutlineColor: '#000000',
                                            usernameOutlineSize: '2px',
                                            usernameAnimationEnabled: true,
                                            usernameAnimationType: 'glow',
                                            usernameAnimationDuration: '2s'
                                        };
                                        Object.entries(preset).forEach(([key, value]) => {
                                            handleSettingChange(key, value);
                                        });
                                        setTimeout(applyUsernameStyles, 100);
                                    }}
                                >
                                    <span className="preset-preview gaming-style">Gaming</span>
                                    <span className="preset-name">Gaming</span>
                                </button>

                                <button 
                                    className="preset-btn elegant"
                                    onClick={() => {
                                        const preset = {
                                            usernameFontSize: '13px',
                                            usernameFontFamily: 'Georgia',
                                            usernameIsItalic: true,
                                            usernameGradientEnabled: true,
                                            usernameGradientStart: '#667eea',
                                            usernameGradientEnd: '#f093fb',
                                            usernameGradientDirection: 'to bottom',
                                            usernameTextShadow: '1px 1px 3px rgba(0,0,0,0.2)',
                                            usernameLetterSpacing: '1px'
                                        };
                                        Object.entries(preset).forEach(([key, value]) => {
                                            handleSettingChange(key, value);
                                        });
                                        setTimeout(applyUsernameStyles, 100);
                                    }}
                                >
                                    <span className="preset-preview" style={{
                                        fontFamily: 'Georgia', 
                                        fontSize: '12px', 
                                        fontStyle: 'italic',
                                        background: 'linear-gradient(to bottom, #667eea, #f093fb)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        letterSpacing: '1px'
                                    }}>Elegant</span>
                                    <span className="preset-name">Elegant</span>
                                </button>
                            </div>
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
                                        src={loggedInUserProfile?.photoURL || `https://api.dicebear.com/8.x/adventurer/svg?seed=${auth.currentUser?.uid}&sex=${loggedInUserProfile?.gender?.toLowerCase() === 'female' ? 'female' : 'male'}`}
                                        alt="avatar"
                                        className="modern-account-avatar"
                                    />
                                    <div className="modern-status-indicator"></div>
                                </div>
                                <div className="modern-profile-info">
                                    <h4 className="modern-profile-name">{loggedInUserProfile?.displayName || 'Anonymous'}</h4>
                                    <p className="modern-profile-email">{auth.currentUser?.email}</p>
                                    <span className="modern-role-badge" data-role={loggedInUserProfile?.role || 'user'}>
                                        {loggedInUserProfile?.role || 'user'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Management Section */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z"/>
                                </svg>
                                STATUS MANAGEMENT
                            </h4>

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
                                            onClick={() => {
                                                setShowStatusModal(true);
                                            }}
                                            title="Change Status"
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z"/>
                                            </svg>
                                            <span>CHANGE STATUS</span>
                                        </button>
                                    ) : (
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
                                                Status customization is restricted to Badge Holders, Admins, Owners, and Moderators only.
                                            </p>
                                            <p style={{ margin: '0', fontSize: '12px', opacity: '0.8' }}>
                                                Contact an admin to get access to this feature.
                                            </p>
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
                                                    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                                                        status: '',
                                                        updatedAt: new Date().toISOString()
                                                    });
                                                    toast.success('✅ Status cleared successfully!');
                                                } catch (error) {
                                                    console.error('Error clearing status:', error);
                                                    toast.error('❌ Failed to clear status.');
                                                }
                                            }
                                        }}
                                        title="Clear Status"
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                        </svg>
                                        <span>CLEAR STATUS</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Cover Media Section */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
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
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M16,10V12H13V16H11V12H8V10H11V7H13V10H16Z"/>
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
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,2L13.09,8.26L22,9L14.74,14.74L16.18,22.91L12,18.18L7.82,22.91L9.26,14.74L2,9L10.91,8.26L12,2Z"/>
                                </svg>
                               NAVIGATION
                            </h4>
                            <div className="modern-button-grid">
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
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                    </svg>
                                    <span>EDIT PROFILE</span>
                                </button>

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
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
                                    </svg>
                                    <span>ROOMS</span>
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
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                    </svg>
                                    <span>VIEW PROFILE</span>
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
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                                        </svg>
                                        <span>ADMIN PANEL</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Settings Section */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
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
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        {settings.soundEnabled ? (
                                            <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
                                        ) : (
                                            <path d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"/>
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
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3,3H21V9H19V5H5V19H19V15H21V21H3V3M16,11H21L18,8L16,11M21,13H16L18,16L21,13Z"/>
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
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
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
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                                    </svg>
                                    <span>{settings.showTimestamps ? 'TIME ON' : 'TIME OFF'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Account Management Section */}
                        <div className="modern-setting-group">
                            <h4 className="modern-section-title">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                                </svg>
                                ACCOUNT MANAGEMENT
                            </h4>
                            <div className="modern-management-buttons">
                                <button 
                                    className="modern-management-btn warning"
                                    onClick={handleClearAllData}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z"/>
                                    </svg>
                                    <span>RESET SETTINGS</span>
                                </button>

                                <button 
                                    className="modern-management-btn danger"
                                    onClick={handleLogout}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
                                    </svg>
                                    <span>LOGOUT</span>
                                </button>
                            </div>
                        </div>

                        {/* Warning & Announcement Section (for staff and above) */}
                        {(['owner', 'admin', 'moderator'].includes(loggedInUserProfile?.role)) && (
                            <div className="modern-setting-group">
                                <h4 className="modern-section-title">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M12,2L13,7H20L15,10L17,15L12,12L7,15L9,10L4,7H11L12,2M12,6L10.5,9.5L7,9.5L9.75,11.5L8.5,15L12,13L15.5,15L14.25,11.5L17,9.5L13.5,9.5L12,6Z"/>
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
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
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
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H19M5,7V19H19V7H5M7,9H9V11H7V9M11,9H17V11H11V9M7,13H9V15H7V13M11,13H17V15H11V13M7,17H9V19H7V17M11,17H17V19H11V17Z"/>
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
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
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
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
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
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
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
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
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
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                            </svg>
                            General
                        </button>

                        <button 
                            className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path d="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21"/>
                            </svg>
                            Notifications
                        </button>

                        <button 
                            className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                            onClick={() => setActiveTab('privacy')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/>
                            </svg>
                            Privacy
                        </button>

                        <button 
                            className={`settings-tab ${activeTab === 'blocked' ? 'active' : ''}`}
                            onClick={() => setActiveTab('blocked')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V9M12,19C8.13,19 5,15.87 5,12C5,8.13 8.13,5 12,5C15.87,5 19,8.13 19,12C19,15.87 15.87,19 12,19M7.5,12C7.5,15.04 9.96,17.5 13,17.5V6.5C9.96,6.5 7.5,8.96 7.5,12Z"/>
                            </svg>
                            Blocked Users
                        </button>

                        <button 
                            className={`settings-tab ${activeTab === 'audio' ? 'active' : ''}`}
                            onClick={() => setActiveTab('audio')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                            </svg>
                            Audio
                        </button>

                        <button 
                            className={`settings-tab ${activeTab === 'friends' ? 'active' : ''}`}
                            onClick={() => setActiveTab('friends')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,13C18.67,13 22,14.34 22,17V20H10V17C10,14.34 13.33,13 16,13M8,4C10.21,4 12,5.79 12,8C12,10.21 10.21,12 8,12C5.79,12 4,10.21 4,8C4,5.79 5.79,4 8,4M8,13C10.67,13 14,14.34 14,17V20H2V17C2,14.34 5.33,13 8,13Z"/>
                            </svg>
                            Friends
                        </button>

                        {(() => {
                            const userRole = loggedInUserProfile?.role?.toLowerCase();
                            const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                            const hasAccess = hasBadge || ['admin', 'owner', 'moderator'].includes(userRole);

                            if (!hasAccess) return null;

                            return (
                                <button 
                                    className={`settings-tab ${activeTab === 'username-font' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('username-font')}
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18">
                                        <path d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.5,17.5H14V19H10V17.5H10.5C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z"/>
                                    </svg>
                                    Username Font
                                </button>
                            );
                        })()}

                        <button 
                            className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
                            onClick={() => setActiveTab('account')}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                            </svg>
                            Account
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
                        // Optional: Refresh page to show updated data
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
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