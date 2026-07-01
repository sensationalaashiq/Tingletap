// src/components/Sidebar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { TI } from '../utils/toastIcons';
import { createPortal } from 'react-dom';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collection, doc, query, orderBy, onSnapshot, updateDoc, setDoc, deleteDoc, serverTimestamp, getDoc, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Sidebar.css';
import { Badges as badges } from '../data/Badges';
import { getRoleDisplayLabel, getStoredGuestGender, getDefaultAvatarUrl } from '../utils/roleUtils';
import { getRoomSlug } from '../utils/roomSlug';
import { parseDurationMs } from '../utils/modExpiryService';
import AdminBanKickModal from './AdminBanKickModal';
import ChatActionModal from './ChatActionModal';
import EditProfileModal from './EditProfileModal';
import StatusModal from './StatusModal';
import GenderBadge from './GenderBadge';
import AdultRoomModal from './AdultRoomModal';

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
const PREMIUM_STYLE_MAP = {
  'gold-foil':    { background: 'linear-gradient(135deg,#FFD700,#C7A86B,#FFD700)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700', display: 'inline-block' },
  'cosmic':       { background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700', display: 'inline-block' },
  'ember':        { background: 'linear-gradient(135deg,#f97316,#ef4444)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700', display: 'inline-block' },
  'arctic':       { background: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700', display: 'inline-block' },
  'rose-gold':    { background: 'linear-gradient(135deg,#f9a8d4,#d97706)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700', display: 'inline-block' },
  'matte-luxe':   { color: '#2d2d2d', fontWeight: '600', letterSpacing: '0.5px' },
  'royal-script': { fontFamily: 'Playfair Display, serif', color: '#1a1a1a', fontWeight: '700', fontStyle: 'italic' },
  'velvet-shadow':{ color: '#4a4a4a', fontWeight: '600', textShadow: '3px 3px 6px rgba(0,0,0,0.4)' },
  'minimal-mono': { fontFamily: 'JetBrains Mono, monospace', color: '#333333', fontWeight: '500', letterSpacing: '1px' },
  'neon-glow':    { color: '#39ff14', fontWeight: '700', textShadow: '0 0 7px #39ff14,0 0 14px #39ff14,0 0 21px #39ff14' },
  'ocean-wave':   { background: 'linear-gradient(90deg,#0ea5e9,#38bdf8,#06b6d4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700', display: 'inline-block' },
};

const buildStatusStyle = (statusStyles) => {
  if (!statusStyles) return {};

  const premBase = (statusStyles.premiumStyle && statusStyles.premiumStyle !== 'none')
    ? (PREMIUM_STYLE_MAP[statusStyles.premiumStyle] || {})
    : {};

  const s = { ...premBase };

  if (!premBase.color && !premBase.background) {
    if (statusStyles.gradientEnabled) {
      s.background = `linear-gradient(${statusStyles.gradientDirection || 'to right'}, ${statusStyles.gradientStart || '#667eea'}, ${statusStyles.gradientEnd || '#764ba2'})`;
      s.WebkitBackgroundClip = 'text';
      s.backgroundClip = 'text';
      s.color = 'transparent';
      s.display = 'inline-block';
    } else if (statusStyles.textColor) {
      s.color = statusStyles.textColor;
    }
  }

  if (!premBase.fontFamily && statusStyles.fontFamily && statusStyles.fontFamily !== 'inherit') s.fontFamily = statusStyles.fontFamily;
  if (statusStyles.fontSize) s.fontSize = statusStyles.fontSize;
  if (!premBase.fontWeight && statusStyles.fontWeight) s.fontWeight = statusStyles.fontWeight;
  if (!premBase.fontStyle && statusStyles.fontStyle && statusStyles.fontStyle !== 'normal') s.fontStyle = statusStyles.fontStyle;
  if (statusStyles.textDecoration && statusStyles.textDecoration !== 'none') s.textDecoration = statusStyles.textDecoration;
  if (!premBase.textShadow && statusStyles.textShadow && statusStyles.textShadow !== 'none') s.textShadow = statusStyles.textShadow;
  if (!premBase.letterSpacing && statusStyles.letterSpacing && statusStyles.letterSpacing !== 'normal') s.letterSpacing = statusStyles.letterSpacing;
  if (statusStyles.animation && statusStyles.animation !== 'none') s.animation = statusStyles.animation;
  return s;
};

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
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAdultModal, setShowAdultModal]   = useState(false);
  const [pendingAdultRoom, setPendingAdultRoom] = useState(null);
  const [showPwModal, setShowPwModal]         = useState(false);
  const [pwRoom, setPwRoom]                   = useState(null);
  const [pwInput, setPwInput]                 = useState('');
  const [pwError, setPwError]                 = useState('');
  const [kickedUserIds, setKickedUserIds]     = useState(new Set());
  const dropdownRef = useRef(null);
  const { roomId } = useParams();
  const navigate   = useNavigate();

  /* ── TingleBot strip — writes a system message to the current room chat ── */
  const sendTingleBotMessage = async (text, type = 'system') => {
    try {
      if (!roomId) return;
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text,
        uid: 'tinglebot_system_official_2024',
        displayName: 'TingleBot',
        isBot: true,
        systemBot: true,
        tinglebotType: type,
        createdAt: serverTimestamp(),
        noReply: true,
        noReaction: true,
        noReport: true,
        noUnread: true,
      });
    } catch (err) {
      console.error('TingleBot message failed:', err);
    }
  };

  /* -- open dropdown anchored to element -- */
  const openDropdownAt = (uid, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 260));
    const top  = rect.bottom + 8;
    setDropdownPosition({ top, left });
    setDropdownUser(prev => prev === uid ? null : uid);
  };

  /* -- click outside closes dropdown + deselects row -- */
  useEffect(() => {
    const handler = (event) => {
      const dropdown = event.target.closest('.sb-apd');
      const trigger  = event.target.closest('[data-sb-trigger]');
      if (!dropdown && !trigger) setDropdownUser(null);
      const row = event.target.closest('.sb-user-item');
      if (!row) setSelectedUser(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* -- expose setProfileUser globally — routes through handleViewProfile when available -- */
  useEffect(() => {
    window.setProfileUser = (user) => {
      if (window.handleViewProfile) window.handleViewProfile(user);
      else setProfileUser(user);
    };
    return () => { delete window.setProfileUser; };
  }, [setProfileUser]);

  /* -- kicked users for current room (real-time) -- */
  useEffect(() => {
    if (!roomId) { setKickedUserIds(new Set()); return; }
    const unsub = onSnapshot(collection(db, 'rooms', roomId, 'kickedUsers'), (snap) => {
      setKickedUserIds(new Set(snap.docs.map(d => d.id)));
    }, () => {});
    return () => unsub();
  }, [roomId]);

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

  // Styles are applied via the liveUsers effect and the userSpecificUsernameStylesChanged event — no polling needed

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

  /* -- moderation confirm handler (ban / mute / kick / unkick via AdminBanKickModal) -- */
  const handleAdminModalConfirm = async (actionData, resolvedAction) => {
    if (!adminModalUser) return;
    const adminName = loggedInUserProfile?.displayName || 'Admin';
    const effectiveAction = resolvedAction || actionData._resolvedAction || adminModalType;
    try {
      if (effectiveAction === 'ban') {
        const banMsS = !actionData.expiresAt ? parseDurationMs(actionData.duration) : null;
        const banUntilS = actionData.expiresAt || (banMsS && banMsS !== Infinity ? new Date(Date.now() + banMsS).toISOString() : null);
        await updateDoc(doc(db, 'users', adminModalUser.uid), {
          isBanned: true, banReason: actionData.reason, bannedAt: serverTimestamp(),
          bannedBy: actionData.actionBy, bannedById: actionData.actionById,
          banDuration: actionData.duration, banUntil: banUntilS, appealContact: 'admin@tingleapp.com'
        });
        await sendTingleBotMessage(`${adminModalUser.displayName} has been banned — ${actionData.reason || 'No reason provided'}`, 'banned');

      } else if (effectiveAction === 'mute') {
        const muteMs = !actionData.expiresAt ? parseDurationMs(actionData.duration) : null;
        const muteUntil = actionData.expiresAt || (muteMs && muteMs !== Infinity ? new Date(Date.now() + muteMs).toISOString() : null);
        await updateDoc(doc(db, 'users', adminModalUser.uid), {
          "mutedInfo.isMuted": true, "mutedInfo.reason": actionData.reason,
          "mutedInfo.duration": actionData.duration, "mutedInfo.mutedAt": serverTimestamp(),
          "mutedInfo.muteUntil": muteUntil,
          "mutedInfo.mutedBy": actionData.actionBy, "mutedInfo.mutedById": actionData.actionById,
          "mutedInfo.mutedByRole": loggedInUserProfile?.role || 'admin'
        });
        await sendTingleBotMessage(`${adminModalUser.displayName} has been muted${actionData.duration ? ` for ${actionData.duration}` : ''} — ${actionData.reason || 'No reason provided'}`, 'muted');

      } else if (effectiveAction === 'unmute') {
        await updateDoc(doc(db, 'users', adminModalUser.uid), {
          "mutedInfo.isMuted": false, "mutedInfo.reason": '',
          "mutedInfo.unmutedAt": serverTimestamp(), "mutedInfo.unmutedBy": adminName
        });
        await sendTingleBotMessage(`${adminModalUser.displayName} has been unmuted and can speak again.`, 'system');

      } else if (effectiveAction === 'kick') {
        // Use pre-computed expiresAt from modal (handles datetime picker correctly)
        const kickUntil = actionData.expiresAt || null;
        const kickData = {
          uid: adminModalUser.uid,
          displayName: adminModalUser.displayName,
          kickedAt: serverTimestamp(),
          kickedBy: adminName,
          kickedById: loggedInUserProfile?.uid || 'system',
          reason: actionData.reason,
          duration: actionData.duration,
          kickDuration: actionData.duration,   // BanKickModal reads kickDuration for countdown
          kickUntil,
          kickUntilTs: kickUntil ? Timestamp.fromDate(new Date(kickUntil)) : null,
        };
        if (actionData.kickScope === 'multiple_rooms' && actionData.selectedRooms?.length > 0) {
          for (const rid of actionData.selectedRooms) {
            const rName = rooms.find(r => r.id === rid)?.name || rid;
            await setDoc(doc(db, 'rooms', rid, 'kickedUsers', adminModalUser.uid), {
              ...kickData, roomId: rid, roomName: rName
            });
          }
          const kickedRoomNames = actionData.selectedRooms.map(rid => rooms.find(r => r.id === rid)?.name || rid).join(', ');
          await sendTingleBotMessage(`${adminModalUser.displayName} has been kicked from ${kickedRoomNames} — ${actionData.reason || 'No reason provided'}`, 'kicked');
        } else {
          const targetRoomId = actionData.currentRoomId || roomId;
          if (!targetRoomId) { toast.error('Not in a room — cannot kick.', { icon: TI.error }); return; }
          const currentRoomName = rooms.find(r => r.id === targetRoomId)?.name || targetRoomId;
          await setDoc(doc(db, 'rooms', targetRoomId, 'kickedUsers', adminModalUser.uid), {
            ...kickData, roomId: targetRoomId, roomName: currentRoomName
          });
          await sendTingleBotMessage(`${adminModalUser.displayName} has been kicked from ${currentRoomName} — ${actionData.reason || 'No reason provided'}`, 'kicked');
        }

      } else if (effectiveAction === 'unkick') {
        if (actionData.unkickScope === 'all_rooms') {
          const roomsSnap = await getDocs(collection(db, 'rooms'));
          const promises = roomsSnap.docs.map(rd =>
            deleteDoc(doc(db, 'rooms', rd.id, 'kickedUsers', adminModalUser.uid)).catch(() => {})
          );
          await Promise.all(promises);
          await updateDoc(doc(db, 'users', adminModalUser.uid), { kickedFrom: null }).catch(() => {});
          await sendTingleBotMessage(`${adminModalUser.displayName} has been unkicked from all rooms and can rejoin.`, 'system');
        } else {
          const targetRoomId = actionData.currentRoomId || roomId;
          if (!targetRoomId) { toast.error('Not in a room — cannot unkick.', { icon: TI.error }); return; }
          await deleteDoc(doc(db, 'rooms', targetRoomId, 'kickedUsers', adminModalUser.uid));
          const unkickRoomName = rooms.find(r => r.id === targetRoomId)?.name || targetRoomId;
          await sendTingleBotMessage(`${adminModalUser.displayName} has been unkicked and can rejoin ${unkickRoomName}.`, 'system');
        }

      } else if (effectiveAction === 'unban') {
        await updateDoc(doc(db, 'users', adminModalUser.uid), {
          isBanned: false, banInfo: null, banReason: null, bannedAt: null,
          unbannedAt: serverTimestamp(), unbannedBy: adminName
        });
        await sendTingleBotMessage(`${adminModalUser.displayName} has been unbanned and can rejoin.`, 'system');
      }
    } catch (err) {
      console.error(err);
      toast.error(`Action failed.`, { icon: TI.error });
      throw err; /* Re-throw so modal shows error state */
    }
  };

  /* -- kick/unkick via AdminBanKickModal -- */
  const openKickModal = (targetUser) => {
    setAdminModalUser(targetUser);
    setAdminModalType('kick');
    setAdminModalVisible(true);
    setDropdownUser(null);
  };

  const openUnkickModal = (targetUser) => {
    setAdminModalUser(targetUser);
    setAdminModalType('unkick');
    setAdminModalVisible(true);
    setDropdownUser(null);
  };

  /* -- filter users -- */
  // liveUsers is already filtered to the current room by the RTDB listener in HomePage.
  // We deduplicate by uid, then apply only search/gender UI filters.
  const uniqueUsers = new Map();
  liveUsers.forEach(u => { if (u?.uid && !uniqueUsers.has(u.uid)) uniqueUsers.set(u.uid, u); });

  const filteredUsers = Array.from(uniqueUsers.values()).filter(u => {
    if (!u?.uid) return false;
    // Search filter
    if (searchQuery.trim()) {
      if (!(u.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase().trim())) return false;
    }
    // Gender filter
    if (genderFilter === 'female') return u.gender?.toLowerCase() === 'female';
    if (genderFilter === 'male')   return u.gender?.toLowerCase() === 'male';
    // 'all' — show every user type: guest (Stree/Purush/Navrang), member, badge, owner, admin, moderator
    return true;
  }).sort((a, b) => {
    const roleRank = (u) => {
      const role = u.role?.toLowerCase();
      if (role === 'owner')     return 5;
      if (role === 'admin')     return 4;
      if (role === 'moderator') return 3;
      if (role === 'guest')     return 0;
      // registered user — badge holders above regular members
      return (u.badge && u.badge !== '') ? 2 : 1;
    };
    const diff = roleRank(b) - roleRank(a);
    if (diff !== 0) return diff;
    // same rank → alphabetical by displayName
    return (a.displayName || '').toLowerCase().localeCompare((b.displayName || '').toLowerCase());
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
      {dropdownUser && (
        <div className="sb-dropdown-backdrop" onClick={() => { setDropdownUser(null); setProfileUser(null); }} />
      )}

      <div className={`sb-panel ${isOpen ? 'open' : ''}`}>

        {/* ── TOP PROFILE CARD ─────────────────────────────────────── */}
        {user && loggedInUserProfile && (() => {
          const pill = getRolePill(loggedInUserProfile.role);
          return (
            <div className={`sb-profile-card ${getBorderClass(loggedInUserProfile)}`}>

              {/* Close button */}
              <button className="sb-close-btn" onClick={onClose} aria-label="Close sidebar">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                  <path fill="#7c3aed" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>
                </svg>
              </button>

              {/* Avatar — centered, click opens dropdown */}
              <button
                className="sb-big-avatar-wrap"
                data-sb-trigger="true"
                onClick={(e) => openDropdownAt(user.uid, e)}
                title="Open profile menu"
              >
                <img
                  className="sb-big-avatar"
                  src={getAvatarUrl(user.uid, loggedInUserProfile.gender, loggedInUserProfile.photoURL)}
                  alt="avatar"
                />
                <span className="sb-online-ring" />
              </button>

              {/* Name + role + status — centered, click opens dropdown */}
              <div
                className="sb-profile-meta"
                data-sb-trigger="true"
                onClick={(e) => openDropdownAt(user.uid, e)}
              >
                <div className="sb-name-role-row">
                  <div
                    className="sb-profile-name"
                    data-user-uid={user.uid}
                    data-profile-uid={user.uid}
                    data-role={loggedInUserProfile.badge ? 'badge_holder' : (loggedInUserProfile.role || 'user')}
                    data-badge={loggedInUserProfile.badge ? 'true' : 'false'}
                    data-gender={loggedInUserProfile.gender || 'male'}
                    data-is-bot="false"
                  >
                    <span
                      className="sb-username-text"
                      data-user-uid={user.uid}
                      data-user-id={user.uid}
                    >
                      {loggedInUserProfile.displayName || user.displayName || 'User'}
                    </span>
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
                {loggedInUserProfile.status && (
                  <div className="sb-profile-status">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,opacity:0.82}}>
                      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z" fill="#6d28d9"/>
                      <circle cx="5" cy="5" r="1.2" fill="#6d28d9" opacity="0.6"/>
                      <circle cx="19" cy="18" r="1" fill="#6d28d9" opacity="0.5"/>
                    </svg>
                    <span style={buildStatusStyle(loggedInUserProfile.statusStyles)}>
                      {loggedInUserProfile.status}
                    </span>
                  </div>
                )}
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
                  <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); (window.handleViewProfile || setProfileUser)(loggedInUserProfile); setDropdownUser(null); }}>
                    <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#6366f1" d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/></svg>
                    View Profile
                  </button>
                  {!auth.currentUser?.isAnonymous && (
                    <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); setShowEditProfileModal(true); setDropdownUser(null); }}>
                      <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#8b5cf6" d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83ZM3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25Z"/></svg>
                      Edit Profile
                    </button>
                  )}
                  {(() => {
                    const uRole = loggedInUserProfile.role?.toLowerCase();
                    const hasBadge = loggedInUserProfile.badge && loggedInUserProfile.badge !== '';
                    const isGuest = auth.currentUser?.isAnonymous || uRole === 'guest';
                    if (!isGuest && (hasBadge || ['admin','owner','moderator'].includes(uRole))) return (
                      <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); setShowStatusModal(true); setDropdownUser(null); }}>
                        <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#06b6d4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                        Change Status
                      </button>
                    );
                    return null;
                  })()}
                  <div className="sb-apd-divider" />
                  <button className="sb-apd-btn sb-apd-danger" onClick={async (e) => {
                    e.stopPropagation();
                    try { await signOut(auth); toast.success('Logged out!', { icon: TI.logout }); onClose(); window.location.href = '/login'; }
                    catch { toast.error('Logout failed!', { icon: TI.error }); }
                    setDropdownUser(null);
                  }}>
                    <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#ef4444" d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/></svg>
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
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <defs>
                <linearGradient id="tabUsersG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#7c3aed"/>
                </linearGradient>
              </defs>
              <path fill="url(#tabUsersG)" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            Users
            <span className="sb-tab-count">{filteredUsers.length}</span>
          </button>
          <button className={`sb-tab ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => setActiveTab('rooms')}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <defs>
                <linearGradient id="tabRoomsG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399"/>
                  <stop offset="100%" stopColor="#059669"/>
                </linearGradient>
              </defs>
              <path fill="url(#tabRoomsG)" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
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
                const isStaffRoom  = room.name.toLowerCase().includes('staff') || room.name.toLowerCase().includes('olympian');
                const isAdultRoom  = room.name.toLowerCase().includes('adult') || room.name.toLowerCase().includes('18+') || room.type === 'adult';
                const hasStaffAccess = loggedInUserProfile && ['owner','admin','moderator'].includes(loggedInUserProfile.role?.toLowerCase());
                const locked       = isStaffRoom && !hasStaffAccess;
                const hasPassword  = room.password && room.password.trim() !== '';
                const isLocked     = locked || hasPassword;
                return (
                  <div key={room.id}
                    className={`sb-room-card ${roomId === room.id ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={async () => {
                      if (!user?.uid && !localStorage.getItem('guestUser')) { toast.error('Please login.', { icon: TI.lock }); return; }
                      if (locked) { toast.error('Staff only.', { icon: TI.lock }); return; }
                      if (isAdultRoom) {
                        const ageKey = `ageVerified_${room.id}`;
                        const stored = localStorage.getItem(ageKey);
                        const isVerified = stored && (Date.now() - parseInt(stored)) < 24 * 60 * 60 * 1000;
                        if (!isVerified) { setPendingAdultRoom(room); setShowAdultModal(true); return; }
                      }
                      if (hasPassword) {
                        setPwRoom(room); setPwInput(''); setPwError(''); setShowPwModal(true); return;
                      }
                      try {
                        const kickSnap = await getDoc(doc(db, 'rooms', room.id, 'kickedUsers', user.uid));
                        if (kickSnap.exists()) { toast.error(`You've been kicked from ${room.name}.`, { icon: TI.kick }); navigate('/'); onClose(); return; }
                      } catch {}
                      navigate(`/room/${room.id}`); onClose();
                    }}
                  >
                    <div className="sb-room-icon">{getRoomIcon(room.name)}</div>
                    <div className="sb-room-name">{room.name}</div>
                    <div style={{display:'flex',alignItems:'center',gap:'3px',marginLeft:'auto',flexShrink:0}}>
                      {isAdultRoom && (
                        <div title="Adults Only (18+)" style={{
                          display:'flex', alignItems:'center', justifyContent:'center',
                          width:18, height:18, borderRadius:'50%',
                          background:'linear-gradient(135deg,#ec4899,#a855f7)',
                          boxShadow:'0 0 6px rgba(236,72,153,0.7)',
                          animation:'sbAdultPulse 2.5s ease-in-out infinite',
                          flexShrink:0
                        }}>
                          <span style={{fontSize:'7px',fontWeight:900,color:'#fff',letterSpacing:'-0.03em',lineHeight:1}}>18+</span>
                        </div>
                      )}
                      {isLocked && (
                        <div title={hasPassword ? 'Password Protected' : 'Staff Only'} style={{
                          display:'flex', alignItems:'center', justifyContent:'center',
                          width:18, height:18, borderRadius:'50%',
                          background: hasPassword ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#f59e0b,#ef4444)',
                          boxShadow: hasPassword ? '0 0 6px rgba(124,58,237,0.7)' : '0 0 6px rgba(245,158,11,0.7)',
                          flexShrink:0
                        }}>
                          <svg viewBox="0 0 24 24" width="10" height="10" fill="white">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (

            /* USERS TAB */
            <ul className="sb-user-list">
              {filteredUsers.map(userItem => {
                const isSelf       = user?.uid === userItem.uid;
                const statusEntry  = window.userOnlineStatuses?.[userItem.uid];
                const isOnline     = (window.onlineUsers?.has(userItem.uid) || statusEntry?.state === 'online' || userItem.isOnline)
                                   && statusEntry?.showOnlineStatus !== false;
                const isGuest   = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role?.toLowerCase() === 'guest' || localStorage.getItem('isGuest') === 'true' || auth.currentUser?.isAnonymous;
                const tIsGuest  = userItem.isGuest === true || userItem.role?.toLowerCase() === 'guest';
                const tIsStaff  = ['owner','admin','moderator'].includes(userItem.role?.toLowerCase());
                const limited   = isGuest || tIsGuest;
                const pill      = getRolePill(userItem.role);
                const showMod   = !isSelf && canModerate(userItem);
                const showMute  = showMod && canDoMute(userItem);
                const showKick  = showMod && canDoKick(userItem);
                const showBan   = showMod && canDoBan(userItem);

                const isRowSelected = selectedUser === userItem.uid;

                return (
                  <li key={userItem.uid} className={`sb-user-item ${getBorderClass(userItem)} ${isRowSelected ? 'sb-row-selected' : ''}`}>
                    {/* Avatar — click opens dropdown */}
                    <button
                      className="sb-user-avatar-wrap"
                      data-sb-trigger="true"
                      disabled={isSelf}
                      onClick={(e) => {
                        if (!isSelf) {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedUser(null);
                          openDropdownAt(userItem.uid, e);
                        }
                      }}
                    >
                      <img
                        className="sb-list-avatar"
                        src={getAvatarUrl(userItem.uid, userItem.gender, userItem.photoURL)}
                        alt="avatar"
                        data-user-uid={userItem.uid}
                      />
                      <span className={`sb-dot ${isOnline ? 'online' : 'offline'}`} />
                    </button>

                    {/* Info — click toggles mod action visibility */}
                    <div
                      className="sb-user-info"
                      style={{ cursor: isSelf ? 'default' : 'pointer', flex: 1, minWidth: 0 }}
                      onClick={(e) => {
                        if (!isSelf) {
                          e.preventDefault();
                          e.stopPropagation();
                          setDropdownUser(null);
                          setSelectedUser(prev => prev === userItem.uid ? null : userItem.uid);
                        }
                      }}
                    >
                      <div className="sb-user-name-row">
                        <span
                          className="sb-list-username"
                          data-user-uid={userItem.uid}
                          data-role={userItem.badge ? 'badge_holder' : (userItem.role || 'user')}
                          data-badge={userItem.badge ? 'true' : 'false'}
                          data-gender={userItem.gender || 'male'}
                          data-is-bot="false"
                        >
                          <span
                            className="sb-username-text"
                            data-user-uid={userItem.uid}
                            data-user-id={userItem.uid}
                          >
                            {userItem.displayName || 'Anonymous'}
                          </span>
                          {userItem.badge && badges[userItem.badge] && (
                            <span className="inline-badge" title={badges[userItem.badge].name}
                              dangerouslySetInnerHTML={{ __html: badges[userItem.badge].svg }} />
                          )}
                        </span>
                        <span className="sb-user-role-pill" style={{ background: pill.bg, color: pill.color }}>
                          {getRoleDisplayLabel({ role: userItem.role, gender: userItem.gender, isGuest: tIsGuest, badge: userItem.badge })}
                        </span>
                      </div>
                      {userItem.status && (
                        <div className="sb-user-status">
                          <svg width="7" height="7" viewBox="0 0 24 24" style={{flexShrink:0,opacity:0.7}} fill="#7c3aed">
                            <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/>
                          </svg>
                          <span style={buildStatusStyle(userItem.statusStyles)}>
                            {userItem.status}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Mod action buttons — hidden by default, appear on hover OR row-click */}
                    {(showMute || showKick || showBan) && (
                      <div className={`sb-mod-actions${isRowSelected ? ' sb-mod-visible' : ''}`}>
                        {showMute && (
                          <button
                            className={`sb-mod-btn ${userItem.mutedInfo?.isMuted ? 'unmute' : 'mute'}`}
                            title={userItem.mutedInfo?.isMuted ? 'Unmute User' : 'Mute User'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (userItem.mutedInfo?.isMuted) {
                                updateDoc(doc(db, 'users', userItem.uid), {
                                  "mutedInfo.isMuted": false, "mutedInfo.reason": "",
                                  "mutedInfo.unmutedAt": serverTimestamp(),
                                  "mutedInfo.unmutedBy": loggedInUserProfile?.displayName || 'admin'
                                }).then(() => sendTingleBotMessage(`${userItem.displayName} has been unmuted and can speak again.`, 'system'))
                                  .catch(() => toast.error('Unmute failed.'));
                              } else {
                                setAdminModalUser(userItem);
                                setAdminModalType('mute');
                                setAdminModalVisible(true);
                              }
                            }}
                          >
                            {userItem.mutedInfo?.isMuted ? (
                              /* Unmute — mic ON (green) */
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                                <path fill="#10b981" d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.44 6 6.93V21h2v-2.07c3.39-.49 6-3.4 6-6.93h-2z"/>
                              </svg>
                            ) : (
                              /* Mute — mic OFF with slash (amber) */
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                                <path fill="#f59e0b" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V6c0-1.66-1.34-3-3-3S9 4.34 9 6v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                              </svg>
                            )}
                          </button>
                        )}
                        {showKick && (
                          <button
                            className={`sb-mod-btn ${kickedUserIds.has(userItem.uid) ? 'unkick' : 'kick'}`}
                            title={kickedUserIds.has(userItem.uid) ? 'Unkick User' : 'Kick from Room'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (kickedUserIds.has(userItem.uid)) {
                                openUnkickModal(userItem);
                              } else {
                                openKickModal(userItem);
                              }
                            }}
                          >
                            {kickedUserIds.has(userItem.uid) ? (
                              /* Unkick — return/re-enter icon (cyan) */
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                                <path fill="#06b6d4" d="M16 13v-3l-5 5 5 5v-3h6v-4h-6zm-4 8H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h7c1.1 0 2 .9 2 2v2h-2V5H5v14h7v-2h2v2c0 1.1-.9 2-2 2z"/>
                              </svg>
                            ) : (
                              /* Kick — exit-door icon (orange) */
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                                <path fill="#f97316" d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                              </svg>
                            )}
                          </button>
                        )}
                        {showBan && (
                          <button
                            className={`sb-mod-btn ${userItem.isBanned ? 'unban' : 'ban'}`}
                            title={userItem.isBanned ? 'Unban User' : 'Ban User'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (userItem.isBanned) {
                                updateDoc(doc(db, 'users', userItem.uid), {
                                  isBanned: false, banReason: null, bannedAt: null,
                                  unbannedAt: serverTimestamp(),
                                  unbannedBy: loggedInUserProfile?.displayName || 'admin'
                                }).then(() => sendTingleBotMessage(`${userItem.displayName} has been unbanned and can rejoin.`, 'system'))
                                  .catch(() => toast.error('Unban failed.'));
                              } else {
                                setAdminModalUser(userItem);
                                setAdminModalType('ban');
                                setAdminModalVisible(true);
                              }
                            }}
                          >
                            {userItem.isBanned ? (
                              /* Unban — check-circle (green) */
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                                <path fill="#22c55e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            ) : (
                              /* Ban — no-entry circle (red) */
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                                <path fill="#ef4444" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm4.3 14.3L7.7 7.7C9.14 6.64 10.99 6 13 6c3.87 0 7 3.13 7 7 0 2.01-.64 3.86-1.7 5.3zM5 12c0-2.01.64-3.86 1.7-5.3l8.6 8.6C13.86 16.36 12.01 17 11 17c-3.87 0-7-3.13-7-7z"/>
                              </svg>
                            )}
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

                          <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); (window.handleViewProfile || setProfileUser)(userItem); setDropdownUser(null); }}>
                            <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#6366f1" d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/></svg>
                            View Profile
                          </button>

                          {!limited && (
                            <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); if (window.handleAddFriendFromSidebar) window.handleAddFriendFromSidebar(userItem); else toast.info(`Adding ${userItem.displayName} as friend`); setDropdownUser(null); }}>
                              <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#10b981" d="M15 14c-2.67 0-8 1.33-8 4v2h16v-2c0-2.67-5.33-4-8-4m0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 10H2v2h3v3h2v-3h3v-2H7V7H5v3z"/></svg>
                              Add Friend
                            </button>
                          )}

                          <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); if (window.handlePrivateMessageFromSidebar) window.handlePrivateMessageFromSidebar(userItem); else toast.info(`Opening PM with ${userItem.displayName}`); setDropdownUser(null); }}>
                            <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#3b82f6" d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
                            Send Message
                          </button>

                          {!limited && (
                            <button className="sb-apd-btn" onClick={(e) => { e.stopPropagation(); if (window.handleWhisperFromSidebar) window.handleWhisperFromSidebar(userItem); else toast.info(`Whispering to ${userItem.displayName}`); setDropdownUser(null); }}>
                              <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#06b6d4" d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2M13 11h-2V9h2v2m0 4h-2v-2h2v2z"/></svg>
                              Whisper
                            </button>
                          )}

                          {!tIsStaff && (
                            <>
                              <div className="sb-apd-divider"/>
                              <button className="sb-apd-btn sb-apd-danger" onClick={(e) => { e.stopPropagation(); if (window.handleBlockUserFromSidebar) window.handleBlockUserFromSidebar(userItem); else toast.info(`Blocking ${userItem.displayName}`); setDropdownUser(null); }}>
                                <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#ef4444" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 2c2.01 0 3.86.64 5.3 1.7L5.7 17.3A7.93 7.93 0 0 1 4 12c0-4.42 3.58-8 8-8m0 16c-2.01 0-3.86-.64-5.3-1.7L18.3 6.7A7.93 7.93 0 0 1 20 12c0 4.42-3.58 8-8 8z"/></svg>
                                Block User
                              </button>
                            </>
                          )}

                          {/* Mod section in dropdown */}
                          {(showMute || showKick || showBan) && (
                            <>
                              <div className="sb-apd-divider"/>
                              <div className="sb-apd-mod-label">
                                <svg viewBox="0 0 24 24" width="11" height="11"><path fill="#7c3aed" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                                Moderation
                              </div>
                              {showMute && (
                                <button className="sb-apd-btn sb-apd-warn" onClick={(e) => {
                                  e.stopPropagation();
                                  if (userItem.mutedInfo?.isMuted) {
                                    updateDoc(doc(db, 'users', userItem.uid), { "mutedInfo.isMuted": false, "mutedInfo.reason": "", "mutedInfo.unmutedAt": serverTimestamp(), "mutedInfo.unmutedBy": loggedInUserProfile?.displayName || 'admin' })
                                      .then(() => sendTingleBotMessage(`${userItem.displayName} has been unmuted and can speak again.`, 'system')).catch(() => toast.error('Failed'));
                                  } else {
                                    setAdminModalUser(userItem); setAdminModalType('mute'); setAdminModalVisible(true);
                                  }
                                  setDropdownUser(null);
                                }}>
                                  <svg viewBox="0 0 24 24" width="15" height="15">
                                    {userItem.mutedInfo?.isMuted
                                      ? <path fill="#10b981" d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V5a3 3 0 0 1 3-3m7 9c0 3.53-2.61 6.44-6 6.93V21h-2v-3.07C7.61 17.44 5 14.53 5 11h2a5 5 0 0 0 5 5 5 5 0 0 0 5-5h2z"/>
                                      : <path fill="#f59e0b" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>}
                                  </svg>
                                  {userItem.mutedInfo?.isMuted ? 'Unmute User' : 'Mute User'}
                                </button>
                              )}
                              {showKick && (
                                <button className={`sb-apd-btn ${kickedUserIds.has(userItem.uid) ? 'sb-apd-cyan' : 'sb-apd-orange'}`} onClick={(e) => {
                                  e.stopPropagation();
                                  if (kickedUserIds.has(userItem.uid)) {
                                    openUnkickModal(userItem);
                                  } else {
                                    openKickModal(userItem);
                                  }
                                  setDropdownUser(null);
                                }}>
                                  {kickedUserIds.has(userItem.uid) ? (
                                    <svg viewBox="0 0 24 24" width="15" height="15">
                                      <path fill="#06b6d4" d="M16 13v-3l-5 5 5 5v-3h6v-4h-6zm-4 8H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h7c1.1 0 2 .9 2 2v2h-2V5H5v14h7v-2h2v2c0 1.1-.9 2-2 2z"/>
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 24 24" width="15" height="15">
                                      <path fill="#f97316" d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"/>
                                    </svg>
                                  )}
                                  {kickedUserIds.has(userItem.uid) ? 'Unkick User' : 'Kick from Room'}
                                </button>
                              )}
                              {showBan && (
                                <button className={`sb-apd-btn ${userItem.isBanned ? 'sb-apd-green' : 'sb-apd-danger'}`} onClick={(e) => {
                                  e.stopPropagation();
                                  if (userItem.isBanned) {
                                    updateDoc(doc(db, 'users', userItem.uid), { isBanned: false, banInfo: null, banReason: null, bannedAt: null, unbannedAt: serverTimestamp(), unbannedBy: loggedInUserProfile?.displayName || 'admin' })
                                      .then(() => sendTingleBotMessage(`${userItem.displayName} has been unbanned and can rejoin.`, 'system')).catch(() => toast.error('Failed'));
                                  } else {
                                    setAdminModalUser(userItem); setAdminModalType('ban'); setAdminModalVisible(true);
                                  }
                                  setDropdownUser(null);
                                }}>
                                  <svg viewBox="0 0 24 24" width="15" height="15">
                                    {userItem.isBanned
                                      ? <path fill="#22c55e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                      : <path fill="#ef4444" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm4.3 14.3L7.7 7.7C9.14 6.64 10.99 6 13 6c3.87 0 7 3.13 7 7 0 2.01-.64 3.86-1.7 5.3zM5 12c0-2.01.64-3.86 1.7-5.3l8.6 8.6C13.86 16.36 12.01 17 11 17c-3.87 0-7-3.13-7-7z"/>}
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
      <AdminBanKickModal
        isVisible={adminModalVisible}
        onClose={() => setAdminModalVisible(false)}
        selectedUser={adminModalUser}
        actionType={adminModalType}
        onConfirm={handleAdminModalConfirm}
        currentUserProfile={loggedInUserProfile}
        currentRoomId={roomId}
        currentRoomName={rooms.find(r => r.id === roomId)?.name || ''}
      />

      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSuccess={() => setShowEditProfileModal(false)}
        />
      )}

      {showStatusModal && (
        <StatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          currentUser={loggedInUserProfile}
        />
      )}

      {showAdultModal && pendingAdultRoom && (
        <AdultRoomModal
          isOpen={showAdultModal}
          roomName={pendingAdultRoom.name}
          onConfirm={async () => {
            const ageKey = `ageVerified_${pendingAdultRoom.id}`;
            localStorage.setItem(ageKey, Date.now().toString());
            setShowAdultModal(false);
            const room = pendingAdultRoom;
            setPendingAdultRoom(null);
            if (room.password && room.password.trim() !== '') {
              setPwRoom(room); setPwInput(''); setPwError(''); setShowPwModal(true); return;
            }
            try {
              const kickSnap = await getDoc(doc(db, 'rooms', room.id, 'kickedUsers', user.uid));
              if (kickSnap.exists()) { toast.error(`You've been kicked from ${room.name}.`, { icon: TI.kick }); navigate('/'); onClose(); return; }
            } catch {}
            navigate(`/room/${room.id}`); onClose();
          }}
          onCancel={() => { setShowAdultModal(false); setPendingAdultRoom(null); }}
        />
      )}

      {showPwModal && pwRoom && createPortal(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100000,padding:'16px',fontFamily:'Inter,-apple-system,sans-serif'}}>
          <div style={{background:'linear-gradient(150deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)',border:'1.5px solid rgba(99,102,241,0.4)',borderRadius:'20px',width:'100%',maxWidth:'380px',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,0.6),0 0 60px rgba(99,102,241,0.15)'}}>
            <div style={{padding:'28px 24px 20px',borderBottom:'1px solid rgba(99,102,241,0.2)',textAlign:'center'}}>
              <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))',border:'2px solid rgba(99,102,241,0.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 0 0 8px rgba(99,102,241,0.06)'}}>
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                  <defs><linearGradient id="pwLockGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="url(#pwLockGrad)"/>
                </svg>
              </div>
              <div style={{fontSize:'18px',fontWeight:800,color:'#e2e8f0',marginBottom:'6px',letterSpacing:'-0.02em'}}>Password Required</div>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',lineHeight:1.5}}>
                <span style={{color:'#a5b4fc',fontWeight:600}}>{pwRoom.name}</span> is password-protected
              </div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{marginBottom:'12px'}}>
                <input
                  type="password"
                  placeholder="Enter room password…"
                  value={pwInput}
                  onChange={e => { setPwInput(e.target.value); setPwError(''); }}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      if (pwInput.trim() === pwRoom.password) {
                        setShowPwModal(false);
                        const room = pwRoom; setPwRoom(null);
                        try {
                          const kickSnap = await getDoc(doc(db, 'rooms', room.id, 'kickedUsers', user.uid));
                          if (kickSnap.exists()) { toast.error(`You've been kicked from ${room.name}.`, { icon: TI.kick }); navigate('/'); onClose(); return; }
                        } catch {}
                        navigate(`/room/${room.id}`); onClose();
                      } else { setPwError('Incorrect password. Please try again.'); }
                    }
                  }}
                  autoFocus
                  style={{width:'100%',padding:'12px 14px',borderRadius:'12px',border:`1.5px solid ${pwError ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.3)'}`,background:'rgba(255,255,255,0.06)',color:'#e2e8f0',fontSize:'14px',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                />
                {pwError && <div style={{fontSize:'12px',color:'#f87171',marginTop:'6px',paddingLeft:'4px'}}>{pwError}</div>}
              </div>
              <div style={{display:'flex',gap:'10px'}}>
                <button
                  onClick={() => { setShowPwModal(false); setPwRoom(null); setPwInput(''); setPwError(''); }}
                  style={{flex:'0 0 100px',height:'44px',borderRadius:'12px',border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.65)',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}
                >Cancel</button>
                <button
                  onClick={async () => {
                    if (pwInput.trim() === pwRoom.password) {
                      setShowPwModal(false);
                      const room = pwRoom; setPwRoom(null);
                      try {
                        const kickSnap = await getDoc(doc(db, 'rooms', room.id, 'kickedUsers', user.uid));
                        if (kickSnap.exists()) { toast.error(`You've been kicked from ${room.name}.`, { icon: TI.kick }); navigate('/'); onClose(); return; }
                      } catch {}
                      navigate(`/room/${room.id}`); onClose();
                    } else { setPwError('Incorrect password. Please try again.'); }
                  }}
                  style={{flex:1,height:'44px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#6366f1,#7c3aed)',color:'#fff',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(99,102,241,0.4)'}}
                >Enter Room</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Sidebar;
