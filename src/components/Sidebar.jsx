// src/components/Sidebar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collection, doc, query, orderBy, onSnapshot, updateDoc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Sidebar.css';
import { Badges as badges } from '../data/Badges';
import { getRoleDisplayLabel, getStoredGuestGender, getDefaultAvatarUrl } from '../utils/roleUtils';
import AdminBanKickModal from './AdminBanKickModal';
import ChatActionModal from './ChatActionModal';
import EditProfileModal from './EditProfileModal';
import ViewProfileModal from './ViewProfileModal';
import StatusModal from './StatusModal';
import GenderBadge from './GenderBadge';

/* ─── Room icons ─────────────────────────────────────────────────────────── */
const getRoomIcon = (roomName) => {
  const name = roomName.toLowerCase();
  if (name.includes('olympian') || name.includes('staff')) return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ffd700"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#sg1)"/></svg>
  );
  if (name.includes('indian') || name.includes('india') || name.includes('desi')) return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff9933"/><stop offset="100%" stopColor="#138808"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#sg2)"/><circle cx="12" cy="12" r="2.5" fill="#000080"/></svg>
  );
  if (name.includes('international') || name.includes('global') || name.includes('world') || name.includes('universal')) return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#3b82f6"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#sg3)"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" stroke="#fff" strokeWidth="1.5" fill="none"/></svg>
  );
  if (name.includes('general') || name.includes('main')) return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#10b981"/></linearGradient></defs><path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="url(#sg4)"/></svg>
  );
  if (name.includes('music') || name.includes('song')) return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs><path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" fill="url(#sg5)"/></svg>
  );
  if (name.includes('game') || name.includes('gaming')) return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#ef4444"/></linearGradient></defs><path d="M6 12h4m-2-2v4m8-1h.01M17 10h.01M12 3C8.5 3 6 5.5 6 9v6c0 1.5 1.5 3 3 3h6c1.5 0 3-1.5 3-3V9c0-3.5-2.5-6-6-6z" stroke="url(#sg6)" strokeWidth="2" fill="none"/></svg>
  );
  if (name.includes('adult') || name.includes('18+')) return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ef4444"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#sg7)"/><text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">18+</text></svg>
  );
  if (name.includes('love') || name.includes('dating')) return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg8" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#be185d"/></linearGradient></defs><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#sg8)"/></svg>
  );
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><defs><linearGradient id="sg9" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#667eea"/><stop offset="100%" stopColor="#764ba2"/></linearGradient></defs><path d="M20 2H4A2 2 0 0 0 2 4V22L6 18H20A2 2 0 0 0 22 16V4C22 2.89 21.1 2 20 2Z" fill="url(#sg9)"/><circle cx="8" cy="10" r="1" fill="#fff"/><circle cx="12" cy="10" r="1" fill="#fff"/><circle cx="16" cy="10" r="1" fill="#fff"/></svg>
  );
};

/* ─── Role pill colors ───────────────────────────────────────────────────── */
const getRolePill = (role) => {
  const map = {
    owner:     { bg: '#fef3c7', color: '#92400e', label: 'Godfather' },
    admin:     { bg: '#ede9fe', color: '#5b21b6', label: 'High Council' },
    moderator: { bg: '#dcfce7', color: '#15803d', label: 'Guardian' },
    user:      { bg: '#f1f5f9', color: '#475569', label: 'Member' },
    guest:     { bg: '#f9fafb', color: '#6b7280', label: 'Guest' },
  };
  return map[role?.toLowerCase()] || map.user;
};

/* ─── Component ──────────────────────────────────────────────────────────── */
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
  const [activeTab, setActiveTab]             = useState('users');
  const [genderFilter, setGenderFilter]       = useState('all');
  const [searchQuery, setSearchQuery]         = useState('');
  const [rooms, setRooms]                     = useState([]);
  const [dropdownUser, setDropdownUser]       = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [profileUser, setProfileUser]         = useState(null);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminModalType, setAdminModalType]   = useState('');
  const [adminModalUser, setAdminModalUser]   = useState(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [sidebarKickConfirm, setSidebarKickConfirm] = useState({ isOpen: false, user: null });
  const dropdownRef = useRef(null);
  const { roomId } = useParams();
  const navigate   = useNavigate();

  /* -- open dropdown anchored to element -- */
  const openDropdownAt = (uid, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 260));
    const top  = rect.bottom + 8;
    setDropdownPosition({ top, left });
    setDropdownUser(prev => prev === uid ? null : uid);
  };

  /* -- click outside closes dropdown -- */
  useEffect(() => {
    const handler = (event) => {
      const dropdown = event.target.closest('.sb-apd');
      const trigger  = event.target.closest('[data-sb-trigger]');
      if (!dropdown && !trigger) setDropdownUser(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* -- expose setProfileUser globally -- */
  useEffect(() => {
    window.setProfileUser = setProfileUser;
    return () => { delete window.setProfileUser; };
  }, [setProfileUser]);

  /* -- rooms subscription -- */
  useEffect(() => {
    const q = query(collection(db, 'rooms'), orderBy('order'));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => { if (window.applyGlobalUsernameStyles) window.applyGlobalUsernameStyles(); }, 500);
    });
    const handleProfileUpdate = (event) => {
      const { userId, userData } = event.detail;
      const newAvatarUrl = userData.photoURL || getAvatarUrl(userId, userData.gender, userData.photoURL);
      const els = document.querySelectorAll(`[data-user-uid="${userId}"] .sb-list-avatar, [data-user-uid="${userId}"] .sb-avatar`);
      els.forEach(el => { if (el.src !== newAvatarUrl) el.src = newAvatarUrl; });
      if (window.userProfilesCache) window.userProfilesCache.set(userId, userData);
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => {
      unsub();
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  /* -- periodic username styling -- */
  useEffect(() => {
    const t = setTimeout(() => { if (window.applyGlobalUsernameStyles) window.applyGlobalUsernameStyles(); }, 300);
    return () => clearTimeout(t);
  }, [liveUsers]);

  useEffect(() => {
    const id = setInterval(() => { if (window.applyGlobalUsernameStyles) window.applyGlobalUsernameStyles(); }, 5000);
    return () => clearInterval(id);
  }, []);

  /* -- status modal event -- */
  useEffect(() => {
    const h = () => setShowStatusModal(true);
    window.addEventListener('openStatusModal', h);
    return () => window.removeEventListener('openStatusModal', h);
  }, []);

  /* -- username style event -- */
  useEffect(() => {
    const handle = () => {
      setTimeout(() => {
        if (window.forceApplyAllUsersStyles) window.forceApplyAllUsersStyles();
      }, 100);
    };
    window.addEventListener('userSpecificUsernameStylesChanged', handle);
    return () => window.removeEventListener('userSpecificUsernameStylesChanged', handle);
  }, []);

  /* -- helpers -- */
  const getAvatarUrl = (uid, gender, photoURL) => photoURL || getDefaultAvatarUrl(uid, gender);

  const getBorderClass = (u) => {
    if (!u) return 'male-border';
    const g = u.gender?.toLowerCase();
    if (g === 'female') return 'female-border';
    if (g === 'transgender' || g === 'other') return 'transgender-border';
    return 'male-border';
  };

  /* -- moderation confirm handler (ban / mute via AdminBanKickModal) -- */
  const handleAdminModalConfirm = async (actionData) => {
    if (!adminModalUser) return;
    try {
      if (adminModalType === 'ban') {
        await updateDoc(doc(db, 'users', adminModalUser.uid), {
          isBanned: true, banReason: actionData.reason, bannedAt: serverTimestamp(),
          bannedBy: actionData.actionBy, bannedById: actionData.actionById,
          banDuration: actionData.duration, appealContact: 'admin@tingleapp.com'
        });
        toast.success(`🚫 ${adminModalUser.displayName} has been banned.`);
      } else if (adminModalType === 'mute') {
        await updateDoc(doc(db, 'users', adminModalUser.uid), {
          "mutedInfo.isMuted": true, "mutedInfo.reason": actionData.reason,
          "mutedInfo.duration": actionData.duration, "mutedInfo.mutedAt": serverTimestamp(),
          "mutedInfo.mutedBy": actionData.actionBy, "mutedInfo.mutedById": actionData.actionById,
          "mutedInfo.mutedByRole": loggedInUserProfile?.role || 'admin'
        });
        toast.success(`🔇 ${adminModalUser.displayName} has been muted.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`❌ Action failed.`);
    }
  };

  /* -- kick via ChatActionModal -- */
  const openKickModal = (targetUser) => {
    setSidebarKickConfirm({
      isOpen: true,
      user: targetUser,
      onConfirm: async () => {
        try {
          await setDoc(doc(db, 'rooms', roomId, 'kickedUsers', targetUser.uid), {
            uid: targetUser.uid,
            displayName: targetUser.displayName,
            kickedAt: serverTimestamp(),
            kickedBy: loggedInUserProfile?.displayName || 'Admin',
            kickedById: loggedInUserProfile?.uid || 'system',
            roomName: 'Current Room',
            reason: 'Kicked from sidebar'
          });
          toast.success(`👢 ${targetUser.displayName} has been kicked.`);
          setSidebarKickConfirm({ isOpen: false, user: null });
        } catch (err) {
          console.error(err);
          toast.error('❌ Kick failed.');
          setSidebarKickConfirm({ isOpen: false, user: null });
        }
      },
      onCancel: () => setSidebarKickConfirm({ isOpen: false, user: null })
    });
    setDropdownUser(null);
  };

  /* -- filter users -- */
  const uniqueUsers = new Map();
  liveUsers.forEach(u => { if (!uniqueUsers.has(u.uid)) uniqueUsers.set(u.uid, u); });

  const filteredUsers = Array.from(uniqueUsers.values()).filter(u => {
    const online = window.onlineUsers?.has(u.uid) || window.userOnlineStatuses?.[u.uid]?.state === 'online' || u.isOnline;
    if (!online) return false;
    if (genderFilter === 'female') return u.gender?.toLowerCase() === 'female';
    if (genderFilter === 'male')   return u.gender?.toLowerCase() !== 'female';
    if (searchQuery.trim()) return (u.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase().trim());
    return true;
  });

  /* -- role-based mod permissions (for viewer) -- */
  const viewerRole = loggedInUserProfile?.role?.toLowerCase();
  const isStaff = ['owner', 'admin', 'moderator'].includes(viewerRole);

  const canModerate = (targetUser) => {
    if (!isStaff) return false;
    const targetRole = targetUser.role?.toLowerCase();
    const hierarchy = { owner: 4, admin: 3, moderator: 2, user: 1, guest: 0 };
    const vLevel = hierarchy[viewerRole] || 0;
    const tLevel = hierarchy[targetRole] || 1;
    return vLevel > tLevel;
  };

  const canDoMute = (targetUser) => {
    if (!canModerate(targetUser)) return false;
    return ['owner', 'admin', 'moderator'].includes(viewerRole);
  };

  const canDoKick = (targetUser) => {
    if (!canModerate(targetUser)) return false;
    return ['owner', 'admin', 'moderator'].includes(viewerRole);
  };

  const canDoBan = (targetUser) => {
    if (!canModerate(targetUser)) return false;
    return ['owner', 'admin'].includes(viewerRole);
  };

  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Backdrop */}
      <div className={`sb-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      {/* Dropdown backdrop */}
      {(dropdownUser || profileUser) && (
        <div className="sb-dropdown-backdrop" onClick={() => { setDropdownUser(null); setProfileUser(null); }} />
      )}

      <div className={`sb-panel ${isOpen ? 'open' : ''}`}>

        {/* ── TOP PROFILE CARD ─────────────────────────────────────── */}
        {user && loggedInUserProfile && (() => {
          const pill = getRolePill(loggedInUserProfile.role);
          return (
            <div className={`sb-profile-card ${getBorderClass(loggedInUserProfile)}`}>
              <div className="sb-profile-glow" />

              {/* Close button */}
              <button className="sb-close-btn" onClick={onClose} aria-label="Close sidebar">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path fill="#fff" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>
                </svg>
              </button>

              {/* Avatar */}
              <button
                className="sb-big-avatar-wrap"
                data-sb-trigger="true"
                onClick={(e) => openDropdownAt(user.uid, e)}
              >
                <img
                  className="sb-big-avatar"
                  src={getAvatarUrl(user.uid, loggedInUserProfile.gender, loggedInUserProfile.photoURL)}
                  alt="avatar"
                />
                <span className="sb-online-ring" />
              </button>

              {/* Name + role */}
              <div
                className="sb-profile-meta"
                data-sb-trigger="true"
                onClick={(e) => openDropdownAt(user.uid, e)}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="sb-profile-name"
                  data-user-uid={user.uid}
                  data-profile-uid={user.uid}
                  data-role={loggedInUserProfile.badge ? 'badge_holder' : (loggedInUserProfile.role || 'user')}
                  data-badge={loggedInUserProfile.badge ? 'true' : 'false'}
                  data-gender={loggedInUserProfile.gender || 'male'}
                  data-is-bot="false"
                >
                  {loggedInUserProfile.displayName || user.displayName || 'User'}
                  {loggedInUserProfile.badge && badges[loggedInUserProfile.badge] && (
                    <span className="inline-badge" title={badges[loggedInUserProfile.badge].name}
                      dangerouslySetInnerHTML={{ __html: badges[loggedInUserProfile.badge].svg }} />
                  )}
                </div>
                <span className="sb-role-pill" style={{ background: pill.bg, color: pill.color }}>
                  {getRoleDisplayLabel({
                    role: loggedInUserProfile.role,
                    gender: loggedInUserProfile.gender || getStoredGuestGender(),
                    isGuest: loggedInUserProfile.isGuest || loggedInUserProfile.role === 'guest',
                    badge: loggedInUserProfile.badge
                  })}
                </span>
              </div>

              {/* Status */}
              {loggedInUserProfile.status && (
                <div className="sb-profile-status" style={loggedInUserProfile.statusStyles ? {
                  fontFamily: loggedInUserProfile.statusStyles.fontFamily || 'inherit',
                  color: loggedInUserProfile.statusStyles.gradientEnabled ? 'transparent' : (loggedInUserProfile.statusStyles.textColor || 'rgba(255,255,255,0.85)'),
                  background: loggedInUserProfile.statusStyles.gradientEnabled ? `linear-gradient(${loggedInUserProfile.statusStyles.gradientDirection || 'to right'}, ${loggedInUserProfile.statusStyles.gradientStart || '#667eea'}, ${loggedInUserProfile.statusStyles.gradientEnd || '#764ba2'})` : 'rgba(255,255,255,0.12)',
                  WebkitBackgroundClip: loggedInUserProfile.statusStyles.gradientEnabled ? 'text' : 'initial',
                  backgroundClip: loggedInUserProfile.statusStyles.gradientEnabled ? 'text' : 'initial',
                } : {}}>
                  {loggedInUserProfile.status}
                </div>
              )}

              {/* Quick actions */}
              <div className="sb-quick-actions">
                <button className="sb-quick-btn" title="Edit Profile" onClick={(e) => { e.stopPropagation(); setShowEditProfileModal(true); }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83ZM3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25Z"/>
                  </svg>
                </button>
                {(() => {
                  const uRole = loggedInUserProfile.role?.toLowerCase();
                  const hasBadge = loggedInUserProfile.badge && loggedInUserProfile.badge !== '';
                  if (hasBadge || ['admin','owner','moderator'].includes(uRole)) return (
                    <button className="sb-quick-btn" title="Change Status" onClick={(e) => { e.stopPropagation(); setShowStatusModal(true); }}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                      </svg>
                    </button>
                  );
                  return null;
                })()}
                <button className="sb-quick-btn sb-quick-logout" title="Logout" onClick={async (e) => {
                  e.stopPropagation();
                  try { await signOut(auth); toast.success('👋 Logged out!'); onClose(); window.location.href = '/login'; }
                  catch { toast.error('❌ Logout failed!'); }
                }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/>
                  </svg>
                </button>
              </div>

              {/* Self dropdown */}
              {dropdownUser === user.uid && createPortal(
                <div className="sb-apd" ref={dropdownRef}
                  style={{ top: dropdownPosition.top, left: dropdownPosition.left }}>
                  <div className="sb-apd-header">
                    <img src={getAvatarUrl(user.uid, loggedInUserProfile.gender, loggedInUserProfile.photoURL)} alt="" className="sb-apd-avatar" />
                    <div>
                      <div className="sb-apd-name"
                        data-user-uid={user.uid} data-user-id={user.uid}
                        data-role={loggedInUserProfile.badge ? 'badge_holder' : (loggedInUserProfile.role || 'user')}
                        data-badge={loggedInUserProfile.badge ? 'true' : 'false'}
                        data-gender={loggedInUserProfile.gender || 'male'}
                      >{loggedInUserProfile.displayName}</div>
                      <div className="sb-apd-role">{getRoleDisplayLabel({ role: loggedInUserProfile.role, gender: loggedInUserProfile.gender || getStoredGuestGender(), isGuest: loggedInUserProfile.isGuest, badge: loggedInUserProfile.badge })}</div>
                    </div>
                  </div>
                  <div className="sb-apd-divider" />
                  <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); setProfileUser(loggedInUserProfile); setDropdownUser(null); }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/></svg>
                    View Profile
                  </button>
                  <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); setShowEditProfileModal(true); setDropdownUser(null); }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83ZM3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25Z"/></svg>
                    Edit Profile
                  </button>
                  {(() => {
                    const uRole = loggedInUserProfile.role?.toLowerCase();
                    const hasBadge = loggedInUserProfile.badge && loggedInUserProfile.badge !== '';
                    if (hasBadge || ['admin','owner','moderator'].includes(uRole)) return (
                      <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); setShowStatusModal(true); setDropdownUser(null); }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                        Change Status
                      </button>
                    );
                    return null;
                  })()}
                  <div className="sb-apd-divider" />
                  <button className="sb-apd-btn sb-apd-danger" onClick={async (e) => {
                    e.stopPropagation();
                    try { await signOut(auth); toast.success('👋 Logged out!'); onClose(); window.location.href = '/login'; }
                    catch { toast.error('❌ Logout failed!'); }
                    setDropdownUser(null);
                  }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/></svg>
                    Logout
                  </button>
                </div>,
                document.body
              )}
            </div>
          );
        })()}

        {/* ── TABS ─────────────────────────────────────────────────── */}
        <div className="sb-tabs">
          <button className={`sb-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            Users
            <span className="sb-tab-count">{filteredUsers.length}</span>
          </button>
          <button className={`sb-tab ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => setActiveTab('rooms')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Rooms
          </button>
        </div>

        {/* ── USERS FILTERS ─────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <>
            <div className="sb-gender-row">
              {[
                { key: 'all', label: 'All', icon: <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/> },
                { key: 'male', label: 'Male', icon: <><circle cx="10" cy="14" r="5" fill="url(#mf1)"/><path d="M16 2v2h3.586l-5.697 5.697a6 6 0 1 0 1.414 1.414L21 5.414V9h2V2h-7z" fill="url(#mf1)"/><defs><linearGradient id="mf1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#1e40af"/></linearGradient></defs></> },
                { key: 'female', label: 'Female', icon: <><circle cx="12" cy="8" r="5" fill="url(#mf2)"/><path d="M12 15v3h-2v-2H8v-2h2v-1.071a8 8 0 1 1 2 0V15h2v2h-2v2h-2v-3z" fill="url(#mf2)"/><defs><linearGradient id="mf2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#be185d"/></linearGradient></defs></> },
              ].map(({ key, label, icon }) => (
                <button key={key} className={`sb-gender-btn ${genderFilter === key ? 'active' : ''}`}
                  onClick={() => setGenderFilter(key)}>
                  <svg viewBox="0 0 24 24" width="13" height="13">{icon}</svg>
                  {label}
                </button>
              ))}
            </div>

            <div className="sb-search">
              <svg className="sb-search-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Search users…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sb-search-input"
              />
              {searchQuery && (
                <button className="sb-search-clear" onClick={() => setSearchQuery('')}>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
          </>
        )}

        {/* ── CONTENT ───────────────────────────────────────────────── */}
        <div className="sb-content">

          {/* ROOMS TAB */}
          {activeTab === 'rooms' ? (
            <div className="sb-room-grid">
              {rooms.map(room => {
                const isStaffRoom = room.name.toLowerCase().includes('staff') || room.name.toLowerCase().includes('olympian');
                const hasAccess   = loggedInUserProfile && ['owner','admin','moderator'].includes(loggedInUserProfile.role?.toLowerCase());
                const locked      = isStaffRoom && !hasAccess;
                return (
                  <div key={room.id}
                    className={`sb-room-card ${roomId === room.id ? 'active' : ''} ${locked ? 'locked' : ''}`}
                    onClick={async () => {
                      if (!user?.uid && !localStorage.getItem('guestUser')) { toast.error('🔐 Please login.'); return; }
                      if (locked) { toast.error('🔒 Staff only.'); return; }
                      try {
                        const kickSnap = await getDoc(doc(db, 'rooms', room.id, 'kickedUsers', user.uid));
                        if (kickSnap.exists()) { toast.error(`🚫 You've been kicked from ${room.name}.`); navigate('/'); onClose(); return; }
                      } catch {}
                      navigate(`/room/${room.id}`); onClose();
                    }}
                  >
                    <div className="sb-room-icon">{getRoomIcon(room.name)}</div>
                    <div className="sb-room-name">{room.name}</div>
                    {locked && (
                      <div className="sb-room-lock">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (

            /* USERS TAB */
            <ul className="sb-user-list">
              {filteredUsers.map(userItem => {
                const isSelf    = user?.uid === userItem.uid;
                const isOnline  = window.onlineUsers?.has(userItem.uid) || window.userOnlineStatuses?.[userItem.uid]?.state === 'online' || userItem.isOnline;
                const isGuest   = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role?.toLowerCase() === 'guest' || localStorage.getItem('isGuest') === 'true' || auth.currentUser?.isAnonymous;
                const tIsGuest  = userItem.isGuest === true || userItem.role?.toLowerCase() === 'guest';
                const tIsStaff  = ['owner','admin','moderator'].includes(userItem.role?.toLowerCase());
                const limited   = isGuest || tIsGuest;
                const pill      = getRolePill(userItem.role);
                const showMod   = !isSelf && canModerate(userItem);
                const showMute  = showMod && canDoMute(userItem);
                const showKick  = showMod && canDoKick(userItem);
                const showBan   = showMod && canDoBan(userItem);

                return (
                  <li key={userItem.uid} className={`sb-user-item ${getBorderClass(userItem)}`}>
                    {/* Avatar */}
                    <button
                      className="sb-user-avatar-wrap"
                      data-sb-trigger="true"
                      disabled={isSelf}
                      onClick={(e) => { if (!isSelf) { e.preventDefault(); e.stopPropagation(); openDropdownAt(userItem.uid, e); } }}
                    >
                      <img
                        className="sb-list-avatar"
                        src={getAvatarUrl(userItem.uid, userItem.gender, userItem.photoURL)}
                        alt="avatar"
                        data-user-uid={userItem.uid}
                      />
                      <span className={`sb-dot ${isOnline ? 'online' : 'offline'}`} />
                    </button>

                    {/* Info */}
                    <div
                      className="sb-user-info"
                      data-sb-trigger="true"
                      style={{ cursor: isSelf ? 'default' : 'pointer', flex: 1, minWidth: 0 }}
                      onClick={(e) => { if (!isSelf) { e.preventDefault(); e.stopPropagation(); openDropdownAt(userItem.uid, e); } }}
                    >
                      <div className="sb-user-name-row">
                        <span
                          className="sb-list-username"
                          data-user-uid={userItem.uid}
                          data-role={userItem.badge ? 'badge_holder' : (userItem.role || 'user')}
                          data-badge={userItem.badge ? 'true' : 'false'}
                          data-gender={userItem.gender || 'male'}
                          data-is-bot="false"
                          style={{ opacity: isSelf ? 0.65 : 1 }}
                        >
                          {userItem.displayName || 'Anonymous'}
                          {userItem.badge && badges[userItem.badge] && (
                            <span className="inline-badge" title={badges[userItem.badge].name}
                              dangerouslySetInnerHTML={{ __html: badges[userItem.badge].svg }} />
                          )}
                        </span>
                        <span className="sb-user-role-pill" style={{ background: pill.bg, color: pill.color }}>
                          {pill.label}
                        </span>
                      </div>
                      {userItem.status && (
                        <div className="sb-user-status" style={userItem.statusStyles ? {
                          color: userItem.statusStyles.gradientEnabled ? 'transparent' : (userItem.statusStyles.textColor || '#64748b'),
                          background: userItem.statusStyles.gradientEnabled ? `linear-gradient(${userItem.statusStyles.gradientDirection || 'to right'}, ${userItem.statusStyles.gradientStart || '#667eea'}, ${userItem.statusStyles.gradientEnd || '#764ba2'})` : 'none',
                          WebkitBackgroundClip: userItem.statusStyles.gradientEnabled ? 'text' : 'initial',
                          backgroundClip: userItem.statusStyles.gradientEnabled ? 'text' : 'initial',
                        } : {}}>
                          {userItem.status}
                        </div>
                      )}
                    </div>

                    {/* Mod action buttons (hidden for regular users) */}
                    {(showMute || showKick || showBan) && (
                      <div className="sb-mod-actions">
                        {showMute && (
                          <button
                            className={`sb-mod-btn ${userItem.mutedInfo?.isMuted ? 'unmute' : 'mute'}`}
                            title={userItem.mutedInfo?.isMuted ? 'Unmute' : 'Mute'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (userItem.mutedInfo?.isMuted) {
                                updateDoc(doc(db, 'users', userItem.uid), {
                                  "mutedInfo.isMuted": false, "mutedInfo.reason": "",
                                  "mutedInfo.unmutedAt": serverTimestamp(),
                                  "mutedInfo.unmutedBy": loggedInUserProfile?.displayName || 'admin'
                                }).then(() => toast.success(`Unmuted ${userItem.displayName}`))
                                  .catch(() => toast.error('Unmute failed.'));
                              } else {
                                setAdminModalUser(userItem);
                                setAdminModalType('mute');
                                setAdminModalVisible(true);
                              }
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                              {userItem.mutedInfo?.isMuted ? (
                                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m7 9c0 3.53-2.61 6.44-6 6.93V21h-2v-3.07C7.61 17.44 5 14.53 5 11h2a5 5 0 0 0 5 5 5 5 0 0 0 5-5h2z"/>
                              ) : (
                                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                              )}
                            </svg>
                          </button>
                        )}
                        {showKick && (
                          <button
                            className="sb-mod-btn kick"
                            title="Kick from Room"
                            onClick={(e) => { e.stopPropagation(); openKickModal(userItem); }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                              <path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/>
                            </svg>
                          </button>
                        )}
                        {showBan && (
                          <button
                            className={`sb-mod-btn ${userItem.isBanned ? 'unban' : 'ban'}`}
                            title={userItem.isBanned ? 'Unban' : 'Ban User'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (userItem.isBanned) {
                                updateDoc(doc(db, 'users', userItem.uid), {
                                  isBanned: false, banReason: null, bannedAt: null,
                                  unbannedAt: serverTimestamp(),
                                  unbannedBy: loggedInUserProfile?.displayName || 'admin'
                                }).then(() => toast.success(`Unbanned ${userItem.displayName}`))
                                  .catch(() => toast.error('Unban failed.'));
                              } else {
                                setAdminModalUser(userItem);
                                setAdminModalType('ban');
                                setAdminModalVisible(true);
                              }
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                              {userItem.isBanned ? (
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                              ) : (
                                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm4.3 14.3L7.7 7.7C9.14 6.64 10.99 6 13 6c3.87 0 7 3.13 7 7 0 2.01-.64 3.86-1.7 5.3zM5 12c0-2.01.64-3.86 1.7-5.3l8.6 8.6C13.86 16.36 12.01 17 11 17c-3.87 0-7-3.13-7-7z"/>
                              )}
                            </svg>
                          </button>
                        )}
                      </div>
                    )}

                    {/* User dropdown portal */}
                    {dropdownUser === userItem.uid && !isSelf && createPortal((() => {
                      const roleLabel = getRoleDisplayLabel({ role: userItem.role, gender: userItem.gender, isGuest: tIsGuest, badge: userItem.badge });
                      return (
                        <div className="sb-apd" ref={dropdownRef}
                          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}>
                          <div className="sb-apd-header">
                            <div className="sb-apd-avatar-wrap">
                              <img src={getAvatarUrl(userItem.uid, userItem.gender, userItem.photoURL)} alt="" className="sb-apd-avatar"/>
                              <span className={`sb-apd-dot ${isOnline ? 'online' : ''}`}/>
                            </div>
                            <div>
                              <div className="sb-apd-name"
                                data-user-uid={userItem.uid} data-user-id={userItem.uid}
                                data-role={userItem.badge ? 'badge_holder' : (userItem.role || 'user')}
                                data-badge={userItem.badge ? 'true' : 'false'}
                                data-gender={userItem.gender || 'male'}
                              >{userItem.displayName}</div>
                              <div className="sb-apd-role">{roleLabel}</div>
                            </div>
                          </div>
                          <div className="sb-apd-divider"/>

                          <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); setProfileUser(userItem); setDropdownUser(null); }}>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/></svg>
                            View Profile
                          </button>

                          {!limited && (
                            <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); if (window.handleAddFriendFromSidebar) window.handleAddFriendFromSidebar(userItem); else toast.info(`Adding ${userItem.displayName} as friend`); setDropdownUser(null); }}>
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M15 14c-2.67 0-8 1.33-8 4v2h16v-2c0-2.67-5.33-4-8-4m0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 10H2v2h3v3h2v-3h3v-2H7V7H5v3z"/></svg>
                              Add Friend
                            </button>
                          )}

                          <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); if (window.handlePrivateMessageFromSidebar) window.handlePrivateMessageFromSidebar(userItem); else toast.info(`Opening PM with ${userItem.displayName}`); setDropdownUser(null); }}>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
                            Send Message
                          </button>

                          {!limited && (
                            <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); if (window.handleWhisperFromSidebar) window.handleWhisperFromSidebar(userItem); else toast.info(`Whispering to ${userItem.displayName}`); setDropdownUser(null); }}>
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2M13 11h-2V9h2v2m0 4h-2v-2h2v2z"/></svg>
                              Whisper
                            </button>
                          )}

                          {!tIsStaff && (
                            <>
                              <div className="sb-apd-divider"/>
                              <button className="sb-apd-btn sb-apd-danger" onClick={(e) => { e.stopPropagation(); if (window.handleBlockUserFromSidebar) window.handleBlockUserFromSidebar(userItem); else toast.info(`Blocking ${userItem.displayName}`); setDropdownUser(null); }}>
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 2c2.01 0 3.86.64 5.3 1.7L5.7 17.3A7.93 7.93 0 0 1 4 12c0-4.42 3.58-8 8-8m0 16c-2.01 0-3.86-.64-5.3-1.7L18.3 6.7A7.93 7.93 0 0 1 20 12c0 4.42-3.58 8-8 8z"/></svg>
                                Block User
                              </button>
                            </>
                          )}

                          {/* Mod section in dropdown */}
                          {(showMute || showKick || showBan) && (
                            <>
                              <div className="sb-apd-divider"/>
                              <div className="sb-apd-mod-label">
                                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                                Moderation
                              </div>
                              {showMute && (
                                <button className="sb-apd-btn sb-apd-warn" onClick={(e) => {
                                  e.stopPropagation();
                                  if (userItem.mutedInfo?.isMuted) {
                                    updateDoc(doc(db, 'users', userItem.uid), { "mutedInfo.isMuted": false, "mutedInfo.reason": "", "mutedInfo.unmutedAt": serverTimestamp(), "mutedInfo.unmutedBy": loggedInUserProfile?.displayName || 'admin' })
                                      .then(() => toast.success(`Unmuted ${userItem.displayName}`)).catch(() => toast.error('Failed'));
                                  } else {
                                    setAdminModalUser(userItem); setAdminModalType('mute'); setAdminModalVisible(true);
                                  }
                                  setDropdownUser(null);
                                }}>
                                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                                    {userItem.mutedInfo?.isMuted ? <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m7 9c0 3.53-2.61 6.44-6 6.93V21h-2v-3.07C7.61 17.44 5 14.53 5 11h2a5 5 0 0 0 5 5 5 5 0 0 0 5-5h2z"/> : <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>}
                                  </svg>
                                  {userItem.mutedInfo?.isMuted ? 'Unmute User' : 'Mute User'}
                                </button>
                              )}
                              {showKick && (
                                <button className="sb-apd-btn sb-apd-orange" onClick={(e) => { e.stopPropagation(); openKickModal(userItem); }}>
                                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                                    <path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/>
                                  </svg>
                                  Kick from Room
                                </button>
                              )}
                              {showBan && (
                                <button className="sb-apd-btn sb-apd-danger" onClick={(e) => {
                                  e.stopPropagation();
                                  if (userItem.isBanned) {
                                    updateDoc(doc(db, 'users', userItem.uid), { isBanned: false, banReason: null, bannedAt: null, unbannedAt: serverTimestamp(), unbannedBy: loggedInUserProfile?.displayName || 'admin' })
                                      .then(() => toast.success(`Unbanned ${userItem.displayName}`)).catch(() => toast.error('Failed'));
                                  } else {
                                    setAdminModalUser(userItem); setAdminModalType('ban'); setAdminModalVisible(true);
                                  }
                                  setDropdownUser(null);
                                }}>
                                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm4.3 14.3L7.7 7.7C9.14 6.64 10.99 6 13 6c3.87 0 7 3.13 7 7 0 2.01-.64 3.86-1.7 5.3zM5 12c0-2.01.64-3.86 1.7-5.3l8.6 8.6C13.86 16.36 12.01 17 11 17c-3.87 0-7-3.13-7-7z"/>
                                  </svg>
                                  {userItem.isBanned ? 'Unban User' : 'Ban User'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })(), document.body)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────── */}
      <ChatActionModal
        isOpen={sidebarKickConfirm.isOpen}
        type="kick"
        user={sidebarKickConfirm.user}
        onConfirm={sidebarKickConfirm.onConfirm}
        onCancel={sidebarKickConfirm.onCancel}
      />

      <AdminBanKickModal
        isVisible={adminModalVisible}
        onClose={() => setAdminModalVisible(false)}
        selectedUser={adminModalUser}
        actionType={adminModalType}
        onConfirm={handleAdminModalConfirm}
        currentUserProfile={loggedInUserProfile}
      />

      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSuccess={() => setShowEditProfileModal(false)}
        />
      )}

      {profileUser && (
        <ViewProfileModal
          user={profileUser}
          currentUser={loggedInUserProfile}
          onClose={() => setProfileUser(null)}
        />
      )}

      {showStatusModal && (
        <StatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          currentUser={loggedInUserProfile}
        />
      )}
    </>
  );
};

export default Sidebar;
