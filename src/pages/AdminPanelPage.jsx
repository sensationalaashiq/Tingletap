
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import { useLiveDisplayName } from '../utils/liveUsernames';
import { useNavigate } from 'react-router-dom';
import { auth, db, rtdb } from '../firebase/config';
import { collection, collectionGroup, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, setDoc, where, addDoc, serverTimestamp, getDocs, getDoc, limit, Timestamp } from 'firebase/firestore';
import { nameToSlug } from '../utils/roomSlug';
import { ref, onValue, remove, update as rtdbUpdate } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ToastContainer } from 'react-toastify';
import AdminBanKickModal from '../components/AdminBanKickModal';
import AdminCoinsPanel from '../components/admin/AdminCoinsPanel';
import '../components/admin/AdminCoinsPanel.css';
import AdminVisitorsPanel from '../components/admin/AdminVisitorsPanel';
import '../components/admin/AdminVisitorsPanel.css';
import { IPBanSystem } from '../utils/ipBanSystem';
import { DeviceBanSystem } from '../utils/deviceBanSystem';
import { DeviceFingerprint } from '../utils/deviceFingerprint';
import { Badges } from '../data/Badges.jsx';
import RoyalTrustBadge from '../components/RoyalTrustBadge';
import { TRUST_RANKS, getRankFromScore, updateTrustScore } from '../utils/trustSystem';
import { pt } from '../utils/premiumToast';
import BadgeVerificationPanel from '../components/admin/BadgeVerificationPanel';
import '../components/admin/BadgeVerificationPanel.css';
import RJVerificationPanel from '../components/admin/RJVerificationPanel';
import '../components/RoyalTrustBadge.css';
import './AdminPanelPage.css';

// Extract just the brand name from a device model string for admin panel display
// Resolves a uid's CURRENT username live so admin lists (reports, security
// center, feedback, modlogs) reflect a rename (self or admin) instantly
// instead of showing the name copy that was stored at write time.
const LiveAdminUserName = ({ uid, fallback }) => useLiveDisplayName(uid, fallback) || fallback || 'Unknown';

const extractDeviceBrand = (model) => {
  if (!model || model === 'Unknown Device') return 'Unknown';
  if (/^Apple |^iPhone|^iPad/i.test(model)) return 'Apple';
  if (/^Samsung|^SM-/i.test(model)) return 'Samsung';
  if (/^Xiaomi/i.test(model)) return 'Xiaomi';
  if (/^Redmi/i.test(model)) return 'Xiaomi';
  if (/^POCO/i.test(model)) return 'Xiaomi';
  if (/^OPPO|^CPH\d/i.test(model)) return 'OPPO';
  if (/^vivo /i.test(model)) return 'vivo';
  if (/^OnePlus/i.test(model)) return 'OnePlus';
  if (/^Realme/i.test(model)) return 'Realme';
  if (/^Motorola|^moto /i.test(model)) return 'Motorola';
  if (/^Nokia/i.test(model)) return 'Nokia';
  if (/^Nothing/i.test(model)) return 'Nothing';
  if (/^Infinix/i.test(model)) return 'Infinix';
  if (/^Tecno/i.test(model)) return 'Tecno';
  if (/^Huawei/i.test(model)) return 'Huawei';
  if (/^Honor/i.test(model)) return 'Honor';
  if (/^itel/i.test(model)) return 'itel';
  if (/^Google/i.test(model)) return 'Google';
  if (/Android Device|Desktop Device|Mobile Device|Tablet Device/i.test(model)) return model;
  const first = model.split(/[\s(]/)[0];
  return first || model;
};

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Real-time data states
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [bannedIPs, setBannedIPs] = useState([]);
  const [bannedDevices, setBannedDevices] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    bannedUsers: 0,
    mutedUsers: 0,
    totalRooms: 0,
    activeRooms: 0,
    bannedIPs: 0,
    bannedDevices: 0,
    pendingReports: 0
  });
  
  // Moderation states  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [actionType, setActionType] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isRoleReady, setIsRoleReady] = useState(false);

  // DevBan modal
  const [showDevBanModal, setShowDevBanModal] = useState(false);
  const [devBanTarget, setDevBanTarget] = useState(null);
  const [devBanReason, setDevBanReason] = useState('');
  const [devBanning, setDevBanning] = useState(false);

  // UnDevBan modal
  const [showUnDevBanModal, setShowUnDevBanModal] = useState(false);
  const [unDevBanTarget, setUnDevBanTarget] = useState(null);
  const [unDevBanning, setUnDevBanning] = useState(false);

  // Delete User modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Delete Room modal
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [deleteRoomTarget, setDeleteRoomTarget] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  // Edit Room modal
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [editRoomTarget, setEditRoomTarget] = useState(null);
  const [editRoomData, setEditRoomData] = useState({ name: '', description: '', type: 'public', maxUsers: 50, password: '', order: '' });
  const [showEditPw, setShowEditPw] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);

  // Assign Badge modal
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeTarget, setBadgeTarget] = useState(null);
  const [assigningBadge, setAssigningBadge] = useState(false);

  // Change Role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [changingRole, setChangingRole] = useState(false);
  
  // Pagination
  const [userPage, setUserPage] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);
  const USERS_PER_PAGE = 15;

  // Create Room modal
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createRoomData, setCreateRoomData] = useState({
    name: '', description: '', type: 'public', maxUsers: 50, password: '', order: ''
  });
  const [showCreatePw, setShowCreatePw] = useState(false);

  // Change Email modal (Owner only)
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [changeEmailTarget, setChangeEmailTarget] = useState(null);
  const [changeEmailValue, setChangeEmailValue] = useState('');
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);

  // Change Username modal (Owner only — no time-limit restrictions)
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false);
  const [changeUsernameTarget, setChangeUsernameTarget] = useState(null);
  const [changeUsernameValue, setChangeUsernameValue] = useState('');
  const [changeUsernameLoading, setChangeUsernameLoading] = useState(false);

  // IP Geolocation cache
  const [ipGeoCache, setIpGeoCache] = useState({});

  // Reports & Appeals
  const [reports, setReports] = useState([]);
  const [reportSubTab, setReportSubTab] = useState('all');
  const [reportActionLoading, setReportActionLoading] = useState({});

  // Trust Leaderboard
  const [trustSearch, setTrustSearch] = useState('');
  const [trustAdjustTarget, setTrustAdjustTarget] = useState(null);
  const [trustAdjustDelta, setTrustAdjustDelta] = useState('');
  const [trustAdjusting, setTrustAdjusting] = useState(false);
  const [trustSortBy, setTrustSortBy] = useState('score_desc');

  // Violations Dashboard (modLogs)
  const [violations, setViolations] = useState([]);
  const [violationsFilter, setViolationsFilter] = useState('all');
  const [violationsShowResolved, setViolationsShowResolved] = useState(false);

  // Feedback & Complaints
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all');
  const [feedbackSort, setFeedbackSort] = useState('newest');
  const [feedbackReplyOpen, setFeedbackReplyOpen] = useState(null);
  const [feedbackReplyStatus, setFeedbackReplyStatus] = useState('');
  const [feedbackReplyText, setFeedbackReplyText] = useState('');
  const [feedbackReplySending, setFeedbackReplySending] = useState(false);

  // Unkick modal
  const [showUnkickModal, setShowUnkickModal] = useState(false);
  const [unkickTarget, setUnkickTarget] = useState(null);
  const [unkicking, setUnkicking] = useState(false);

  // All kicked users across all rooms
  const [kickedUsersList, setKickedUsersList] = useState([]);
  const [kickedUsersLoading, setKickedUsersLoading] = useState(false);
  const [quickUnkickingId, setQuickUnkickingId] = useState(null);

  // Unmute modal
  const [showUnmuteModal, setShowUnmuteModal] = useState(false);
  const [unmuteTarget, setUnmuteTarget] = useState(null);
  const [unmuteLoading, setUnmuteLoading] = useState(false);

  // Resolve violation modal
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Inline confirmation IDs (replaces window.confirm — works in all contexts)
  const [confirmUnbanIPId, setConfirmUnbanIPId]         = useState(null); // ipBan.id pending unban
  const [confirmDeleteIPId, setConfirmDeleteIPId]       = useState(null); // ipBan.id pending delete
  const [confirmDeleteViolId, setConfirmDeleteViolId]   = useState(null); // violation.id pending delete
  const [confirmDeleteReportId, setConfirmDeleteReportId] = useState(null); // report.id pending delete

  const fetchIPGeo = async (ip) => {
    if (!ip || ip === 'Unknown' || ip === 'N/A' || ipGeoCache[ip] !== undefined) return;
    setIpGeoCache(prev => ({ ...prev, [ip]: null }));
    try {
      // Use our server-side Netlify function — never exposes ABSTRACT_API_KEY to client
      const res = await fetch(`/.netlify/functions/ip-geo?ip=${encodeURIComponent(ip)}`);
      const data = await res.json();
      if (data && !data._error) {
        setIpGeoCache(prev => ({ ...prev, [ip]: {
          status:     'success',
          country:    data.country    || null,
          city:       data.city       || null,
          regionName: data.region     || null,
          lat:        data.lat        ?? null,
          lon:        data.lon        ?? null,
          isp:        data.isp        || null,
          org:        data.organization || null,
          timezone:   data.timezone   || null,
        }}));
      } else {
        setIpGeoCache(prev => ({ ...prev, [ip]: false }));
      }
    } catch {
      setIpGeoCache(prev => ({ ...prev, [ip]: false }));
    }
  };

  // Check admin permissions + auto-fix legacy superowner role
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        let userData = docSnap.data();
        // Permanent fix: convert any legacy 'superowner' → 'owner' in Firestore immediately
        if (userData.role === 'superowner') {
          try { await updateDoc(userRef, { role: 'owner' }); } catch {}
          userData = { ...userData, role: 'owner' };
        }
        setCurrentUserProfile(userData);
        if (userData.role !== 'owner') {
          pt.error('Access denied. Owner privileges required.');
          navigate('/');
        } else {
          setIsRoleReady(true);
        }
      } else {
        navigate('/');
      }
    });
    
    return () => unsubscribe();
  }, [user, navigate]);

  // Real-time users data
  useEffect(() => {
    if (!isRoleReady) return;
    const usersQuery = query(collection(db, 'users'), limit(100));
    const unsubscribe = onSnapshot(usersQuery,
      (snapshot) => {
        const usersData = snapshot.docs
          .map(doc => ({ id: doc.id, uid: doc.data().uid || doc.id, ...doc.data() }))
          .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setUsers(usersData);
        setStats(prev => ({
          ...prev,
          totalUsers: usersData.length,
          bannedUsers: usersData.filter(u => u.isBanned).length,
          mutedUsers: usersData.filter(u => u.mutedInfo?.isMuted).length
        }));
        setLoading(false);
      },
      (err) => {
        console.error('Users query error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [isRoleReady]);

  // Real-time user status from RTDB
  // Presence is now written to status/{roomId}/{uid} (room-scoped paths).
  // We flatten the nested {roomId: {uid: data}} structure into the same
  // {uid: data} shape that all downstream consumers expect, adding a
  // _roomId field so write operations can derive the correct path.
  useEffect(() => {
    // FIX 7: Production should replace this with a Cloud Function aggregate
    // that pre-computes online counts and writes them to a small RTDB node.
    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      // FIX 7: Status is flat: status/{uid} = { state, currentRoomId, last_changed, ... }
      const raw = snapshot.val() || {};
      const statuses = {};
      Object.entries(raw).forEach(([uid, data]) => {
        // Skip entries that are not user status objects (sanity check)
        if (data && typeof data === 'object' && ('state' in data || 'last_changed' in data)) {
          statuses[uid] = data;
        }
      });
      // FIX 7: Keep only the newest 200 entries in memory — do NOT modify the database.
      const entries = Object.entries(statuses);
      if (entries.length > 200) {
        entries.sort(([, a], [, b]) => (b.last_changed || 0) - (a.last_changed || 0));
        const trimmed = {};
        entries.slice(0, 200).forEach(([uid, data]) => { trimmed[uid] = data; });
        setOnlineStatuses(trimmed);
      } else {
        setOnlineStatuses(statuses);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Dedicated effect — only count UIDs that exist in Firestore users (removes stale RTDB entries)
  useEffect(() => {
    const knownUids = new Set(users.map(u => u.id));
    const onlineCount = Object.entries(onlineStatuses).filter(
      ([uid, s]) => s?.state === 'online' && knownUids.has(uid)
    ).length;
    setStats(prev => ({ ...prev, onlineUsers: onlineCount }));
  }, [onlineStatuses, users]);

  // Auto-expiry: lift timed bans and mutes when their duration expires
  const usersSnapshot = useRef([]);
  useEffect(() => { usersSnapshot.current = users; }, [users]);
  useEffect(() => {
    const autoExpiry = async () => {
      const now = new Date().toISOString();
      const current = usersSnapshot.current;
      const expiredBans = current.filter(
        u => u.isBanned && u.banInfo?.banUntil && u.banInfo.banUntil <= now
      );
      const expiredMutes = current.filter(
        u => u.mutedInfo?.isMuted && u.mutedInfo?.muteUntil && u.mutedInfo.muteUntil <= now
      );
      for (const u of expiredBans) {
        try {
          await updateDoc(doc(db, 'users', u.id || u.uid), { isBanned: false, banInfo: null });
        } catch {}
      }
      for (const u of expiredMutes) {
        try {
          await updateDoc(doc(db, 'users', u.id || u.uid), {
            'mutedInfo.isMuted': false,
            'mutedInfo.muteUntil': null,
            'mutedInfo.reason': null,
            'mutedInfo.mutedBy': null,
          });
        } catch {}
      }
    };
    autoExpiry();
    const iv = setInterval(autoExpiry, 30000);
    return () => clearInterval(iv);
  }, []);

  // Real-time rooms data
  useEffect(() => {
    const roomsQuery = query(collection(db, 'rooms'), orderBy('order'), limit(500));
    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(roomsData);
      
      setStats(prev => ({
        ...prev,
        totalRooms: roomsData.length,
        activeRooms: roomsData.filter(room => room.isActive !== false).length
      }));
    });
    
    return () => unsubscribe();
  }, []);

  // Kicked users are loaded manually via the Refresh button in the Rooms tab.
  // Removed the auto-trigger on tab switch to avoid an unbounded collectionGroup
  // scan firing every time the admin navigates to the Rooms tab.

  // Auto-expiry: clear kicked users whose duration has elapsed
  useEffect(() => {
    const parseDurationMs = (d) => {
      if (!d || d === 'permanent') return null;
      const m = String(d).match(/(\d+)\s*(min|hour|day|week)/i);
      if (!m) return null;
      const n = parseInt(m[1]);
      const u = m[2].toLowerCase();
      if (u.startsWith('min'))  return n * 60000;
      if (u.startsWith('hour')) return n * 3600000;
      if (u.startsWith('day'))  return n * 86400000;
      if (u.startsWith('week')) return n * 604800000;
      return null;
    };
    const checkExpiry = async () => {
      const now = Date.now();
      const expired = kickedUsersList.filter(k => {
        const durMs = parseDurationMs(k.kickDuration);
        if (!durMs) return false;
        const kickedMs = k.kickedAt?.toDate ? k.kickedAt.toDate().getTime() : (k.kickedAt?.seconds ? k.kickedAt.seconds * 1000 : null);
        return kickedMs && (now - kickedMs) >= durMs;
      });
      if (!expired.length) return;
      await Promise.all(expired.map(k =>
        deleteDoc(doc(db, 'rooms', k.roomId, 'kickedUsers', k.uid)).catch(() => {})
      ));
      setKickedUsersList(prev => prev.filter(k => !expired.find(e => e.uid === k.uid && e.roomId === k.roomId)));
    };
    if (kickedUsersList.length > 0) {
      checkExpiry();
      const iv = setInterval(checkExpiry, 60000);
      return () => clearInterval(iv);
    }
  }, [kickedUsersList.length]);

  // Real-time banned IPs data
  useEffect(() => {
    const bannedIPsQuery = query(collection(db, 'bannedIPs'), where('isActive', '!=', false), limit(30));
    const unsubscribe = onSnapshot(bannedIPsQuery, (snapshot) => {
      const ipsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setBannedIPs(ipsData);
      setStats(prev => ({ ...prev, bannedIPs: ipsData.length }));
    });
    
    return () => unsubscribe();
  }, []);

  // Real-time reports data
  useEffect(() => {
    const reportsQuery = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(reportsData);
      setStats(prev => ({
        ...prev,
        pendingReports: reportsData.filter(r => r.status === 'pending').length
      }));
    });
    return () => unsubscribe();
  }, []);

  // Real-time banned devices data
  useEffect(() => {
    const bannedDevicesQuery = query(collection(db, 'bannedDevices'), where('isActive', '!=', false), limit(500));
    const unsubscribe = onSnapshot(bannedDevicesQuery, (snapshot) => {
      const devicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBannedDevices(devicesData);
      
      setStats(prev => ({
        ...prev,
        bannedDevices: devicesData.length
      }));
    });
    
    return () => unsubscribe();
  }, []);


  // Real-time violations (modLogs from TingleBot AutoMod)
  useEffect(() => {
    if (!isRoleReady) return;
    const q = query(collection(db, 'modLogs'), orderBy('timestamp', 'desc'), limit(30));
    const unsub = onSnapshot(q, snap => {
      setViolations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('modLogs listener error:', err.message));
    return () => unsub();
  }, [isRoleReady]);

  // Real-time feedback & complaints
  useEffect(() => {
    if (!isRoleReady) return;
    const q = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'), limit(30));
    const unsub = onSnapshot(q, snap => {
      setFeedbackItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('feedback listener error:', err.message));
    return () => unsub();
  }, [isRoleReady]);

  // Auto-cleanup: 48h violations/spam/abuse/reports, 24h guest sessions
  useEffect(() => {
    if (!isRoleReady) return;
    const runCleanup = async () => {
      try {
        const now = Date.now();
        const cutoff48hMs = now - 48 * 60 * 60 * 1000;
        const cutoff24hMs = now - 24 * 60 * 60 * 1000;
        const cutoff48hDate = new Date(cutoff48hMs);

        // Helper: parse any timestamp value (Firestore Timestamp, ISO string, or millis number)
        const parseTs = (ts) => {
          if (!ts) return null;
          if (ts?.toDate) return ts.toDate().getTime();        // Firestore Timestamp
          if (typeof ts === 'number') return ts;               // epoch ms
          const d = new Date(ts);
          return isNaN(d.getTime()) ? null : d.getTime();      // ISO string
        };

        // 1. Delete reports older than 48h — use single-field range (timestamp index already exists)
        const reportsSnap = await getDocs(
          query(collection(db, 'reports'), where('timestamp', '<', Timestamp.fromDate(cutoff48hDate)), limit(150))
        );
        await Promise.all(reportsSnap.docs.map(d => deleteDoc(d.ref)));

        // 2. Delete guest users/guestSessions whose deleteAt has passed, or older than 24h
        const guestsSnap = await getDocs(
          query(collection(db, 'users'), where('isGuest', '==', true), limit(300))
        );
        const nowIso = new Date().toISOString();
        const staleGuests = guestsSnap.docs.filter(d => {
          const data = d.data();
          // Prefer explicit deleteAt (set to 30 min after logout)
          if (data.deleteAt) return data.deleteAt < nowIso;
          // Fallback: delete if older than 24h
          const ts = parseTs(data.createdAt);
          return ts !== null && ts < cutoff24hMs;
        });
        await Promise.all(staleGuests.map(async d => {
          try { await deleteDoc(doc(db, 'guestSessions', d.id)); } catch {}
          try { await deleteDoc(d.ref); } catch {}
        }));

        // 3. Clean spamViolations and abuseHistory arrays older than 48h (uses already-loaded users state)
        const updatePromises = [];
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(250)));
        usersSnap.docs.forEach(d => {
          const data = d.data();
          const updates = {};
          let needsUpdate = false;

          if (Array.isArray(data.spamViolations) && data.spamViolations.length > 0) {
            const fresh = data.spamViolations.filter(v => {
              const t = parseTs(v.timestamp || v.time || v.at);
              return t !== null && t > cutoff48hMs;
            });
            if (fresh.length !== data.spamViolations.length) {
              updates.spamViolations = fresh;
              if (data.trustData) updates['trustData.spamCount'] = fresh.length;
              needsUpdate = true;
            }
          }

          if (Array.isArray(data.abuseHistory) && data.abuseHistory.length > 0) {
            const fresh = data.abuseHistory.filter(v => {
              const t = parseTs(v.timestamp || v.time || v.at);
              return t !== null && t > cutoff48hMs;
            });
            if (fresh.length !== data.abuseHistory.length) {
              updates.abuseHistory = fresh;
              if (data.trustData) updates['trustData.abuseCount'] = fresh.length;
              needsUpdate = true;
            }
          }

          if (needsUpdate) updatePromises.push(updateDoc(d.ref, updates));
        });
        await Promise.all(updatePromises);

        console.log('[AutoCleanup] Done — reports:', reportsSnap.size, '| guests:', staleGuests.length, '| violation arrays:', updatePromises.length);
      } catch (err) {
        console.error('[AutoCleanup] Error:', err.message);
      }
    };
    runCleanup();
  }, [isRoleReady]);

  // Mark feedback read/unread
  const handleFeedbackMarkRead = async (id, isRead) => {
    try {
      await updateDoc(doc(db, 'feedback', id), { isRead });
    } catch (e) { console.error(e); }
  };

  // Delete feedback
  const handleFeedbackDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'feedback', id));
      pt.success('Submission deleted.');
    } catch (e) {
      console.error(e);
      pt.error('Failed to delete submission.');
    }
  };

  // Send admin reply via TingleBot DM
  const handleFeedbackReply = async (item) => {
    if (!feedbackReplyText.trim() && !feedbackReplyStatus) return;
    setFeedbackReplySending(true);
    try {
      const TINGLEBOT_UID = 'tinglebot_system_official_2024';
      const conversationId = [TINGLEBOT_UID, item.uid].sort().join('_');

      const STATUS_TEXTS = {
        feedback_received: 'Feedback Received — Thank you for sharing your thoughts with us.',
        complaint_received: 'Complaint Received — We have received your complaint and will review it.',
        under_review: 'Your submission is currently Under Review by our team.',
        checking_issue: 'We are Checking the Issue you reported. Stay tuned.',
        in_progress: 'Your request is In Progress. Our team is actively working on it.',
        info_required: 'Additional Information is Required to process your request. Please DM an admin.',
        resolved: 'Your issue has been Resolved. Thank you for your patience.',
        closed: 'This submission has been Closed. No further action is required.',
        warning_issued: 'A Warning has been issued regarding your submission.',
        thank_you: 'Thank You for Your Feedback — we appreciate your contribution to TingleTap!',
      };

      const statusText = feedbackReplyStatus ? STATUS_TEXTS[feedbackReplyStatus] || '' : '';
      const customText = feedbackReplyText.trim();
      const fullText = [statusText, customText].filter(Boolean).join('\n\n');

      await addDoc(collection(db, 'privateMessages'), {
        senderId: TINGLEBOT_UID,
        senderName: 'TingleBot',
        receiverId: item.uid,
        participants: [TINGLEBOT_UID, item.uid],
        conversationId,
        text: fullText,
        isBot: true,
        isBotNotification: true,
        botStatusKey: feedbackReplyStatus || 'feedback_received',
        tinglebotType: feedbackReplyStatus || 'feedback_received',
        feedbackReply: true,
        feedbackId: item.id,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      // Also add reply record to feedback doc
      await updateDoc(doc(db, 'feedback', item.id), {
        lastReplyAt: serverTimestamp(),
        lastReplyStatus: feedbackReplyStatus || 'custom',
        isRead: true,
      });

      setFeedbackReplyOpen(null);
      setFeedbackReplyText('');
      setFeedbackReplyStatus('');
      pt.success('Reply sent via TingleBot DM!');
    } catch (e) {
      console.error('Error sending feedback reply:', e);
      pt.error('Failed to send reply.');
    } finally {
      setFeedbackReplySending(false);
    }
  };

  // Moderation functions
  const handleModerateUser = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setIsModalVisible(true);
  };

  const handleDeleteProfile = (targetUser) => {
    setDeleteTarget(targetUser);
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  const confirmDeleteProfile = async () => {
    if (deleteConfirmText !== 'DELETE') {
      pt.error('Type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const userRef = doc(db, 'users', deleteTarget.uid);
      remove(ref(rtdb, `status/${deleteTarget.uid}`));
      await deleteDoc(userRef);
      pt.success(`${deleteTarget.displayName}'s profile permanently deleted.`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Profile deletion error:', error);
      pt.error('Failed to delete profile. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeviceBan = (targetUser) => {
    const deviceId = targetUser.lastDeviceId || targetUser.deviceId;
    if (!deviceId || deviceId === 'Unknown') {
      pt.warn(`No device fingerprint for ${targetUser.displayName}. They must log in once for fingerprint to register.`);
      return;
    }
    setDevBanTarget(targetUser);
    setDevBanReason('');
    setShowDevBanModal(true);
  };

  const confirmDeviceBan = async () => {
    if (!devBanTarget) return;
    const deviceId = devBanTarget.lastDeviceId || devBanTarget.deviceId;
    setDevBanning(true);
    try {
      await DeviceBanSystem.banDevice(deviceId, {
        reason: devBanReason.trim() || 'Device banned by administrator',
        bannedBy: currentUserProfile?.displayName || 'Admin',
        userInfo: { uid: devBanTarget.uid, displayName: devBanTarget.displayName, email: devBanTarget.email },
        associatedUIDs: [devBanTarget.uid],
        // Pass the TARGET user's stored device info — not the admin's device
        deviceInfo: devBanTarget.lastDeviceInfo || null,
      });
      const userRef = doc(db, 'users', devBanTarget.uid);
      await updateDoc(userRef, {
        isDeviceBanned: true,
        deviceBanInfo: { bannedAt: new Date().toISOString(), bannedBy: currentUserProfile?.displayName || 'Admin', deviceId }
      });
      pt.success(`${devBanTarget.displayName}'s device banned successfully!`);
      setShowDevBanModal(false);
      setDevBanTarget(null);
    } catch (error) {
      console.error('Device ban error:', error);
      pt.error(`Device ban failed: ${error.message}`);
    } finally {
      setDevBanning(false);
    }
  };

  const handleUnDeviceBan = (targetUser) => {
    setUnDevBanTarget(targetUser);
    setShowUnDevBanModal(true);
  };

  const confirmUnDevBan = async () => {
    if (!unDevBanTarget) return;
    const deviceId = unDevBanTarget.lastDeviceId || unDevBanTarget.deviceId;
    setUnDevBanning(true);
    try {
      if (deviceId && deviceId !== 'Unknown') {
        await DeviceBanSystem.unbanDevice(deviceId).catch(() => {});
      }
      await updateDoc(doc(db, 'users', unDevBanTarget.uid), {
        isDeviceBanned: false,
        deviceBanInfo: null
      });
      pt.success(`${unDevBanTarget.displayName}'s device ban lifted!`);
      setShowUnDevBanModal(false);
      setUnDevBanTarget(null);
    } catch (error) {
      console.error('UnDevBan error:', error);
      pt.error(`Failed to remove device ban: ${error.message}`);
    } finally {
      setUnDevBanning(false);
    }
  };

  // ---- Owner: change user email (Firestore) ----
  const handleChangeEmail = async () => {
    if (!changeEmailTarget || !changeEmailValue.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(changeEmailValue.trim())) { pt.error('Invalid email address'); return; }
    setChangeEmailLoading(true);
    try {
      const userRef = doc(db, 'users', changeEmailTarget.uid || changeEmailTarget.id);
      await updateDoc(userRef, {
        email: changeEmailValue.trim().toLowerCase(),
        emailChangedAt: new Date().toISOString(),
        emailChangedBy: currentUserProfile?.displayName || 'Owner'
      });
      pt.success(`Email updated to "${changeEmailValue.trim()}" for ${changeEmailTarget.displayName}`);
      setShowChangeEmailModal(false); setChangeEmailTarget(null); setChangeEmailValue('');
    } catch (err) { pt.error('Failed to update email: ' + err.message); }
    finally { setChangeEmailLoading(false); }
  };

  // ---- Owner: change username (Firestore + usernames collection) ----
  const handleChangeUsername = async () => {
    if (!changeUsernameTarget || !changeUsernameValue.trim()) return;
    const newName = changeUsernameValue.trim();
    if (newName.length < 3 || newName.length > 30) { pt.error('Username must be 3–30 characters'); return; }
    if (/[^a-zA-Z0-9_. ]/.test(newName)) { pt.error('Only letters, numbers, spaces, underscores and dots allowed'); return; }
    setChangeUsernameLoading(true);
    try {
      const uid = changeUsernameTarget.uid || changeUsernameTarget.id;
      const oldName = changeUsernameTarget.username || changeUsernameTarget.displayName;
      if (oldName) {
        try { await deleteDoc(doc(db, 'usernames', oldName.toLowerCase())); } catch {}
      }
      await setDoc(doc(db, 'usernames', newName.toLowerCase()), {
        uid, email: changeUsernameTarget.email || null, createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'users', uid), {
        displayName: newName, username: newName,
        usernameChangedAt: new Date().toISOString(),
        usernameChangedBy: currentUserProfile?.displayName || 'Owner'
      });
      // Mirror the new displayName into RTDB so online presence reflects the change everywhere
      try {
        await rtdbUpdate(ref(rtdb, `status/${uid}`), { displayName: newName });
      } catch {}
      pt.success(`Username updated to "${newName}" for ${changeUsernameTarget.displayName}`);
      setShowChangeUsernameModal(false); setChangeUsernameTarget(null); setChangeUsernameValue('');
    } catch (err) { pt.error('Failed to update username: ' + err.message); }
    finally { setChangeUsernameLoading(false); }
  };

  // Violations: Unkick
  const handleUnkick = async () => {
    if (!unkickTarget?.userId || !unkickTarget?.roomId) return;
    setUnkicking(true);
    try {
      await deleteDoc(doc(db, 'rooms', unkickTarget.roomId, 'kickedUsers', unkickTarget.userId));
      await updateDoc(doc(db, 'users', unkickTarget.userId), { kickedFrom: null }).catch(() => {});
      await updateDoc(doc(db, 'modLogs', unkickTarget.id), {
        resolved: true,
        resolvedBy: currentUserProfile?.displayName || 'Admin',
        resolvedAt: serverTimestamp(),
        resolveNote: 'Unkicked by admin'
      });
      // TingleBot strip in the room (visible to all)
      if (unkickTarget.roomId) {
        addDoc(collection(db, 'rooms', unkickTarget.roomId, 'messages'), {
          text: `${unkickTarget.username || 'User'} has been unkicked and can rejoin.`,
          uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
          isBot: true, systemBot: true, tinglebotType: 'unkicked',
          createdAt: serverTimestamp(),
          noReply: true, noReaction: true, noReport: true, noUnread: true,
        }).catch(() => {});
      }
      setShowUnkickModal(false); setUnkickTarget(null);
    } catch (err) {
      pt.error('Failed to unkick: ' + err.message);
    } finally { setUnkicking(false); }
  };

  // Rooms tab: load ALL kicked users from ALL rooms
  const loadAllKickedUsers = async (roomsList) => {
    const list = roomsList || rooms;
    setKickedUsersLoading(true);
    try {
      const snap = await getDocs(query(collectionGroup(db, 'kickedUsers'), limit(2000)));
      const all = [];
      snap.docs.forEach(d => {
        const roomId = d.ref.parent.parent?.id;
        const room = list.find(r => r.id === roomId);
        all.push({ uid: d.id, roomId, roomName: room?.name || roomId, ...d.data() });
      });
      setKickedUsersList(all);
    } catch (e) {
      console.error('Failed to load kicked users:', e);
    } finally {
      setKickedUsersLoading(false);
    }
  };

  // Quick unkick from Rooms tab
  const handleQuickUnkick = async (kicked) => {
    const key = kicked.uid + kicked.roomId;
    setQuickUnkickingId(key);
    try {
      await deleteDoc(doc(db, 'rooms', kicked.roomId, 'kickedUsers', kicked.uid));
      await updateDoc(doc(db, 'users', kicked.uid), { kickedFrom: null }).catch(() => {});
      addDoc(collection(db, 'rooms', kicked.roomId, 'messages'), {
        text: `${kicked.displayName || kicked.username || 'User'} has been unkicked and can rejoin.`,
        uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
        isBot: true, systemBot: true, tinglebotType: 'unkicked',
        createdAt: serverTimestamp(),
        noReply: true, noReaction: true, noReport: true, noUnread: true,
      }).catch(() => {});
      setKickedUsersList(prev => prev.filter(k => !(k.uid === kicked.uid && k.roomId === kicked.roomId)));
      pt.success(`${kicked.displayName || kicked.username || 'User'} unkicked from ${kicked.roomName}`);
    } catch (e) {
      pt.error('Unkick failed: ' + e.message);
    } finally {
      setQuickUnkickingId(null);
    }
  };

  // Bulk unkick all
  const handleBulkUnkickAll = async () => {
    if (!kickedUsersList.length) return;
    setKickedUsersLoading(true);
    try {
      await Promise.all(kickedUsersList.map(async (k) => {
        await deleteDoc(doc(db, 'rooms', k.roomId, 'kickedUsers', k.uid)).catch(() => {});
        await updateDoc(doc(db, 'users', k.uid), { kickedFrom: null }).catch(() => {});
      }));
      setKickedUsersList([]);
      pt.success(`All ${kickedUsersList.length} kicked user(s) cleared!`);
    } catch (e) {
      pt.error('Bulk unkick failed: ' + e.message);
    } finally {
      setKickedUsersLoading(false);
    }
  };

  // Violations: Unmute
  const handleUnmute = async () => {
    if (!unmuteTarget?.userId) return;
    setUnmuteLoading(true);
    try {
      await updateDoc(doc(db, 'users', unmuteTarget.userId), {
        'mutedInfo.isMuted': false,
        'mutedInfo.muteUntil': null,
        'mutedInfo.reason': null,
        'mutedInfo.mutedBy': null,
      });
      await updateDoc(doc(db, 'modLogs', unmuteTarget.id), {
        resolved: true,
        resolvedBy: currentUserProfile?.displayName || 'Admin',
        resolvedAt: serverTimestamp(),
        resolveNote: 'Unmuted by admin'
      });
      // TingleBot strip in the user's current room (visible to all)
      const unmuteViolRoomId = onlineStatuses[unmuteTarget.userId]?.currentRoomId;
      if (unmuteViolRoomId) {
        addDoc(collection(db, 'rooms', unmuteViolRoomId, 'messages'), {
          text: `${unmuteTarget.username || 'User'} has been unmuted and can speak again.`,
          uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
          isBot: true, systemBot: true, tinglebotType: 'unmuted',
          createdAt: serverTimestamp(),
          noReply: true, noReaction: true, noReport: true, noUnread: true,
        }).catch(() => {});
      }
      setShowUnmuteModal(false); setUnmuteTarget(null);
    } catch (err) {
      pt.error('Failed to unmute: ' + err.message);
    } finally { setUnmuteLoading(false); }
  };

  // Violations: Resolve
  const handleResolveViolation = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      await updateDoc(doc(db, 'modLogs', resolveTarget.id), {
        resolved: true,
        resolvedBy: currentUserProfile?.displayName || 'Admin',
        resolvedAt: serverTimestamp()
      });
      pt.success('Violation marked as resolved.');
      setShowResolveModal(false); setResolveTarget(null);
    } catch (err) {
      pt.error('Failed to resolve: ' + err.message);
    } finally { setResolving(false); }
  };

  /* ── Role Change ─────────────────────────────────── */
  const ROLE_DEFS = [
    {
      key: 'admin',
      label: 'High Council',
      desc: 'Full moderation + admin access',
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg,#2563eb,#60a5fa)',
      ownerOnly: true,
      svg: <svg viewBox="0 0 24 24" width="28" height="28" fill="none"><path fill="#2563eb" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.46,13.97L5.82,21L12,17.27Z"/></svg>,
    },
    {
      key: 'moderator',
      label: 'Guardian',
      desc: 'Kick, mute, manage messages',
      color: '#10b981',
      gradient: 'linear-gradient(135deg,#059669,#34d399)',
      ownerOnly: false,
      svg: <svg viewBox="0 0 24 24" width="28" height="28" fill="none"><path fill="#10b981" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>,
    },
    {
      key: 'user',
      label: 'Member',
      desc: 'Standard registered member',
      color: '#6b7280',
      gradient: 'linear-gradient(135deg,#4b5563,#9ca3af)',
      ownerOnly: false,
      svg: <svg viewBox="0 0 24 24" width="28" height="28" fill="none"><path fill="#6b7280" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>,
    },
  ];

  const ROLE_RANK = { owner: 4, superowner: 4, admin: 3, moderator: 2, user: 1, '': 1 };

  const handleOpenRoleModal = (targetUser) => {
    const myRole = currentUserProfile?.role;
    if (!['owner', 'admin'].includes(myRole)) {
      pt.error('Only Owner and Admin can change roles.'); return;
    }
    if (targetUser.uid === currentUserProfile?.uid) {
      pt.error("You cannot change your own role."); return;
    }
    if ((targetUser.role === 'owner' || targetUser.role === 'superowner')) {
      pt.error("The Owner's role cannot be changed."); return;
    }
    if (myRole === 'admin' && targetUser.role === 'admin') {
      pt.error("Admins cannot demote other Admins."); return;
    }
    setRoleTarget(targetUser);
    setShowRoleModal(true);
  };

  const confirmChangeRole = async (newRole) => {
    if (!roleTarget || !newRole || newRole === roleTarget.role) return;
    const myRole = currentUserProfile?.role;
    /* FIX 23: defense-in-depth guard — re-validate permissions here even though
       handleOpenRoleModal already checks, in case this is ever invoked directly.
       Blocks self-escalation, non-privileged callers, and assigning 'owner'. */
    if (!['owner', 'admin'].includes(myRole)) {
      pt.error('Only Owner and Admin can change roles.'); return;
    }
    if (roleTarget.uid === currentUserProfile?.uid) {
      pt.error('You cannot change your own role.'); return;
    }
    if (roleTarget.role === 'owner' || roleTarget.role === 'superowner') {
      pt.error("The Owner's role cannot be changed."); return;
    }
    if (newRole === 'owner' || newRole === 'superowner') {
      pt.error('The Owner role cannot be assigned through this panel.'); return;
    }
    if (myRole === 'admin' && (newRole === 'owner' || newRole === 'admin')) {
      pt.error('Admins cannot assign Owner or Admin roles.'); return;
    }
    if (myRole === 'admin' && roleTarget.role === 'admin') {
      pt.error('Admins cannot demote other Admins.'); return;
    }
    setChangingRole(true);
    try {
      const userRef = doc(db, 'users', roleTarget.id || roleTarget.uid);
      // Badge sync: admin ↔ titans badge, moderator ↔ spartans badge
      const ROLE_BADGE_MAP = { admin: 'titans', moderator: 'spartans' };
      const newRoleBadge = ROLE_BADGE_MAP[newRole];
      const oldRoleBadge = ROLE_BADGE_MAP[roleTarget.role];
      const updateObj = { role: newRole };
      if (newRoleBadge) {
        // Promoting to a role that carries a badge — set it automatically
        updateObj.badge = newRoleBadge;
      } else if (oldRoleBadge && roleTarget.badge === oldRoleBadge) {
        // Demoting from a role whose badge was auto-assigned — remove it
        updateObj.badge = null;
      }
      await updateDoc(userRef, updateObj);

      const oldRank = ROLE_RANK[roleTarget.role] || 1;
      const newRank = ROLE_RANK[newRole] || 1;
      const isPromotion = newRank > oldRank;
      const tinglebotType = isPromotion ? 'promoted' : 'demoted';
      const roleLabelMap = { admin: 'High Council', moderator: 'Guardian', user: 'Member', owner: 'Godfather' };
      const msgText = isPromotion
        ? `${roleTarget.displayName} has been promoted to ${roleLabelMap[newRole] || newRole}.`
        : `${roleTarget.displayName} has been demoted to ${roleLabelMap[newRole] || newRole}.`;

      const targetRoomId = onlineStatuses[roleTarget.uid]?.currentRoomId;
      const adminRoomId  = onlineStatuses[currentUserProfile?.uid]?.currentRoomId;
      const botMsg = {
        text: msgText,
        uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
        isBot: true, systemBot: true, tinglebotType,
        createdAt: serverTimestamp(),
        noReply: true, noReaction: true, noReport: true, noUnread: true,
      };
      if (targetRoomId) {
        addDoc(collection(db, 'rooms', targetRoomId, 'messages'), botMsg).catch(() => {});
      }
      // Also broadcast to the admin's current room (if different) so staff in that room see it
      if (adminRoomId && adminRoomId !== targetRoomId) {
        addDoc(collection(db, 'rooms', adminRoomId, 'messages'), botMsg).catch(() => {});
      }

      const roleLabelMap2 = { admin: 'High Council', moderator: 'Guardian', user: 'Member', owner: 'Godfather' };
      if (isPromotion) {
        pt.success(`${roleTarget.displayName} promoted to ${roleLabelMap2[newRole] || newRole}.`);
      } else {
        pt.warn(`${roleTarget.displayName} demoted to ${roleLabelMap2[newRole] || newRole}.`);
      }
      setShowRoleModal(false);
      setRoleTarget(null);
    } catch (err) {
      pt.error('Failed to change role: ' + err.message);
    } finally {
      setChangingRole(false);
    }
  };

  const handleAssignBadge = (targetUser) => {
    const myRole = currentUserProfile?.role;
    if (!['owner', 'admin'].includes(myRole)) {
      pt.error('Only Owner and Admin can assign badges.');
      return;
    }
    if (myRole === 'admin' && targetUser.role === 'owner') {
      pt.error("Admins cannot modify the Owner's profile.");
      return;
    }
    setBadgeTarget(targetUser);
    setShowBadgeModal(true);
  };

  const confirmAssignBadge = async (badgeKey) => {
    if (!badgeTarget) return;
    setAssigningBadge(true);
    try {
      const userRef = doc(db, 'users', badgeTarget.id);
      await updateDoc(userRef, { badge: badgeKey || null });

      // TingleBot broadcast — fires to the target's current room (and admin room if different)
      const badgeName = Badges[badgeKey]?.name;
      const msgText = badgeKey
        ? `${badgeTarget.displayName} has been awarded the "${badgeName}" badge!`
        : `${badgeTarget.displayName}'s badge has been removed.`;
      const botMsg = {
        text: msgText,
        uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
        isBot: true, systemBot: true,
        tinglebotType: badgeKey ? 'badge_awarded' : 'demoted',
        createdAt: serverTimestamp(),
        noReply: true, noReaction: true, noReport: true, noUnread: true,
      };
      const targetRoomId = onlineStatuses[badgeTarget.uid || badgeTarget.id]?.currentRoomId;
      const adminRoomId  = onlineStatuses[currentUserProfile?.uid]?.currentRoomId;
      if (targetRoomId) addDoc(collection(db, 'rooms', targetRoomId, 'messages'), botMsg).catch(() => {});
      if (adminRoomId && adminRoomId !== targetRoomId) {
        addDoc(collection(db, 'rooms', adminRoomId, 'messages'), botMsg).catch(() => {});
      }

      if (badgeKey) {
        pt.success(`Badge "${badgeName}" assigned to ${badgeTarget.displayName}!`);
      } else {
        pt.success(`Badge removed from ${badgeTarget.displayName}.`);
      }
      setShowBadgeModal(false);
      setBadgeTarget(null);
    } catch (error) {
      pt.error('Failed to assign badge: ' + error.message);
    } finally {
      setAssigningBadge(false);
    }
  };

  const handleReportAction = async (reportId, action, reportData) => {
    const key = reportId + action;
    setReportActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      const reportRef = doc(db, 'reports', reportId);
      if (action === 'dismiss') {
        await updateDoc(reportRef, { status: 'dismissed', resolvedAt: new Date().toISOString(), resolvedBy: currentUserProfile?.displayName || 'Admin' });
        pt.success('Report dismissed.');
      } else if (action === 'resolve') {
        await updateDoc(reportRef, { status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: currentUserProfile?.displayName || 'Admin' });
        pt.success('Report resolved.');
      } else if (action === 'ban') {
        const uid = reportData.reportedUser?.uid;
        const target = users.find(u => u.uid === uid || u.id === uid) || (uid ? {
          uid, id: uid,
          displayName: reportData.reportedUser?.displayName || reportData.reportedName || 'Unknown User',
          email: reportData.reportedUser?.email || null,
          role: reportData.reportedUser?.role || 'user',
          ...reportData.reportedUser
        } : null);
        if (target) {
          setSelectedUser(target);
          setActionType('ban');
          setIsModalVisible(true);
        } else {
          pt.error('No user UID available in this report.');
        }
      } else if (action === 'mute') {
        const uid = reportData.reportedUser?.uid;
        const target = users.find(u => u.uid === uid || u.id === uid) || (uid ? {
          uid, id: uid,
          displayName: reportData.reportedUser?.displayName || reportData.reportedName || 'Unknown User',
          email: reportData.reportedUser?.email || null,
          role: reportData.reportedUser?.role || 'user',
          ...reportData.reportedUser
        } : null);
        if (target) {
          setSelectedUser(target);
          setActionType('mute');
          setIsModalVisible(true);
        } else {
          pt.error('No user UID available in this report.');
        }
      } else if (action === 'kick') {
        const uid = reportData.reportedUser?.uid;
        const target = users.find(u => u.uid === uid || u.id === uid) || (uid ? {
          uid, id: uid,
          displayName: reportData.reportedUser?.displayName || reportData.reportedName || 'Unknown User',
          email: reportData.reportedUser?.email || null,
          role: reportData.reportedUser?.role || 'user',
          ...reportData.reportedUser
        } : null);
        if (target) {
          setSelectedUser(target);
          setActionType('kick');
          setIsModalVisible(true);
        } else {
          pt.error('No user UID available in this report.');
        }
      } else if (action === 'ip_ban') {
        const ip = reportData.reportedUser?.ipAddress;
        if (ip) {
          await IPBanSystem.banIP(ip, { reason: `Reported: ${reportData.category || 'Violation'}`, bannedBy: currentUserProfile?.displayName || 'Admin', reportId });
          await updateDoc(reportRef, { status: 'action_taken', resolvedAt: new Date().toISOString(), resolvedBy: currentUserProfile?.displayName || 'Admin' });
          pt.success(`IP ${ip} has been banned.`);
        } else pt.error('No IP address captured for this report.');
      } else if (action === 'device_ban') {
        const deviceId = reportData.reportedUser?.deviceId;
        const uid = reportData.reportedUser?.uid;
        if (deviceId && uid) {
          await DeviceBanSystem.banDevice(deviceId, { reason: `Reported: ${reportData.category || 'Violation'}`, bannedBy: currentUserProfile?.displayName || 'Admin', uid });
          await updateDoc(doc(db, 'users', uid), {
            isDeviceBanned: true,
            deviceBanInfo: { bannedAt: new Date().toISOString(), bannedBy: currentUserProfile?.displayName || 'Admin', deviceId }
          });
          await updateDoc(reportRef, { status: 'action_taken', resolvedAt: new Date().toISOString(), resolvedBy: currentUserProfile?.displayName || 'Admin' });
          pt.success(`Device ID …${deviceId.slice(-8)} banned.`);
        } else pt.error('No device ID captured for this report.');
      } else if (action === 'appeal_accept') {
        const uid = reportData.reportedUser?.uid || reportData.uid;
        if (uid) {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, { isBanned: false, banInfo: null });
          await updateDoc(reportRef, { status: 'appeal_accepted', resolvedAt: new Date().toISOString(), resolvedBy: currentUserProfile?.displayName || 'Admin' });
          pt.success('Appeal accepted — user unbanned.');
        }
      } else if (action === 'appeal_reject') {
        await updateDoc(reportRef, { status: 'appeal_rejected', resolvedAt: new Date().toISOString(), resolvedBy: currentUserProfile?.displayName || 'Admin' });
        pt.info('Appeal rejected.');
      }
    } catch (err) {
      pt.error('Action failed: ' + err.message);
    } finally {
      setReportActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCreateRoom = async () => {
    if (!createRoomData.name.trim()) {
      pt.error('Room name is required.');
      return;
    }
    setCreatingRoom(true);
    try {
      const orderVal = createRoomData.order.toString().trim()
        ? parseInt(createRoomData.order) 
        : Date.now();
      await addDoc(collection(db, 'rooms'), {
        name: createRoomData.name.trim(),
        slug: nameToSlug(createRoomData.name.trim()),
        description: createRoomData.description.trim(),
        type: createRoomData.type,
        maxUsers: parseInt(createRoomData.maxUsers) || 50,
        password: createRoomData.password.trim() || null,
        isActive: true,
        order: orderVal,
        createdAt: serverTimestamp(),
        createdBy: currentUserProfile?.displayName || 'Admin',
        createdByUid: user?.uid
      });
      pt.success(`Room "${createRoomData.name}" created successfully!`);
      setCreateRoomData({ name: '', description: '', type: 'public', maxUsers: 50, password: '', order: '' });
      setShowCreateRoom(false);
    } catch (error) {
      console.error('Create room error:', error);
      pt.error('Failed to create room. Please try again.');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleDeleteRoom = (room) => {
    setDeleteRoomTarget(room);
    setShowDeleteRoomModal(true);
  };

  const confirmDeleteRoom = async () => {
    if (!deleteRoomTarget) return;
    setDeletingRoom(true);
    try {
      await deleteDoc(doc(db, 'rooms', deleteRoomTarget.id));
      pt.success(`Room "${deleteRoomTarget.name}" deleted successfully.`);
      setShowDeleteRoomModal(false);
      setDeleteRoomTarget(null);
    } catch (error) {
      console.error('Delete room error:', error);
      pt.error('Failed to delete room. Please try again.');
    } finally {
      setDeletingRoom(false);
    }
  };

  const handleEditRoom = (room) => {
    setEditRoomTarget(room);
    setEditRoomData({
      name: room.name || '',
      description: room.description || '',
      type: room.type || 'public',
      maxUsers: room.maxUsers || 50,
      password: room.password || '',
      order: room.order !== undefined ? String(room.order) : ''
    });
    setShowEditPw(false);
    setShowEditRoom(true);
  };

  const confirmEditRoom = async () => {
    if (!editRoomTarget || !editRoomData.name.trim()) {
      pt.error('Room name is required.');
      return;
    }
    setSavingRoom(true);
    try {
      const orderVal = editRoomData.order.toString().trim()
        ? parseInt(editRoomData.order)
        : (editRoomTarget.order || Date.now());
      await updateDoc(doc(db, 'rooms', editRoomTarget.id), {
        name: editRoomData.name.trim(),
        slug: nameToSlug(editRoomData.name.trim()),
        description: editRoomData.description.trim(),
        type: editRoomData.type,
        maxUsers: parseInt(editRoomData.maxUsers) || 50,
        password: editRoomData.password.trim() || null,
        order: orderVal,
        updatedAt: serverTimestamp(),
        updatedBy: currentUserProfile?.displayName || 'Admin'
      });
      pt.success(`Room "${editRoomData.name}" updated successfully!`);
      setShowEditRoom(false);
      setEditRoomTarget(null);
    } catch (error) {
      console.error('Edit room error:', error);
      pt.error('Failed to update room. Please try again.');
    } finally {
      setSavingRoom(false);
    }
  };

  const parseDurationMs = (dur) => {
    if (!dur || dur === 'permanent') return null;
    const s = dur.toString().toLowerCase().trim();
    const n = parseFloat(s) || 1;
    if (/^\d+(\.\d+)?y/.test(s)) return n * 365 * 86400000;
    if (/^\d+(\.\d+)?mo/.test(s) || /^\d+(\.\d+)?month/.test(s)) return n * 30 * 86400000;
    if (/^\d+(\.\d+)?w/.test(s) || s.includes('week')) return n * 7 * 86400000;
    if (/^\d+(\.\d+)?d/.test(s) || s.includes('day')) return n * 86400000;
    if (/^\d+(\.\d+)?h/.test(s) || s.includes('hour')) return n * 3600000;
    if (/^\d+(\.\d+)?m/.test(s) || s.includes('min')) return n * 60000;
    if (/^\d+(\.\d+)?s/.test(s) || s.includes('sec')) return n * 1000;
    return n * 60000;
  };

  const handleConfirmAction = async (actionData, resolvedAction) => {
    if (!selectedUser) return;
    /* resolvedAction is passed from the modal's localAction state (supports toggle) */
    const effectiveAction = resolvedAction || actionData._resolvedAction || actionType;

    /* After success we update selectedUser locally so the modal tabs reflect new status */
    const updateSelectedUser = (patch) =>
      setSelectedUser(prev => prev ? { ...prev, ...patch } : prev);

    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      const adminName = currentUserProfile?.displayName || 'Admin';
      
      switch (effectiveAction) {
        case 'ban': {
          // Use pre-computed expiresAt from modal (handles datetime picker correctly)
          const banMs = !actionData.expiresAt ? parseDurationMs(actionData.duration) : null;
          const banUntil = actionData.expiresAt || (banMs && banMs !== Infinity ? new Date(Date.now() + banMs).toISOString() : null);
          const banInfo = {
            reason: actionData.reason || '',
            bannedBy: adminName,
            bannedAt: new Date().toISOString(),
            banUntil,
            duration: actionData.duration,
            adminNotes: actionData.adminNotes || '',
            appealAllowed: actionData.appealAllowed,
          };
          await updateDoc(userRef, { isBanned: true, banInfo });
          remove(ref(rtdb, `status/${selectedUser.uid}`));
          const banRoomId = onlineStatuses[selectedUser.uid]?.currentRoomId;
          if (banRoomId) {
            getDoc(doc(db, 'rooms', banRoomId)).then(rs => {
              const banRoomName = rs?.data()?.name || 'this room';
              addDoc(collection(db, 'rooms', banRoomId, 'messages'), {
                text: `${selectedUser.displayName} has been banned from ${banRoomName}${actionData.reason ? ` — ${actionData.reason}` : '.'}`,
                uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
                isBot: true, systemBot: true, tinglebotType: 'banned',
                createdAt: serverTimestamp(),
                noReply: true, noReaction: true, noReport: true, noUnread: true,
              }).catch(() => {});
            }).catch(() => {});
          }
          const banLabel = actionData.duration === 'permanent' ? 'permanently' : (actionData.duration ? `for ${actionData.duration}` : '');
          pt.error(`${selectedUser.displayName} banned ${banLabel}.`);
          try {
            const ipBanResults = await IPBanSystem.banUserWithIP(
              selectedUser.uid,
              { displayName: selectedUser.displayName, email: selectedUser.email },
              { reason: actionData.reason || 'Banned by administrator', bannedBy: adminName, userAgent: navigator.userAgent, location: 'Admin Panel', country: selectedUser.country || 'Unknown' }
            );
            if (ipBanResults?.ipBanned && ipBanResults?.bannedIP) {
              pt.info(`IP ${ipBanResults.bannedIP} also banned.`);
            }
          } catch (ipError) {
            pt.warn(`Account banned — IP ban failed: ${ipError.message}`);
          }
          /* Update local snapshot so modal tabs reflect new state */
          updateSelectedUser({ isBanned: true, banInfo });
          break;
        }
          
        case 'unban': {
          await updateDoc(userRef, { isBanned: false, banInfo: null });
          const unbanRoomId = onlineStatuses[selectedUser.uid]?.currentRoomId;
          if (unbanRoomId) {
            addDoc(collection(db, 'rooms', unbanRoomId, 'messages'), {
              text: `${selectedUser.displayName} has been unbanned and can rejoin.`,
              uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
              isBot: true, systemBot: true, tinglebotType: 'unbanned',
              createdAt: serverTimestamp(),
              noReply: true, noReaction: true, noReport: true, noUnread: true,
            }).catch(() => {});
          }
          pt.success(`${selectedUser.displayName} has been unbanned.`);
          try {
            const unbannedIPs = await IPBanSystem.unbanUserIP(selectedUser.uid);
            if (unbannedIPs?.length > 0) {
              pt.info(`IP(s) ${unbannedIPs.join(', ')} also unbanned.`);
            }
          } catch (ipError) {
            pt.warn(`Account unbanned — IP unban failed: ${ipError.message}`);
          }
          updateSelectedUser({ isBanned: false, banInfo: null });
          break;
        }
          
        case 'mute': {
          // Use pre-computed expiresAt from modal (handles datetime picker correctly)
          const muteMs = !actionData.expiresAt ? parseDurationMs(actionData.duration) : null;
          const muteUntil = actionData.expiresAt || (muteMs && muteMs !== Infinity ? new Date(Date.now() + muteMs).toISOString() : null);
          const mutedInfo = {
            isMuted: true,
            mutedAt: new Date().toISOString(),
            mutedBy: adminName,
            reason: actionData.reason || '',
            duration: actionData.duration,
            muteUntil,
          };
          await updateDoc(userRef, {
            'mutedInfo.isMuted': true,
            'mutedInfo.mutedAt': mutedInfo.mutedAt,
            'mutedInfo.mutedBy': adminName,
            'mutedInfo.reason': actionData.reason || '',
            'mutedInfo.duration': actionData.duration,
            'mutedInfo.muteUntil': muteUntil,
          });
          const muteRoomId = onlineStatuses[selectedUser.uid]?.currentRoomId;
          if (muteRoomId) {
            addDoc(collection(db, 'rooms', muteRoomId, 'messages'), {
              text: `${selectedUser.displayName} has been muted${actionData.duration && actionData.duration !== 'permanent' ? ` for ${actionData.duration}` : ''}${actionData.reason ? ` — ${actionData.reason}` : '.'}`,
              uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
              isBot: true, systemBot: true, tinglebotType: 'muted',
              createdAt: serverTimestamp(),
              noReply: true, noReaction: true, noReport: true, noUnread: true,
            }).catch(() => {});
          }
          const muteLabel = actionData.duration === 'permanent' ? 'permanently' : (actionData.duration ? `for ${actionData.duration}` : '');
          pt.warn(`${selectedUser.displayName} muted ${muteLabel}.`);
          updateSelectedUser({ mutedInfo });
          break;
        }
          
        case 'unmute': {
          await updateDoc(userRef, {
            'mutedInfo.isMuted': false,
            'mutedInfo.mutedAt': null,
            'mutedInfo.mutedBy': null,
            'mutedInfo.reason': null,
            'mutedInfo.muteUntil': null,
          });
          const unmuteRoomId = onlineStatuses[selectedUser.uid]?.currentRoomId;
          if (unmuteRoomId) {
            addDoc(collection(db, 'rooms', unmuteRoomId, 'messages'), {
              text: `${selectedUser.displayName} has been unmuted and can speak again.`,
              uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
              isBot: true, systemBot: true, tinglebotType: 'unmuted',
              createdAt: serverTimestamp(),
              noReply: true, noReaction: true, noReport: true, noUnread: true,
            }).catch(() => {});
          }
          pt.success(`${selectedUser.displayName} has been unmuted.`);
          updateSelectedUser({ mutedInfo: { isMuted: false } });
          break;
        }
          
        case 'kick': {
          const kickReason = actionData?.reason || 'Kicked by admin';
          const kickDur = actionData?.duration || null;
          // Prefer pre-computed expiresAt from modal (handles datetime picker correctly)
          const kickUntil = actionData?.expiresAt || null;
          const kickEntry = {
            uid: selectedUser.uid,
            displayName: selectedUser.displayName,
            reason: kickReason,
            kickedBy: adminName,
            kickedAt: serverTimestamp(),
            duration: kickDur,
            kickDuration: kickDur,   // BanKickModal reads kickDuration for countdown
            kickUntil,
            kickUntilTs: kickUntil ? Timestamp.fromDate(new Date(kickUntil)) : null,
          };

          if (actionData?.kickScope === 'multiple_rooms' && actionData?.selectedRooms?.length > 0) {
            for (const rid of actionData.selectedRooms) {
              const rSnap = await getDoc(doc(db, 'rooms', rid)).catch(() => null);
              const rName = rSnap?.data()?.name || rid;
              await setDoc(doc(db, 'rooms', rid, 'kickedUsers', selectedUser.uid), {
                ...kickEntry, roomId: rid, roomName: rName
              });
              addDoc(collection(db, 'rooms', rid, 'messages'), {
                text: `${selectedUser.displayName} has been kicked${kickReason ? ` — ${kickReason}` : '.'}`,
                uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
                isBot: true, systemBot: true, tinglebotType: 'kicked',
                createdAt: serverTimestamp(),
                noReply: true, noReaction: true, noReport: true, noUnread: true,
              }).catch(() => {});
            }
            remove(ref(rtdb, `status/${selectedUser.uid}/currentRoomId`));
            pt.warn(`${selectedUser.displayName} kicked from ${actionData.selectedRooms.length} room(s).`);
            /* Reflect kick in local snapshot using first selected room */
            const firstRid = actionData.selectedRooms[0];
            updateSelectedUser({ kickedFrom: { roomId: firstRid, kickedAt: new Date().toISOString(), kickedBy: adminName, reason: kickReason } });
          } else {
            const kickRoomId = onlineStatuses[selectedUser.uid]?.currentRoomId || currentRoomId || selectedUser.kickedFrom?.roomId;
            if (kickRoomId) {
              const kickRoomSnap = await getDoc(doc(db, 'rooms', kickRoomId)).catch(() => null);
              const kickRoomName = kickRoomSnap?.data()?.name || kickRoomId;
              await setDoc(doc(db, 'rooms', kickRoomId, 'kickedUsers', selectedUser.uid), {
                ...kickEntry, roomId: kickRoomId, roomName: kickRoomName
              });
              await updateDoc(userRef, {
                kickedFrom: { roomId: kickRoomId, kickedAt: new Date().toISOString(), kickedBy: adminName, reason: kickReason }
              }).catch(() => {});
              addDoc(collection(db, 'rooms', kickRoomId, 'messages'), {
                text: `${selectedUser.displayName} has been kicked from ${kickRoomName}${kickReason ? ` — ${kickReason}` : '.'}`,
                uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
                isBot: true, systemBot: true, tinglebotType: 'kicked',
                createdAt: serverTimestamp(),
                noReply: true, noReaction: true, noReport: true, noUnread: true,
              }).catch(() => {});
              remove(ref(rtdb, `status/${selectedUser.uid}/currentRoomId`));
              updateSelectedUser({ kickedFrom: { roomId: kickRoomId, kickedAt: new Date().toISOString(), kickedBy: adminName, reason: kickReason } });
            } else {
              remove(ref(rtdb, `status/${selectedUser.uid}/currentRoomId`));
            }
            pt.warn(`${selectedUser.displayName} has been kicked.`);
          }
          break;
        }

        case 'unkick': {
          const unkickScopeMode = actionData?.unkickScope || 'all_rooms';
          if (unkickScopeMode === 'all_rooms') {
            // Clear from every room that has a kickedUsers entry for this uid
            const allRoomsSnap = await getDocs(query(collection(db, 'rooms'), limit(1000))).catch(() => null);
            if (allRoomsSnap) {
              const tasks = allRoomsSnap.docs.map(rd =>
                deleteDoc(doc(db, 'rooms', rd.id, 'kickedUsers', selectedUser.uid)).catch(() => {})
              );
              await Promise.all(tasks);
            }
          } else {
            // This-room or specific room: use kickedFrom.roomId or currentRoomId
            const kickedRoomId = selectedUser.kickedFrom?.roomId || actionData?.currentRoomId;
            if (kickedRoomId) {
              await deleteDoc(doc(db, 'rooms', kickedRoomId, 'kickedUsers', selectedUser.uid)).catch(() => {});
              const unkickRoomSnap = await getDoc(doc(db, 'rooms', kickedRoomId)).catch(() => null);
              const unkickRoomName = unkickRoomSnap?.data()?.name || kickedRoomId;
              addDoc(collection(db, 'rooms', kickedRoomId, 'messages'), {
                text: `${selectedUser.displayName} has been unkicked and can rejoin ${unkickRoomName}.`,
                uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
                isBot: true, systemBot: true, tinglebotType: 'unkicked',
                createdAt: serverTimestamp(),
                noReply: true, noReaction: true, noReport: true, noUnread: true,
              }).catch(() => {});
            }
          }
          // Always clear kickedFrom on the user doc
          await updateDoc(userRef, { kickedFrom: null }).catch(() => {});
          pt.success(`${selectedUser.displayName} can now rejoin.`);
          updateSelectedUser({ kickedFrom: null });
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error('Moderation error:', error);
      pt.error('Action failed. Please try again.');
      throw error; /* Re-throw so modal shows error state */
    }
  };

  // Filter users based on search and filters (memoized — avoids re-filtering the
  // entire users array on every unrelated re-render, e.g. presence tick or other tab state)
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'online' && onlineStatuses[user.uid]?.state === 'online') ||
        (filterStatus === 'offline' && onlineStatuses[user.uid]?.state !== 'online') ||
        (filterStatus === 'banned' && user.isBanned) ||
        (filterStatus === 'muted' && user.mutedInfo?.isMuted);
        
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus, onlineStatuses]);

  // Get user's real device/location info with proper fallbacks
  const getUserDeviceInfo = (user) => {
    const status = onlineStatuses[user.uid];
    const isOnline = status?.state === 'online';
    
    // Get IP - prefer current status for online users, last known for offline
    const lastIP = isOnline
      ? (status?.ip || status?.ipAddress || user.lastIP || user.ipAddress || user.ip || 'Unknown')
      : (user.lastIP || user.ipAddress || user.ip || status?.ip || status?.ipAddress || 'Unknown');
    
    // Get device fingerprint data
    const deviceId = user.lastDeviceId || user.deviceId || 'Unknown';
    const deviceInfo = user.lastDeviceInfo || user.deviceInfo;
    
    // Get user agent - prefer current for online, last known for offline
    const userAgent = isOnline
      ? (status?.userAgent || user.lastUserAgent || deviceInfo?.userAgent || 'Unknown')
      : (user.lastUserAgent || status?.userAgent || deviceInfo?.userAgent || 'Unknown');
    
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const isTablet = /iPad|Tablet/i.test(userAgent);
    
    // Parse browser from stored device info or user agent
    let browser = 'Unknown';
    if (deviceInfo?.browser) {
      browser = deviceInfo.browser;
    } else if (user.lastBrowser) {
      browser = user.lastBrowser;
    } else if (userAgent !== 'Unknown') {
      if (userAgent.includes('Edg/')) browser = 'Edge';
      else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) browser = 'Chrome';
      else if (userAgent.includes('Firefox/')) browser = 'Firefox';
      else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
      else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) browser = 'Opera';
    }
    
    // Parse OS from stored device info or user agent
    let os = 'Unknown';
    if (deviceInfo?.os) {
      os = deviceInfo.os;
    } else if (user.lastOS) {
      os = user.lastOS;
    } else if (userAgent !== 'Unknown') {
      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    }
    
    // Get location - prefer current for online, last known for offline
    const location = isOnline
      ? (status?.country || user.lastCountry || user.country || user.lastLocation || status?.location || 'Unknown')
      : (user.lastCountry || user.country || user.lastLocation || status?.country || status?.location || 'Unknown');
    
    // Determine device type
    let deviceType = 'Desktop';
    if (deviceInfo?.deviceType) {
      deviceType = deviceInfo.deviceType;
    } else if (user.lastDeviceType) {
      deviceType = user.lastDeviceType;
    } else if (isTablet) {
      deviceType = 'Tablet';
    } else if (isMobile) {
      deviceType = 'Mobile';
    }
    
    // Parse device model — prefer the value stored at login time, then fall back.
    // Guard against Chrome's reduced UA privacy feature which stores "K" as the
    // Android device model for all users since Chrome 85+. Treat single-letter
    // or "K"-only values as missing and use a friendlier label instead.
    const _rawStoredModel = deviceInfo?.deviceModel || '';
    const _isReducedUA = _rawStoredModel === 'K' || (_rawStoredModel.length <= 2 && /^[A-Z]$/i.test(_rawStoredModel));
    let deviceModel = _isReducedUA ? '' : _rawStoredModel;
    if (!deviceModel && userAgent !== 'Unknown') {
      const _parsed = DeviceFingerprint._parseDeviceModel(userAgent);
      const _parsedReduced = _parsed === 'K' || (_parsed.length <= 2 && /^[A-Z]$/i.test(_parsed));
      deviceModel = _parsedReduced ? '' : _parsed;
    }
    if (!deviceModel) deviceModel = `${deviceType} Device`;

    // Get last seen — if online show marker, else use most accurate timestamp available
    let lastSeen;
    if (isOnline) {
      lastSeen = 'Online';
    } else {
      const ts = status?.lastChanged || status?.lastSeen || user.lastSeenAt || user.lastActivityAt || user.lastLoginAt || status?.connectedAt;
      lastSeen = ts || 'Unknown';
    }
    
    return {
      deviceId: deviceId,
      ip: lastIP,
      location: location,
      device: deviceType,
      deviceModel: deviceModel,
      macAddress: 'N/A',
      browser: browser,
      os: os,
      lastSeen: lastSeen,
      userAgent: userAgent,
      isOnline: isOnline,
      lat: user.lastLat ?? null,
      lon: user.lastLon ?? null,
      city: user.lastCity || '',
      country: user.lastCountry || ''
    };
  };

  if (!currentUserProfile || !['owner', 'admin'].includes(currentUserProfile.role)) {
    return (
      <div className="luxury-admin-container">
        <div className="luxury-access-denied">
          <div className="luxury-shield-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M11,7H13V9H11V7M11,11H13V17H11V11Z"/>
            </svg>
          </div>
          <h2>Access Restricted</h2>
          <p>Administrative privileges required to access this panel.</p>
          <button className="luxury-btn-primary" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
            </svg>
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="luxury-admin-container">
        {/* Premium Header */}
        <header className="luxury-admin-header">
          <div className="luxury-header-content">
            <div className="luxury-brand" onClick={() => navigate('/')}>
              <div className="luxury-logo">
                <img src="/tingletap-logo.jpg" alt="TingleTap" />
              </div>
              <div className="luxury-brand-text">
                <span className="luxury-brand-name">TingleTap</span>
                <span className="luxury-brand-subtitle">Administrative Console</span>
              </div>
            </div>
            
            <div className="luxury-admin-info">
              <div className="luxury-admin-badge">
                <svg viewBox="0 0 24 24" fill="none">
                  {currentUserProfile?.role === 'owner' && <path fill="#FFD700" d="M5,16L3,5L8.5,10L12,4L15.5,10L21,5L19,16H5M19,19A1,1 0 0,1 18,20H6A1,1 0 0,1 5,19V18H19V19Z"/>}
                  {currentUserProfile?.role === 'admin' && <path fill="#ffffff" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.46,13.97L5.82,21L12,17.27Z"/>}
                  {currentUserProfile?.role === 'moderator' && <path fill="#ffffff" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>}
                  {!currentUserProfile?.role && <path fill="#ffffff" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>}
                </svg>
                {({'owner':'GODFATHER','admin':'HIGH COUNCIL','moderator':'GUARDIAN'}[currentUserProfile?.role]) || (currentUserProfile?.role?.toUpperCase()) || 'STAFF'}
              </div>
              <div className="luxury-admin-profile">
                <span className="luxury-admin-name">{currentUserProfile?.displayName}</span>
                <span className="luxury-admin-email">{currentUserProfile?.email}</span>
              </div>
              <button className="luxury-btn-secondary" onClick={() => navigate('/')}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path fill="#7c3aed" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
                </svg>
                Exit Panel
              </button>
            </div>
          </div>
        </header>

        {/* Premium Stats Dashboard */}
        <div className="luxury-stats-section">
          <div className="luxury-stats-grid">
            <div className="luxury-stat-card primary">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" style={{width:34,height:34,animation:'statFloat 3s ease-in-out infinite'}}>
                  <path fill="#9333ea" d="M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M8,13C5.33,13 0,14.34 0,17V19H16V17C16,14.34 10.67,13 8,13M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H24V17C24,14.34 18.67,13 16,13Z"/>
                  <path fill="#c084fc" d="M12,6A2,2 0 0,1 14,8A2,2 0 0,1 12,10A2,2 0 0,1 10,8A2,2 0 0,1 12,6Z" opacity="0.5"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.totalUsers}</div>
                <div className="luxury-stat-label">Total Users</div>
              </div>
            </div>
            
            <div className="luxury-stat-card success">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" style={{width:34,height:34,animation:'statPulse 2s ease-in-out infinite'}}>
                  <path fill="#22c55e" d="M4.93,4.93C3.12,6.74 2,9.24 2,12C2,14.76 3.12,17.26 4.93,19.07L6.34,17.66C4.9,16.22 4,14.22 4,12C4,9.79 4.9,7.78 6.34,6.34L4.93,4.93Z"/>
                  <path fill="#22c55e" d="M19.07,4.93L17.66,6.34C19.1,7.78 20,9.79 20,12C20,14.22 19.1,16.22 17.66,17.66L19.07,19.07C20.88,17.26 22,14.76 22,12C22,9.24 20.88,6.74 19.07,4.93Z"/>
                  <path fill="#4ade80" d="M7.76,7.76C6.67,8.85 6,10.35 6,12C6,13.65 6.67,15.15 7.76,16.24L9.17,14.83C8.45,14.11 8,13.11 8,12C8,10.89 8.45,9.89 9.17,9.17L7.76,7.76Z"/>
                  <path fill="#4ade80" d="M16.24,7.76L14.83,9.17C15.55,9.89 16,10.89 16,12C16,13.11 15.55,14.11 14.83,14.83L16.24,16.24C17.33,15.15 18,13.65 18,12C18,10.35 17.33,8.85 16.24,7.76Z"/>
                  <circle fill="#22c55e" cx="12" cy="12" r="2.8"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.onlineUsers}</div>
                <div className="luxury-stat-label">Online Now</div>
              </div>
            </div>
            
            <div className="luxury-stat-card warning">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" style={{width:34,height:34,animation:'statShake 4s ease-in-out infinite'}}>
                  <path fill="#f97316" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.45 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L4.27,3M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18.01,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.mutedUsers}</div>
                <div className="luxury-stat-label">Muted Users</div>
              </div>
            </div>
            
            <div className="luxury-stat-card danger">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" style={{width:34,height:34,animation:'statGavel 3s ease-in-out infinite'}}>
                  <path fill="#ef4444" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                  <path fill="#fca5a5" d="M17.46,21L15,18.54L12.54,21L11.46,19.92L13.92,17.46L11.46,15L12.54,13.92L15,16.38L17.46,13.92L18.54,15L16.08,17.46L18.54,19.92L17.46,21Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.bannedUsers}</div>
                <div className="luxury-stat-label">Banned Users</div>
              </div>
            </div>
            
            <div className="luxury-stat-card info">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" style={{width:34,height:34,animation:'statFloat 4s ease-in-out infinite',animationDelay:'0.5s'}}>
                  <path fill="#3b82f6" d="M17,12V3A1,1 0 0,0 16,2H3A1,1 0 0,0 2,3V17L6,13H16A1,1 0 0,0 17,12Z"/>
                  <path fill="#93c5fd" d="M21,6H19V15H6V17A1,1 0 0,0 7,18H18L22,22V7A1,1 0 0,0 21,6Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.totalRooms}</div>
                <div className="luxury-stat-label">Total Rooms</div>
              </div>
            </div>
            
            <div className="luxury-stat-card security">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="none" style={{width:34,height:34,animation:'statPulse 2.5s ease-in-out infinite',animationDelay:'0.3s'}}>
                  <path fill="#ec4899" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"/>
                  <path fill="#ffffff" d="M15,15L13.5,16.5L12,15L10.5,16.5L9,15L10.5,13.5L9,12L10.5,10.5L12,12L13.5,10.5L15,12L13.5,13.5L15,15Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.bannedIPs}</div>
                <div className="luxury-stat-label">Banned IPs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Navigation Tabs */}
        <div className="luxury-nav-section">
          <div className="luxury-nav-tabs">
            {[
              {
                id: 'dashboard', label: 'Dashboard', iconColor: '#9333ea',
                renderIcon: (c) => (
                  <>
                    <path fill={c} d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
                  </>
                )
              },
              {
                id: 'users', label: 'Users', iconColor: '#3b82f6',
                renderIcon: (c) => (
                  <>
                    <path fill={c} d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z"/>
                  </>
                )
              },
              {
                id: 'rooms', label: 'Rooms', iconColor: '#10b981',
                renderIcon: (c) => (
                  <>
                    <path fill={c} d="M17,12V3A1,1 0 0,0 16,2H3A1,1 0 0,0 2,3V17L6,13H16A1,1 0 0,0 17,12M21,6H19V15H6V17A1,1 0 0,0 7,18H18L22,22V7A1,1 0 0,0 21,6Z"/>
                  </>
                )
              },
              {
                id: 'security', label: 'Security', iconColor: '#ef4444',
                renderIcon: (c) => (
                  <>
                    <path fill={c} d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7A2,2 0 0,1 14,9V10H15V15H9V10H10V9A2,2 0 0,1 12,7M12,8.9C11.5,8.9 11,9.4 11,10H13C13,9.4 12.5,8.9 12,8.9Z"/>
                  </>
                )
              },
              {
                id: 'reports', label: 'Reports', badge: stats.pendingReports, iconColor: '#a855f7',
                renderIcon: (c) => (
                  <>
                    <path fill={c} d="M11,4.5H13V15.5H11V4.5M13,17.5V19.5H11V17.5H13M2,22H22L12,2L2,22Z"/>
                  </>
                )
              },
              {
                id: 'trust', label: 'Trust', iconColor: '#FFD700',
                renderIcon: (c) => (
                  <>
                    <path fill={c} d="M12,1L9.5,8H2L7.72,12.27L5.82,19.27L12,15.27L18.18,19.27L16.28,12.27L22,8H14.5L12,1Z"/>
                  </>
                )
              },
              {
                id: 'violations', label: 'Violations',
                badge: violations.filter(v => !v.resolved).length,
                iconColor: '#f43f5e',
                renderIcon: (c) => (
                  <>
                    <path fill={c} d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7V13H13V7H11M11,15V17H13V15H11Z"/>
                  </>
                )
              },
              {
                id: 'feedback', label: 'Feedback',
                badge: feedbackItems.filter(f => !f.isRead).length,
                iconColor: '#a855f7',
                renderIcon: (c) => (
                  <>
                    <defs>
                      <linearGradient id="adm_fb_g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor={c}/>
                        <stop offset="1" stopColor={c}/>
                      </linearGradient>
                    </defs>
                    <path fill={c} d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2.5-3.5c-.4.6-1 1-1.5 1.3V10h-2V8.8c-.6-.3-1.2-1-1.5-1.7-.3-.7-.2-1.5.2-2.1.8-1.2 2.5-1.5 3.7-.7.9.6 1.4 1.7 1.1 2.7z"/>
                  </>
                )
              },
              {
                id: 'coins', label: 'Coins',
                iconColor: '#f59e0b',
                renderIcon: (c) => (
                  <>
                    <defs>
                      <linearGradient id="adm_coins_g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#fde68a"/>
                        <stop offset="1" stopColor={c}/>
                      </linearGradient>
                    </defs>
                    <circle cx="12" cy="12" r="10" fill="url(#adm_coins_g)"/>
                    <path fill="#92400e" d="M13.5 8H10v1.5h1.5v5H10V16h4v-1.5h-1.5v-5H14L13.5 8zm-2-2a1 1 0 112 0 1 1 0 01-2 0z"/>
                  </>
                )
              },
              {
                id: 'visitors', label: 'Visitors',
                iconColor: '#0ea5e9',
                renderIcon: (c) => (
                  <>
                    <circle cx="12" cy="8" r="3.5" fill={c}/>
                    <path fill={c} d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"/>
                    <circle cx="19" cy="7" r="2.5" fill={c} opacity="0.6"/>
                    <path fill={c} d="M16.5 16c.5-1 1.5-1.8 2.5-2s2.1.1 3 .8c-.5.7-1.4 1.2-2 1.2H16.5z" opacity="0.6"/>
                  </>
                )
              },
              {
                id: 'badge-verify', label: 'Badges',
                iconColor: '#8b5cf6',
                renderIcon: (c) => (
                  <>
                    <path fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      d="M12 2L2 7l1 5a9 9 0 0 0 9 7 9 9 0 0 0 9-7l1-5z"/>
                    <path fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                      d="M9 12l2 2 4-4"/>
                  </>
                )
              },
              {
                id: 'rj-verify', label: 'RJ Verify',
                iconColor: '#6d28d9',
                renderIcon: (c) => (
                  <>
                    <rect x="9" y="2" width="6" height="12" rx="3" fill="none" stroke={c} strokeWidth="2"/>
                    <path fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" d="M5 11a7 7 0 0 0 14 0"/>
                    <path fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" d="M12 19v3M9 22h6"/>
                  </>
                )
              }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const iconFill = isActive ? '#ffffff' : tab.iconColor;
              return (
                <button
                  key={tab.id}
                  className={`luxury-nav-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22, flexShrink: 0 }}>
                    {tab.renderIcon(iconFill)}
                  </svg>
                  <span className="luxury-tab-label">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className={`lav-notif-badge ${isActive ? 'lav-notif-badge--active' : ''}`}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
            {/* Email Center — owner only */}
            {currentUserProfile?.role === 'owner' && (
              <button
                className="luxury-nav-tab"
                onClick={() => navigate('/owner/email-center')}
                title="Owner Email Center"
              >
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22, flexShrink: 0 }}>
                  <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="#a855f7" strokeWidth="1.9"/>
                  <path d="M2 8l10 6 10-6" stroke="#a855f7" strokeWidth="1.9" strokeLinecap="round"/>
                </svg>
                <span className="luxury-tab-label">Email Center</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="luxury-main-content">
          {activeTab === 'dashboard' && (
            <div className="luxury-dashboard-section">
              <div className="luxury-section-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:28,height:28,flexShrink:0,animation:'statFloat 3.5s ease-in-out infinite'}}>
                    <path fill="#9333ea" d="M21,3H3C1.89,3 1,3.89 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,0 23,17V5C23,3.89 22.1,3 21,3M21,17H3V5H21V17Z"/>
                    <path fill="#a855f7" d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14Z"/>
                    <path fill="#c084fc" d="M5.5,7.5L4,9L7,12L4,15L5.5,16.5L10,12L5.5,7.5Z"/>
                  </svg>
                  System Overview
                </h2>
                <p>Real-time platform statistics and monitoring</p>
              </div>
              
              <div className="luxury-dashboard-grid">
                <div className="luxury-dashboard-card">
                  <h3>Recent Activity</h3>
                  <div className="luxury-activity-list">
                    {users.slice(0, 5).map(user => (
                      <div key={user.uid} className="luxury-activity-item">
                        <img src={user.photoURL || `${getDefaultAvatarUrl(user.uid, user.gender)}`} alt="" />
                        <div>
                          <span className="luxury-activity-name">{user.displayName}</span>
                          <span className="luxury-activity-action">
                            {onlineStatuses[user.uid]?.state === 'online' ? 'Currently online' : 'Recently active'}
                          </span>
                        </div>
                        <div className={`luxury-activity-status ${onlineStatuses[user.uid]?.state === 'online' ? 'online' : 'offline'}`}></div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="luxury-dashboard-card">
                  <h3>System Health</h3>
                  <div className="luxury-health-metrics">
                    <div className="luxury-health-item">
                      <span className="luxury-health-label">Server Status</span>
                      <span className="luxury-health-value status-online">Operational</span>
                    </div>
                    <div className="luxury-health-item">
                      <span className="luxury-health-label">Database</span>
                      <span className="luxury-health-value status-online">Connected</span>
                    </div>
                    <div className="luxury-health-item">
                      <span className="luxury-health-label">Real-time Sync</span>
                      <span className="luxury-health-value status-online">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="luxury-users-section">
              <div className="luxury-section-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:27,height:27,flexShrink:0}}>
                    <path fill="#3b82f6" d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
                  </svg>
                  User Management
                </h2>
                <p>Comprehensive user control and moderation tools</p>
              </div>

              {/* Search and Filters */}
              <div className="luxury-controls-section">
                <div className="luxury-search-bar">
                  <div className="luxury-search-input-wrapper">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="luxury-search-input"
                    />
                  </div>
                </div>
                
                <div className="luxury-filters">
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="luxury-filter-select"
                  >
                    <option value="all">All Roles</option>
                    <option value="owner">⭐ Owner</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                    <option value="user">User</option>
                  </select>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="luxury-filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="banned">Banned</option>
                    <option value="muted">Muted</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="luxury-users-table-container">
                {loading ? (
                  <div className="luxury-loading-state">
                    <div className="luxury-loading-spinner"></div>
                    <span>Loading user data...</span>
                  </div>
                ) : (
                  <div className="luxury-users-table">
                    <div className="luxury-table-header">
                      <div className="luxury-th">User Profile</div>
                      <div className="luxury-th">Status & Role</div>
                      <div className="luxury-th">Device Information</div>
                      <div className="luxury-th">Location & IP</div>
                      <div className="luxury-th">Actions</div>
                    </div>
                    
                    <div className="luxury-table-body">
                      {filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE).map(user => {
                        const isOnline = onlineStatuses[user.uid]?.state === 'online';
                        const deviceInfo = getUserDeviceInfo(user);
                        const currentRoom = onlineStatuses[user.uid]?.currentRoomId;
                        
                        return (
                          <div key={user.uid} className="luxury-table-row">
                            <div className="luxury-td user-profile-cell">
                              <div className="luxury-user-avatar-wrapper">
                                <img 
                                  src={user.photoURL || `${getDefaultAvatarUrl(user.uid, user.gender)}`}
                                  alt={user.displayName}
                                  className="luxury-user-avatar"
                                />
                                <div className={`luxury-user-status-indicator ${isOnline ? 'online' : 'offline'}`}></div>
                              </div>
                              <div className="luxury-user-details">
                                <div className="luxury-user-name">{user.displayName || 'Anonymous'}</div>
                                <div className="luxury-user-email">{user.email}</div>
                                <div className="luxury-user-id">ID: {user.uid.substring(0, 8)}...</div>
                              </div>
                            </div>
                            
                            <div className="luxury-td status-role-cell">
                              <div className="luxury-status-section">
                                <div className={`luxury-status-badge ${isOnline ? 'online' : 'offline'}`}>
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10"/>
                                  </svg>
                                  {isOnline ? 'Online' : 'Offline'}
                                </div>
                                {currentRoom && (
                                  <div className="luxury-current-room">
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#7c3aed" d="M20,2H4C2.9,2 2,2.9 2,4V16C2,17.1 2.9,18 4,18H8L12,22L16,18H20C21.1,18 22,17.1 22,16V4C22,2.9 21.1,2 20,2M20,16H15.17L12,19.17L8.83,16H4V4H20V16Z"/>
                                    </svg>
                                    {currentRoom}
                                  </div>
                                )}
                              </div>
                              
                              <div className="luxury-role-section">
                                <span className={`luxury-role-badge role-${(user.role === 'superowner' ? 'owner' : user.role) || 'user'}`}>
                                  <svg viewBox="0 0 24 24" fill="none">
                                    {(user.role === 'owner' || user.role === 'superowner') && <path fill="#FFD700" d="M5,16L3,5L8.5,10L12,4L15.5,10L21,5L19,16H5M19,19A1,1 0 0,1 18,20H6A1,1 0 0,1 5,19V18H19V19Z"/>}
                                    {user.role === 'admin' && <path fill="#3b82f6" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.46,13.97L5.82,21L12,17.27Z"/>}
                                    {user.role === 'moderator' && <path fill="#10b981" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>}
                                    {(!user.role || user.role === 'user') && <path fill="#3b82f6" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>}
                                  </svg>
                                  {({'owner':'GODFATHER','superowner':'GODFATHER','admin':'HIGH COUNCIL','moderator':'GUARDIAN'}[user.role]) || (user.role?.toUpperCase()) || 'USER'}
                                </span>
                              </div>
                              
                              <div className="luxury-moderation-status">
                                {user.isBanned && (
                                  <span className="luxury-banned-badge">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                                    </svg>
                                    BANNED
                                  </span>
                                )}
                                {user.mutedInfo?.isMuted && (
                                  <span className="luxury-muted-badge">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19M16.5,12C16.78,12 17,12.22 17,12.5V13.5C17,13.78 16.78,14 16.5,14H15.5C15.22,14 15,13.78 15,13.5V12.5C15,12.22 15.22,12 15.5,12H16.5Z"/>
                                    </svg>
                                    MUTED
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="luxury-td device-info-cell">
                              <div className="luxury-device-details">
                                <div className="luxury-device-item">
                                  {deviceInfo.device === 'Mobile' ? (
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}><path fill="#6366f1" d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,19H7V5H17V19M12,20.5A1.5,1.5 0 0,1 10.5,19A1.5,1.5 0 0,1 12,17.5A1.5,1.5 0 0,1 13.5,19A1.5,1.5 0 0,1 12,20.5Z"/></svg>
                                  ) : deviceInfo.device === 'Tablet' ? (
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}><path fill="#6366f1" d="M19,18H5V6H19M21,4H3C1.89,4 1,4.89 1,6V18A2,2 0 0,0 3,20H21A2,2 0 0,0 23,18V6C23,4.89 22.1,4 21,4Z"/></svg>
                                  ) : (
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}><path fill="#6366f1" d="M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z"/></svg>
                                  )}
                                  <span style={{fontWeight:800,color:'#4f46e5',fontSize:11}}>{extractDeviceBrand(deviceInfo.deviceModel)}</span>
                                </div>
                                <div className="luxury-device-item">
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}><path fill="#f97316" d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
                                  <span style={{fontSize:11,color:'#c2410c',fontWeight:700}}>{deviceInfo.browser}</span>
                                </div>
                                <div className="luxury-device-item">
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}><path fill="#10b981" d="M12,3C7.58,3 4,4.79 4,7V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V7C20,4.79 16.42,3 12,3M12,5C15.87,5 18,6.5 18,7C18,7.5 15.87,9 12,9C8.13,9 6,7.5 6,7C6,6.5 8.13,5 12,5M18,17C18,17.5 15.87,19 12,19C8.13,19 6,17.5 6,17V14.77C7.61,15.55 9.72,16 12,16C14.28,16 16.39,15.55 18,14.77V17M18,12.45C16.7,13.4 14.42,14 12,14C9.58,14 7.3,13.4 6,12.45V9.64C7.47,10.47 9.61,11 12,11C14.39,11 16.53,10.47 18,9.64V12.45Z"/></svg>
                                  <span style={{fontSize:11,color:'#065f46',fontWeight:700}}>{deviceInfo.os}</span>
                                </div>
                                <div className="luxury-device-item">
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}><path fill="#ec4899" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
                                  <span style={{fontFamily:'monospace',fontSize:10,color: deviceInfo.lastSeen === 'Online' ? '#059669' : '#9f1239',fontWeight:700}}>
                                    {(() => {
                                      const ls = deviceInfo.lastSeen;
                                      if (ls === 'Online') return '🟢 Online Now';
                                      if (!ls || ls === 'Unknown') return '—';
                                      const d = new Date(typeof ls === 'number' ? ls : ls);
                                      if (isNaN(d.getTime())) return '—';
                                      const now = Date.now();
                                      const diff = now - d.getTime();
                                      const mins = Math.floor(diff / 60000);
                                      const hrs = Math.floor(diff / 3600000);
                                      const days = Math.floor(diff / 86400000);
                                      if (mins < 2) return 'Just now';
                                      if (mins < 60) return `${mins}m ago`;
                                      if (hrs < 24) return `${hrs}h ago`;
                                      if (days < 7) return `${days}d ago`;
                                      return d.toLocaleString('en-IN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
                                    })()}
                                  </span>
                                </div>
                                {(user.lastDeviceId || user.deviceId) && (
                                  <div className="luxury-device-item" title={`Full Device ID: ${user.lastDeviceId || user.deviceId}`}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}><path fill="#8b5cf6" d="M6.5,2C5.12,2 4,3.12 4,4.5V18.5C4,19.88 5.12,21 6.5,21H17.5C18.88,21 20,19.88 20,18.5V4.5C20,3.12 18.88,2 17.5,2H6.5M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M8,10H16V12H8V10M8,14H14V16H8V14Z"/></svg>
                                    <span style={{fontFamily:'monospace',fontSize:10,color:'#5b21b6',fontWeight:800,letterSpacing:'0.04em'}}>
                                      {(user.lastDeviceId || user.deviceId).substring(0, 10)}…
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="luxury-td location-ip-cell">
                              {(() => {
                                const ip = deviceInfo.ip;
                                const storedLat = deviceInfo.lat;
                                const storedLon = deviceInfo.lon;
                                const storedCity = deviceInfo.city;
                                const storedCountry = deviceInfo.country;
                                const cityCountry = storedCity || storedCountry
                                  ? [storedCity, storedCountry].filter(Boolean).join(', ')
                                  : (deviceInfo.location && deviceInfo.location !== 'Unknown' ? deviceInfo.location : '');
                                const hasCoords = storedLat !== null && storedLat !== undefined && storedLon !== null && storedLon !== undefined;
                                return (
                                  <div className="luxury-location-details">
                                    <div className="luxury-location-item">
                                      <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16,flexShrink:0}}><path fill="#8b5cf6" d="M15,12C15,13.66 13.66,15 12,15C10.34,15 9,13.66 9,12C9,10.34 10.34,9 12,9C13.66,9 15,10.34 15,12M21,12C21,16.97 16.97,21 12,21C7.03,21 3,16.97 3,12C3,7.03 7.03,3 12,3C16.97,3 21,7.03 21,12M19,12C19,8.13 15.87,5 12,5C8.13,5 5,8.13 5,12C5,15.87 8.13,19 12,19C15.87,19 19,15.87 19,12Z"/></svg>
                                      <span style={{fontFamily:'monospace',fontSize:11,color:'#5b21b6',fontWeight:900,letterSpacing:'0.03em'}}>
                                        {ip && ip !== 'Unknown' ? ip : '—'}
                                      </span>
                                    </div>
                                    <div className="luxury-location-item">
                                      <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16,flexShrink:0}}><path fill="#ef4444" d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5C10.62,11.5 9.5,10.38 9.5,9C9.5,7.62 10.62,6.5 12,6.5C13.38,6.5 14.5,7.62 14.5,9C14.5,10.38 13.38,11.5 12,11.5Z"/></svg>
                                      <span style={{fontSize:11,color:'#1f2937',fontWeight:700}}>
                                        {cityCountry || '—'}
                                      </span>
                                    </div>
                                    <div className="luxury-location-item">
                                      <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16,flexShrink:0}}><path fill="#14b8a6" d="M12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5M12,2A7,7 0 0,1 19,9C19,14.25 12,22 12,22C12,22 5,14.25 5,9A7,7 0 0,1 12,2Z"/></svg>
                                      <span style={{fontFamily:'monospace',fontSize:10,color:'#0f766e',fontWeight:800}}>
                                        {hasCoords ? `${Number(storedLat).toFixed(4)}°, ${Number(storedLon).toFixed(4)}°` : '—'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            
                            <div className="luxury-td actions-cell">
                              <div className="luxury-action-buttons">
                                {!user.isBanned ? (
                                  <button 
                                    className="luxury-action-btn ban-btn"
                                    onClick={() => handleModerateUser(user, 'ban')}
                                    title="Ban User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#ffffff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.57,15.55 5.53,16.97L16.97,5.53C15.55,4.57 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.43,8.45 18.47,7.03L7.03,18.47C8.45,19.43 10.15,20 12,20Z"/>
                                    </svg>
                                    <span>Ban</span>
                                  </button>
                                ) : (
                                  <button 
                                    className="luxury-action-btn unban-btn"
                                    onClick={() => handleModerateUser(user, 'unban')}
                                    title="Unban User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#ffffff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/>
                                    </svg>
                                    <span>Unban</span>
                                  </button>
                                )}
                                
                                {!user.mutedInfo?.isMuted ? (
                                  <button 
                                    className="luxury-action-btn mute-btn"
                                    onClick={() => handleModerateUser(user, 'mute')}
                                    title="Mute User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#ffffff" d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.28,11.73 17.28,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5L15,11.16M4.27,3L21,19.73L19.73,21L15.54,16.81C14.77,17.27 13.91,17.58 13,17.72V21H11V17.72C7.72,17.23 5,14.41 5,11H6.73C6.73,14 9.43,16.1 12,16.1C12.62,16.1 13.22,15.97 13.77,15.74L11.91,13.88C11.94,13.88 11.97,14 12,14A3,3 0 0,1 9,11V10.27L4.27,5.54L3,4.27L4.27,3Z"/>
                                    </svg>
                                    <span>Mute</span>
                                  </button>
                                ) : (
                                  <button 
                                    className="luxury-action-btn unmute-btn"
                                    onClick={() => handleModerateUser(user, 'unmute')}
                                    title="Unmute User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#ffffff" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                                    </svg>
                                    <span>Unmute</span>
                                  </button>
                                )}
                                
                                {user.kickedFrom?.roomId ? (
                                  <button
                                    className="luxury-action-btn"
                                    style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
                                    onClick={() => handleModerateUser(user, 'unkick')}
                                    title="Unkick User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#ffffff" d="M16,13V10L11,15L16,20V17H22V13H16M14,2A2,2 0 0,0 12,4V6H14V4H5V20H14V18H12A2,2 0 0,1 10,16H5A2,2 0 0,1 3,14V4A2,2 0 0,1 5,2H14Z"/>
                                    </svg>
                                    <span>Unkick</span>
                                  </button>
                                ) : (
                                  <button
                                    className="luxury-action-btn kick-btn"
                                    onClick={() => handleModerateUser(user, 'kick')}
                                    title="Kick from Room"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#ffffff" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
                                    </svg>
                                    <span>Kick</span>
                                  </button>
                                )}

                                {!user.isDeviceBanned ? (
                                  <button
                                    className="luxury-action-btn device-ban-btn"
                                    onClick={() => handleDeviceBan(user)}
                                    title="Ban Device"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#ffffff" d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,19H7V5H17V19M14.12,6.88L12,9L9.88,6.88L8.5,8.28L10.62,10.38L8.5,12.5L9.88,13.88L12,11.78L14.12,13.88L15.5,12.5L13.4,10.38L15.5,8.28L14.12,6.88Z"/>
                                    </svg>
                                    <span>Dev-Ban</span>
                                  </button>
                                ) : (
                                  <button
                                    className="luxury-action-btn"
                                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
                                    onClick={() => handleUnDeviceBan(user)}
                                    title="Remove Device Ban"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path fill="#ffffff" d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,19H7V5H17V19M9,8.41L10.41,7L12,8.58L13.59,7L15,8.41L13.42,10L15,11.59L13.59,13L12,11.41L10.41,13L9,11.59L10.58,10L9,8.41Z"/>
                                    </svg>
                                    <span>Un-DevBan</span>
                                  </button>
                                )}
                                
                                {['owner', 'admin'].includes(currentUserProfile?.role) &&
                                  !(currentUserProfile?.role === 'admin' && user.role === 'owner') && (
                                  <>
                                    <button
                                      className="luxury-action-btn"
                                      style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}
                                      onClick={() => handleAssignBadge(user)}
                                      title="Assign Badge"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
                                        <path fill="#ffffff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,17L6.5,12.5L7.91,11.09L11,14.17L16.09,9.08L17.5,10.5L11,17Z"/>
                                      </svg>
                                      <span>Badge</span>
                                    </button>
                                    {!(user.role === 'owner' || user.role === 'superowner') &&
                                      !(currentUserProfile?.role === 'admin' && user.role === 'admin') && (
                                      <button
                                        className="luxury-action-btn"
                                        style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}
                                        onClick={() => handleOpenRoleModal(user)}
                                        title="Change Role"
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
                                          <path fill="#ffffff" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L19.37,4.29C19,3.9 18.35,3.9 17.96,4.29L17,5.25L18.75,7L20.71,7.04M11,13.92V16H13.08L19.17,9.91L17.42,8.16L11,13.92Z"/>
                                        </svg>
                                        <span>Role</span>
                                      </button>
                                    )}
                                  </>
                                )}

                                {currentUserProfile?.role === 'owner' && (
                                  <>
                                    <button
                                      className="luxury-action-btn"
                                      style={{ background: 'linear-gradient(135deg,#059669,#34d399)' }}
                                      onClick={() => { setChangeEmailTarget(user); setChangeEmailValue(user.email || ''); setShowChangeEmailModal(true); }}
                                      title="Change Email"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
                                        <path fill="#ffffff" d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
                                      </svg>
                                      <span>Chg Email</span>
                                    </button>
                                    <button
                                      className="luxury-action-btn"
                                      style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}
                                      onClick={() => { setChangeUsernameTarget(user); setChangeUsernameValue(user.displayName || user.username || ''); setShowChangeUsernameModal(true); }}
                                      title="Change Username"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
                                        <path fill="#ffffff" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L19.37,4.29C19,3.9 18.35,3.9 17.96,4.29L17,5.25L18.75,7L20.71,7.04M11,13.92V16H13.08L19.17,9.91L17.42,8.16L11,13.92Z"/>
                                      </svg>
                                      <span>Chg Name</span>
                                    </button>
                                  </>
                                )}

                                <button 
                                  className="luxury-action-btn delete-btn"
                                  onClick={() => handleDeleteProfile(user)}
                                  title="Delete Profile"
                                >
                                  <svg viewBox="0 0 24 24" fill="none">
                                    <path fill="#ffffff" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
                                  </svg>
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="luxury-rooms-section">
              <div className="luxury-section-header luxury-section-header-flex">
                <div>
                  <h2>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:27,height:27,flexShrink:0}}>
                      <path fill="#10b981" d="M20,2H4C2.9,2 2,2.9 2,4V16C2,17.1 2.9,18 4,18H8L12,22L16,18H20C21.1,18 22,17.1 22,16V4C22,2.9 21.1,2 20,2M20,16H15.17L12,19.17L8.83,16H4V4H20V16Z"/>
                    </svg>
                    Room Management
                  </h2>
                  <p>Monitor and control all chat rooms</p>
                </div>
                <button className="luxury-btn-primary" onClick={() => setShowCreateRoom(true)}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path fill="#ffffff" d="M17,12H13V16H11V12H7V10H11V6H13V10H17M20,2H4C2.89,2 2,2.89 2,4V16C2,17.11 2.89,18 4,18H8L12,22L16,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
                  </svg>
                  Create Room
                </button>
              </div>

              {rooms.length === 0 && (
                <div className="luxury-empty-state">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
                  </svg>
                  <p>No rooms yet. Create your first room!</p>
                </div>
              )}
              
              <div className="luxury-rooms-grid">
                {rooms.map((room, idx) => {
                  const roomColors = [
                    { from: '#7c3aed', to: '#a855f7' },
                    { from: '#3b82f6', to: '#6366f1' },
                    { from: '#10b981', to: '#059669' },
                    { from: '#f59e0b', to: '#d97706' },
                    { from: '#ec4899', to: '#db2777' },
                    { from: '#14b8a6', to: '#0d9488' },
                  ];
                  const getRoomIconPath = (name) => {
                    const n = (name || '').toLowerCase();
                    if (n.includes('india') || n.includes('indian') || n.includes('bharat') || n.includes('hindi') || n.includes('desi'))
                      return "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4C15.86,4 19.12,6.36 20.5,9.75H3.5C4.88,6.36 8.14,4 12,4M3.06,11.75H20.94C20.98,11.83 21,11.91 21,12C21,12.09 20.98,12.17 20.94,12.25H3.06C3.02,12.17 3,12.09 3,12C3,11.91 3.02,11.83 3.06,11.75M3.5,14.25H20.5C19.12,17.64 15.86,20 12,20C8.14,20 4.88,17.64 3.5,14.25Z";
                    if (n.includes('game') || n.includes('gaming') || n.includes('gamer') || n.includes('play') || n.includes('esport'))
                      return "M7,6H17A6,6 0 0,1 23,12A6,6 0 0,1 17,18C15.22,18 13.63,17.23 12.53,16H11.47C10.37,17.23 8.78,18 7,18A6,6 0 0,1 1,12A6,6 0 0,1 7,6M6,9V11H4V13H6V15H8V13H10V11H8V9H6M15.5,12A1.5,1.5 0 0,0 14,13.5A1.5,1.5 0 0,0 15.5,15A1.5,1.5 0 0,0 17,13.5A1.5,1.5 0 0,0 15.5,12M18.5,9A1.5,1.5 0 0,0 17,10.5A1.5,1.5 0 0,0 18.5,12A1.5,1.5 0 0,0 20,10.5A1.5,1.5 0 0,0 18.5,9Z";
                    if (n.includes('staff') || n.includes('mod') || n.includes('admin') || n.includes('team') || n.includes('crew') || n.includes('olympian'))
                      return "M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.46,13.97L5.82,21L12,17.27Z";
                    if (n.includes('music') || n.includes('song') || n.includes('beat') || n.includes('audio') || n.includes('vibe'))
                      return "M12,3V13.55C11.41,13.21 10.73,13 10,13A4,4 0 0,0 6,17A4,4 0 0,0 10,21A4,4 0 0,0 14,17V7H18V3H12Z";
                    if (n.includes('video') || n.includes('movie') || n.includes('film') || n.includes('watch') || n.includes('stream'))
                      return "M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z";
                    if (n.includes('news') || n.includes('announce') || n.includes('update') || n.includes('notice'))
                      return "M18,14H6V12H18V14M18,10H6V8H18V10M18,18H6V16H18V18M3,3A2,2 0 0,0 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5A2,2 0 0,0 21,3H3Z";
                    if (n.includes('love') || n.includes('romance') || n.includes('dating') || n.includes('date') || n.includes('heart'))
                      return "M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z";
                    if (n.includes('sport') || n.includes('cricket') || n.includes('football') || n.includes('soccer') || n.includes('fitness'))
                      return "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M9.58,16.57C8.33,15.5 7.5,14 7.5,12.25L12,7.25L16.5,12.25C16.5,14 15.67,15.5 14.42,16.57L12,14.25L9.58,16.57M17.25,14.75C17.72,13.97 18,13.1 18,12.25C18,10.07 16.57,8.2 14.75,7.33L12,4.25L9.25,7.33C7.43,8.2 6,10.07 6,12.25C6,13.1 6.28,13.97 6.75,14.75L12,20L17.25,14.75Z";
                    if (n.includes('tech') || n.includes('code') || n.includes('program') || n.includes('dev') || n.includes('hack'))
                      return "M8,3A2,2 0 0,0 6,5V9A2,2 0 0,0 4,11H3V13H4A2,2 0 0,0 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,1 20,11H21V13H20A2,2 0 0,1 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3H16Z";
                    if (n.includes('art') || n.includes('draw') || n.includes('design') || n.includes('creative'))
                      return "M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A1.5,1.5 0 0,0 13.5,19.5C13.5,19.11 13.35,18.76 13.11,18.5C12.88,18.23 12.73,17.88 12.73,17.5A1.5,1.5 0 0,1 14.23,16H16A5,5 0 0,0 21,11C21,6.58 16.97,3 12,3Z";
                    if (n.includes('global') || n.includes('world') || n.includes('international') || n.includes('english'))
                      return "M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z";
                    return "M20,2H4C2.9,2 2,2.9 2,4V22L6,18H20C21.1,18 22,17.1 22,16V4C22,2.9 21.1,2 20,2M20,16H5.17L4,17.17V4H20V16Z";
                  };
                  const col = roomColors[idx % roomColors.length];
                  const iconPath = getRoomIconPath(room.name);
                  return (
                    <div key={room.id} className="luxury-room-card">
                      <div className="luxury-room-header">
                        <div className="luxury-room-icon" style={{ background: `linear-gradient(135deg, ${col.from}, ${col.to})` }}>
                          <svg viewBox="0 0 24 24" fill="none">
                            <path fill="#ffffff" d={iconPath}/>
                          </svg>
                        </div>
                        <div className="luxury-room-info">
                          <h3 className="luxury-room-name">{room.name}</h3>
                          <p className="luxury-room-description">{room.description || 'No description'}</p>
                        </div>
                        <span className={`luxury-room-type-badge ${room.type || 'public'}`}>
                          {room.type === 'private' ? '🔒 Private' : '🌐 Public'}
                        </span>
                      </div>
                      
                      <div className="luxury-room-stats">
                        <div className="luxury-room-stat">
                          <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                            {room.isActive !== false ? <path fill="#6366f1" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/> : <path fill="#ef4444" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>}
                          </svg>
                          <span style={{fontWeight:700,color: room.isActive !== false ? '#4f46e5' : '#dc2626'}}>{room.isActive !== false ? 'Active' : 'Inactive'}</span>
                        </div>
                        {room.maxUsers && (
                          <div className="luxury-room-stat">
                            <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                              <path fill="#f59e0b" d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2Z"/>
                            </svg>
                            <span style={{fontWeight:700,color:'#b45309'}}>Max: {room.maxUsers}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="luxury-room-actions">
                        <button
                          className="luxury-action-btn"
                          style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
                          onClick={() => handleEditRoom(room)}
                          title="Edit Room"
                        >
                          <svg viewBox="0 0 24 24" fill="none">
                            <path fill="#ffffff" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                          </svg>
                          <span>Edit</span>
                        </button>
                        <button
                          className="luxury-action-btn delete-btn"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => handleDeleteRoom(room)}
                          title="Delete Room"
                        >
                          <svg viewBox="0 0 24 24" fill="none">
                            <path fill="#ffffff" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Kicked Users Management Panel ── */}
              <div style={{ marginTop: '2rem' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.6rem', marginBottom:'0.9rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.55rem' }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#f97316,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}}>
                        <path fill="#fff" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'#1e1b4b' }}>
                        Kicked Users
                        {kickedUsersList.length > 0 && (
                          <span style={{ marginLeft:8, background:'#f97316', color:'#fff', fontSize:11, fontWeight:700, borderRadius:20, padding:'1px 8px' }}>
                            {kickedUsersList.length}
                          </span>
                        )}
                      </h3>
                      <p style={{ margin:0, fontSize:11, color:'#6b7280' }}>Users currently kicked from any room</p>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                    <button
                      onClick={() => loadAllKickedUsers(rooms)}
                      disabled={kickedUsersLoading}
                      style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, padding:'6px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', fontWeight:700, cursor:'pointer', opacity: kickedUsersLoading ? 0.6 : 1 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}>
                        <path fill="#6b7280" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                      </svg>
                      {kickedUsersLoading ? 'Loading…' : 'Refresh'}
                    </button>
                    {kickedUsersList.length > 0 && (
                      <button
                        onClick={handleBulkUnkickAll}
                        disabled={kickedUsersLoading}
                        style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, padding:'6px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', fontWeight:800, cursor:'pointer', opacity: kickedUsersLoading ? 0.6 : 1 }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}>
                          <path fill="#fff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/>
                        </svg>
                        Unkick All ({kickedUsersList.length})
                      </button>
                    )}
                  </div>
                </div>

                {kickedUsersLoading && kickedUsersList.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'2rem', color:'#9ca3af', fontSize:13 }}>
                    <div className="luxury-loading-spinner" style={{width:22,height:22,borderWidth:3,margin:'0 auto 8px'}}></div>
                    Loading kicked users…
                  </div>
                ) : kickedUsersList.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'2rem 1rem', background:'#f8fafc', borderRadius:14, border:'1.5px dashed #e2e8f0' }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:36,height:36,margin:'0 auto 8px',display:'block'}}>
                      <path fill="#10b981" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/>
                    </svg>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#059669' }}>No kicked users right now</p>
                    <p style={{ margin:'4px 0 0', fontSize:11.5, color:'#9ca3af' }}>All rooms are clear</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    {kickedUsersList.map((kicked) => {
                      const kickKey = kicked.uid + kicked.roomId;
                      const isUnkicking = quickUnkickingId === kickKey;
                      const kickedAtMs = kicked.kickedAt?.toDate ? kicked.kickedAt.toDate().getTime() : (kicked.kickedAt?.seconds ? kicked.kickedAt.seconds * 1000 : null);
                      const kickedAtStr = kickedAtMs ? new Date(kickedAtMs).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
                      return (
                        <div key={kickKey} style={{ display:'flex', alignItems:'center', gap:'0.7rem', background:'#fff', border:'1.5px solid #fed7aa', borderRadius:12, padding:'10px 14px', flexWrap:'wrap' }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#fed7aa,#fb923c)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:900, fontSize:15, color:'#9a3412' }}>
                            {(kicked.displayName || kicked.username || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:100 }}>
                            <div style={{ fontWeight:800, fontSize:13, color:'#1e1b4b' }}>{kicked.displayName || kicked.username || kicked.uid}</div>
                            <div style={{ fontSize:11, color:'#6b7280', display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:2 }}>
                              <span style={{ background:'#ede9fe', color:'#5b21b6', padding:'1px 7px', borderRadius:20, fontWeight:700 }}>
                                🚪 {kicked.roomName || kicked.roomId}
                              </span>
                              {kicked.kickDuration && kicked.kickDuration !== 'permanent' && (
                                <span style={{ background:'#fef3c7', color:'#92400e', padding:'1px 7px', borderRadius:20, fontWeight:600 }}>
                                  ⏱ {kicked.kickDuration}
                                </span>
                              )}
                              {kicked.kickDuration === 'permanent' && (
                                <span style={{ background:'#fee2e2', color:'#991b1b', padding:'1px 7px', borderRadius:20, fontWeight:700 }}>
                                  🔴 Permanent
                                </span>
                              )}
                              {kicked.reason && (
                                <span style={{ color:'#9ca3af', fontStyle:'italic' }}>"{kicked.reason}"</span>
                              )}
                            </div>
                            <div style={{ fontSize:10.5, color:'#9ca3af', marginTop:3 }}>
                              Kicked at {kickedAtStr}{kicked.kickedBy ? ` by ${kicked.kickedBy}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => handleQuickUnkick(kicked)}
                            disabled={isUnkicking || kickedUsersLoading}
                            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, padding:'7px 14px', borderRadius:8, border:'none', background: isUnkicking ? '#e5e7eb' : 'linear-gradient(135deg,#06b6d4,#0891b2)', color: isUnkicking ? '#9ca3af' : '#fff', fontWeight:800, cursor: isUnkicking ? 'default' : 'pointer', whiteSpace:'nowrap', flexShrink:0 }}
                          >
                            {isUnkicking ? (
                              <><div className="luxury-loading-spinner" style={{width:12,height:12,borderWidth:2}}></div> Unkicking…</>
                            ) : (
                              <>
                                <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}>
                                  <path fill="#fff" d="M16,13V10L11,15L16,20V17H22V13H16M14,2A2,2 0 0,0 12,4V6H14V4H5V20H14V18H12A2,2 0 0,1 10,16H5A2,2 0 0,1 3,14V4A2,2 0 0,1 5,2H14Z"/>
                                </svg>
                                Unkick
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Create Room Modal */}
              {showCreateRoom && (
                <div className="luxury-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateRoom(false); }}>
                  <div className="luxury-modal-card">
                    <div className="luxury-modal-header">
                      <div className="luxury-modal-icon">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path fill="#ffffff" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                        </svg>
                      </div>
                      <div>
                        <h3>Create New Room</h3>
                        <p>Set up a new chat room for your community</p>
                      </div>
                      <button className="luxury-modal-close" onClick={() => setShowCreateRoom(false)}>
                        <svg viewBox="0 0 24 24" fill="none">
                          <path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                        </svg>
                      </button>
                    </div>

                    <div className="luxury-modal-body">
                      <div className="luxury-form-group">
                        <label className="luxury-form-label">
                          <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M5,4V7H10.5V19H13.5V7H19V4H5Z"/></svg>
                          Room Name *
                        </label>
                        <input
                          className="luxury-form-input"
                          type="text"
                          placeholder="e.g. General Chat, Gaming, Music..."
                          value={createRoomData.name}
                          onChange={(e) => setCreateRoomData(p => ({ ...p, name: e.target.value }))}
                          maxLength={40}
                          autoFocus
                        />
                      </div>

                      <div className="luxury-form-group">
                        <label className="luxury-form-label">
                          <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/></svg>
                          Description
                        </label>
                        <input
                          className="luxury-form-input"
                          type="text"
                          placeholder="Short description of this room..."
                          value={createRoomData.description}
                          onChange={(e) => setCreateRoomData(p => ({ ...p, description: e.target.value }))}
                          maxLength={100}
                        />
                      </div>

                      <div className="luxury-form-row">
                        <div className="luxury-form-group">
                          <label className="luxury-form-label">
                            <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"/></svg>
                            Room Type
                          </label>
                          <select
                            className="luxury-form-input"
                            value={createRoomData.type}
                            onChange={(e) => setCreateRoomData(p => ({ ...p, type: e.target.value }))}
                          >
                            <option value="public">🌐 Public</option>
                            <option value="private">🔒 Private</option>
                          </select>
                        </div>

                        <div className="luxury-form-group">
                          <label className="luxury-form-label">
                            <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/></svg>
                            Max Users
                          </label>
                          <input
                            className="luxury-form-input"
                            type="number"
                            min="2"
                            max="500"
                            value={createRoomData.maxUsers}
                            onChange={(e) => setCreateRoomData(p => ({ ...p, maxUsers: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Password + Order row */}
                      <div className="luxury-form-row">
                        <div className="luxury-form-group">
                          <label className="luxury-form-label">
                            <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></svg>
                            Room Password (optional)
                          </label>
                          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                            <input
                              className="luxury-form-input"
                              type={showCreatePw ? 'text' : 'password'}
                              placeholder="Leave blank = open room"
                              value={createRoomData.password}
                              onChange={(e) => setCreateRoomData(p => ({ ...p, password: e.target.value }))}
                              style={{ paddingRight: 36 }}
                            />
                            <button type="button" onClick={() => setShowCreatePw(p=>!p)} style={{ position:'absolute', right:10, background:'none', border:'none', cursor:'pointer', color:'#7c3aed', padding:0 }}>
                              <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16}}>
                                {showCreatePw ? <path fill="#7c3aed" d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/> : <path fill="#7c3aed" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>}
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="luxury-form-group">
                          <label className="luxury-form-label">
                            <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M3,3H5V5H3V3M7,5H21V3H7V5M3,7H5V9H3V7M7,9H21V7H7V9M3,11H5V13H3V11M7,13H21V11H7V13M3,15H5V17H3V15M7,17H21V15H7V17M3,19H5V21H3V19M7,21H21V19H7V21Z"/></svg>
                            Order / Position
                          </label>
                          <input
                            className="luxury-form-input"
                            type="number"
                            placeholder="Auto (goes to bottom)"
                            value={createRoomData.order}
                            onChange={(e) => setCreateRoomData(p => ({ ...p, order: e.target.value }))}
                            title="Lower number = higher in list. Leave blank = auto (newest rooms go to bottom)."
                          />
                        </div>
                      </div>
                      <div style={{ background:'rgba(124,58,237,0.05)', border:'1.5px solid rgba(124,58,237,0.15)', borderRadius:10, padding:'8px 12px', fontSize:11, color:'#6d28d9', fontWeight:600 }}>
                        💡 <strong>Order tip:</strong> Lower number = higher position. 1 = top, 999 = bottom. Leave blank = auto (newest goes to bottom).
                        {createRoomData.password && <span style={{marginLeft:8}}>🔒 This room will require a password to enter.</span>}
                      </div>
                    </div>

                    <div className="luxury-modal-footer">
                      <button className="luxury-btn-secondary" onClick={() => setShowCreateRoom(false)}>
                        Cancel
                      </button>
                      <button
                        className="luxury-btn-primary"
                        onClick={handleCreateRoom}
                        disabled={creatingRoom || !createRoomData.name.trim()}
                      >
                        {creatingRoom ? (
                          <>
                            <div className="luxury-loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none">
                              <path fill="#ffffff" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                            </svg>
                            Create Room
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="luxury-security-section">
              <div className="luxury-section-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:27,height:27,flexShrink:0}}>
                    <path fill="#ef4444" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M11,15H13V17H11V15M11,7H13V13H11V7Z"/>
                  </svg>
                  Security Center
                </h2>
                <p>Monitor banned IPs and security threats</p>
              </div>
              
              <div className="luxury-security-grid">
                <div className="luxury-security-card">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20,flexShrink:0}}><path fill="#ef4444" d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
                    Banned IP Addresses
                  </h3>
                  <div className="luxury-banned-ips-list">
                    {bannedIPs.slice(0, 30).map(ipBan => (
                      <div key={ipBan.id} className="luxury-banned-ip-item">
                        <div className="luxury-ip-info">
                          <span className="luxury-ip-address">{ipBan.ip}</span>
                          <span className="luxury-ip-reason">{ipBan.reason}</span>
                        </div>
                        <div className="luxury-ip-meta">
                          <span className="luxury-ip-date">
                            {new Date(ipBan.bannedAt).toLocaleDateString()}
                          </span>
                          <span className="luxury-ip-by">by {ipBan.bannedBy}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%', flexBasis: '100%', maxWidth: '100%' }}>

                          {/* ── Unban IP ── */}
                          {confirmUnbanIPId === ipBan.id ? (
                            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:10, padding:'5px 10px', fontSize:12, flexWrap:'wrap', maxWidth:'100%' }}>
                              <span style={{ color:'#15803d', fontWeight:700 }}>Unban this IP?</span>
                              <button
                                onClick={async () => {
                                  setConfirmUnbanIPId(null);
                                  try {
                                    // unbanIP queries ALL active records for this IP and deactivates them
                                    const result = await IPBanSystem.unbanIP(ipBan.ip);
                                    if (result) {
                                      pt.success(`IP ${ipBan.ip} unbanned successfully.`);
                                    } else {
                                      // IP was not found as active — force-deactivate this specific doc as fallback
                                      await updateDoc(doc(db, 'bannedIPs', ipBan.id), {
                                        isActive: false,
                                        unbannedAt: new Date().toISOString(),
                                      });
                                      pt.success(`IP ${ipBan.ip} unbanned.`);
                                    }
                                  } catch (e) {
                                    pt.error(`Failed to unban: ${e.message}`);
                                  }
                                }}
                                style={{ padding:'3px 10px', fontSize:12, fontWeight:800, background:'#16a34a', color:'#fff', border:'none', borderRadius:7, cursor:'pointer' }}
                              >Yes</button>
                              <button
                                onClick={() => setConfirmUnbanIPId(null)}
                                style={{ padding:'3px 10px', fontSize:12, fontWeight:700, background:'transparent', color:'#6b7280', border:'1px solid #d1d5db', borderRadius:7, cursor:'pointer' }}
                              >No</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmUnbanIPId(ipBan.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 14px', fontSize: 12, fontWeight: 800,
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff', border: 'none', borderRadius: 9,
                                cursor: 'pointer', letterSpacing: '0.02em',
                                boxShadow: '0 2px 10px rgba(16,185,129,0.35)',
                                transition: 'all 0.18s ease',
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                              onMouseLeave={e => e.currentTarget.style.transform='none'}
                            >
                              <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                                <path fill="white" d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-5 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3-9H8V6a4 4 0 0 1 8 0v2z"/>
                              </svg>
                              Unban IP
                            </button>
                          )}

                          {/* ── Delete Record ── */}
                          {confirmDeleteIPId === ipBan.id ? (
                            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:10, padding:'5px 10px', fontSize:12, flexWrap:'wrap', maxWidth:'100%' }}>
                              <span style={{ color:'#b91c1c', fontWeight:700 }}>Delete permanently?</span>
                              <button
                                onClick={async () => {
                                  setConfirmDeleteIPId(null);
                                  try {
                                    await deleteDoc(doc(db, 'bannedIPs', ipBan.id));
                                    pt.success(`Ban record for ${ipBan.ip} deleted.`);
                                  } catch (e) {
                                    pt.error(`Failed to delete: ${e.message}`);
                                  }
                                }}
                                style={{ padding:'3px 10px', fontSize:12, fontWeight:800, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer' }}
                              >Delete</button>
                              <button
                                onClick={() => setConfirmDeleteIPId(null)}
                                style={{ padding:'3px 10px', fontSize:12, fontWeight:700, background:'transparent', color:'#6b7280', border:'1px solid #d1d5db', borderRadius:7, cursor:'pointer' }}
                              >Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteIPId(ipBan.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 14px', fontSize: 12, fontWeight: 800,
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: '#fff', border: 'none', borderRadius: 9,
                                cursor: 'pointer', letterSpacing: '0.02em',
                                boxShadow: '0 2px 10px rgba(239,68,68,0.35)',
                                transition: 'all 0.18s ease',
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                              onMouseLeave={e => e.currentTarget.style.transform='none'}
                            >
                              <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                                <path fill="white" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"/>
                              </svg>
                              Delete Record
                            </button>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="luxury-security-card">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:20,height:20,flexShrink:0}}><path fill="#7c3aed" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17V13H8L12,7L16,13H14V17H10Z"/></svg>
                    Security Metrics
                  </h3>
                  <div className="luxury-security-metrics">
                    <div className="luxury-security-metric">
                      <span className="luxury-metric-label">
                        <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0,marginRight:5}}><path fill="#ef4444" d="M11,4.5H13V15.5H11V4.5M13,17.5V19.5H11V17.5H13M2,22H22L12,2L2,22Z"/></svg>
                        Blocked Attempts
                      </span>
                      <span className="luxury-metric-value">{bannedIPs.length}</span>
                    </div>
                    <div className="luxury-security-metric">
                      <span className="luxury-metric-label">
                        <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0,marginRight:5}}><path fill="#ef4444" d="M18,8H17V6A5,5 0 0,0 12,1A5,5 0 0,0 7,6V8H6A2,2 0 0,0 4,10V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V10A2,2 0 0,0 18,8M12,17A2,2 0 0,1 10,15A2,2 0 0,1 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17M15.1,8H8.9V6A3.1,3.1 0 0,1 12,2.9A3.1,3.1 0 0,1 15.1,6V8Z"/></svg>
                        Active Bans
                      </span>
                      <span className="luxury-metric-value">{stats.bannedUsers}</span>
                    </div>
                    <div className="luxury-security-metric">
                      <span className="luxury-metric-label">
                        <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0,marginRight:5}}><path fill="#10b981" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>
                        Threat Level
                      </span>
                      <span className="luxury-metric-value status-low">🟢 Low</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="rpt-section">
              <div className="luxury-section-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:28,height:28,flexShrink:0}}>
                    <path fill="#f59e0b" d="M11,4.5H13V15.5H11V4.5M13,17.5V19.5H11V17.5H13M2,22H22L12,2L2,22Z"/>
                  </svg>
                  Reports &amp; Ban Appeals
                </h2>
                <p>Manage user-submitted reports, flagged messages, and ban appeal requests</p>
              </div>

              <div className="rpt-sub-tabs">
                {[
                  { id: 'all', label: 'All Reports', color: '#6366f1',
                    renderIcon: (c) => <><path fill={c} d="M3,3H21V5H3V3M3,7H15V9H3V7M3,11H21V13H3V11M3,15H15V17H3V15M3,19H21V21H3V19Z"/></> },
                  { id: 'users', label: 'User Reports', color: '#ef4444',
                    renderIcon: (c) => <><path fill={c} d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></> },
                  { id: 'messages', label: 'Message Reports', color: '#3b82f6',
                    renderIcon: (c) => <><path fill={c} d="M20,2H4C2.89,2 2,2.89 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/></> },
                  { id: 'appeals', label: 'Ban Appeals', color: '#10b981',
                    renderIcon: (c) => <><path fill={c} d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></> },
                  { id: 'pending', label: `Pending (${stats.pendingReports})`, color: '#f59e0b',
                    renderIcon: (c) => <><path fill={c} d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></> }
                ].map(st => {
                  const isAct = reportSubTab === st.id;
                  return (
                    <button key={st.id} className={`rpt-sub-tab ${isAct ? 'active' : ''}`} style={{'--rpt-color': st.color}} onClick={() => setReportSubTab(st.id)}>
                      <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16,flexShrink:0}}>
                        {st.renderIcon(isAct ? '#ffffff' : st.color)}
                      </svg>
                      {st.label}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const filtered = reports.filter(r => {
                  if (reportSubTab === 'users') return r.reportType === 'User';
                  if (reportSubTab === 'messages') return r.reportType === 'Message' || !r.reportType;
                  if (reportSubTab === 'appeals') return r.status === 'appeal' || r.status === 'appeal_pending';
                  if (reportSubTab === 'pending') return r.status === 'pending';
                  return true;
                });

                const statusColors = { pending: '#f59e0b', resolved: '#10b981', dismissed: '#9ca3af', action_taken: '#6366f1', appeal_accepted: '#059669', appeal_rejected: '#ef4444', appeal_pending: '#f97316' };
                const categoryColors = { Spam: '#ef4444', Harassment: '#dc2626', 'Hate Speech': '#b91c1c', Incest: '#7f1d1d', 'Inappropriate Content': '#f97316', 'Personal Info': '#a855f7', Other: '#6b7280' };

                const fmtTime = (ts) => {
                  if (!ts) return '—';
                  const d = ts?.toDate ? ts.toDate() : new Date(ts);
                  if (isNaN(d.getTime())) return '—';
                  const diff = Date.now() - d.getTime();
                  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
                  if (m < 2) return 'Just now';
                  if (m < 60) return `${m}m ago`;
                  if (h < 24) return `${h}h ago`;
                  if (dy < 7) return `${dy}d ago`;
                  return d.toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'});
                };

                if (filtered.length === 0) return (
                  <div className="rpt-empty">
                    <svg viewBox="0 0 24 24" fill="none" style={{width:52,height:52,opacity:.25}}>
                      <path fill="#6366f1" d="M11,4.5H13V15.5H11V4.5M13,17.5V19.5H11V17.5H13M2,22H22L12,2L2,22Z"/>
                    </svg>
                    <p>No reports found in this category</p>
                  </div>
                );

                return (
                  <div className="rpt-list">
                    {filtered.map(r => {
                      const isAppeal = r.status === 'appeal' || r.status === 'appeal_pending';
                      const sc = statusColors[r.status] || '#9ca3af';
                      const cc = categoryColors[r.category] || '#6b7280';
                      const load = (a) => reportActionLoading[r.id + a];

                      return (
                        <div key={r.id} className={`rpt-card ${r.status === 'pending' ? 'rpt-card--pending' : ''}`}>
                          <div className="rpt-card-header">
                            <div className="rpt-type-badge" style={{background: r.reportType === 'User' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#3b82f6,#2563eb)'}}>
                              {r.reportType === 'User' ? (
                                <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}><path fill="#fff" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}><path fill="#fff" d="M20,2H4C2.89,2 2,2.89 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/></svg>
                              )}
                              {r.reportType || 'Message'}
                            </div>
                            <div className="rpt-category-badge" style={{background: cc + '22', color: cc, border: `1px solid ${cc}44`}}>
                              {r.category || 'Other'}
                            </div>
                            <div className="rpt-status-badge" style={{background: sc + '22', color: sc, border: `1px solid ${sc}44`}}>
                              {r.status?.replace(/_/g,' ') || 'pending'}
                            </div>
                            <div className="rpt-time">
                              <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12}}><path fill="#9ca3af" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
                              {fmtTime(r.timestamp)}
                            </div>
                          </div>

                          <div className="rpt-card-body">
                            <div className="rpt-parties">
                              <div className="rpt-party">
                                <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}>
                                  <path fill="#f59e0b" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                </svg>
                                <div>
                                  <span className="rpt-party-label">Reported By</span>
                                  <span className="rpt-party-name"><LiveAdminUserName uid={r.reportedBy?.uid} fallback={r.reportedBy?.name || r.reportedBy?.displayName || 'Anonymous'} /></span>
                                </div>
                              </div>
                              <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18,flexShrink:0,opacity:.4}}><path fill="#6b7280" d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/></svg>
                              <div className="rpt-party">
                                <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}>
                                  <path fill="#ef4444" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                                </svg>
                                <div>
                                  <span className="rpt-party-label">Reported User</span>
                                  <span className="rpt-party-name">
                                    <LiveAdminUserName uid={r.reportedUser?.uid} fallback={r.reportedUser?.name || r.reportedUser?.displayName || '—'} />
                                    {r.reportedUser?.isGuest && (
                                      <span style={{marginLeft:5,background:'rgba(139,92,246,.15)',color:'#7c3aed',border:'1px solid rgba(139,92,246,.3)',borderRadius:4,fontSize:9,fontWeight:700,padding:'1px 5px',verticalAlign:'middle'}}>GUEST</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Forensic data — IP + Device ID */}
                            {(r.reportedUser?.ipAddress || r.reportedUser?.deviceId) && (
                              <div style={{display:'flex',flexWrap:'wrap',gap:8,margin:'10px 0',padding:'10px 14px',background:'linear-gradient(135deg,rgba(239,68,68,.05),rgba(220,38,38,.08))',border:'1px solid rgba(239,68,68,.18)',borderRadius:10}}>
                                {r.reportedUser?.ipAddress && (
                                  <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                                      <defs><linearGradient id={`ipg-${r.id}`} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#ef4444"/><stop offset="1" stopColor="#dc2626"/></linearGradient></defs>
                                      <path fill={`url(#ipg-${r.id})`} d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,7H13V13H11V7M11,15H13V17H11V15Z"/>
                                    </svg>
                                    <span style={{fontSize:10,fontWeight:700,color:'#b91c1c',letterSpacing:.3}}>IP:</span>
                                    <code style={{fontSize:11,fontWeight:700,color:'#dc2626',fontFamily:'monospace',background:'rgba(239,68,68,.1)',padding:'1px 6px',borderRadius:4}}>{r.reportedUser.ipAddress}</code>
                                    <button title="Copy IP" onClick={() => {navigator.clipboard?.writeText(r.reportedUser.ipAddress); pt.info('IP copied');}}
                                      style={{background:'none',border:'none',cursor:'pointer',padding:'2px',color:'#9ca3af',display:'flex'}}>
                                      <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11}}><path fill="#9ca3af" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/></svg>
                                    </button>
                                  </div>
                                )}
                                {r.reportedUser?.deviceId && (
                                  <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                                      <defs><linearGradient id={`dvg-${r.id}`} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#7c3aed"/><stop offset="1" stopColor="#6d28d9"/></linearGradient></defs>
                                      <path fill={`url(#dvg-${r.id})`} d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/>
                                    </svg>
                                    <span style={{fontSize:10,fontWeight:700,color:'#5b21b6',letterSpacing:.3}}>Device:</span>
                                    <code style={{fontSize:11,fontWeight:700,color:'#7c3aed',fontFamily:'monospace',background:'rgba(139,92,246,.1)',padding:'1px 6px',borderRadius:4,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.reportedUser.deviceId}>…{r.reportedUser.deviceId.slice(-12)}</code>
                                    <button title="Copy Device ID" onClick={() => {navigator.clipboard?.writeText(r.reportedUser.deviceId); pt.info('Device ID copied');}}
                                      style={{background:'none',border:'none',cursor:'pointer',padding:'2px',color:'#9ca3af',display:'flex'}}>
                                      <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11}}><path fill="#9ca3af" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/></svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {r.messageText && (
                              <div className="rpt-msg-box">
                                <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                                  <path fill="#3b82f6" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>
                                </svg>
                                <span className="rpt-msg-text">&ldquo;{r.messageText}&rdquo;</span>
                              </div>
                            )}

                            {r.reason && (
                              <div className="rpt-reason-box">
                                <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                                  <path fill="#a855f7" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                </svg>
                                <span className="rpt-reason-text">{r.reason}</span>
                              </div>
                            )}
                          </div>

                          <div className="rpt-card-actions">
                            {isAppeal ? (
                              <>
                                <button className="rpt-btn rpt-btn--green" disabled={load('appeal_accept')} onClick={() => handleReportAction(r.id, 'appeal_accept', r)}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}><path fill="#fff" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                                  {load('appeal_accept') ? '…' : 'Accept Appeal'}
                                </button>
                                <button className="rpt-btn rpt-btn--red" disabled={load('appeal_reject')} onClick={() => handleReportAction(r.id, 'appeal_reject', r)}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}><path fill="#fff" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
                                  {load('appeal_reject') ? '…' : 'Reject Appeal'}
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="rpt-btn rpt-btn--red" disabled={load('ban') || r.status === 'action_taken'} onClick={() => handleReportAction(r.id, 'ban', r)}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}><path fill="#fff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.57,15.55 5.53,16.97L16.97,5.53C15.55,4.57 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.43,8.45 18.47,7.03L7.03,18.47C8.45,19.43 10.15,20 12,20Z"/></svg>
                                  {load('ban') ? '…' : 'Ban'}
                                </button>
                                <button className="rpt-btn rpt-btn--orange" disabled={load('kick')} onClick={() => handleReportAction(r.id, 'kick', r)}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}><path fill="#fff" d="M13.5,5.5C14.59,5.5 15.5,4.58 15.5,3.5C15.5,2.38 14.59,1.5 13.5,1.5C12.39,1.5 11.5,2.38 11.5,3.5C11.5,4.58 12.39,5.5 13.5,5.5M9.89,19.38L10.89,15L13,17V23H15V15.5L12.89,13.5L13.5,10.5C14.79,12 16.79,13 19,13V11C17.09,11 15.5,10 14.69,8.58L13.69,7C13.29,6.38 12.69,6 12,6C11.69,6 11.5,6.08 11.19,6.08L6,8.28V13H8V9.58L9.79,8.88L8.19,17L3.29,16L2.89,18L9.89,19.38Z"/></svg>
                                  {load('kick') ? '…' : 'Kick'}
                                </button>
                                <button className="rpt-btn rpt-btn--purple" disabled={load('mute')} onClick={() => handleReportAction(r.id, 'mute', r)}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}><path fill="#fff" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19M16.5,12C16.78,12 17,12.22 17,12.5V13.5C17,13.78 16.78,14 16.5,14H15.5C15.22,14 15,13.78 15,13.5V12.5C15,12.22 15.22,12 15.5,12H16.5Z"/></svg>
                                  {load('mute') ? '…' : 'Mute'}
                                </button>
                                {r.reportedUser?.ipAddress && (
                                  <button className="rpt-btn" disabled={load('ip_ban')} onClick={() => handleReportAction(r.id, 'ip_ban', r)}
                                    style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',color:'#fff',border:'none'}}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}>
                                      <path fill="#fff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,7H13V13H11V7M11,15H13V17H11V15Z"/>
                                    </svg>
                                    {load('ip_ban') ? '…' : 'IP Ban'}
                                  </button>
                                )}
                                {r.reportedUser?.deviceId && (
                                  <button className="rpt-btn" disabled={load('device_ban')} onClick={() => handleReportAction(r.id, 'device_ban', r)}
                                    style={{background:'linear-gradient(135deg,#7c3aed,#5b21b6)',color:'#fff',border:'none'}}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}>
                                      <path fill="#fff" d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/>
                                    </svg>
                                    {load('device_ban') ? '…' : 'Dev Ban'}
                                  </button>
                                )}
                                {r.status === 'pending' && (
                                  <>
                                    <button className="rpt-btn rpt-btn--green" disabled={load('resolve')} onClick={() => handleReportAction(r.id, 'resolve', r)}>
                                      <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}><path fill="#fff" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                                      {load('resolve') ? '…' : 'Resolve'}
                                    </button>
                                    <button className="rpt-btn rpt-btn--gray" disabled={load('dismiss')} onClick={() => handleReportAction(r.id, 'dismiss', r)}>
                                      <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}><path fill="#fff" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
                                      {load('dismiss') ? '…' : 'Dismiss'}
                                    </button>
                                  </>
                                )}
                              </>
                            )}

                            {/* Delete Report — inline confirm (no window.confirm) */}
                            {confirmDeleteReportId === r.id ? (
                              <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:10, padding:'5px 10px', fontSize:12, flexWrap:'wrap', maxWidth:'100%' }}>
                                <span style={{ color:'#b91c1c', fontWeight:700 }}>Delete report?</span>
                                <button
                                  onClick={async () => {
                                    setConfirmDeleteReportId(null);
                                    try {
                                      await deleteDoc(doc(db, 'reports', r.id));
                                      pt.success('Report deleted.');
                                    } catch (e) {
                                      pt.error('Delete failed: ' + e.message);
                                    }
                                  }}
                                  style={{ padding:'3px 10px', fontSize:12, fontWeight:800, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer' }}
                                >Delete</button>
                                <button
                                  onClick={() => setConfirmDeleteReportId(null)}
                                  style={{ padding:'3px 10px', fontSize:12, fontWeight:700, background:'transparent', color:'#6b7280', border:'1px solid #d1d5db', borderRadius:7, cursor:'pointer' }}
                                >Cancel</button>
                              </div>
                            ) : (
                              <button
                                className="rpt-btn"
                                onClick={() => setConfirmDeleteReportId(r.id)}
                                style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', border:'none' }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}><path fill="#fff" d="M19,4h-3.5l-1-1h-5l-1,1H5v2h14M6,19a2,2 0 0,0 2,2h8a2,2 0 0,0 2-2V7H6v12z"/></svg>
                                Delete
                              </button>
                            )}
                          </div>

                          {r.resolvedAt && (
                            <div className="rpt-resolved-by">
                              <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12}}><path fill="#6b7280" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4Z"/></svg>
                              Handled by <strong>{r.resolvedBy || 'Admin'}</strong> · {fmtTime(r.resolvedAt)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TRUST LEADERBOARD TAB
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'trust' && (() => {
            const RANK_ORDER = ['squire','noble','regent','monarch','eternal_crown'];
            const rankDist = RANK_ORDER.map(id => ({
              ...TRUST_RANKS[id],
              count: users.filter(u => (u.trustRank || 'squire') === id).length
            }));
            const avgScore = users.length
              ? Math.round(users.reduce((s, u) => s + (u.trustScore ?? 10), 0) / users.length)
              : 0;
            const totalViolations = users.reduce((s, u) => s + ((u.trustData?.violationsCount) || 0), 0);
            const totalSpam = users.reduce((s, u) => s + ((u.trustData?.spamCount) || 0), 0);
            const totalAbuse = users.reduce((s, u) => s + ((u.trustData?.abuseCount) || 0), 0);

            const filtered = users
              .filter(u => !u.isGuest && (
                !trustSearch || u.displayName?.toLowerCase().includes(trustSearch.toLowerCase())
              ))
              .sort((a, b) => {
                if (trustSortBy === 'score_desc') return (b.trustScore ?? 10) - (a.trustScore ?? 10);
                if (trustSortBy === 'score_asc') return (a.trustScore ?? 10) - (b.trustScore ?? 10);
                if (trustSortBy === 'violations') return ((b.trustData?.violationsCount) || 0) - ((a.trustData?.violationsCount) || 0);
                if (trustSortBy === 'name') return (a.displayName || '').localeCompare(b.displayName || '');
                return 0;
              });

            const handleTrustAdjust = async (targetUid, delta, targetName) => {
              if (!delta || isNaN(delta)) { pt.error('Enter a valid number'); return; }
              const d = parseFloat(delta);
              if (d === 0) return;
              setTrustAdjusting(true);
              try {
                const result = await updateTrustScore(targetUid, 'MESSAGE_SENT', d);
                pt.success(`Trust score for ${targetName} ${d > 0 ? '+' : ''}${d} → ${result?.newScore ?? '?'}`);
                setTrustAdjustTarget(null);
                setTrustAdjustDelta('');
              } catch (err) {
                pt.error('Failed to update trust score');
              } finally {
                setTrustAdjusting(false);
              }
            };

            return (
              <div style={{ padding: '0 0 40px 0' }}>
                {/* Header */}
                <div className="luxury-section-header">
                  <h2 style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:28,height:28,flexShrink:0}}>
                      <path fill="#FFD700" d="M12,1L9.5,8H2L7.72,12.27L5.82,19.27L12,15.27L18.18,19.27L16.28,12.27L22,8H14.5L12,1Z"/>
                    </svg>
                    Royal Trust Leaderboard
                  </h2>
                  <p>Live rank distribution, trust scores, and moderation intelligence</p>
                </div>

                {/* Summary Stats Row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, margin:'0 0 24px' }}>
                  {[
                    { label:'Avg Trust Score', value:avgScore, suffix:'/100', color:'#7c3aed', icon:'M12,1L9.5,8H2L7.72,12.27L5.82,19.27L12,15.27L18.18,19.27L16.28,12.27L22,8H14.5Z' },
                    { label:'Total Violations', value:totalViolations, suffix:'', color:'#ef4444', icon:'M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z' },
                    { label:'Spam Events', value:totalSpam, suffix:'', color:'#f97316', icon:'M11,4.5H13V15.5H11V4.5M13,17.5V19.5H11V17.5H13M2,22H22L12,2L2,22Z' },
                    { label:'Abuse Events', value:totalAbuse, suffix:'', color:'#dc2626', icon:'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z' },
                    { label:'Tracked Users', value:users.filter(u=>!u.isGuest).length, suffix:'', color:'#3b82f6', icon:'M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z' },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      background: '#fff', borderRadius: 14, padding: '14px 16px',
                      border: '1.5px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      display: 'flex', flexDirection: 'column', gap: 6
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}}>
                        <path fill={stat.color} d={stat.icon}/>
                      </svg>
                      <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                        {stat.value}{stat.suffix}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rank Distribution */}
                <div style={{
                  background: 'linear-gradient(145deg,#f5f0ff,#ede9fe)',
                  borderRadius: 18, padding: '20px 22px', marginBottom: 24,
                  border: '1.5px solid rgba(124,58,237,0.15)'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom: 16 }}>
                    ✦ Rank Distribution
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {rankDist.map(rank => {
                      const pct = users.length ? Math.round((rank.count / users.length) * 100) : 0;
                      return (
                        <div key={rank.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width: 90, fontSize: 12, fontWeight: 700, color: rank.color, flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
                            <span>{rank.emoji}</span>
                            <span style={{ fontSize:11 }}>{rank.name}</span>
                          </div>
                          <div style={{ flex:1, height:8, background:'rgba(124,58,237,0.12)', borderRadius:4, overflow:'hidden' }}>
                            <div style={{
                              height:'100%', width:`${pct}%`, borderRadius:4,
                              background: rank.gradient,
                              transition:'width 1s cubic-bezier(0.34,1.56,0.64,1)',
                              minWidth: rank.count > 0 ? 4 : 0
                            }}/>
                          </div>
                          <div style={{ width: 60, display:'flex', justifyContent:'flex-end', gap:6, flexShrink:0 }}>
                            <span style={{ fontSize:12, fontWeight:800, color:'#3b0764' }}>{rank.count}</span>
                            <span style={{ fontSize:10, color:'#7c3aed', opacity:0.6 }}>({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:8, flex:1, minWidth:200,
                    background:'#fff', border:'1.5px solid rgba(0,0,0,0.1)',
                    borderRadius:10, padding:'0 12px', height:40
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16,flexShrink:0}}>
                      <path fill="#9ca3af" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search users…"
                      value={trustSearch}
                      onChange={e => setTrustSearch(e.target.value)}
                      style={{ border:'none', outline:'none', flex:1, fontSize:13, color:'#1e1b4b', background:'transparent' }}
                    />
                  </div>
                  <select
                    value={trustSortBy}
                    onChange={e => setTrustSortBy(e.target.value)}
                    style={{
                      padding:'8px 12px', borderRadius:10, border:'1.5px solid rgba(0,0,0,0.1)',
                      background:'#fff', fontSize:13, color:'#374151', cursor:'pointer', height:40
                    }}
                  >
                    <option value="score_desc">↓ Highest Score</option>
                    <option value="score_asc">↑ Lowest Score</option>
                    <option value="violations">⚠ Most Violations</option>
                    <option value="name">A–Z Name</option>
                  </select>
                </div>

                {/* ── Leaderboard Cards ── */}
                {filtered.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'48px 20px', background:'linear-gradient(135deg,#f8f7ff,#f0ebff)', borderRadius:18, border:'2px dashed rgba(124,58,237,0.18)' }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:44,height:44,margin:'0 auto 12px',display:'block',opacity:0.35}}><path fill="#7c3aed" d="M12,1L9.5,8H2L7.72,12.27L5.82,19.27L12,15.27L18.18,19.27L16.28,12.27L22,8H14.5Z"/></svg>
                    <div style={{fontWeight:800,fontSize:15,color:'#7c3aed',marginBottom:5}}>No users found</div>
                    <div style={{fontSize:12,color:'#a78bfa'}}>Try adjusting your search or sort options.</div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {filtered.map((u, idx) => {
                      const score = u.trustScore ?? 10;
                      const rank = getRankFromScore(score);
                      const violations = u.trustData?.violationsCount || 0;
                      const msgs = u.trustData?.messagesCount || 0;
                      const isTop3 = idx < 3;
                      const medalColors = ['#FFD700','#C0C0C0','#CD7F32'];
                      const medalBg = ['rgba(255,215,0,0.12)','rgba(192,192,192,0.12)','rgba(205,127,50,0.12)'];
                      const isAdjusting = trustAdjustTarget === u.uid;

                      // Build username style from the flat settings fields stored on user doc
                      const us = u.settings || {};
                      const hasGrad = !!us.usernameGradientEnabled;
                      const gradDir = us.usernameGradientDirection || 'to right';
                      const gradType = gradDir === 'radial' ? 'radial-gradient(circle' : `linear-gradient(${gradDir}`;
                      const nameStyle = hasGrad ? {
                        background: `${gradType}, ${us.usernameGradientStart || '#7c3aed'}, ${us.usernameGradientEnd || '#a855f7'})`,
                        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                        fontWeight: us.usernameIsBold ? 900 : 700,
                        fontFamily: us.usernameFont || 'inherit',
                        letterSpacing: us.usernameLetterSpacing || '-0.01em',
                        textShadow: 'none',
                      } : {
                        color: us.usernameFontColor || '#1e1b4b',
                        fontWeight: us.usernameIsBold ? 900 : 700,
                        fontFamily: us.usernameFont || 'inherit',
                        letterSpacing: us.usernameLetterSpacing || '-0.01em',
                        textShadow: us.usernameTextShadow || 'none',
                      };

                      return (
                        <div key={u.uid} style={{
                          background: isTop3 ? `linear-gradient(135deg, ${medalBg[idx]}, rgba(255,255,255,0.95))` : '#fff',
                          border: isTop3 ? `2px solid ${medalColors[idx]}44` : '1.5px solid rgba(0,0,0,0.06)',
                          borderLeft: isTop3 ? `4px solid ${medalColors[idx]}` : `4px solid ${rank.color}44`,
                          borderRadius: 16,
                          boxShadow: isTop3 ? `0 4px 20px ${medalColors[idx]}22` : '0 2px 10px rgba(0,0,0,0.05)',
                          overflow: 'hidden',
                          transition: 'box-shadow 0.2s',
                        }}>
                          {/* Card Main Row */}
                          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', flexWrap:'wrap' }}>

                            {/* Position */}
                            <div style={{ width:32, textAlign:'center', flexShrink:0 }}>
                              {isTop3 ? (
                                <div style={{ fontSize:22, lineHeight:1, filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}>
                                  {['🥇','🥈','🥉'][idx]}
                                </div>
                              ) : (
                                <div style={{ fontSize:13, fontWeight:900, color:'#9ca3af', background:'rgba(0,0,0,0.04)', borderRadius:8, padding:'3px 0', lineHeight:1.4 }}>
                                  #{idx+1}
                                </div>
                              )}
                            </div>

                            {/* Avatar with rank ring */}
                            <div style={{ position:'relative', flexShrink:0 }}>
                              <img
                                src={u.photoURL || getDefaultAvatarUrl(u.uid, u.gender)}
                                alt={u.displayName}
                                style={{
                                  width: 52, height: 52, borderRadius:'50%', objectFit:'cover',
                                  border: `3px solid ${rank.color}`,
                                  boxShadow: `0 0 0 2px ${rank.color}33, 0 3px 12px ${rank.color}44`,
                                  display:'block',
                                }}
                                onError={e => { e.target.src = getDefaultAvatarUrl(u.uid, u.gender); }}
                              />
                              {/* Online dot */}
                              <div style={{
                                position:'absolute', bottom:2, right:2,
                                width:12, height:12, borderRadius:'50%',
                                background: onlineStatuses[u.uid]?.state === 'online' ? '#10b981' : '#d1d5db',
                                border:'2px solid #fff',
                              }}/>
                            </div>

                            {/* Identity block */}
                            <div style={{ flex:1, minWidth:0 }}>
                              {/* Username with stored styles */}
                              <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:3 }}>
                                <span style={{ fontSize:15, ...nameStyle, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {u.displayName || u.username || 'Unknown'}
                                </span>
                                {/* Badge pill */}
                                {u.badge && (
                                  <span style={{
                                    fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:99,
                                    background:'linear-gradient(135deg,#fde68a,#f59e0b)',
                                    color:'#78350f', letterSpacing:'0.04em', flexShrink:0,
                                    border:'1px solid #fcd34d',
                                  }}>
                                    {u.badge.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {/* Sub-info row */}
                              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                                {u.username && (
                                  <span style={{ fontSize:11, color:'#7c3aed', fontWeight:700 }}>@{u.username}</span>
                                )}
                                {u.role && u.role !== 'user' && (
                                  <span style={{
                                    fontSize:10, padding:'1px 7px', borderRadius:99, fontWeight:700,
                                    background: u.role==='owner'?'#fef3c7': u.role==='admin'?'#ede9fe': u.role==='moderator'?'#dcfce7':'#f1f5f9',
                                    color: u.role==='owner'?'#92400e': u.role==='admin'?'#5b21b6': u.role==='moderator'?'#15803d':'#475569',
                                  }}>
                                    {u.role}
                                  </span>
                                )}
                                {u.email && (
                                  <span style={{ fontSize:10, color:'#9ca3af', overflow:'hidden', textOverflow:'ellipsis', maxWidth:140 }}>{u.email}</span>
                                )}
                              </div>
                            </div>

                            {/* Royal Rank + score bar */}
                            <div style={{ flexShrink:0, minWidth:130, display:'flex', flexDirection:'column', gap:5 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                                <RoyalTrustBadge trustScore={score} trustRank={u.trustRank} size="sm" showLabel={false} showTooltip={false} />
                                <div>
                                  <div style={{ fontSize:11, fontWeight:800, color:rank.color, lineHeight:1 }}>{rank.name}</div>
                                  <div style={{ fontSize:10, color:'#9ca3af' }}>{rank.emoji} Royal Rank</div>
                                </div>
                              </div>
                              {/* Score bar */}
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <div style={{ flex:1, height:6, background:'rgba(0,0,0,0.07)', borderRadius:3, overflow:'hidden' }}>
                                  <div style={{ height:'100%', width:`${score}%`, background:rank.gradient, borderRadius:3, transition:'width 0.6s ease' }}/>
                                </div>
                                <span style={{ fontSize:12, fontWeight:900, color:rank.color, flexShrink:0, minWidth:24, textAlign:'right' }}>{score}</span>
                              </div>
                            </div>

                            {/* Stats pills */}
                            <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12,flexShrink:0}}><path fill="#6366f1" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z"/></svg>
                                <span style={{ fontSize:11, fontWeight:700, color:'#6366f1' }}>{msgs.toLocaleString()} msgs</span>
                              </div>
                              <span style={{
                                display:'inline-flex', alignItems:'center', gap:4,
                                padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:800,
                                background: violations === 0 ? 'rgba(16,185,129,0.12)' : violations > 5 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                color: violations === 0 ? '#065f46' : violations > 5 ? '#b91c1c' : '#92400e',
                              }}>
                                {violations === 0 ? (
                                  <><svg viewBox="0 0 24 24" fill="none" style={{width:10,height:10}}><path fill="#065f46" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>Clean</>
                                ) : (
                                  <><svg viewBox="0 0 24 24" fill="none" style={{width:10,height:10}}><path fill="currentColor" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>{violations} violations</>
                                )}
                              </span>
                            </div>

                            {/* Actions */}
                            <div style={{ flexShrink:0 }}>
                              {isAdjusting ? (
                                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <input
                                    type="number"
                                    value={trustAdjustDelta}
                                    onChange={e => setTrustAdjustDelta(e.target.value)}
                                    placeholder="±pts"
                                    style={{ width:52, padding:'5px 6px', borderRadius:7, border:'1.5px solid #7c3aed', fontSize:12, textAlign:'center', outline:'none', color:'#1e1b4b' }}
                                    autoFocus
                                    onKeyDown={e => { if(e.key==='Enter') handleTrustAdjust(u.uid, trustAdjustDelta, u.displayName); if(e.key==='Escape'){setTrustAdjustTarget(null);setTrustAdjustDelta('');} }}
                                  />
                                  <button onClick={() => handleTrustAdjust(u.uid, trustAdjustDelta, u.displayName)} disabled={trustAdjusting}
                                    style={{ padding:'5px 8px', borderRadius:7, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:11, fontWeight:800 }}>
                                    {trustAdjusting ? '…' : '✓'}
                                  </button>
                                  <button onClick={() => { setTrustAdjustTarget(null); setTrustAdjustDelta(''); }}
                                    style={{ padding:'5px 7px', borderRadius:7, border:'1px solid #e5e7eb', cursor:'pointer', background:'#f9fafb', color:'#6b7280', fontSize:11 }}>
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                                  <button onClick={() => { setTrustAdjustTarget(u.uid); setTrustAdjustDelta(''); }}
                                    style={{
                                      display:'flex', alignItems:'center', gap:5,
                                      padding:'6px 12px', borderRadius:8,
                                      background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(168,85,247,0.1))',
                                      border:'1.5px solid rgba(124,58,237,0.25)', color:'#7c3aed',
                                      fontSize:11, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap',
                                    }}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11,flexShrink:0}}><path fill="#7c3aed" d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3zm1 13h-2v-2h2zm0-4h-2V7h2z"/></svg>
                                    Adjust Score
                                  </button>
                                  <button onClick={() => handleTrustAdjust(u.uid, '-5', u.displayName)}
                                    style={{
                                      display:'flex', alignItems:'center', gap:5,
                                      padding:'6px 12px', borderRadius:8,
                                      background:'rgba(239,68,68,0.06)',
                                      border:'1.5px solid rgba(239,68,68,0.2)', color:'#ef4444',
                                      fontSize:11, fontWeight:800, cursor:'pointer',
                                    }}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11,flexShrink:0}}><path fill="#ef4444" d="M11,4.5H13V15.5H11V4.5M13,17.5V19.5H11V17.5H13M2,22H22L12,2L2,22Z"/></svg>
                                    −5 Penalty
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                <div style={{
                    padding:'10px 16px', background:'#faf9ff',
                    borderTop:'1px solid rgba(124,58,237,0.08)',
                    fontSize:11, color:'#9ca3af', textAlign:'center',
                    borderRadius:'0 0 16px 16px', marginTop:8,
                  }}>
                    Showing {filtered.length} of {users.filter(u=>!u.isGuest).length} registered users
                    {trustSearch && ` matching "${trustSearch}"`}
                  </div>

                {/* Rank Legend */}
                <div style={{ marginTop:20, padding:'16px 20px', background:'linear-gradient(145deg,#faf5ff,#ede9fe)', borderRadius:14, border:'1px solid rgba(124,58,237,0.1)' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
                    ✦ Rank Guide &amp; Score Thresholds
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                    {RANK_ORDER.map(id => {
                      const r = TRUST_RANKS[id];
                      return (
                        <div key={id} style={{
                          display:'flex', alignItems:'center', gap:8,
                          padding:'6px 12px', borderRadius:20,
                          background:'rgba(255,255,255,0.7)',
                          border:`1.5px solid ${r.color}30`
                        }}>
                          <span style={{fontSize:16}}>{r.emoji}</span>
                          <div>
                            <div style={{ fontSize:11, fontWeight:800, color:r.color }}>{r.name}</div>
                            <div style={{ fontSize:10, color:'#9ca3af' }}>{r.minScore}–{r.maxScore} pts</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop:12, fontSize:11, color:'#7c3aed', opacity:0.7, lineHeight:1.6 }}>
                    💡 Scores increase daily with clean activity. Spam violations −3 pts · Warnings −5 pts · Mutes −8 pts · Bans −30 pts. Use the ⚖ Adjust button for manual corrections.
                  </div>
                </div>
              </div>
            );
          })()}


          {/* ═══════════════════════════════════════════════════════
              VIOLATIONS DASHBOARD TAB
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'violations' && (() => {
            const VC = {
              SPAM:           { bg:'#fff7ed', border:'#fed7aa', badge:'#ea580c', text:'Spam',         svgPath:'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-1 11H5v-2h14v2zm0-4H5V9h14v2z', rule:'User was sending repetitive or bulk messages.' },
              PROFANITY:      { bg:'#fff1f2', border:'#fecdd3', badge:'#e11d48', text:'Profanity',    svgPath:'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z', rule:'User used abusive or offensive language.' },
              THREAT:         { bg:'#fef2f2', border:'#fecaca', badge:'#dc2626', text:'Threat',       svgPath:'M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2z', rule:'User made threatening statements toward another user.' },
              PERSONAL_INFO:  { bg:'#faf5ff', border:'#e9d5ff', badge:'#7c3aed', text:'Personal Info',svgPath:'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08A7.23 7.23 0 0 1 12 19z', rule:'User shared private personal information publicly.' },
              EXCESSIVE_CAPS: { bg:'#eff6ff', border:'#bfdbfe', badge:'#2563eb', text:'Caps Abuse',  svgPath:'M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z', rule:'User sent messages in excessive capital letters.' },
              EMOJI_SPAM:     { bg:'#fefce8', border:'#fde68a', badge:'#d97706', text:'Emoji Spam',  svgPath:'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 14.5c-1.38 0-2.5-1.12-2.5-2.5S8.62 11.5 10 11.5s2.5 1.12 2.5 2.5S11.38 16.5 10 16.5zm0-6C8.62 10.5 7.5 9.38 7.5 8S8.62 5.5 10 5.5 12.5 6.62 12.5 8 11.38 10.5 10 10.5zm4 6c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm0-6c-1.38 0-2.5-1.12-2.5-2.5S12.62 5.5 14 5.5 16.5 6.62 16.5 8 15.38 10.5 14 10.5z', rule:'User flooded chat with excessive emojis.' },
              HOMOGLYPH:      { bg:'#fdf4ff', border:'#f0abfc', badge:'#a21caf', text:'Homoglyph',   svgPath:'M5 4v3h5.5v12h3V7H19V4H5z', rule:'User used lookalike characters to bypass filters.' },
            };
            const SEV = { low:'#6b7280', medium:'#f59e0b', high:'#f97316', critical:'#dc2626' };
            const SEV_BG = { low:'#f3f4f6', medium:'#fef3c7', high:'#fff7ed', critical:'#fee2e2' };
            const ACT = {
              WARN:        { color:'#f59e0b', bg:'#fef3c7', label:'Warning',     svgPath:'M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2z', desc:'User received a warning message from TingleBot.' },
              MUTE:        { color:'#f97316', bg:'#fff7ed', label:'Muted',       svgPath:'M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z', desc:'User was temporarily muted and cannot send messages.' },
              KICK:        { color:'#dc2626', bg:'#fee2e2', label:'Kicked',       svgPath:'M16 17V14H9V10H16V7L21 12L16 17M14 2A2 2 0 0 1 16 4V6H14V4H5V20H14V18H16V20A2 2 0 0 1 14 22H5A2 2 0 0 1 3 20V4A2 2 0 0 1 5 2H14Z', desc:'User was kicked out of the room.' },
              AUTO_DELETE: { color:'#7c3aed', bg:'#f5f3ff', label:'Auto-deleted', svgPath:'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', desc:'Offending message was automatically deleted.' },
              NOTICE:      { color:'#3b82f6', bg:'#eff6ff', label:'Notice',       svgPath:'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z', desc:'TingleBot sent an informational notice.' },
            };

            const filtered = violations.filter(v => {
              if (!violationsShowResolved && v.resolved) return false;
              return violationsFilter === 'all' || v.type === violationsFilter;
            });
            const unresolved = violations.filter(v => !v.resolved).length;

            return (
              <div style={{ padding:'4px 0 40px' }}>

                {/* ── Header ── */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:20 }}>
                  <div>
                    <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:'#1e1b4b', display:'flex', alignItems:'center', gap:8 }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{width:24,height:24,flexShrink:0}}>
                        <path fill="#f43f5e" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7V13H13V7H11M11,15V17H13V15H11Z"/>
                      </svg>
                      Live Violations Feed
                    </h2>
                    <p style={{ margin:'3px 0 0', fontSize:12, color:'#6b7280' }}>Full case details — TingleBot AutoMod log with user info, fault, and action taken</p>
                  </div>
                  {unresolved > 0 && (
                    <div style={{ background:'#fee2e2', border:'1.5px solid #fecaca', borderRadius:10, padding:'8px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:20, fontWeight:900, color:'#dc2626', lineHeight:1 }}>{unresolved}</div>
                      <div style={{ fontSize:10, color:'#b91c1c', fontWeight:700, textTransform:'uppercase' }}>Unresolved</div>
                    </div>
                  )}
                </div>

                {/* ── Stats ── */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:10, marginBottom:20 }}>
                  {[
                    { label:'Total Logs',  value:violations.length,                                   color:'#7c3aed', bg:'rgba(124,58,237,0.08)',  border:'rgba(124,58,237,0.2)',  d:'M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z' },
                    { label:'Kicks',       value:violations.filter(v=>v.actionTaken==='KICK').length, color:'#dc2626', bg:'rgba(220,38,38,0.08)',   border:'rgba(220,38,38,0.2)',   d:'M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z' },
                    { label:'Mutes',       value:violations.filter(v=>v.actionTaken==='MUTE').length, color:'#f97316', bg:'rgba(249,115,22,0.08)',  border:'rgba(249,115,22,0.2)',  d:'M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z' },
                    { label:'Warnings',    value:violations.filter(v=>v.actionTaken==='WARN').length, color:'#f59e0b', bg:'rgba(245,158,11,0.08)',  border:'rgba(245,158,11,0.2)',  d:'M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16Z' },
                    { label:'Resolved',    value:violations.filter(v=>v.resolved).length,             color:'#10b981', bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.2)',  d:'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z' },
                  ].map(st => (
                    <div key={st.label} style={{ background:st.bg, border:`1.5px solid ${st.border}`, borderRadius:14, padding:'12px 12px 10px', textAlign:'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,margin:'0 auto 5px',display:'block'}}><path fill={st.color} d={st.d}/></svg>
                      <div style={{ fontSize:22, fontWeight:900, color:st.color, lineHeight:1 }}>{st.value}</div>
                      <div style={{ fontSize:10, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:4 }}>{st.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Filter bar ── */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
                  {['all','SPAM','PROFANITY','THREAT','PERSONAL_INFO','EXCESSIVE_CAPS','EMOJI_SPAM','HOMOGLYPH'].map(f => (
                    <button key={f} onClick={() => setViolationsFilter(f)} style={{
                      display:'flex', alignItems:'center', gap:5,
                      padding:'5px 12px', borderRadius:20, border:'1.5px solid',
                      borderColor: violationsFilter===f ? '#f43f5e' : '#e5e7eb',
                      background:  violationsFilter===f ? '#f43f5e' : '#fff',
                      color:       violationsFilter===f ? '#fff' : '#374151',
                      fontSize:11.5, fontWeight:700, cursor:'pointer',
                    }}>
                      {f === 'all'
                        ? <><svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12,flexShrink:0}}><path fill={violationsFilter===f?'#fff':'#374151'} d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>All Types</>
                        : <><svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12,flexShrink:0}}><path fill={violationsFilter===f?'#fff':(VC[f]?.badge||'#374151')} d={VC[f]?.svgPath||'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z'}/></svg>{VC[f]?.text||f.replace(/_/g,' ')}</>}
                    </button>
                  ))}
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6b7280', cursor:'pointer', marginLeft:'auto' }}>
                    <input type="checkbox" checked={violationsShowResolved} onChange={e=>setViolationsShowResolved(e.target.checked)} style={{accentColor:'#7c3aed'}}/>
                    Show Resolved
                  </label>
                </div>

                {/* ── List ── */}
                {filtered.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'48px 20px', background:'#f8fafc', borderRadius:16, border:'2px dashed #e2e8f0' }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:44,height:44,margin:'0 auto 10px',display:'block'}}><path fill="#cbd5e1" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M13,17H11V15H13M13,13H11V7H13V13Z"/></svg>
                    <div style={{fontWeight:700,fontSize:15,color:'#94a3b8',marginBottom:6}}>No violations found</div>
                    <div style={{fontSize:12,color:'#cbd5e1'}}>TingleBot AutoMod logs appear here when rule violations are detected.</div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {filtered.map(v => {
                      // ── Backward-compat field aliases ──────────────────────────────────────────
                      // Old logs used: uid, text, violationType, action
                      // New logs use:  userId, message, type, actionTaken  (plus username, photoURL, matchedWord)
                      const vType      = v.type       || v.violationType || '';
                      const vAction    = v.actionTaken|| v.action        || '';
                      const vMessage   = v.message    || v.text          || '';
                      const vUserId    = v.userId     || v.uid           || '';
                      const vUsername  = v.username   || v.displayName   || '';
                      const vPhotoURL  = v.photoURL   || '';
                      const vMatched   = v.matchedWord|| '';
                      // ──────────────────────────────────────────────────────────────────────────

                      const vc = VC[vType] || { bg:'#f9fafb', border:'#e5e7eb', badge:'#6b7280', text: vType ? vType.replace(/_/g,' ') : 'Violation', svgPath:'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z', rule:'A rule violation was detected.' };
                      const sevColor = SEV[v.severity] || '#6b7280';
                      const sevBg    = SEV_BG[v.severity] || '#f3f4f6';
                      const act = ACT[vAction] || { color:'#6b7280', bg:'#f3f4f6', label: vAction || 'NOTICE', desc:'Automated action was taken.' };
                      const ts = v.timestamp?.toDate ? v.timestamp.toDate() : (v.timestamp ? new Date(v.timestamp) : null);
                      const timeStr = ts ? ts.toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
                      const matchedUser = users.find(u => u.uid === vUserId);
                      const userEmail = matchedUser?.email || v.email || null;

                      // Prefer the LIVE current username from the users collection over the
                      // stale copy stored on the violation log at write time, so a rename
                      // (self or admin) is reflected immediately in this list.
                      const resolvedUsername = matchedUser?.displayName
                        || (vUsername && vUsername !== 'Unknown User' && vUsername !== 'Unknown' ? vUsername : null)
                        || (vUserId ? `UID:${vUserId.slice(0,10)}` : 'Unknown User');
                      const avatarUrl = vPhotoURL || matchedUser?.photoURL || getDefaultAvatarUrl(vUserId, matchedUser?.gender || 'male');
                      return (
                        <div key={v.id} style={{
                          background: v.resolved ? '#f8fafc' : '#fff',
                          border: `2px solid ${v.resolved ? '#e2e8f0' : vc.border}`,
                          borderRadius:16, overflow:'hidden',
                          opacity: v.resolved ? 0.8 : 1,
                          boxShadow: v.resolved ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
                        }}>
                          {/* ── Card Header: Violation type + severity strip ── */}
                          <div style={{ background: v.resolved ? '#f1f5f9' : vc.bg, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', borderBottom:`1px solid ${v.resolved ? '#e2e8f0' : vc.border}` }}>
                            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:900, background: v.resolved ? '#94a3b8' : vc.badge, color:'#fff', borderRadius:8, padding:'3px 10px', letterSpacing:'0.04em', flexShrink:0 }}>
                              {vc.svgPath && <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12,flexShrink:0}}><path fill="white" d={vc.svgPath}/></svg>}
                              {vc.text}
                            </span>
                            <span style={{ fontSize:11, fontWeight:700, background:sevBg, color:sevColor, borderRadius:20, padding:'2px 9px', textTransform:'uppercase', letterSpacing:'0.05em', border:`1px solid ${sevColor}33` }}>
                              {v.severity || 'low'} severity
                            </span>
                            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:800, background:act.bg, color:act.color, borderRadius:8, padding:'3px 10px', marginLeft:'auto', flexShrink:0, border:`1px solid ${act.color}33` }}>
                              {act.svgPath && <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12,flexShrink:0}}><path fill={act.color} d={act.svgPath}/></svg>}
                              {act.label}
                            </span>
                            {v.resolved && (
                              <span style={{ fontSize:11, fontWeight:800, color:'#10b981', background:'#dcfce7', borderRadius:20, padding:'2px 9px', border:'1px solid #86efac', display:'flex', alignItems:'center', gap:4 }}>
                                <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11}}><path fill="#10b981" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                                Resolved
                              </span>
                            )}
                          </div>

                          {/* ── Card Body ── */}
                          <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>

                            {/* User identity */}
                            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                              {/* Real DP — falls back to deterministic avatar */}
                              <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${vc.badge}66`, flexShrink:0, overflow:'hidden', background:`linear-gradient(135deg,${vc.badge}22,${vc.badge}44)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <img
                                  src={avatarUrl}
                                  alt={resolvedUsername}
                                  style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}
                                  onError={e => {
                                    e.target.style.display = 'none';
                                    e.target.parentNode.setAttribute('data-fallback', resolvedUsername[0]?.toUpperCase() || '?');
                                    e.target.parentNode.style.fontSize = '17px';
                                    e.target.parentNode.style.fontWeight = '900';
                                    e.target.parentNode.style.color = vc.badge;
                                    e.target.parentNode.textContent = resolvedUsername[0]?.toUpperCase() || '?';
                                  }}
                                />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                                  <span style={{ fontSize:15, fontWeight:900, color:'#1e1b4b' }}>{resolvedUsername}</span>
                                  {v.roomName && (
                                    <span style={{ fontSize:11, color:'#7c3aed', background:'#f5f3ff', borderRadius:6, padding:'2px 8px', fontWeight:700, border:'1px solid #ede9fe' }}>
                                      #{v.roomName}
                                    </span>
                                  )}
                                  <span style={{ fontSize:10.5, color:'#9ca3af', marginLeft:'auto', flexShrink:0 }}>{timeStr}</span>
                                </div>
                                {userEmail && (
                                  <div style={{ fontSize:12, color:'#6366f1', fontWeight:600, display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12,flexShrink:0}}><path fill="#6366f1" d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg>
                                    {userEmail}
                                  </div>
                                )}
                                {vUserId && (
                                  <div style={{ fontSize:10.5, color:'#9ca3af', fontFamily:'monospace' }}>UID: {vUserId}</div>
                                )}
                              </div>
                            </div>

                            {/* Offending message */}
                            {vMessage && (
                              <div style={{ background:'rgba(0,0,0,0.04)', borderLeft:`3px solid ${vc.badge}`, borderRadius:'0 8px 8px 0', padding:'8px 12px' }}>
                                <div style={{ fontSize:10, fontWeight:800, color:vc.badge, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11,flexShrink:0}}><path fill={vc.badge} d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/></svg>
                                  Offending Message
                                </div>
                                <div style={{ fontSize:12.5, color:'#1e1b4b', fontStyle:'italic', wordBreak:'break-word', lineHeight:1.5 }}>
                                  "{vMessage.slice(0, 300)}{vMessage.length > 300 ? '…' : ''}"
                                </div>
                              </div>
                            )}

                            {/* Exact trigger word */}
                            {vMatched && (
                              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#fff1f2', border:'1.5px solid #fecdd3', borderRadius:10, padding:'7px 12px', alignSelf:'flex-start' }}>
                                <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13,flexShrink:0}}><path fill="#e11d48" d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z"/></svg>
                                <span style={{ fontSize:11, fontWeight:800, color:'#9f1239', textTransform:'uppercase', letterSpacing:'0.05em' }}>Trigger Word:</span>
                                <code style={{ fontSize:12.5, fontWeight:900, color:'#e11d48', background:'#ffe4e6', borderRadius:6, padding:'2px 8px', letterSpacing:'0.02em' }}>{vMatched}</code>
                              </div>
                            )}

                            {/* Fault + Reason + Action grid */}
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
                              <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
                                <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11,flexShrink:0}}><path fill="#94a3b8" d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2z"/></svg>
                                  What Was the Fault
                                </div>
                                <div style={{ fontSize:12.5, color:'#374151', fontWeight:600, lineHeight:1.4 }}>{vc.rule}</div>
                              </div>
                              <div style={{ background: act.bg, borderRadius:10, padding:'10px 12px', border:`1px solid ${act.color}22` }}>
                                <div style={{ fontSize:10, fontWeight:800, color:act.color, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
                                  {act.svgPath && <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11,flexShrink:0}}><path fill={act.color} d={act.svgPath}/></svg>}
                                  Action Taken
                                </div>
                                <div style={{ fontSize:12.5, color:'#374151', fontWeight:600, lineHeight:1.4 }}>{act.desc}</div>
                              </div>
                              {(v.reason || v.autoModReason) && (
                                <div style={{ background:'#fefce8', borderRadius:10, padding:'10px 12px', border:'1px solid #fde68a' }}>
                                  <div style={{ fontSize:10, fontWeight:800, color:'#d97706', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11,flexShrink:0}}><path fill="#d97706" d="M14 17H7v-2h7m3-4H7v-2h10m0-4H7V5h10M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                                    Reason / Details
                                  </div>
                                  <div style={{ fontSize:12.5, color:'#374151', fontWeight:600, lineHeight:1.4 }}>{v.reason || v.autoModReason}</div>
                                </div>
                              )}
                            </div>

                            {/* Resolution info */}
                            {v.resolved && v.resolvedBy && (
                              <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#059669', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                                <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}><path fill="#059669" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                                <strong>Resolved by {v.resolvedBy}</strong>
                                {v.resolvedAt && <span style={{color:'#6b7280'}}>· {(v.resolvedAt?.toDate ? v.resolvedAt.toDate() : new Date(v.resolvedAt)).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
                                {v.resolveNote && <span style={{color:'#374151'}}>· "{v.resolveNote}"</span>}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingTop:4, alignItems:'center' }}>
                              {!v.resolved && v.actionTaken === 'KICK' && v.userId && v.roomId && (
                                <button onClick={() => { setUnkickTarget(v); setShowUnkickModal(true); }} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, padding:'7px 14px', borderRadius:9, border:'1.5px solid #f97316', background:'#fff7ed', color:'#ea580c', fontWeight:800, cursor:'pointer' }}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}><path fill="#ea580c" d="M16,13V10L11,15L16,20V17H22V13H16M14,2A2,2 0 0,0 12,4V6H14V4H5V20H14V18H12A2,2 0 0,1 10,16H5A2,2 0 0,1 3,14V4A2,2 0 0,1 5,2H14Z"/></svg>
                                  Unkick User
                                </button>
                              )}
                              {!v.resolved && v.actionTaken === 'MUTE' && v.userId && (
                                <button onClick={() => { setUnmuteTarget(v); setShowUnmuteModal(true); }} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, padding:'7px 14px', borderRadius:9, border:'1.5px solid #3b82f6', background:'#eff6ff', color:'#2563eb', fontWeight:800, cursor:'pointer' }}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}><path fill="#2563eb" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/></svg>
                                  Unmute User
                                </button>
                              )}
                              {!v.resolved && (
                                <button onClick={() => { setResolveTarget(v); setShowResolveModal(true); }} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, padding:'7px 14px', borderRadius:9, border:'1.5px solid #10b981', background:'#f0fdf4', color:'#059669', fontWeight:800, cursor:'pointer' }}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}><path fill="#059669" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                                  Mark Resolved
                                </button>
                              )}
                              {/* Delete Record — inline confirm (no window.confirm) */}
                              {confirmDeleteViolId === v.id ? (
                                <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:10, padding:'5px 10px', fontSize:12, marginLeft:'auto' }}>
                                  <span style={{ color:'#b91c1c', fontWeight:700 }}>Delete permanently?</span>
                                  <button
                                    onClick={async () => {
                                      setConfirmDeleteViolId(null);
                                      try {
                                        await deleteDoc(doc(db, 'modLogs', v.id));
                                        pt.success('Violation record deleted.');
                                      } catch (e) {
                                        pt.error('Delete failed: ' + e.message);
                                      }
                                    }}
                                    style={{ padding:'3px 10px', fontSize:12, fontWeight:800, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer' }}
                                  >Delete</button>
                                  <button
                                    onClick={() => setConfirmDeleteViolId(null)}
                                    style={{ padding:'3px 10px', fontSize:12, fontWeight:700, background:'transparent', color:'#6b7280', border:'1px solid #d1d5db', borderRadius:7, cursor:'pointer' }}
                                  >Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteViolId(v.id)}
                                  style={{
                                    display:'flex', alignItems:'center', gap:6,
                                    fontSize:12, padding:'7px 14px', borderRadius:9,
                                    background:'linear-gradient(135deg,#ef4444,#dc2626)',
                                    color:'#fff', border:'none', fontWeight:800, cursor:'pointer',
                                    boxShadow:'0 2px 10px rgba(239,68,68,0.32)',
                                    marginLeft:'auto', letterSpacing:'0.02em',
                                    transition:'all 0.18s ease',
                                  }}
                                  onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                                  onMouseLeave={e=>e.currentTarget.style.transform='none'}
                                  title="Delete this violation record"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13,flexShrink:0}}>
                                    <path fill="white" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"/>
                                  </svg>
                                  Delete Record
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════
              FEEDBACK & COMPLAINTS TAB
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'feedback' && (() => {
            const REPLY_STATUSES = [
              { key: 'feedback_received',  label: 'Feedback Received',              color: '#a855f7' },
              { key: 'complaint_received', label: 'Complaint Received',             color: '#ef4444' },
              { key: 'under_review',       label: 'Under Review',                   color: '#60a5fa' },
              { key: 'checking_issue',     label: 'Checking Issue',                 color: '#f59e0b' },
              { key: 'in_progress',        label: 'In Progress',                    color: '#10b981' },
              { key: 'info_required',      label: 'Additional Information Required',color: '#f97316' },
              { key: 'resolved',           label: 'Resolved',                       color: '#10b981' },
              { key: 'closed',             label: 'Closed',                         color: '#64748b' },
              { key: 'warning_issued',     label: 'Warning Issued',                 color: '#f59e0b' },
              { key: 'thank_you',          label: 'Thank You for Your Feedback',    color: '#ec4899' },
            ];

            let filtered = [...feedbackItems];
            if (feedbackTypeFilter !== 'all') filtered = filtered.filter(f => f.type === feedbackTypeFilter);
            if (feedbackSearch.trim()) {
              const q = feedbackSearch.trim().toLowerCase();
              filtered = filtered.filter(f =>
                (f.username || '').toLowerCase().includes(q) ||
                (f.displayName || '').toLowerCase().includes(q) ||
                (f.email || '').toLowerCase().includes(q)
              );
            }
            if (feedbackSort === 'oldest') filtered.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

            const unreadCount = feedbackItems.filter(f => !f.isRead).length;
            const feedbackCount = feedbackItems.filter(f => f.type === 'feedback').length;
            const complaintCount = feedbackItems.filter(f => f.type === 'complaint').length;

            return (
              <div style={{ padding: '0 0 24px' }}>
                {/* Header */}
                <div className="luxury-section-header" style={{ marginBottom: 18 }}>
                  <h2 style={{ display:'flex', alignItems:'center', gap:10, fontSize:20, fontWeight:800, color:'#1e293b', margin:0 }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:26,height:26,flexShrink:0}}>
                      <defs>
                        <linearGradient id="adm_fbtitle_g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stopColor="#a855f7"/><stop offset="1" stopColor="#ec4899"/>
                        </linearGradient>
                      </defs>
                      <path d="M20 2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h3l3 3 3-3h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" fill="url(#adm_fbtitle_g)"/>
                      <path d="M7 9h10M7 12h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Feedback &amp; Complaints
                  </h2>
                  <p style={{ color:'#64748b', fontSize:13, margin:'4px 0 0', fontWeight:500 }}>
                    Manage user-submitted feedback and complaint reports
                  </p>
                </div>

                {/* Stats row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:18 }}>
                  {[
                    { label:'Total', value: feedbackItems.length, color:'#6366f1', bg:'rgba(99,102,241,0.08)', border:'rgba(99,102,241,0.18)' },
                    { label:'Unread', value: unreadCount, color:'#ef4444', bg:'rgba(239,68,68,0.08)', border:'rgba(239,68,68,0.18)' },
                    { label:'Feedback', value: feedbackCount, color:'#a855f7', bg:'rgba(168,85,247,0.08)', border:'rgba(168,85,247,0.18)' },
                    { label:'Complaints', value: complaintCount, color:'#f97316', bg:'rgba(249,115,22,0.08)', border:'rgba(249,115,22,0.18)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border:`1px solid ${s.border}`, borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:800, color: s.color, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginTop:3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Filters & Search */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14, alignItems:'center' }}>
                  <div style={{ position:'relative', flex:'1 1 180px' }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',opacity:0.4}}>
                      <circle cx="11" cy="11" r="8" stroke="#64748b" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <input
                      placeholder="Search username or email…"
                      value={feedbackSearch}
                      onChange={e => setFeedbackSearch(e.target.value)}
                      style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px 8px 30px', borderRadius:9, border:'1px solid rgba(148,163,184,0.3)', fontSize:12.5, fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,0.8)', color:'#1e293b' }}
                    />
                  </div>
                  {['all','feedback','complaint'].map(f => (
                    <button key={f} onClick={() => setFeedbackTypeFilter(f)} style={{
                      padding:'7px 13px', borderRadius:8, border:`1px solid ${feedbackTypeFilter===f ? '#a855f7' : 'rgba(148,163,184,0.3)'}`,
                      background: feedbackTypeFilter===f ? 'linear-gradient(135deg,#a855f7,#ec4899)' : 'rgba(255,255,255,0.8)',
                      color: feedbackTypeFilter===f ? '#fff' : '#475569', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit'
                    }}>
                      {f === 'all' ? 'All' : f === 'feedback' ? 'Feedback' : 'Complaints'}
                    </button>
                  ))}
                  <button onClick={() => setFeedbackSort(s => s==='newest'?'oldest':'newest')} style={{
                    padding:'7px 13px', borderRadius:8, border:'1px solid rgba(148,163,184,0.3)',
                    background:'rgba(255,255,255,0.8)', color:'#475569', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit',
                    display:'flex', alignItems:'center', gap:5
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12}}>
                      <path d="M3 18h6v-2H3v2zm0-5h12v-2H3v2zm0-7v2h18V6H3z" fill="#475569"/>
                    </svg>
                    {feedbackSort === 'newest' ? 'Newest' : 'Oldest'}
                  </button>
                </div>

                {/* Feedback Cards */}
                {filtered.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 20px', color:'#94a3b8' }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:40,height:40,margin:'0 auto 12px',display:'block',opacity:0.3}}>
                      <path d="M20 2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h3l3 3 3-3h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" stroke="#64748b" strokeWidth="1.5" fill="none"/>
                    </svg>
                    <div style={{fontWeight:700,fontSize:14}}>No submissions found</div>
                  </div>
                ) : filtered.map(item => {
                  const isOpen = feedbackReplyOpen === item.id;
                  const ts = item.timestamp?.toDate ? item.timestamp.toDate() : item.timestamp ? new Date(item.timestamp) : null;
                  const dateStr = ts ? ts.toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }) : '—';
                  const isFeedback = item.type === 'feedback';
                  const accentColor = isFeedback ? '#a855f7' : '#ef4444';
                  const accentBg = isFeedback ? 'rgba(168,85,247,0.07)' : 'rgba(239,68,68,0.07)';
                  const accentBorder = isFeedback ? 'rgba(168,85,247,0.2)' : 'rgba(239,68,68,0.2)';
                  // Always show current username — look up user's latest data from loaded users list
                  const _currentUser = users.find(u => u.uid === item.uid || u.id === item.uid);
                  const _currentDisplayName = _currentUser?.username || _currentUser?.displayName || item.username || item.displayName || 'Unknown';
                  const avatarUrl = _currentUser?.photoURL || item.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${item.uid || 'user'}`;

                  return (
                    <div key={item.id} style={{
                      background: item.isRead ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.95)',
                      border: `1.5px solid ${item.isRead ? 'rgba(148,163,184,0.2)' : accentBorder}`,
                      borderRadius: 16, marginBottom: 12, overflow:'hidden',
                      boxShadow: item.isRead ? '0 2px 8px rgba(0,0,0,0.04)' : `0 4px 20px ${accentColor}18`,
                      transition: 'box-shadow 0.2s, border-color 0.2s',
                    }}>
                      {/* Card Header */}
                      <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px 12px', borderBottom:'1px solid rgba(148,163,184,0.1)' }}>
                        <img src={avatarUrl} alt="" style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover', border:`2px solid ${accentColor}40`, flexShrink:0 }} onError={e=>{ e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${item.uid||'user'}`; }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                            <span style={{ fontWeight:800, fontSize:13.5, color:'#1e293b' }}>{_currentDisplayName}</span>
                            {_currentUser?.username && _currentUser.username !== _currentUser.displayName && (
                              <span style={{ fontSize:11, color:'#7c3aed', fontWeight:600 }}>@{_currentUser.username}</span>
                            )}
                            {/* Type badge */}
                            <span style={{
                              padding:'2px 8px', borderRadius:20, fontSize:10.5, fontWeight:700, letterSpacing:'0.04em',
                              background: accentBg, color: accentColor, border:`1px solid ${accentBorder}`, textTransform:'uppercase'
                            }}>
                              {isFeedback ? 'Feedback' : 'Complaint'}
                            </span>
                            {/* Unread dot */}
                            {!item.isRead && (
                              <span style={{ width:7, height:7, borderRadius:'50%', background: accentColor, display:'inline-block', flexShrink:0 }} title="Unread" />
                            )}
                          </div>
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{item.email || '—'}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3, flexWrap:'wrap' }}>
                            {item.role && (
                              <span style={{ padding:'1px 6px', borderRadius:5, fontSize:10, fontWeight:600, background:'rgba(99,102,241,0.1)', color:'#6366f1' }}>
                                {item.role}
                              </span>
                            )}
                            {item.badge && (
                              <span style={{ padding:'1px 6px', borderRadius:5, fontSize:10, fontWeight:600, background:'rgba(251,191,36,0.12)', color:'#d97706' }}>
                                {item.badge}
                              </span>
                            )}
                            <span style={{ fontSize:10.5, color:'#94a3b8' }}>{dateStr}</span>
                          </div>
                        </div>
                        {/* Read status & Actions */}
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          <button onClick={() => handleFeedbackMarkRead(item.id, !item.isRead)} title={item.isRead ? 'Mark Unread' : 'Mark Read'} style={{
                            width:30, height:30, borderRadius:8, border:'1px solid rgba(148,163,184,0.3)', background:'rgba(255,255,255,0.8)',
                            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}>
                              {item.isRead
                                ? <><path d="M3 10l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#64748b" strokeWidth="1.6"/><path d="M9 21V12h6v9" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round"/></>
                                : <><path d="M3 10l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1.6"/><path d="M9 21V12h6v9" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/></>
                              }
                            </svg>
                          </button>
                          <button onClick={() => { setFeedbackReplyOpen(isOpen ? null : item.id); setFeedbackReplyText(''); setFeedbackReplyStatus(''); }} style={{
                            width:30, height:30, borderRadius:8, border:`1px solid ${isOpen ? accentColor : 'rgba(148,163,184,0.3)'}`,
                            background: isOpen ? accentBg : 'rgba(255,255,255,0.8)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
                          }} title="Reply">
                            <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}>
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={isOpen ? accentColor : '#64748b'} strokeWidth="1.6" fill="none"/>
                            </svg>
                          </button>
                          <button onClick={() => handleFeedbackDelete(item.id)} title="Delete" style={{
                            width:30, height:30, borderRadius:8, border:'1px solid rgba(239,68,68,0.25)', background:'rgba(239,68,68,0.06)',
                            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14}}>
                              <path d="M3 6h18M19 6l-1 14H6L5 6M10 6V4h4v2" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Message Body */}
                      <div style={{ padding:'12px 16px', fontSize:13, color:'#334155', lineHeight:1.65, whiteSpace:'pre-wrap', borderBottom: isOpen ? '1px solid rgba(148,163,184,0.1)' : 'none' }}>
                        {item.message}
                      </div>

                      {/* Reply Panel */}
                      {isOpen && (
                        <div style={{ padding:'12px 16px 14px', background: accentBg }}>
                          <div style={{ fontWeight:700, fontSize:12, color: accentColor, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                            <svg viewBox="0 0 24 24" fill="none" style={{width:13,height:13}}>
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={accentColor} strokeWidth="1.8" fill="none"/>
                            </svg>
                            SEND TINGLEBOT REPLY TO {(item.username || 'USER').toUpperCase()}
                          </div>
                          {/* Status buttons */}
                          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
                            {REPLY_STATUSES.map(s => (
                              <button key={s.key} onClick={() => setFeedbackReplyStatus(feedbackReplyStatus === s.key ? '' : s.key)} style={{
                                padding:'4px 9px', borderRadius:6, fontSize:10.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:`1px solid ${s.color}50`,
                                background: feedbackReplyStatus === s.key ? s.color : `${s.color}12`,
                                color: feedbackReplyStatus === s.key ? '#fff' : s.color,
                                transition: 'all 0.15s'
                              }}>
                                {s.label}
                              </button>
                            ))}
                          </div>
                          {/* Custom message */}
                          <textarea
                            rows={3}
                            placeholder="Type a custom message to include with the reply (optional)…"
                            value={feedbackReplyText}
                            onChange={e => setFeedbackReplyText(e.target.value)}
                            style={{ width:'100%', boxSizing:'border-box', borderRadius:9, padding:'8px 11px', fontSize:12.5, fontFamily:'inherit', border:`1px solid ${accentBorder}`, outline:'none', resize:'vertical', background:'rgba(255,255,255,0.9)', color:'#1e293b', lineHeight:1.5 }}
                          />
                          <div style={{ display:'flex', gap:7, marginTop:8, justifyContent:'flex-end' }}>
                            <button onClick={() => { setFeedbackReplyOpen(null); setFeedbackReplyText(''); setFeedbackReplyStatus(''); }} style={{ padding:'7px 13px', borderRadius:8, border:'1px solid rgba(148,163,184,0.3)', background:'rgba(255,255,255,0.8)', color:'#475569', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                              Cancel
                            </button>
                            <button
                              onClick={() => handleFeedbackReply(item)}
                              disabled={feedbackReplySending || (!feedbackReplyText.trim() && !feedbackReplyStatus)}
                              style={{
                                padding:'7px 16px', borderRadius:8, border:'none',
                                background: `linear-gradient(135deg,${accentColor},${isFeedback?'#ec4899':'#f97316'})`,
                                color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit',
                                opacity: feedbackReplySending || (!feedbackReplyText.trim() && !feedbackReplyStatus) ? 0.55 : 1,
                                display:'flex', alignItems:'center', gap:6
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" style={{width:12,height:12}}>
                                <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {feedbackReplySending ? 'Sending…' : 'Send via TingleBot'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Coins, Payments & RJ Earnings Tab ── */}
          {activeTab === 'coins' && (
            <div className="luxury-coins-section">
              <div className="luxury-section-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:28,height:28,flexShrink:0}}>
                    <defs><linearGradient id="adm_ch" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
                    <circle cx="12" cy="12" r="10" fill="url(#adm_ch)"/>
                    <path fill="#92400e" d="M13.5 8H10v1.5h1.5v5H10V16h4v-1.5h-1.5v-5H14L13.5 8zm-2-2a1 1 0 112 0 1 1 0 01-2 0z"/>
                  </svg>
                  Coins, Payments &amp; RJ Earnings
                </h2>
                <p>Manage coin packages, UPI settings, payment orders, and RJ earnings</p>
              </div>
              <AdminCoinsPanel />
            </div>
          )}

          {/* ── Visitors Tab ── */}
          {activeTab === 'visitors' && <AdminVisitorsPanel />}

          {/* ── Badge Verification Tab ── */}
          {activeTab === 'badge-verify' && (
            <BadgeVerificationPanel currentUserProfile={currentUserProfile} />
          )}

          {/* ── RJ Verification Tab ── */}
          {activeTab === 'rj-verify' && (
            <RJVerificationPanel currentUserProfile={currentUserProfile} />
          )}

        </div>
      </div>

      {/* ── Unkick Modal ── */}
      {showUnkickModal && unkickTarget && (
        <div className="luxury-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowUnkickModal(false); setUnkickTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 420 }}>
            <div className="luxury-modal-header" style={{ borderTopColor: '#f97316' }}>
              <div className="luxury-modal-icon" style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                  <path fill="#fff" d="M10.09,15.59L11.5,17L16.5,12L11.5,7L10.09,8.41L12.67,11H3V13H12.67L10.09,15.59M19,3H5A2,2 0 0,0 3,5V9H5V5H19V19H5V15H3V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#1e1b4b', fontWeight: 800 }}>Unkick User</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#ea580c', opacity: 0.8 }}>Allow re-entry to room</p>
              </div>
              <button className="luxury-modal-close" onClick={() => { setShowUnkickModal(false); setUnkickTarget(null); }}>
                <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>
            <div className="luxury-modal-body">
              <div style={{ background:'#fff7ed', border:'1.5px solid #fed7aa', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ fontSize:12.5, fontWeight:800, color:'#c2410c' }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,marginRight:6,verticalAlign:'middle'}}><path fill="#c2410c" d="M13.5,5.5C14.59,5.5 15.5,4.58 15.5,3.5C15.5,2.38 14.59,1.5 13.5,1.5C12.39,1.5 11.5,2.38 11.5,3.5C11.5,4.58 12.39,5.5 13.5,5.5Z"/></svg>
                  Removing kick for: <strong>{unkickTarget.username || unkickTarget.userId}</strong>
                </div>
                <div style={{ fontSize:11.5, color:'#9a3412' }}>Room: <strong>{unkickTarget.roomName || unkickTarget.roomId}</strong></div>
                <div style={{ fontSize:11, color:'#c2410c', opacity:0.75 }}>This will remove their entry in kickedUsers and allow them back into the room.</div>
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button className="luxury-btn-secondary" onClick={() => { setShowUnkickModal(false); setUnkickTarget(null); }} disabled={unkicking}>Cancel</button>
              <button className="luxury-btn-primary" style={{ background:'linear-gradient(135deg,#ea580c,#f97316)' }} onClick={handleUnkick} disabled={unkicking}>
                {unkicking ? <><div className="luxury-loading-spinner" style={{ width:14, height:14, borderWidth:2 }}></div> Unkicking…</> : <>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}}><path fill="#fff" d="M10.09,15.59L11.5,17L16.5,12L11.5,7L10.09,8.41L12.67,11H3V13H12.67L10.09,15.59Z"/></svg>
                  Confirm Unkick
                </>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unmute Modal ── */}
      {showUnmuteModal && unmuteTarget && (
        <div className="luxury-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowUnmuteModal(false); setUnmuteTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 420 }}>
            <div className="luxury-modal-header" style={{ borderTopColor: '#3b82f6' }}>
              <div className="luxury-modal-icon" style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                  <path fill="#fff" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#1e1b4b', fontWeight: 800 }}>Unmute User</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#2563eb', opacity: 0.8 }}>Restore chat privileges</p>
              </div>
              <button className="luxury-modal-close" onClick={() => { setShowUnmuteModal(false); setUnmuteTarget(null); }}>
                <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>
            <div className="luxury-modal-body">
              <div style={{ background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ fontSize:12.5, fontWeight:800, color:'#1d4ed8' }}>
                  Restoring voice for: <strong>{unmuteTarget.username || unmuteTarget.userId}</strong>
                </div>
                <div style={{ fontSize:11, color:'#1e40af', opacity:0.75 }}>This will clear their isMuted flag and mutedInfo, allowing them to chat again immediately.</div>
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button className="luxury-btn-secondary" onClick={() => { setShowUnmuteModal(false); setUnmuteTarget(null); }} disabled={unmuteLoading}>Cancel</button>
              <button className="luxury-btn-primary" style={{ background:'linear-gradient(135deg,#2563eb,#3b82f6)' }} onClick={handleUnmute} disabled={unmuteLoading}>
                {unmuteLoading ? <><div className="luxury-loading-spinner" style={{ width:14, height:14, borderWidth:2 }}></div> Unmuting…</> : <>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}}><path fill="#fff" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/></svg>
                  Confirm Unmute
                </>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Violation Modal ── */}
      {showResolveModal && resolveTarget && (
        <div className="luxury-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowResolveModal(false); setResolveTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 420 }}>
            <div className="luxury-modal-header" style={{ borderTopColor: '#10b981' }}>
              <div className="luxury-modal-icon" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                  <path fill="#fff" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#1e1b4b', fontWeight: 800 }}>Resolve Violation</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#059669', opacity: 0.8 }}>Mark as handled</p>
              </div>
              <button className="luxury-modal-close" onClick={() => { setShowResolveModal(false); setResolveTarget(null); }}>
                <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>
            <div className="luxury-modal-body">
              <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ fontSize:12.5, fontWeight:800, color:'#065f46' }}>
                  Marking violation as resolved:
                </div>
                <div style={{ fontSize:11.5, color:'#047857' }}>
                  User: <strong>{resolveTarget.username || resolveTarget.userId}</strong> · Type: <strong>{resolveTarget.type}</strong>
                </div>
                <div style={{ fontSize:11, color:'#065f46', opacity:0.75 }}>This action will be logged with your name and timestamp. The violation log will remain visible but marked resolved.</div>
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button className="luxury-btn-secondary" onClick={() => { setShowResolveModal(false); setResolveTarget(null); }} disabled={resolving}>Cancel</button>
              <button className="luxury-btn-primary" style={{ background:'linear-gradient(135deg,#059669,#10b981)' }} onClick={handleResolveViolation} disabled={resolving}>
                {resolving ? <><div className="luxury-loading-spinner" style={{ width:14, height:14, borderWidth:2 }}></div> Resolving…</> : <>
                  <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15}}><path fill="#fff" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                  Mark Resolved
                </>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Ban Modal */}
      {showUnDevBanModal && unDevBanTarget && (
        <div className="luxury-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowUnDevBanModal(false); setUnDevBanTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 420 }}>
            <div className="luxury-modal-header" style={{ borderTopColor: '#10b981' }}>
              <div className="luxury-modal-icon" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                  <path fill="#ffffff" d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,19H7V5H17V19M9,8.41L10.41,7L12,8.58L13.59,7L15,8.41L13.42,10L15,11.59L13.59,13L12,11.41L10.41,13L9,11.59L10.58,10L9,8.41Z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#1e1b4b', fontWeight: 700 }}>Remove Device Ban</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#10b981', opacity: 0.8 }}>{unDevBanTarget.displayName}</p>
              </div>
              <button className="luxury-modal-close" onClick={() => { setShowUnDevBanModal(false); setUnDevBanTarget(null); }}>
                <svg viewBox="0 0 24 24" fill="none"><path fill="#10b981" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>
            <div className="luxury-modal-body">
              <div style={{ background: '#f0fdf4', border: '1.5px solid #a7f3d0', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#065f46', fontWeight: 700, marginBottom: 4 }}>⚠️ This will lift the device ban</div>
                <div style={{ fontSize: 11, color: '#047857' }}>
                  <strong>{unDevBanTarget.displayName}</strong>'s device will be unbanned. They will be able to access the platform from this device again.
                </div>
                {(unDevBanTarget.lastDeviceId || unDevBanTarget.deviceId) && (
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#059669', marginTop: 6, wordBreak: 'break-all' }}>
                    Device ID: {(unDevBanTarget.lastDeviceId || unDevBanTarget.deviceId).substring(0, 24)}…
                  </div>
                )}
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button className="luxury-btn-secondary" onClick={() => { setShowUnDevBanModal(false); setUnDevBanTarget(null); }} disabled={unDevBanning}>Cancel</button>
              <button className="luxury-btn-primary" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }} onClick={confirmUnDevBan} disabled={unDevBanning}>
                {unDevBanning ? (
                  <><div className="luxury-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Removing…</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}><path fill="#ffffff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/></svg> Confirm Un-DevBan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDevBanModal && devBanTarget && (
        <div className="luxury-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowDevBanModal(false); setDevBanTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 420 }}>
            <div className="luxury-modal-header" style={{ borderTopColor: '#8b5cf6' }}>
              <div className="luxury-modal-icon" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                  <path fill="#ffffff" d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,19H7V5H17V19M14.12,6.88L12,9L9.88,6.88L8.5,8.28L10.62,10.38L8.5,12.5L9.88,13.88L12,11.78L14.12,13.88L15.5,12.5L13.4,10.38L15.5,8.28L14.12,6.88Z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#1e1b4b', fontWeight: 700 }}>Ban Device</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#7c3aed', opacity: 0.7 }}>{devBanTarget.displayName}</p>
              </div>
              <button className="luxury-modal-close" onClick={() => { setShowDevBanModal(false); setDevBanTarget(null); }}>
                <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>
            <div className="luxury-modal-body">
              <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 10, padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 11, color: '#5b21b6', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Device Fingerprint</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#4c1d95', fontWeight: 800, letterSpacing: '0.05em', wordBreak: 'break-all' }}>
                  {(devBanTarget.lastDeviceId || devBanTarget.deviceId || '').substring(0, 32)}…
                </div>
                <div style={{ fontSize: 10.5, color: '#7c3aed', opacity: 0.7 }}>This device will be blocked even if they change IP or create a new account.</div>
              </div>
              <div className="luxury-form-group">
                <label className="luxury-form-label">
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}><path fill="#7c3aed" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/></svg>
                  Reason (optional)
                </label>
                <input
                  className="luxury-form-input"
                  type="text"
                  placeholder="Reason for device ban…"
                  value={devBanReason}
                  onChange={(e) => setDevBanReason(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button className="luxury-btn-secondary" onClick={() => { setShowDevBanModal(false); setDevBanTarget(null); }} disabled={devBanning}>
                Cancel
              </button>
              <button
                className="luxury-btn-primary"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                onClick={confirmDeviceBan}
                disabled={devBanning}
              >
                {devBanning ? (
                  <><div className="luxury-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Banning…</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}><path fill="#ffffff" d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M14.12,6.88L12,9L9.88,6.88L8.5,8.28L10.62,10.38L8.5,12.5L9.88,13.88L12,11.78L14.12,13.88L15.5,12.5L13.4,10.38L15.5,8.28L14.12,6.88Z"/></svg> Ban Device</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="luxury-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteModal(false); setDeleteTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 420 }}>
            <div className="luxury-modal-header" style={{ borderTopColor: '#ef4444' }}>
              <div className="luxury-modal-icon" style={{ background: 'linear-gradient(135deg,#dc2626,#f97316)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                  <path fill="#ffffff" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#1e1b4b', fontWeight: 700 }}>Delete Profile</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#ef4444', opacity: 0.8 }}>This is irreversible</p>
              </div>
              <button className="luxury-modal-close" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}>
                <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>
            <div className="luxury-modal-body">
              <div style={{ background: '#fff1f1', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#b91c1c' }}>⚠️ Permanent deletion of: {deleteTarget.displayName}</div>
                <div style={{ fontSize: 11, color: '#7f1d1d', lineHeight: 1.5 }}>
                  This will permanently remove their profile, ban their IP, and cannot be undone.
                </div>
              </div>
              <div className="luxury-form-group">
                <label className="luxury-form-label">
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}><path fill="#ef4444" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
                  Type <strong style={{ color: '#b91c1c', fontFamily: 'monospace' }}>DELETE</strong> to confirm
                </label>
                <input
                  className="luxury-form-input"
                  type="text"
                  placeholder="Type DELETE here…"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  style={{ borderColor: deleteConfirmText === 'DELETE' ? '#10b981' : undefined }}
                  autoFocus
                />
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button className="luxury-btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} disabled={deleting}>
                Cancel
              </button>
              <button
                className="luxury-btn-primary"
                style={{ background: deleteConfirmText === 'DELETE' ? 'linear-gradient(135deg,#dc2626,#f97316)' : '#d1d5db', cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed' }}
                onClick={confirmDeleteProfile}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
              >
                {deleting ? (
                  <><div className="luxury-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Deleting…</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}><path fill="#ffffff" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/></svg> Delete Permanently</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Room Modal */}
      {showDeleteRoomModal && deleteRoomTarget && (
        <div className="luxury-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteRoomModal(false); setDeleteRoomTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 430 }}>
            <div className="luxury-modal-header" style={{ borderTopColor: '#ef4444' }}>
              <div className="luxury-modal-icon" style={{ background: 'linear-gradient(135deg,#dc2626,#f97316)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                  <path fill="#ffffff" d="M20,2H4C2.9,2 2,2.9 2,4V22L6,18H20C21.1,18 22,17.1 22,16V4C22,2.9 21.1,2 20,2M9,13H7V11H9V13M9,10H7V8H9V10M13,13H11V11H13V13M13,10H11V8H13V10M17,13H15V11H17V13M17,10H15V8H17V10Z"/>
                  <path fill="rgba(255,255,255,0.6)" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9Z" opacity="0.4"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: '#1e1b4b', fontWeight: 800 }}>Delete Room</h3>
                <p style={{ margin: 0, fontSize: 11, color: '#ef4444', opacity: 0.8 }}>This cannot be undone</p>
              </div>
              <button className="luxury-modal-close" onClick={() => { setShowDeleteRoomModal(false); setDeleteRoomTarget(null); }}>
                <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>
            <div className="luxury-modal-body">
              <div style={{ background: '#fff1f1', border: '1.5px solid #fecaca', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22, flexShrink: 0, marginTop: 1 }}>
                  <path fill="#dc2626" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#b91c1c' }}>Permanently deleting: &ldquo;{deleteRoomTarget.name}&rdquo;</div>
                  <div style={{ fontSize: 11.5, color: '#7f1d1d', marginTop: 4, lineHeight: 1.5 }}>
                    All messages and data in this room will be permanently removed. Users currently in this room will be disconnected.
                  </div>
                </div>
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button className="luxury-btn-secondary" onClick={() => { setShowDeleteRoomModal(false); setDeleteRoomTarget(null); }} disabled={deletingRoom}>
                Cancel
              </button>
              <button
                className="luxury-btn-primary"
                style={{ background: 'linear-gradient(135deg,#dc2626,#f97316)' }}
                onClick={confirmDeleteRoom}
                disabled={deletingRoom}
              >
                {deletingRoom ? (
                  <><div className="luxury-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Deleting…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
                      <path fill="#ffffff" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                    Delete Room
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditRoom && editRoomTarget && (
        <div className="luxury-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowEditRoom(false); setEditRoomTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 520 }}>
            <div className="luxury-modal-header" style={{ borderTopColor: '#6366f1' }}>
              <div className="luxury-modal-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
                  <path fill="#ffffff" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#1e1b4b', fontWeight: 800 }}>Edit Room</h3>
                <p style={{ margin: 0, fontSize: 11.5, color: '#6366f1', opacity: 0.75 }}>Changes reflect on Room List page instantly</p>
              </div>
              <button className="luxury-modal-close" onClick={() => { setShowEditRoom(false); setEditRoomTarget(null); }}>
                <svg viewBox="0 0 24 24" fill="none"><path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>
            <div className="luxury-modal-body">
              <div className="luxury-form-group">
                <label className="luxury-form-label">
                  <svg viewBox="0 0 24 24" fill="none"><path fill="#6366f1" d="M5,4V7H10.5V19H13.5V7H19V4H5Z"/></svg>
                  Room Name *
                </label>
                <input
                  className="luxury-form-input"
                  type="text"
                  placeholder="e.g. Indian Chat, Gaming Lounge…"
                  value={editRoomData.name}
                  onChange={(e) => setEditRoomData(p => ({ ...p, name: e.target.value }))}
                  maxLength={40}
                  autoFocus
                />
              </div>
              <div className="luxury-form-group">
                <label className="luxury-form-label">
                  <svg viewBox="0 0 24 24" fill="none"><path fill="#6366f1" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/></svg>
                  Description
                </label>
                <input
                  className="luxury-form-input"
                  type="text"
                  placeholder="Short description of this room…"
                  value={editRoomData.description}
                  onChange={(e) => setEditRoomData(p => ({ ...p, description: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div className="luxury-form-row">
                <div className="luxury-form-group">
                  <label className="luxury-form-label">
                    <svg viewBox="0 0 24 24" fill="none"><path fill="#6366f1" d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"/></svg>
                    Room Type
                  </label>
                  <select
                    className="luxury-form-input"
                    value={editRoomData.type}
                    onChange={(e) => setEditRoomData(p => ({ ...p, type: e.target.value }))}
                  >
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>
                <div className="luxury-form-group">
                  <label className="luxury-form-label">
                    <svg viewBox="0 0 24 24" fill="none"><path fill="#6366f1" d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/></svg>
                    Max Users
                  </label>
                  <input
                    className="luxury-form-input"
                    type="number"
                    min="2"
                    max="500"
                    value={editRoomData.maxUsers}
                    onChange={(e) => setEditRoomData(p => ({ ...p, maxUsers: e.target.value }))}
                  />
                </div>
              </div>

              {/* Password + Order row */}
              <div className="luxury-form-row">
                <div className="luxury-form-group">
                  <label className="luxury-form-label">
                    <svg viewBox="0 0 24 24" fill="none"><path fill="#6366f1" d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></svg>
                    Room Password
                  </label>
                  <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                    <input
                      className="luxury-form-input"
                      type={showEditPw ? 'text' : 'password'}
                      placeholder="Leave blank = open room"
                      value={editRoomData.password}
                      onChange={(e) => setEditRoomData(p => ({ ...p, password: e.target.value }))}
                      style={{ paddingRight: 36 }}
                    />
                    <button type="button" onClick={() => setShowEditPw(p=>!p)} style={{ position:'absolute', right:10, background:'none', border:'none', cursor:'pointer', color:'#6366f1', padding:0 }}>
                      <svg viewBox="0 0 24 24" fill="none" style={{width:16,height:16}}>
                        {showEditPw ? <path fill="#6366f1" d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/> : <path fill="#6366f1" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>}
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="luxury-form-group">
                  <label className="luxury-form-label">
                    <svg viewBox="0 0 24 24" fill="none"><path fill="#6366f1" d="M3,3H5V5H3V3M7,5H21V3H7V5M3,7H5V9H3V7M7,9H21V7H7V9M3,11H5V13H3V11M7,13H21V11H7V13M3,15H5V17H3V15M7,17H21V15H7V17M3,19H5V21H3V19M7,21H21V19H7V21Z"/></svg>
                    Order / Position
                  </label>
                  <input
                    className="luxury-form-input"
                    type="number"
                    placeholder={editRoomTarget?.order || 'e.g. 1, 2, 100…'}
                    value={editRoomData.order}
                    onChange={(e) => setEditRoomData(p => ({ ...p, order: e.target.value }))}
                    title="Lower number = higher position. 1 = top, large number = bottom."
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1.5px solid rgba(99,102,241,0.18)', borderRadius: 11, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, flexShrink: 0 }}>
                  <path fill="#6366f1" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
                <span style={{ fontSize: 11.5, color: '#4338ca', fontWeight: 600 }}>
                  Changes are saved to Firestore and reflected in real-time.
                  {editRoomData.password ? ' 🔒 Room will be password-protected.' : ' 🌐 Room is open (no password).'}
                </span>
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button className="luxury-btn-secondary" onClick={() => { setShowEditRoom(false); setEditRoomTarget(null); }} disabled={savingRoom}>
                Cancel
              </button>
              <button
                className="luxury-btn-primary"
                style={{ background: editRoomData.name.trim() ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#d1d5db', cursor: editRoomData.name.trim() ? 'pointer' : 'not-allowed' }}
                onClick={confirmEditRoom}
                disabled={savingRoom || !editRoomData.name.trim()}
              >
                {savingRoom ? (
                  <><div className="luxury-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Saving…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
                      <path fill="#ffffff" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Badge Modal */}
      {showBadgeModal && badgeTarget && (
        <div className="luxury-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowBadgeModal(false); setBadgeTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 580, background: '#faf7ff' }}>
            {/* Premium lavender gradient header strip */}
            <div style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 60%,#c084fc 100%)', borderRadius: '18px 18px 0 0', padding: '20px 22px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.32)', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 26, height: 26 }}>
                  <path fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  <circle cx="12" cy="12" r="2.5" fill="#fbbf24"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 0.2 }}>Assign Badge</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 2 }}>
                  Assigning to <strong style={{ color: '#fff' }}>{badgeTarget.displayName}</strong>
                  {badgeTarget.badge && (
                    <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.18)', borderRadius: 6, padding: '1px 7px', fontSize: 10.5, color: '#fff', fontWeight: 600 }}>
                      Current: {Badges[badgeTarget.badge]?.name || badgeTarget.badge}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setShowBadgeModal(false); setBadgeTarget(null); }}
                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              >
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}><path fill="#fff" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>

            <div style={{ padding: '18px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}>
                  <path fill="#7c3aed" d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', letterSpacing: 0.5, textTransform: 'uppercase' }}>Select a Badge</span>
              </div>

              {/* Badge grid — excludes role-reserved badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                {Object.entries(Badges)
                  .filter(([key]) => !['the_olympian', 'titans', 'spartans'].includes(key))
                  .map(([key, badge]) => {
                    const isActive = badgeTarget.badge === key;
                    return (
                      <button
                        key={key}
                        onClick={() => confirmAssignBadge(key)}
                        disabled={assigningBadge}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                          padding: '14px 8px 12px', borderRadius: 16, cursor: assigningBadge ? 'default' : 'pointer',
                          border: isActive ? '2px solid #7c3aed' : '1.5px solid rgba(124,58,237,0.15)',
                          background: isActive
                            ? 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.08))'
                            : 'rgba(255,255,255,0.88)',
                          boxShadow: isActive
                            ? '0 0 0 3px rgba(124,58,237,0.15), 0 4px 12px rgba(124,58,237,0.12)'
                            : '0 2px 6px rgba(124,58,237,0.06)',
                          transition: 'all .18s cubic-bezier(.34,1.56,.64,1)',
                          transform: 'scale(1)',
                          opacity: assigningBadge ? 0.6 : 1,
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          if (!assigningBadge) {
                            e.currentTarget.style.transform = 'scale(1.04) translateY(-2px)';
                            e.currentTarget.style.boxShadow = isActive
                              ? '0 0 0 3px rgba(124,58,237,0.18), 0 8px 20px rgba(124,58,237,0.18)'
                              : '0 6px 18px rgba(124,58,237,0.14)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = isActive
                            ? '0 0 0 3px rgba(124,58,237,0.15), 0 4px 12px rgba(124,58,237,0.12)'
                            : '0 2px 6px rgba(124,58,237,0.06)';
                        }}
                      >
                        {isActive && (
                          <div style={{ position: 'absolute', top: 7, right: 7, width: 16, height: 16, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg viewBox="0 0 24 24" fill="none" style={{ width: 10, height: 10 }}><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                        <div style={{ width: 48, height: 48, flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))' }}
                          dangerouslySetInnerHTML={{ __html: badge.svg.replace(/\{\.\.\.props\}/g, '') }}
                        />
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: isActive ? '#6d28d9' : '#4c1d95', textAlign: 'center', lineHeight: 1.3 }}>{badge.name}</span>
                        {isActive && (
                          <span style={{ fontSize: 9, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', borderRadius: 5, padding: '2px 7px', fontWeight: 700, letterSpacing: 0.3 }}>Active</span>
                        )}
                      </button>
                    );
                })}
              </div>

              {/* Remove badge */}
              {badgeTarget.badge && !['the_olympian','titans','spartans'].includes(badgeTarget.badge) && (
                <button
                  onClick={() => confirmAssignBadge(null)}
                  disabled={assigningBadge}
                  style={{
                    marginTop: 12, width: '100%', padding: '10px 14px', borderRadius: 12,
                    border: '1.5px dashed rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.04)',
                    color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.04)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'; }}
                >
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}><path fill="#7c3aed" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
                  Remove Current Badge
                </button>
              )}
            </div>

            <div className="luxury-modal-footer" style={{ marginTop: 16 }}>
              <button className="luxury-btn-secondary" onClick={() => { setShowBadgeModal(false); setBadgeTarget(null); }} disabled={assigningBadge}>
                Cancel
              </button>
              {assigningBadge && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', fontSize: 13, fontWeight: 600 }}>
                  <div className="luxury-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#7c3aed' }}></div>
                  Assigning…
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && roleTarget && (
        <div className="luxury-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowRoleModal(false); setRoleTarget(null); } }}>
          <div className="luxury-modal-card" style={{ maxWidth: 500, background: '#faf7ff' }}>
            {/* Premium lavender gradient header — same language as badge modal */}
            <div style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 60%,#c084fc 100%)', borderRadius: '18px 18px 0 0', padding: '20px 22px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.32)', boxShadow: '0 2px 8px rgba(124,58,237,0.25)' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 26, height: 26 }}>
                  <path d="M12 2l9 4v6c0 5-4 9-9 10C3 21 3 16 3 12V6l9-4z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M9 12l2 2 4-4" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 0.2 }}>Assign Role</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 2 }}>
                  Assigning to <strong style={{ color: '#fff' }}>{roleTarget.displayName}</strong>
                  <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.18)', borderRadius: 6, padding: '1px 7px', fontSize: 10.5, color: '#fff', fontWeight: 600 }}>
                    Current: {({'owner':'Godfather','superowner':'Godfather','admin':'High Council','moderator':'Guardian'}[roleTarget.role]) || 'Member'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setShowRoleModal(false); setRoleTarget(null); }}
                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              >
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}><path fill="#fff" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
              </button>
            </div>

            <div style={{ padding: '18px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}>
                  <path d="M12 2l9 4v6c0 5-4 9-9 10C3 21 3 16 3 12V6l9-4z" fill="#7c3aed"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', letterSpacing: 0.5, textTransform: 'uppercase' }}>Select New Role</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {ROLE_DEFS.filter(rd => {
                  if (currentUserProfile?.role !== 'owner' && rd.ownerOnly) return false;
                  return true;
                }).map((rd) => {
                  const isCurrent = roleTarget.role === rd.key || (!roleTarget.role && rd.key === 'user');
                  const isLocked = changingRole;
                  return (
                    <button
                      key={rd.key}
                      onClick={() => confirmChangeRole(rd.key)}
                      disabled={isCurrent || isLocked}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '13px 16px', borderRadius: 15, cursor: isCurrent ? 'default' : (isLocked ? 'not-allowed' : 'pointer'),
                        border: isCurrent ? `2px solid ${rd.color}` : '1.5px solid rgba(124,58,237,0.13)',
                        background: isCurrent
                          ? `linear-gradient(135deg,${rd.color}18,${rd.color}09)`
                          : 'rgba(255,255,255,0.9)',
                        boxShadow: isCurrent
                          ? `0 0 0 3px ${rd.color}1a, 0 4px 12px ${rd.color}10`
                          : '0 2px 6px rgba(124,58,237,0.06)',
                        transition: 'all .18s cubic-bezier(.34,1.56,.64,1)',
                        opacity: isLocked && !isCurrent ? 0.5 : 1,
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => {
                        if (!isCurrent && !isLocked) {
                          e.currentTarget.style.background = `linear-gradient(135deg,${rd.color}10,${rd.color}06)`;
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = `0 6px 16px ${rd.color}18`;
                          e.currentTarget.style.borderColor = `${rd.color}40`;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(124,58,237,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(124,58,237,0.13)';
                        }
                      }}
                    >
                      {/* Role icon with gradient background */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 13,
                        background: isCurrent ? rd.gradient : `linear-gradient(135deg,${rd.color}15,${rd.color}08)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all .18s',
                        border: `1.5px solid ${rd.color}25`,
                        boxShadow: isCurrent ? `0 2px 8px ${rd.color}30` : 'none',
                      }}>
                        {React.cloneElement(rd.svg, {
                          style: { width: 24, height: 24 },
                          ...(isCurrent ? { fill: undefined } : {}),
                        })}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: isCurrent ? rd.color : '#1e1b4b', letterSpacing: 0.1 }}>{rd.label}</div>
                        <div style={{ fontSize: 11, color: '#7c6b9e', marginTop: 2, lineHeight: 1.4 }}>{rd.desc}</div>
                      </div>
                      {isCurrent ? (
                        <span style={{ fontSize: 9.5, background: rd.gradient, color: '#fff', borderRadius: 6, padding: '3px 9px', fontWeight: 700, flexShrink: 0, letterSpacing: 0.2 }}>Current</span>
                      ) : (
                        !isLocked && (
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                            <path d="M9 18l6-6-6-6" stroke={rd.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )
                      )}
                    </button>
                  );
                })}
              </div>

              {currentUserProfile?.role !== 'owner' && (
                <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 11, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ fontSize: 11, color: '#5b21b6', fontWeight: 500 }}>High Council role assignment requires Owner access.</span>
                </div>
              )}
            </div>

            <div className="luxury-modal-footer" style={{ marginTop: 16 }}>
              <button className="luxury-btn-secondary" onClick={() => { setShowRoleModal(false); setRoleTarget(null); }} disabled={changingRole}>Cancel</button>
              {changingRole && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', fontSize: 13, fontWeight: 600 }}>
                  <div className="luxury-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#7c3aed' }}></div>
                  Changing role…
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal (Owner only) */}
      {showChangeEmailModal && changeEmailTarget && (
        <div className="luxury-modal-overlay" onClick={() => { setShowChangeEmailModal(false); setChangeEmailTarget(null); setChangeEmailValue(''); }}>
          <div className="luxury-modal" style={{ maxWidth: 460, background: '#fff', borderRadius: 20, boxShadow: '0 24px 64px rgba(5,150,105,0.18), 0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Gradient header strip */}
            <div style={{ background: 'linear-gradient(135deg,#059669 0%,#34d399 60%,#6ee7b7 100%)', padding: '22px 24px 18px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.35)' }}>
                  <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                    <defs>
                      <linearGradient id="em-icon-g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff"/>
                        <stop offset="100%" stopColor="#d1fae5"/>
                      </linearGradient>
                    </defs>
                    <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="url(#em-icon-g)" strokeWidth="1.8"/>
                    <path d="M2 7.5L12 13.5L22 7.5" stroke="url(#em-icon-g)" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="18.5" cy="16.5" r="3.5" fill="white" opacity="0.25"/>
                    <path d="M17.2 16.5l1 1 2-2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, color: '#fff', fontWeight: 800, letterSpacing: '-0.3px' }}>Change Email</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
                    Updating: <strong style={{ color: '#fff' }}>{changeEmailTarget.displayName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowChangeEmailModal(false); setChangeEmailTarget(null); setChangeEmailValue(''); }}
                style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                  <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div style={{ padding: '22px 24px 24px' }}>
              {/* Info card */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'linear-gradient(135deg,rgba(5,150,105,0.06),rgba(52,211,153,0.04))', border: '1px solid rgba(5,150,105,0.18)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="9" fill="rgba(5,150,105,0.12)" stroke="#059669" strokeWidth="1.5"/>
                  <path d="M12 8v4M12 16h.01" stroke="#059669" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <p style={{ margin: 0, fontSize: 12.5, color: '#065f46', lineHeight: 1.6 }}>
                  Updates the profile email in Firestore. Firebase Auth login email stays unchanged.
                </p>
              </div>

              {/* Input with icon */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="#059669" strokeWidth="1.6"/>
                    <path d="M2 8l10 6 10-6" stroke="#059669" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  type="email"
                  value={changeEmailValue}
                  onChange={e => setChangeEmailValue(e.target.value)}
                  placeholder="Enter new email address"
                  style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12, border: '1.8px solid #d1fae5', fontSize: 13.5, color: '#1e1b4b', outline: 'none', boxSizing: 'border-box', fontWeight: 500, background: '#f0fdf9', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#059669'}
                  onBlur={e => e.target.style.borderColor = '#d1fae5'}
                  onKeyDown={e => e.key === 'Enter' && handleChangeEmail()}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowChangeEmailModal(false); setChangeEmailTarget(null); setChangeEmailValue(''); }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.background='#f3f4f6'; e.currentTarget.style.borderColor='#d1d5db'; }}
                  onMouseOut={e => { e.currentTarget.style.background='#f9fafb'; e.currentTarget.style.borderColor='#e5e7eb'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeEmail}
                  disabled={changeEmailLoading || !changeEmailValue.trim()}
                  style={{ flex: 2, padding: '11px 0', borderRadius: 11, border: 'none', background: changeEmailLoading || !changeEmailValue.trim() ? 'linear-gradient(135deg,#6ee7b7,#a7f3d0)' : 'linear-gradient(135deg,#059669,#34d399)', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: changeEmailLoading || !changeEmailValue.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'opacity 0.2s', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}
                >
                  {changeEmailLoading ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" width="15" height="15" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"/>
                        <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                        <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Update Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Username Modal (Owner only, no time-limit) */}
      {showChangeUsernameModal && changeUsernameTarget && (
        <div className="luxury-modal-overlay" onClick={() => { setShowChangeUsernameModal(false); setChangeUsernameTarget(null); setChangeUsernameValue(''); }}>
          <div className="luxury-modal" style={{ maxWidth: 460, background: '#fff', borderRadius: 20, boxShadow: '0 24px 64px rgba(124,58,237,0.18), 0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Gradient header strip */}
            <div style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#a78bfa 60%,#c4b5fd 100%)', padding: '22px 24px 18px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.35)' }}>
                  <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                    <defs>
                      <linearGradient id="un-icon-g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff"/>
                        <stop offset="100%" stopColor="#ede9fe"/>
                      </linearGradient>
                    </defs>
                    <circle cx="9" cy="7" r="4" fill="none" stroke="url(#un-icon-g)" strokeWidth="1.8"/>
                    <path d="M2 21c0-4 3.13-7 7-7h4" stroke="url(#un-icon-g)" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M16.5 12l1.2 1.2L21 10" stroke="url(#un-icon-g)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 15l5-5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, color: '#fff', fontWeight: 800, letterSpacing: '-0.3px' }}>Change Username</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
                    Updating: <strong style={{ color: '#fff' }}>{changeUsernameTarget.displayName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowChangeUsernameModal(false); setChangeUsernameTarget(null); setChangeUsernameValue(''); }}
                style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                  <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div style={{ padding: '22px 24px 24px' }}>
              {/* Info card */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(167,139,250,0.04))', border: '1px solid rgba(124,58,237,0.16)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="rgba(124,58,237,0.12)" stroke="#7c3aed" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
                <p style={{ margin: 0, fontSize: 12.5, color: '#4c1d95', lineHeight: 1.6 }}>
                  Owner override — no cooldown applies. Old username is freed immediately and becomes reassignable.
                </p>
              </div>

              {/* Input with icon */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <circle cx="9" cy="7" r="4" fill="none" stroke="#7c3aed" strokeWidth="1.6"/>
                    <path d="M2 21c0-3.87 3.13-7 7-7" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M16 12l2 2 4-4" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={changeUsernameValue}
                  onChange={e => setChangeUsernameValue(e.target.value)}
                  placeholder="Enter new username (3–30 chars)"
                  maxLength={30}
                  style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12, border: '1.8px solid #ede9fe', fontSize: 13.5, color: '#1e1b4b', outline: 'none', boxSizing: 'border-box', fontWeight: 500, background: '#faf5ff', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'}
                  onBlur={e => e.target.style.borderColor = '#ede9fe'}
                  onKeyDown={e => e.key === 'Enter' && handleChangeUsername()}
                />
                {changeUsernameValue && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: changeUsernameValue.length < 3 ? '#ef4444' : '#7c3aed', fontWeight: 600 }}>
                    {changeUsernameValue.length}/30
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowChangeUsernameModal(false); setChangeUsernameTarget(null); setChangeUsernameValue(''); }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.background='#f3f4f6'; e.currentTarget.style.borderColor='#d1d5db'; }}
                  onMouseOut={e => { e.currentTarget.style.background='#f9fafb'; e.currentTarget.style.borderColor='#e5e7eb'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeUsername}
                  disabled={changeUsernameLoading || !changeUsernameValue.trim() || changeUsernameValue.trim().length < 3}
                  style={{ flex: 2, padding: '11px 0', borderRadius: 11, border: 'none', background: changeUsernameLoading || changeUsernameValue.trim().length < 3 ? 'linear-gradient(135deg,#c4b5fd,#ddd6fe)' : 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: changeUsernameLoading || changeUsernameValue.trim().length < 3 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(124,58,237,0.3)', transition: 'all 0.2s' }}
                >
                  {changeUsernameLoading ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" width="15" height="15" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"/>
                        <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                        <path d="M12 20h9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Update Username
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      <AdminBanKickModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedUser(null);
          setActionType('');
        }}
        selectedUser={selectedUser}
        actionType={actionType}
        onConfirm={handleConfirmAction}
        currentUserProfile={currentUserProfile}
      />

      {/* ToastContainer removed — using global premium container from App.jsx */}
    </>
  );
};

export default AdminPanelPage;
