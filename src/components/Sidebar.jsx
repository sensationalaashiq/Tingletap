// src/components/Sidebar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collection, doc, query, orderBy, onSnapshot, updateDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Sidebar.css';
import { Badges as badges } from '../data/Badges';
import AdminBanKickModal from './AdminBanKickModal';
import EditProfileModal from './EditProfileModal';
import ViewProfileModal from './ViewProfileModal';
import StatusModal from './StatusModal';
import GenderBadge from './GenderBadge';


const MaleIconSVG = () => (
  <svg width="14" height="14" clipRule="evenodd" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="maleGradientSidebar" gradientTransform="matrix(38.402 -29.918 29.918 38.402 879.315 261.556)" gradientUnits="userSpaceOnUse" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#0056e0"/>
        <stop offset=".01" stopColor="#0056e0"/>
        <stop offset="1" stopColor="#00e5b8"/>
      </linearGradient>
    </defs>
    <g transform="translate(-106 -159)">
      <g transform="translate(-764.321 -65.93)">
        <g id="ngicon">
          <path d="m903.204 236.514-7.015 7.014c-4.849-3.22-11.433-2.709-15.673 1.532-4.841 4.84-4.822 12.734.06 17.617 4.883 4.882 12.777 4.901 17.617.06 4.241-4.24 4.752-10.824 1.532-15.673l7.004-7.004.014 3.371c.006 1.38 1.131 2.495 2.511 2.489s2.495-1.131 2.489-2.511l-.04-9.392c-.006-1.374-1.12-2.486-2.494-2.489l-9.374-.022c-1.38-.003-2.503 1.114-2.506 2.494s1.114 2.503 2.494 2.506zm-19.092 22.627c-2.923-2.923-2.959-7.648-.061-10.546s7.624-2.862 10.546.06c2.923 2.923 2.959 7.649.061 10.547-2.898 2.897-7.624 2.862-10.546-.061z" fill="url(#maleGradientSidebar)"/>
        </g>
      </g>
    </g>
  </svg>
);

const FemaleIconSVG = () => (
  <svg width="14" height="14" id="Filled_Expand" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" data-name="Filled Expand">
    <path d="m35 38.607a11.983 11.983 0 0 0 4.477-20.983 10 10 0 1 0 -14.954 0 11.983 11.983 0 0 0 4.477 20.983v10.393h-8v6h8v8h6v-8h8v-6h-8zm-3-31.607a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm-6 20a6 6 0 1 1 6 6 6 6 0 0 1 -6-6z"/>
    <path d="m35 49v-10.393a11.983 11.983 0 0 0 4.477-20.983 9.987 9.987 0 0 0 -6.477-16.574 9.987 9.987 0 0 0 -6.477 16.574 11.969 11.969 0 0 0 -4.523 9.376c0 5.589 3.827 9.666 9 11v13h-8v4h8v8h4v-8h8v-6zm-3-42a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm0 26a6 6 0 1 1 6-6 6 6 0 0 1 -6 6z"/>
  </svg>
);

const modernToggleIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`;

const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>`;

const getRoomIcon = (roomName) => {
  const name = roomName.toLowerCase();

  if (name.includes('olympian') || name.includes('staff')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="staffGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700"/>
            <stop offset="50%" stopColor="#ffed4a"/>
            <stop offset="100%" stopColor="#f59e0b"/>
          </linearGradient>
        </defs>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#staffGradient)" stroke="#fff" strokeWidth="0.5"/>
        <circle cx="12" cy="12" r="3" fill="#fff" opacity="0.8"/>
        <path d="M10 11h4v2h-4z" fill="#ffd700"/>
      </svg>
    );
  } else if (name.includes('indian') || name.includes('india') || name.includes('desi')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="indianGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9933"/>
            <stop offset="33%" stopColor="#ffffff"/>
            <stop offset="66%" stopColor="#ffffff"/>
            <stop offset="100%" stopColor="#138808"/>
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#indianGradient)" stroke="#fff" strokeWidth="1"/>
        <circle cx="12" cy="12" r="2.5" fill="#000080" stroke="#fff" strokeWidth="0.5"/>
        <path d="M12 9.5l0.5 1.5h1.5l-1.2 0.8 0.5 1.5-1.3 0.8-1.3 0.8 0.5-1.5-1.2-0.8h1.5z" fill="#fff"/>
      </svg>
    );
  } else if (name.includes('international') || name.includes('global') || name.includes('world') || name.includes('universal')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="globalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981"/>
            <stop offset="50%" stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#3b82f6"/>
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#globalGradient)" stroke="#fff" strokeWidth="1"/>
        <path d="M8 12h8M12 8c2.21 0 4 1.79 4 4s-1.79 4-4 4M6 12c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
        <circle cx="8" cy="10" r="1" fill="#fff"/>
        <circle cx="16" cy="14" r="1" fill="#fff"/>
        <circle cx="12" cy="8" r="0.5" fill="#fff"/>
      </svg>
    );
  } else if (name.includes('general') || name.includes('main')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="homeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399"/>
            <stop offset="100%" stopColor="#10b981"/>
          </linearGradient>
        </defs>
        <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" fill="url(#homeGradient)" stroke="#fff" strokeWidth="0.5"/>
        <rect x="10" y="16" width="4" height="2" fill="#fff" opacity="0.8"/>
        <rect x="11" y="17" width="2" height="1" fill="#34d399"/>
      </svg>
    );
  } else if (name.includes('music') || name.includes('song')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="musicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b"/>
            <stop offset="50%" stopColor="#ec4899"/>
            <stop offset="100%" stopColor="#8b5cf6"/>
          </linearGradient>
        </defs>
        <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" fill="url(#musicGradient)" stroke="#fff" strokeWidth="0.5"/>
        <circle cx="7" cy="18" r="1" fill="#fff" opacity="0.9"/>
        <circle cx="19" cy="18" r="1" fill="#fff" opacity="0.9"/>
        <path d="M9 5l12-2v4l-12 2z" fill="#fff" opacity="0.3"/>
      </svg>
    );
  } else if (name.includes('game') || name.includes('gaming')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="gamingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6"/>
            <stop offset="50%" stopColor="#ec4899"/>
            <stop offset="100%" stopColor="#ef4444"/>
          </linearGradient>
        </defs>
        <path d="M6 12h4m-2 -2v4m8 -1h.01M17 10h.01M12 3C8.5 3 6 5.5 6 9v6c0 1.5 1.5 3 3 3h6c1.5 0 3 -1.5 3 -3V9c0 -3.5 -2.5 -6 -6 -6z" stroke="url(#gamingGradient)" strokeWidth="2" fill="url(#gamingGradient)" fillOpacity="0.7"/>
        <circle cx="16" cy="11" r="0.5" fill="#fff"/>
        <circle cx="17" cy="10" r="0.5" fill="#fff"/>
        <path d="M6 12h4" stroke="#fff" strokeWidth="1"/>
        <path d="M8 10v4" stroke="#fff" strokeWidth="1"/>
      </svg>
    );
  } else if (name.includes('adult') || name.includes('18+')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="adultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444"/>
            <stop offset="50%" stopColor="#dc2626"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#adultGradient)" stroke="#fff" strokeWidth="1"/>
        <text x="12" y="9" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">18+</text>
        <rect x="8" y="11" width="8" height="1" fill="#ffffff" rx="0.5"/>
        <rect x="8" y="13" width="8" height="1" fill="#ffffff" rx="0.5"/>
        <rect x="8" y="15" width="8" height="1" fill="#ffffff" rx="0.5"/>
      </svg>
    );
  } else if (name.includes('tech') || name.includes('programming')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="techGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981"/>
            <stop offset="100%" stopColor="#059669"/>
          </linearGradient>
        </defs>
        <path d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z" fill="url(#techGradient)" stroke="#fff" strokeWidth="0.5"/>
        <circle cx="12" cy="12" r="1" fill="#fff"/>
      </svg>
    );
  } else if (name.includes('love') || name.includes('dating')) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="loveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899"/>
            <stop offset="50%" stopColor="#f472b6"/>
            <stop offset="100%" stopColor="#be185d"/>
          </linearGradient>
        </defs>
        <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" fill="url(#loveGradient)" stroke="#fff" strokeWidth="0.5"/>
        <circle cx="9" cy="8" r="1" fill="#fff" opacity="0.8"/>
        <circle cx="15" cy="8" r="1" fill="#fff" opacity="0.8"/>
        <path d="M12 10c1 1 2 2 2 3s-1 2-2 2-2-1-2-2 1-2 2-3z" fill="#fff" opacity="0.6"/>
      </svg>
    );
  } else {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <defs>
          <linearGradient id="defaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea"/>
            <stop offset="100%" stopColor="#764ba2"/>
          </linearGradient>
        </defs>
        <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z" fill="url(#defaultGradient)" stroke="#fff" strokeWidth="0.5"/>
        <circle cx="8" cy="10" r="1" fill="#fff"/>
        <circle cx="12" cy="10" r="1" fill="#fff"/>
        <circle cx="16" cy="10" r="1" fill="#fff"/>
        <path d="M7 13c1 2 3 2 5 2s4 0 5-2" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round"/>
      </svg>
    );
  }
};

const Sidebar = ({ 
  user, 
  isOpen, 
  onClose, 
  liveUsers, 
  loggedInUserProfile, 
  onKick, 
  onMute, 
  onBan,
  onCall 
}) => {
  const [activeTab, setActiveTab] = useState('users');
  const [genderFilter, setGenderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState([]);
  const [dropdownUser, setDropdownUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminModalType, setAdminModalType] = useState('');
  const [adminModalUser, setAdminModalUser] = useState(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const dropdownRef = useRef(null);
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close dropdown if clicking outside
      const dropdown = event.target.closest('.modern-sidebar-dropdown');
      const trigger = event.target.closest('[data-dropdown-trigger]');

      if (!dropdown && !trigger) {
        setDropdownUser(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'rooms'), orderBy('order'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Apply username styles after rooms load
      setTimeout(() => {
        if (window.applyGlobalUsernameStyles) {
          window.applyGlobalUsernameStyles();
        }
      }, 500);
    });

    // Listen for global profile updates
    const handleProfileUpdate = (event) => {
      const { userId, userData } = event.detail;

      // Update profile pictures in sidebar without flickering
      const newAvatarUrl = userData.photoURL ? 
        userData.photoURL : 
        getAvatarUrl(userId, userData.gender, userData.photoURL);

      const sidebarAvatars = document.querySelectorAll(`[data-user-uid="${userId}"] .list-avatar, [data-user-uid="${userId}"] .sidebar-avatar, [data-user-uid="${userId}"] .dropdown-avatar, [data-user-id="${userId}"] .list-avatar, [data-user-id="${userId}"] .sidebar-avatar, [data-user-id="${userId}"] .dropdown-avatar`);
      sidebarAvatars.forEach(avatar => {
        if (avatar.src !== newAvatarUrl) {
          avatar.src = newAvatarUrl;
          console.log('📸 Updated sidebar avatar for:', userData.displayName);
        }
      });

      // Update cache
      if (window.userProfilesCache) {
        window.userProfilesCache.set(userId, userData);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  // Apply username styles when users change
  useEffect(() => {
    setTimeout(() => {
      if (window.applyGlobalUsernameStyles) {
        window.applyGlobalUsernameStyles();
      }
    }, 300);
  }, [liveUsers]);

  // Periodic username styling application
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.applyGlobalUsernameStyles) {
        window.applyGlobalUsernameStyles();
      }
    }, 5000); // Apply every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownUser(null);
      }
    };

    const handleOpenStatusModal = () => {
      setShowStatusModal(true);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('openStatusModal', handleOpenStatusModal);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('openStatusModal', handleOpenStatusModal);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
    navigate('/login');
  };

  const getAvatarUrl = (uid, gender, photoURL) => {
    if (photoURL) {
      return photoURL;
    }
    const g = gender?.toLowerCase() === 'female' ? 'female' : 'male';
    return `https://api.dicebear.com/8.x/adventurer/svg?seed=${uid}&sex=${g}&backgroundColor=c0aede`;
  };

  const getBorderClass = (user) => {
    if (!user) return 'male-border';

    // Handle guest users safely
    const gender = user.gender?.toLowerCase() === 'female' ? 'female-border' : 'male-border';

    // Check if user is guest
    if (user.isGuest) return `user-border ${gender}`;

    if (user.role === 'owner') return `owner-border ${gender}`;
    if (user.role === 'admin') return `admin-border ${gender}`;
    if (user.role === 'moderator') return `moderator-border ${gender}`;
    if (user.role === 'badge_holder' || user.badge) return `badge-holder-border ${gender}`;
    return `user-border ${gender}`;
  };

  // Check if current user can kick another user
  const canKick = (targetUser) => {
    if (!user || !targetUser) return false;

    const currentUser = loggedInUserProfile;
    const currentRole = currentUser.role || 'user';
    const targetRole = targetUser.role || 'user';

    // Role hierarchy: owner > admin > moderator > user
    const roleHierarchy = {
      'owner': 4,
      'admin': 3,
      'moderator': 2,
      'user': 1
    };

    return roleHierarchy[currentRole] > roleHierarchy[targetRole];
  };



  const handleAdminModalConfirm = async (actionData) => {
    if (!adminModalUser) return;

    try {
      if (adminModalType === 'ban') {
        const userRef = doc(db, 'users', adminModalUser.uid);
        const banData = {
          isBanned: true,
          banReason: actionData.reason,
          bannedAt: serverTimestamp(),
          bannedBy: actionData.actionBy,
          bannedById: actionData.actionById,
          banDuration: actionData.duration,
          appealContact: 'admin@tingleapp.com'
        };

        await updateDoc(userRef, banData);
        toast.success(`🚫 ${adminModalUser.displayName} has been banned.`);

      } else if (adminModalType === 'mute') {
        const userRef = doc(db, 'users', adminModalUser.uid);
        await updateDoc(userRef, {
          "mutedInfo.isMuted": true,
          "mutedInfo.reason": actionData.reason,
          "mutedInfo.duration": actionData.duration,
          "mutedInfo.mutedAt": serverTimestamp(),
          "mutedInfo.mutedBy": actionData.actionBy,
          "mutedInfo.mutedById": actionData.actionById,
          "mutedInfo.mutedByRole": loggedInUserProfile?.role || 'admin'
        });
        toast.success(`🔇 ${adminModalUser.displayName} has been muted.`);

      } else if (adminModalType === 'kick') {
        const kickRef = doc(db, 'rooms', adminModalUser.roomId, 'kickedUsers', adminModalUser.uid);
        await setDoc(kickRef, {
          uid: adminModalUser.uid,
          displayName: adminModalUser.displayName,
          kickedAt: serverTimestamp(),
          kickedBy: actionData.actionBy,
          kickedById: actionData.actionById,
          roomName: adminModalUser.roomName,
          reason: actionData.reason
        });
        toast.success(`👢 ${adminModalUser.displayName} has been kicked from ${adminModalUser.roomName}.`);
      } else if (adminModalType === 'kick_all') {
        // Implement kicking from all rooms here if needed
        // For now, let's assume it logs a message
        console.log(`Kicking ${adminModalUser.displayName} from all rooms (implementation pending)`);
        toast.info(`Kicking ${adminModalUser.displayName} from all rooms is not yet fully implemented.`);
      }
    } catch (error) {
      console.error(`Error performing ${adminModalType}:`, error);
      toast.error(`❌ ${adminModalType} action failed.`);
    }
  };

  // Filter users based on gender filter, search query, AND online status
  // Remove duplicates by tracking unique UIDs
  const uniqueUsers = new Map();
  liveUsers.forEach(userItem => {
    if (!uniqueUsers.has(userItem.uid)) {
      uniqueUsers.set(userItem.uid, userItem);
    }
  });

  const filteredUsers = Array.from(uniqueUsers.values()).filter(userItem => {
    // MOST IMPORTANT: Only show ONLINE users
    const isOnlineInWindow = window.onlineUsers?.has(userItem.uid);
    const isOnlineInStatus = window.userOnlineStatuses?.[userItem.uid]?.state === 'online';
    const isOnlineInProps = userItem.isOnline;
    const isActuallyOnline = isOnlineInWindow || isOnlineInStatus || isOnlineInProps;

    // Skip offline users completely - don't show them at all
    if (!isActuallyOnline) {
      return false;
    }

    // Gender filter
    let matchesGender = true;
    if (genderFilter !== 'all') {
      if (genderFilter === 'male') matchesGender = userItem.gender?.toLowerCase() !== 'female';
      if (genderFilter === 'female') matchesGender = userItem.gender?.toLowerCase() === 'female';
    }

    // Search query filter
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const displayName = userItem.displayName?.toLowerCase() || '';
      const query = searchQuery.toLowerCase().trim();
      matchesSearch = displayName.includes(query);
    }

    return matchesGender && matchesSearch;
  });

    // Listen for user-specific username style changes and force apply them
    React.useEffect(() => {
        const handleUserSpecificUsernameStylesChanged = (event) => {
            console.log('🎨 User-specific username styles changed in Sidebar:', event.detail);

            // Force apply styles to sidebar elements immediately for ALL users
            setTimeout(() => {
                if (window.forceApplyAllUsersStyles) {
                    window.forceApplyAllUsersStyles();
                }

                // Additional force update for sidebar specific elements
                const allUsernameElements = document.querySelectorAll('.sidebar-username, .list-username, .profile-name, .dropdown-username');
                allUsernameElements.forEach(element => {
                    const userId = element.getAttribute('data-user-uid') || element.getAttribute('data-user-id');
                    if (userId && window.userUsernameStyles && window.userUsernameStyles[userId]) {
                        const styles = window.userUsernameStyles[userId];

                        element.style.setProperty('font-size', styles.usernameFontSize || '12px', 'important');
                        element.style.setProperty('font-family', styles.usernameFontFamily !== 'inherit' ? styles.usernameFontFamily : 'inherit', 'important');
                        element.style.setProperty('font-weight', styles.usernameIsBold ? 'bold' : 'normal', 'important');
                        element.style.setProperty('font-style', styles.usernameIsItalic ? 'italic' : 'normal', 'important');

                        const decorations = [];
                        if (styles.usernameIsUnderline) decorations.push('underline');
                        if (styles.usernameIsStrikethrough) decorations.push('line-through');
                        element.style.setProperty('text-decoration', decorations.length > 0 ? decorations.join(' ') : 'none', 'important');

                        element.style.setProperty('text-shadow', styles.usernameTextShadow || 'none', 'important');
                        element.style.setProperty('letter-spacing', styles.usernameLetterSpacing || '0px', 'important');

                        if (styles.usernameGradientEnabled) {
                            const gradientType = styles.usernameGradientDirection === 'radial' ? 'radial-gradient' : 'linear-gradient';
                            element.style.setProperty('background', `${gradientType}(${styles.usernameGradientDirection || 'to right'}, ${styles.usernameGradientStart || '#ff0000'}, ${styles.usernameGradientEnd || '#0000ff'})`, 'important');
                            element.style.setProperty('-webkit-background-clip', 'text', 'important');
                            element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
                            element.style.setProperty('background-clip', 'text', 'important');
                        } else {
                            element.style.setProperty('color', styles.usernameFontColor || '#000000', 'important');
                            element.style.setProperty('background', 'none', 'important');
                            element.style.setProperty('-webkit-background-clip', 'initial', 'important');
                            element.style.setProperty('-webkit-text-fill-color', 'initial', 'important');
                            element.style.setProperty('background-clip', 'initial', 'important');
                        }

                        if (styles.usernameAnimationEnabled) {
                            element.style.setProperty('animation', `${styles.usernameAnimationType || 'pulse'} ${styles.usernameAnimationDuration || '2s'} infinite`, 'important');
                        } else {
                            element.style.setProperty('animation', 'none', 'important');
                        }
                    }
                });

                console.log('🎨 Sidebar username styles force-applied for ALL users');
            }, 100);
        };

        window.addEventListener('userSpecificUsernameStylesChanged', handleUserSpecificUsernameStylesChanged);

        return () => {
            window.removeEventListener('userSpecificUsernameStylesChanged', handleUserSpecificUsernameStylesChanged);
        };
    }, []);

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      {/* Dropdown backdrop */}
      {(dropdownUser || profileUser) && (
        <div 
          className="sidebar-dropdown-backdrop" 
          onClick={() => {
            setDropdownUser(null);
            setProfileUser(null);
          }}
        />
      )}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className={`sidebar-header ${loggedInUserProfile?.badge ? 'badge-bg-' + loggedInUserProfile.badge : ''}`}>
          {user && loggedInUserProfile && (
            <div className={`sidebar-profile-centered ${getBorderClass(loggedInUserProfile || user)}`} style={{ position: 'relative', zIndex: 1 }}>
              <div className="avatar-wrapper" style={{ position: 'relative' }}>
                <img className="sidebar-avatar" src={getAvatarUrl(user.uid, loggedInUserProfile?.gender || user?.gender || 'male', loggedInUserProfile?.photoURL || user?.photoURL)} alt="avatar" />
                <GenderBadge 
                  gender={loggedInUserProfile?.gender || user?.gender || 'male'} 
                  size="medium"
                  className="online"
                />
              </div>
              <div 
                className="sidebar-user-info" 
                style={{ cursor: 'pointer' }} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  // Handle current user dropdown toggle using same system as user list
                  if (dropdownUser === user.uid) {
                    setDropdownUser(null);
                  } else {
                    setDropdownUser(user.uid);
                  }
                }}
                data-dropdown-trigger="true"
              >
                <div 
                  className="sidebar-username"
                  data-user-uid={user.uid}
                  data-profile-uid={user.uid}
                  data-role={loggedInUserProfile.badge ? 'badge_holder' : (loggedInUserProfile.role || 'user')}
                  data-badge={loggedInUserProfile.badge ? 'true' : 'false'}
                  data-gender={loggedInUserProfile?.gender || user?.gender || 'male'}
                  data-is-bot="false"
                >
                  {loggedInUserProfile?.displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Guest')}
                  {loggedInUserProfile.badge && badges[loggedInUserProfile.badge] && (
                    <span
                      className="inline-badge"
                      title={badges[loggedInUserProfile.badge].name}
                      dangerouslySetInnerHTML={{ __html: badges[loggedInUserProfile.badge].svg }}
                    />
                  )}
                </div>
                {loggedInUserProfile?.status && (
                  <div 
                    className="sidebar-user-status"
                    style={loggedInUserProfile?.statusStyles ? {
                      fontFamily: loggedInUserProfile.statusStyles.fontFamily || 'inherit',
                      fontSize: loggedInUserProfile.statusStyles.fontSize || '0.85rem',
                      fontWeight: loggedInUserProfile.statusStyles.fontWeight || 'normal',
                      fontStyle: loggedInUserProfile.statusStyles.fontStyle || 'normal',
                      textDecoration: loggedInUserProfile.statusStyles.textDecoration || 'none',
                      color: loggedInUserProfile.statusStyles.gradientEnabled ? 'transparent' : (loggedInUserProfile.statusStyles.textColor || 'rgba(255, 255, 255, 0.9)'),
                      background: loggedInUserProfile.statusStyles.gradientEnabled ? 
                        `linear-gradient(${loggedInUserProfile.statusStyles.gradientDirection || 'to right'}, ${loggedInUserProfile.statusStyles.gradientStart || '#667eea'}, ${loggedInUserProfile.statusStyles.gradientEnd || '#764ba2'})` : 'rgba(255, 255, 255, 0.15)',
                      WebkitBackgroundClip: loggedInUserProfile.statusStyles.gradientEnabled ? 'text' : 'initial',
                      backgroundClip: loggedInUserProfile.statusStyles.gradientEnabled ? 'text' : 'initial',
                      textShadow: loggedInUserProfile.statusStyles.textShadow || 'none',
                      animation: loggedInUserProfile.statusStyles.animation || 'none'
                    } : {}}
                  >
                    {loggedInUserProfile.status}
                  </div>
                )}
              </div>

              {/* Current User Profile Dropdown */}
              {dropdownUser === user.uid && (
                <div 
                  className="modern-sidebar-dropdown position-below-right" 
                  ref={dropdownRef}
                >
                  <div className="dropdown-header">
                    <div className="dropdown-user-info">
                      <img src={getAvatarUrl(user.uid, loggedInUserProfile.gender, loggedInUserProfile.photoURL)} alt="avatar" className="dropdown-avatar" />
                      <div className="dropdown-user-details">
                        <span 
                          className="dropdown-username"
                          data-user-uid={user.uid}
                          data-user-id={user.uid}
                          data-profile-uid={user.uid}
                          data-username={loggedInUserProfile.displayName}
                          data-role={loggedInUserProfile.badge ? 'badge_holder' : (loggedInUserProfile.role || 'user')}
                          data-badge={loggedInUserProfile.badge ? 'true' : 'false'}
                          data-gender={loggedInUserProfile.gender || 'male'}
                          data-is-bot="false"
                          style={{
                            color: '#1e293b !important',
                            opacity: '1 !important',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}
                        >
                          {loggedInUserProfile.displayName}
                        </span>
                        <span className="dropdown-user-role">{loggedInUserProfile.role || 'User'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>

                  <button className="modern-dropdown-btn primary" onClick={(e) => { 
                    e.stopPropagation(); 
                    if (window.setProfileUser && typeof window.setProfileUser === 'function') {
                      window.setProfileUser(loggedInUserProfile);
                    } else if (window.handleViewProfile && typeof window.handleViewProfile === 'function') {
                      window.handleViewProfile(loggedInUserProfile);
                    } else {
                      toast.info(`👤 ${loggedInUserProfile?.displayName || 'User'} - ${loggedInUserProfile?.role || 'user'}`);
                    }
                    setDropdownUser(null); 
                  }}>
                    <div className="btn-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                      </svg>
                    </div>
                    <span>View Profile</span>
                  </button>

                  <button className="modern-dropdown-btn" onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowEditProfileModal(true);
                    setDropdownUser(null); 
                  }}>
                    <div className="btn-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                      </svg>
                    </div>
                    <span>Edit Profile</span>
                  </button>

                  {(() => {
                    const userRole = loggedInUserProfile?.role?.toLowerCase();
                    const hasBadge = loggedInUserProfile?.badge && loggedInUserProfile.badge !== '';
                    const hasAccess = hasBadge || ['superowner', 'admin', 'owner', 'moderator'].includes(userRole);

                    return hasAccess ? (
                      <button className="modern-dropdown-btn" onClick={(e) => { 
                        e.stopPropagation(); 
                        setShowStatusModal(true);
                        setDropdownUser(null); 
                      }}>
                        <div className="btn-icon">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52 2,12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,12A4,4 0 0,0 12,18A4,4 0 0,0 16,12A4,4 0 0,0 12,6M12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16Z"/>
                          </svg>
                        </div>
                        <span>Change Status</span>
                      </button>
                    ) : null;
                  })()}

                  <button className="modern-dropdown-btn" onClick={(e) => { 
                    e.stopPropagation(); 
                    // Logout functionality
                    const handleLogout = async () => {
                      try {
                        await signOut(auth);
                        toast.success('👋 Logged out successfully!');
                        onClose();
                        window.location.href = '/login';
                      } catch (error) {
                        console.error('Logout error:', error);
                        toast.error('❌ Logout failed!');
                      }
                    };
                    handleLogout();
                    setDropdownUser(null); 
                  }}>
                    <div className="btn-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
                      </svg>
                    </div>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sidebar-tabs">
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M6,6H4V4H6V6M10,6H8V4H10V6M6,10H4V8H6V10M10,10H8V8H10V10M6,14H4V12H6V14M10,14H8V12H10V14Z"/>
            </svg>
            Users <span className="online-count">{filteredUsers.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => setActiveTab('rooms')}>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
            </svg>
            Rooms
          </button>
        </div>

        {/* Gender Filter Buttons - Only show when users tab is active */}
        {activeTab === 'users' && (
          <div className="gender-filter-controls">
            <button 
              className={`gender-filter-btn ${genderFilter === 'all' ? 'active' : ''}`}
              onClick={() => setGenderFilter('all')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,14C20.42,14 24,15.79 24,18V20H8V18C8,15.79 11.58,14 16,14M6,6H4V4H6V6M10,6H8V4H10V6M6,10H4V8H6V10M10,10H8V8H10V10M6,14H4V12H6V14M10,14H8V12H10V14Z"/>
              </svg>
              All
            </button>
            <button 
              className={`gender-filter-btn ${genderFilter === 'male' ? 'active' : ''}`}
              onClick={() => setGenderFilter('male')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="maleFilterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1e40af" />
                  </linearGradient>
                </defs>
                <circle cx="10" cy="14" r="5" fill="url(#maleFilterGradient)" />
                <path d="M16 2v2h3.586l-5.697 5.697a6 6 0 1 0 1.414 1.414L21 5.414V9h2V2h-7z" 
                      fill="url(#maleFilterGradient)" />
              </svg>
              Male
            </button>
            <button 
              className={`gender-filter-btn ${genderFilter === 'female' ? 'active' : ''}`}
              onClick={() => setGenderFilter('female')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="femaleFilterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#be185d" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="8" r="5" fill="url(#femaleFilterGradient)" />
                <path d="M12 15v3h-2v-2H8v-2h2v-1.071a8 8 0 1 1 2 0V15h2v2h-2v2h-2v-3z" 
                      fill="url(#femaleFilterGradient)" />
              </svg>
              Female
            </button>
          </div>
        )}

        {/* Search Box - Only show when users tab is active */}
        {activeTab === 'users' && (
          <div className="user-search-container">
            <div className="user-search-box">
              <svg className="search-icon" viewBox="0 0 24 24" width="14" height="14">
                <path d="M15.5 14H14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z"/>
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}



        <div className="sidebar-content">
          {activeTab === 'rooms' ? (
            <div className="room-card-grid">
              {rooms.map(room => {
                // Determine room type for styling
                const roomType = (() => {
                  const name = room.name.toLowerCase();
                  if (name.includes('indian') || name.includes('india')) return 'indian';
                  if (name.includes('game') || name.includes('gaming')) return 'gaming';
                  if (name.includes('music') || name.includes('song')) return 'music';
                  if (name.includes('adult') || name.includes('18+')) return 'adult';
                  if (name.includes('universal') || name.includes('global') || name.includes('world')) return 'universal';
                  if (name.includes('staff') || name.includes('olympian')) return 'staff';
                  return 'general';
                })();

                // Check if this is a staff room
                const isStaffRoom = room.name.toLowerCase().includes('staff') || room.name.toLowerCase().includes('olympian');
                const hasStaffAccess = loggedInUserProfile && ['superowner', 'owner', 'admin', 'moderator'].includes(loggedInUserProfile.role?.toLowerCase());

                return (
                  <div
                    key={room.id}
                    className={`room-card ${roomId === room.id ? 'active-room' : ''} ${isStaffRoom && !hasStaffAccess ? 'locked-room' : ''}`}
                    data-room={roomType}
                    onClick={async () => {
                      const currentUser = auth.currentUser;
                      const isGuest = localStorage.getItem('isGuest') === 'true';

                      if (!currentUser && !isGuest) {
                        toast.error("🔐 Please login or sign up to access rooms.");
                        return;
                      }

                      // Check if user is kicked from this specific room
                      try {
                        const kickedUserDocRef = doc(db, 'rooms', room.id, 'kickedUsers', currentUser.uid);
                        const kickDoc = await getDoc(kickedUserDocRef);

                        if (kickDoc.exists()) {
                          // User is kicked from this room - redirect to room list page
                          toast.error(`🚫 You have been kicked from ${room.name}. Redirecting to room list...`);
                          navigate('/');
                          onClose();
                          return;
                        }
                      } catch (error) {
                        console.error("Error checking kick status:", error);
                      }

                      // Check staff room access
                      if (isStaffRoom && !hasStaffAccess) {
                        toast.error("🔒 Access Denied: This room is restricted to staff members only.");
                        return;
                      }

                      // If user is currently in a room they got kicked from, redirect to room list
                      if (roomId && roomId !== room.id) {
                        try {
                          const currentRoomKickDoc = doc(db, 'rooms', roomId, 'kickedUsers', currentUser.uid);
                          const currentRoomKickSnap = await getDoc(currentRoomKickDoc);

                          if (currentRoomKickSnap.exists()) {
                            toast.error("🚫 You have been kicked from the current room. Redirecting to room list...");
                            navigate('/');
                            onClose();
                            return;
                          }
                        } catch (error) {
                          console.error("Error checking current room kick status:", error);
                        }
                      }

                      navigate(`/room/${room.id}`);
                      onClose();
                    }}
                  >
                    <div className="room-icon">{getRoomIcon(room.name)}</div>
                    <div className="room-name">{room.name}</div>
                    {isStaffRoom && !hasStaffAccess && (
                      <div className="room-lock-overlay">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17M18,20V10H6V20H18M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10C4,8.89 4.89,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="sidebar-list">
              {filteredUsers.map(userItem => {
                const isDropdownOpen = dropdownUser === userItem.uid;
                return (
                  <li className={`user-list-item ${getBorderClass(userItem)}`} key={userItem.uid}>
                    <div className="avatar-wrapper" style={{ position: 'relative' }}>
                      <img className="list-avatar" src={getAvatarUrl(userItem.uid, userItem.gender, userItem.photoURL)} alt="avatar" />
                      <GenderBadge 
                        gender={userItem.gender || 'male'} 
                        size="small"
                        className={(() => {
                          // Check multiple sources for online status
                          const isOnlineInWindow = window.onlineUsers?.has(userItem.uid);
                          const isOnlineInStatus = window.userOnlineStatuses?.[userItem.uid]?.state === 'online';
                          const isOnlineInProps = userItem.isOnline;

                          return (isOnlineInWindow || isOnlineInStatus || isOnlineInProps) ? 'online' : '';
                        })()}
                      />
                    </div>
                    <div 
                      className="user-info-container"
                      onClick={(e) => {
                        // Don't allow clicking on own profile, only on others
                        if (user?.uid !== userItem.uid) {
                          e.preventDefault();
                          e.stopPropagation();

                          // If this dropdown is already open, close it
                          if (dropdownUser === userItem.uid) {
                            setDropdownUser(null);
                          } else {
                            // Close any other dropdown and open this one
                            setDropdownUser(userItem.uid);
                          }
                        }
                      }}
                      data-dropdown-trigger="true"
                      style={{ 
                        cursor: user?.uid !== userItem.uid ? 'pointer' : 'default',
                        flex: 1
                      }}
                    >
                      <div
                        className="list-username"
                        data-user-uid={userItem.uid}
                        data-role={userItem.badge ? 'badge_holder' : (userItem.role || 'user')}
                        data-badge={userItem.badge ? 'true' : 'false'}
                        data-gender={userItem.gender || 'male'}
                        data-is-bot="false"
                        style={{ 
                          opacity: user?.uid === userItem.uid ? 0.7 : 1
                        }}
                      >
                        {userItem.displayName || 'Anonymous'}
                        {userItem.badge && badges[userItem.badge] && (
                          <span
                            className="inline-badge"
                            title={badges[userItem.badge].name}
                            dangerouslySetInnerHTML={{ __html: badges[userItem.badge].svg }}
                          />
                        )}
                      </div>
                      {userItem.status && (
                        <div 
                          className="user-status-list"
                          style={userItem.statusStyles ? {
                            fontFamily: userItem.statusStyles.fontFamily || 'inherit',
                            fontSize: userItem.statusStyles.fontSize || '0.7rem',
                            fontWeight: userItem.statusStyles.fontWeight || 'normal',
                            fontStyle: userItem.statusStyles.fontStyle || 'normal',
                            textDecoration: userItem.statusStyles.textDecoration || 'none',
                            color: userItem.statusStyles.gradientEnabled ? 'transparent' : (userItem.statusStyles.textColor || '#64748b'),
                            background: userItem.statusStyles.gradientEnabled ? 
                              `linear-gradient(${userItem.statusStyles.gradientDirection || 'to right'}, ${userItem.statusStyles.gradientStart || '#667eea'}, ${userItem.statusStyles.gradientEnd || '#764ba2'})` : 'none',
                            WebkitBackgroundClip: userItem.statusStyles.gradientEnabled ? 'text' : 'initial',
                            backgroundClip: userItem.statusStyles.gradientEnabled ? 'text' : 'initial',
                            textShadow: userItem.statusStyles.textShadow || 'none',
                            animation: userItem.statusStyles.animation || 'none'
                          } : {}}
                        >
                          {userItem.status}
                        </div>
                      )}
                    </div>

                    {/* User List Item Dropdown */}
                    {dropdownUser === userItem.uid && user?.uid !== userItem.uid && (
                      <div 
                        className="modern-sidebar-dropdown position-below-right" 
                        ref={dropdownRef}
                      >
                        <div className="dropdown-header">
                          <div className="dropdown-user-info">
                            <img src={getAvatarUrl(userItem.uid, userItem.gender, userItem.photoURL)} alt="avatar" className="dropdown-avatar" />
                            <div className="dropdown-user-details">
                              <span 
                                className="dropdown-username"
                                data-user-uid={userItem.uid}
                                data-user-id={userItem.uid}
                                data-profile-uid={userItem.uid}
                                data-username={userItem.displayName}
                                data-role={userItem.badge ? 'badge_holder' : (userItem.role || 'user')}
                                data-badge={userItem.badge ? 'true' : 'false'}
                                data-gender={userItem.gender || 'male'}
                                data-is-bot="false"
                                style={{
                                  color: '#1e293b !important',
                                  opacity: '1 !important',
                                  fontWeight: '600',
                                  fontSize: '14px'
                                }}
                              >
                                {userItem.displayName}
                              </span>
                              <span className="dropdown-user-role">{userItem.role || 'User'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="dropdown-divider"></div>

                        <button className="modern-dropdown-btn primary" onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.setProfileUser && typeof window.setProfileUser === 'function') {
                            window.setProfileUser(userItem);
                          } else if (window.handleViewProfile && typeof window.handleViewProfile === 'function') {
                            window.handleViewProfile(userItem);
                          } else {
                            toast.info(`👤 ${userItem?.displayName || 'User'} - ${userItem?.role || 'user'}`);
                          }
                          setDropdownUser(null); 
                        }}>
                          <div className="btn-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                              <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                            </svg>
                          </div>
                          <span>View Profile</span>
                        </button>

                        <button className="modern-dropdown-btn" onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.handleAddFriendFromSidebar && typeof window.handleAddFriendFromSidebar === 'function') {
                            window.handleAddFriendFromSidebar(userItem);
                          } else {
                            toast.info(`👥 Adding ${userItem?.displayName || 'User'} as friend`);
                          }
                          setDropdownUser(null); 
                        }}>
                          <div className="btn-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                              <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                            </svg>
                          </div>
                          <span>Add Friend</span>
                        </button>

                        <button className="modern-dropdown-btn danger" onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.handleBlockUserFromSidebar && typeof window.handleBlockUserFromSidebar === 'function') {
                            window.handleBlockUserFromSidebar(userItem);
                          } else {
                            toast.info(`🚫 Blocking ${userItem?.displayName || 'User'}`);
                          }
                          setDropdownUser(null); 
                        }}>
                          <div className="btn-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                              <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                            </svg>
                          </div>
                          <span>Block User</span>
                        </button>
                      </div>
                    )}

                    <div className="moderation-actions">
                      {loggedInUserProfile && user?.uid !== userItem.uid && (
                        <>
                          {(() => {
                            const viewerRole = loggedInUserProfile.role;
                            const targetRole = userItem.role;
                            const canMute = (viewerRole === 'superowner') || (viewerRole === 'owner') || (viewerRole === 'admin' && !['superowner','owner', 'admin'].includes(targetRole)) || (viewerRole === 'moderator' && !['superowner','owner', 'admin', 'moderator'].includes(targetRole));
                            const canKick = (viewerRole === 'superowner') || (viewerRole === 'owner') || (viewerRole === 'admin' && !['superowner','owner', 'admin'].includes(targetRole));
                            const canBan = (viewerRole === 'superowner') || (viewerRole === 'owner') || (viewerRole === 'admin' && !['superowner','owner', 'admin'].includes(targetRole));
                            return (
                              <>
                                {canMute && (
                                  <button onClick={() => {
                                    if (userItem.mutedInfo?.isMuted) {
                                      // Direct unmute
                                      const userRef = doc(db, 'users', userItem.uid);
                                      updateDoc(userRef, {
                                        "mutedInfo.isMuted": false,
                                        "mutedInfo.mutedByRole": "",
                                        "mutedInfo.reason": "",
                                        "mutedInfo.duration": "",
                                        "mutedInfo.unmutedAt": serverTimestamp(),
                                        "mutedInfo.unmutedBy": loggedInUserProfile?.displayName || "admin"
                                      }).then(() => {
                                        toast.success(`Unmuted ${userItem.displayName} successfully.`);
                                      }).catch(() => {
                                        toast.error('Unmute failed.');
                                      });
                                    } else {
                                      // Open mute modal
                                      setAdminModalUser(userItem);
                                      setAdminModalType('mute');
                                      setAdminModalVisible(true);
                                    }
                                  }} title={userItem.mutedInfo?.isMuted ? "Unmute" : "Mute"}>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      {userItem.mutedInfo?.isMuted ? (
                                        <path d="M19,11H17.3C17.3,9.79 16.28,8.77 15.07,8.77H15V5A3,3 0 0,0 12,2A3,3 0 0,0 9,5V8.77H8.93C7.72,8.77 6.7,9.79 6.7,11H5C5,14.53 7.61,17.44 11,17.93V21H13V17.93C16.39,17.44 19,14.53 19,11M12,4A1,1 0 0,1 13,5V6H11V5A1,1 0 0,1 12,4M15.07,10.23C15.5,10.23 15.8,10.53 15.8,10.96V11.96C15.8,12.39 15.5,12.69 15.07,12.69H8.93C8.5,12.69 8.2,12.39 8.2,11.96V10.96C8.2,10.53 8.5,10.23 8.93,10.23H15.07Z"/>
                                      ) : (
                                        <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                                      )}
                                    </svg>
                                  </button>
                                )}
                                {canKick && (
                                  <button onClick={() => {
                                    // Toggle between kick modes - check if last action was kick_all
                                    const lastKickType = sessionStorage.getItem(`lastKickType_${userItem.uid}`);
                                    const isNextActionKickAll = !lastKickType || lastKickType === 'kick';

                                    if (isNextActionKickAll) {
                                      // Kick from all rooms
                                      setAdminModalUser(userItem);
                                      setAdminModalType('kick_all');
                                      setAdminModalVisible(true);
                                      sessionStorage.setItem(`lastKickType_${userItem.uid}`, 'kick_all');
                                    } else {
                                      // Kick from current room
                                      setAdminModalUser({...userItem, roomId, roomName: 'Current Room'});
                                      setAdminModalType('kick');
                                      setAdminModalVisible(true);
                                      sessionStorage.setItem(`lastKickType_${userItem.uid}`, 'kick');
                                    }
                                  }} title={(() => {
                                    const lastKickType = sessionStorage.getItem(`lastKickType_${userItem.uid}`);
                                    const isNextActionKickAll = !lastKickType || lastKickType === 'kick';
                                    return isNextActionKickAll ? "Kick from All Rooms" : "Kick from Current Room";
                                  })()}>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/>
                                      <path d="M13,9V7.5L10,4.5L7,7.5V9C7,9.55 7.45,10 8,10H9L11,12L13,10H14C14.55,10 15,9.55 15,9Z"/>
                                      <path d="M19,15H17L15,17L13,15H5C4.45,15 4,15.45 4,16V19C4,19.55 4.45,20 5,20H19C19.55,20 20,19.55 20,19V16C20,15.45 19.55,15 19,15Z"/>
                                    </svg>
                                  </button>
                                )}
                                {canBan && (
                                  <button onClick={() => {
                                    if (userItem.isBanned) {
                                      // Direct unban
                                      const userRef = doc(db, 'users', userItem.uid);
                                      updateDoc(userRef, { 
                                        isBanned: false,
                                        banReason: null,
                                        bannedAt: null,
                                        bannedBy: null,
                                        banDuration: null,
                                        unbanAt: null,
                                        appealContact: null,
                                        unbannedAt: serverTimestamp(),
                                        unbannedBy: loggedInUserProfile?.displayName || "admin"
                                      }).then(() => {
                                        toast.success(`Unbanned ${userItem.displayName} successfully.`);
                                      }).catch(() => {
                                        toast.error('Unban failed.');
                                      });
                                    } else {
                                      // Open ban modal
                                      setAdminModalUser(userItem);
                                      setAdminModalType('ban');
                                      setAdminModalVisible(true);
                                    }
                                  }} title={userItem.isBanned ? "Unban" : "Ban User"}>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      {userItem.isBanned ? (
                                        <>
                                          <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" fill="transparent" stroke="currentColor" strokeWidth="2"/>
                                          <path d="M9,12L11,14L15,10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                        </>
                                      ) : (
                                        <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                                      )}
                                    </svg>
                                  </button>
                                )}

                              </>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        </div>

      {profileUser && (
        <div className="profile-modal">
          <div className="profile-modal-content">
            <button className="modal-close-btn" onClick={() => setProfileUser(null)}>✖</button>

            {/* Header Section - Compact */}
            <div className="profile-header">
              <div className={`avatar-wrapper ${getBorderClass(profileUser)}`}>
                <img src={getAvatarUrl(profileUser.uid, profileUser.gender, profileUser.photoURL)} alt="avatar" className="modal-avatar" />
                <span className="gender-badge-on-avatar">
                  {profileUser.gender?.toLowerCase() === 'female' ? <FemaleIconSVG /> : <MaleIconSVG />}
                </span>
              </div>
              <div className="profile-user-details">
                <div className="username-badge-wrapper">
                  <h2 
                    className="profile-name"
                    data-user-uid={profileUser.uid}
                    data-role={profileUser.badge ? 'badge_holder' : (profileUser.role || 'user')}
                    data-badge={profileUser.badge ? 'true' : 'false'}
                    data-gender={profileUser.gender || 'male'}
                    data-is-bot="false"
                  >
                    {profileUser.displayName}
                  </h2>
                  {profileUser.badge && badges[profileUser.badge] && (
                    <span
                      className="inline-badge"
                      title={badges[profileUser.badge].name}
                      dangerouslySetInnerHTML={{ __html: badges[profileUser.badge].svg }}
                    />
                  )}
                </div>
                {profileUser.status && (
                  <div className="profile-status">
                    {profileUser.status}
                  </div>
                )}
                <div className="profile-basic-info">
                  <span className="profile-role">{profileUser.role || 'User'}</span>
                  <span className="profile-gender">{profileUser.gender}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
              <button className="profile-tab-btn active">👤 Info</button>
              <button className="profile-tab-btn">👥 Friends</button>
              <button className="profile-tab-btn">⏱️ Activity</button>
            </div>

            {/* Content Area - Scrollable */}
            <div className="profile-content">
              <div className="profile-info">
                <div className="info-row">
                  <span className="info-label">Gender:</span>
                  <span className="info-value">{profileUser.gender}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Role:</span>
                  <span className="info-value">{profileUser.role}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className={`info-value ${onlineUsers.has && onlineUsers.has(profileUser.uid) ? 'online' : ''}`}>
                    {onlineUsers.has && onlineUsers.has(profileUser.uid) ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last Seen:</span>
                  <span className="info-value">
                    {window.getUserStatus ? window.getUserStatus(profileUser.uid).status : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Friends Section */}
              <div className="profile-friends">
                <div className="friends-header">
                  <h4>Friends</h4>
                  <span className="friends-count">2</span>
                </div>
                <div className="friends-list-container">
                  <div className="friends-grid">
                    {/* Sample friends with proper DP grid */}
                    <div className={`mini-friend-dp moderator-border female-border`}
                      onClick={() => {
                        toast.info('💬 Starting chat with Shadow Warrior');
                        setProfileUser(null);
                        onClose();
                      }}
                    >
                      <div className="mini-friend-tooltip">Shadow Warrior</div>
                      <img 
                        src={`https://api.dicebear.com/8.x/adventurer/svg?seed=shadowwarrior&sex=female`}
                        alt="avatar"
                      />
                      <span className="mini-gender-badge">
                        <FemaleIconSVG />
                      </span>
                    </div>

                    <div className={`mini-friend-dp male-border`}
                      onClick={() => {
                        toast.info('💬 Starting chat with Thunder Strike');
                        setProfileUser(null);
                        onClose();
                      }}
                    >
                      <div className="mini-friend-tooltip">Thunder Strike</div>
                      <img 
                        src={`https://api.dicebear.com/8.x/adventurer/svg?seed=thunderstrike&sex=male`}
                        alt="avatar"
                      />
                      <span className="mini-gender-badge">
                        <MaleIconSVG />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSuccess={() => {
            setShowEditProfileModal(false);
            toast.success('✅ Profile updated successfully!');
            window.location.reload(); // Refresh to show updated data
          }}
        />
      )}

      {/* Admin Ban/Kick/Mute Modal */}
      <AdminBanKickModal
        isVisible={adminModalVisible}
        onClose={() => {
          setAdminModalVisible(false);
          setAdminModalUser(null);
          setAdminModalType('');
        }}
        selectedUser={adminModalUser}
        actionType={adminModalType}
        onConfirm={handleAdminModalConfirm}
        currentUserProfile={loggedInUserProfile}
      />

      {/* View Profile Modal */}
      {profileUser && (
        <ViewProfileModal 
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onOpenProfile={(user) => setProfileUser(user)}
        />
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <StatusModal
          onClose={() => setShowStatusModal(false)}
        />
      )}
    </>
  );
};

export default Sidebar;