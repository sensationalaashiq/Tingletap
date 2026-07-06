
import React, { useState, useEffect, useMemo } from 'react';
import { getDefaultAvatarUrl, getRoleDisplayLabel } from '../utils/roleUtils';
import { useNavigate } from 'react-router-dom';
import { auth, db, rtdb } from '../firebase/config';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, addDoc, serverTimestamp, getDocs, getDoc, limit, Timestamp, orderBy, where } from 'firebase/firestore';
import { ref, onValue, remove } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ToastContainer } from 'react-toastify';
import AdminBanKickModal from '../components/AdminBanKickModal';
import { IPBanSystem } from '../utils/ipBanSystem';
import { pt } from '../utils/premiumToast';
import './AdminPanelPage.css';
import './BanKickMutePanel.css';

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

const USERS_PER_PAGE = 20;

const BanKickMutePanel = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isRoleReady, setIsRoleReady] = useState(false);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [currentRoomId, setCurrentRoomId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | registered | guest
  const [filterStatus, setFilterStatus] = useState('all'); // all | online | offline | banned | muted | kicked
  const [userPage, setUserPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [actionType, setActionType] = useState('');

  // Multi-tab state
  const [activeTab, setActiveTab] = useState('users');
  const [reports, setReports] = useState([]);
  const [violations, setViolations] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [reportSubTab, setReportSubTab] = useState('all');
  const [violationsFilter, setViolationsFilter] = useState('all');
  const [violationsShowResolved, setViolationsShowResolved] = useState(false);
  const [reportActionLoading, setReportActionLoading] = useState({});

  // Access control: Owner + Admin only
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        const role = userData.role === 'superowner' ? 'owner' : userData.role;
        setCurrentUserProfile({ ...userData, role, uid: user.uid });
        if (!['owner', 'admin'].includes(role)) {
          pt.error('Access denied. Owner/Admin privileges required.');
          navigate('/');
        } else {
          setIsRoleReady(true);
        }
      } else {
        navigate('/');
      }
    });
    return () => unsub();
  }, [user, navigate]);

  // Single lightweight users listener (reused pattern from AdminPanelPage — capped, no duplicate collections)
  useEffect(() => {
    if (!isRoleReady) return;
    const usersQuery = query(collection(db, 'users'), limit(150));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs
        .map(d => ({ id: d.id, uid: d.id, ...d.data() }))
        .filter(u => (u.role || '').toLowerCase() !== 'owner' && (u.role || '').toLowerCase() !== 'superowner');
      setUsers(usersData);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [isRoleReady]);

  // Reuse RTDB presence tree exactly as elsewhere in the app
  useEffect(() => {
    if (!isRoleReady) return;
    const statusRef = ref(rtdb, 'status');
    const unsub = onValue(statusRef, (snap) => {
      setOnlineStatuses(snap.val() || {});
    });
    return () => unsub();
  }, [isRoleReady]);

  useEffect(() => {
    if (!user) return;
    const myStatusRef = ref(rtdb, `status/${user.uid}/currentRoomId`);
    const unsub = onValue(myStatusRef, (snap) => setCurrentRoomId(snap.val() || null));
    return () => unsub();
  }, [user]);

  // Reports listener (loads when on reports/appeals tabs)
  useEffect(() => {
    if (!isRoleReady) return;
    setReportsLoading(true);
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(150));
    const unsub = onSnapshot(q, snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setReportsLoading(false);
    }, () => setReportsLoading(false));
    return () => unsub();
  }, [isRoleReady]);

  // Live violations listener
  useEffect(() => {
    if (!isRoleReady) return;
    setViolationsLoading(true);
    const q = query(collection(db, 'modLogs'), orderBy('timestamp', 'desc'), limit(200));
    const unsub = onSnapshot(q, snap => {
      setViolations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setViolationsLoading(false);
    }, () => setViolationsLoading(false));
    return () => unsub();
  }, [isRoleReady]);

  const handleModerateUser = (u, action) => {
    setSelectedUser(u);
    setActionType(action);
    setIsModalVisible(true);
  };

  const handleConfirmAction = async (actionData, resolvedAction) => {
    if (!selectedUser) return;
    const effectiveAction = resolvedAction || actionData._resolvedAction || actionType;
    const updateSelectedUser = (patch) => setSelectedUser(prev => prev ? { ...prev, ...patch } : prev);

    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      const adminName = currentUserProfile?.displayName || 'Admin';

      switch (effectiveAction) {
        case 'ban': {
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
              { reason: actionData.reason || 'Banned by administrator', bannedBy: adminName, userAgent: navigator.userAgent, location: 'Mod Panel', country: selectedUser.country || 'Unknown' }
            );
            if (ipBanResults?.ipBanned && ipBanResults?.bannedIP) {
              pt.info(`IP ${ipBanResults.bannedIP} also banned.`);
            }
          } catch (ipError) {
            pt.warn(`Account banned — IP ban failed: ${ipError.message}`);
          }
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
            if (unbannedIPs?.length > 0) pt.info(`IP(s) ${unbannedIPs.join(', ')} also unbanned.`);
          } catch (ipError) {
            pt.warn(`Account unbanned — IP unban failed: ${ipError.message}`);
          }
          updateSelectedUser({ isBanned: false, banInfo: null });
          break;
        }

        case 'mute': {
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
          const kickUntil = actionData?.expiresAt || null;
          const kickEntry = {
            uid: selectedUser.uid,
            displayName: selectedUser.displayName,
            reason: kickReason,
            kickedBy: adminName,
            kickedAt: serverTimestamp(),
            duration: kickDur,
            kickDuration: kickDur,
            kickUntil,
            kickUntilTs: kickUntil ? Timestamp.fromDate(new Date(kickUntil)) : null,
          };

          if (actionData?.kickScope === 'multiple_rooms' && actionData?.selectedRooms?.length > 0) {
            for (const rid of actionData.selectedRooms) {
              const rSnap = await getDoc(doc(db, 'rooms', rid)).catch(() => null);
              const rName = rSnap?.data()?.name || rid;
              await setDoc(doc(db, 'rooms', rid, 'kickedUsers', selectedUser.uid), { ...kickEntry, roomId: rid, roomName: rName });
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
            const firstRid = actionData.selectedRooms[0];
            updateSelectedUser({ kickedFrom: { roomId: firstRid, kickedAt: new Date().toISOString(), kickedBy: adminName, reason: kickReason } });
          } else {
            const kickRoomId = onlineStatuses[selectedUser.uid]?.currentRoomId || currentRoomId || selectedUser.kickedFrom?.roomId;
            if (kickRoomId) {
              const kickRoomSnap = await getDoc(doc(db, 'rooms', kickRoomId)).catch(() => null);
              const kickRoomName = kickRoomSnap?.data()?.name || kickRoomId;
              await setDoc(doc(db, 'rooms', kickRoomId, 'kickedUsers', selectedUser.uid), { ...kickEntry, roomId: kickRoomId, roomName: kickRoomName });
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
            const allRoomsSnap = await getDocs(query(collection(db, 'rooms'), limit(1000))).catch(() => null);
            if (allRoomsSnap) {
              const tasks = allRoomsSnap.docs.map(rd => deleteDoc(doc(db, 'rooms', rd.id, 'kickedUsers', selectedUser.uid)).catch(() => {}));
              await Promise.all(tasks);
            }
          } else {
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
      throw error;
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchTerm ||
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' ||
        (filterType === 'registered' && !u.isGuest) ||
        (filterType === 'guest' && u.isGuest);

      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'online' && onlineStatuses[u.uid]?.state === 'online') ||
        (filterStatus === 'offline' && onlineStatuses[u.uid]?.state !== 'online') ||
        (filterStatus === 'banned' && u.isBanned) ||
        (filterStatus === 'muted' && u.mutedInfo?.isMuted) ||
        (filterStatus === 'kicked' && !!u.kickedFrom?.roomId);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [users, searchTerm, filterType, filterStatus, onlineStatuses]);

  const stats = useMemo(() => ({
    total: users.length,
    online: users.filter(u => onlineStatuses[u.uid]?.state === 'online').length,
    banned: users.filter(u => u.isBanned).length,
    muted: users.filter(u => u.mutedInfo?.isMuted).length,
  }), [users, onlineStatuses]);

  if (!isRoleReady) {
    return (
      <div className="luxury-admin-container">
        <div className="luxury-loading-state" style={{ minHeight: '100vh' }}>
          <div className="luxury-loading-spinner"></div>
          <span>Verifying access...</span>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));

  return (
    <div className="luxury-admin-container mkm-panel">
      <header className="luxury-admin-header">
        <div className="luxury-header-content">
          <div className="luxury-brand" onClick={() => navigate('/')}>
            <div className="luxury-logo">
              <img src="/tingletap-logo.jpg" alt="TingleTap" />
            </div>
            <div className="luxury-brand-text">
              <span className="luxury-brand-name">TingleTap</span>
              <span className="luxury-brand-subtitle">Ban / Kick / Mute Panel</span>
            </div>
          </div>

          <div className="luxury-admin-info">
            <div className="luxury-admin-badge">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="#ffffff" />
                <path d="M4 20v-1a8 8 0 0 1 16 0v1" fill="#ffffff" />
              </svg>
              {getRoleDisplayLabel({ role: currentUserProfile?.role }).toUpperCase()}
            </div>
            <div className="luxury-admin-profile">
              <span className="luxury-admin-name">{currentUserProfile?.displayName}</span>
              <span className="luxury-admin-email">{currentUserProfile?.email}</span>
            </div>
            <button className="luxury-btn-secondary" onClick={() => navigate('/')}>
              <svg viewBox="0 0 24 24" fill="none">
                <path fill="#7c3aed" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
              Exit Panel
            </button>
          </div>
        </div>
      </header>

      <div className="luxury-stats-section">
        <div className="luxury-stats-grid mkm-stats-grid">
          <div className="luxury-stat-card primary">
            <div className="luxury-stat-content">
              <div className="luxury-stat-number">{stats.total}</div>
              <div className="luxury-stat-label">Total Users</div>
            </div>
          </div>
          <div className="luxury-stat-card success">
            <div className="luxury-stat-content">
              <div className="luxury-stat-number">{stats.online}</div>
              <div className="luxury-stat-label">Online Now</div>
            </div>
          </div>
          <div className="luxury-stat-card warning">
            <div className="luxury-stat-content">
              <div className="luxury-stat-number">{stats.muted}</div>
              <div className="luxury-stat-label">Muted Users</div>
            </div>
          </div>
          <div className="luxury-stat-card danger">
            <div className="luxury-stat-content">
              <div className="luxury-stat-number">{stats.banned}</div>
              <div className="luxury-stat-label">Banned Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid rgba(99,102,241,0.13)',padding:'0 24px',background:'#fff',overflowX:'auto'}}>
        {[
          { id:'users', label:'Users', color:'#3b82f6', icon:'M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z', badge: null },
          { id:'reports', label:'Reports', color:'#f59e0b', icon:'M11,4.5H13V15.5H11V4.5M13,17.5V19.5H11V17.5H13M2,22H22L12,2L2,22Z', badge: reports.filter(r=>r.status==='pending').length },
          { id:'appeals', label:'Ban Appeals', color:'#10b981', icon:'M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z', badge: reports.filter(r=>r.status==='appeal'||r.status==='appeal_pending').length },
          { id:'violations', label:'Live Violations', color:'#ef4444', icon:'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7V13H13V7H11M11,15V17H13V15H11Z', badge: violations.filter(v=>!v.resolved).length },
        ].map(tab => {
          const isAct = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'11px 16px',
              border:'none', background:'transparent', cursor:'pointer', whiteSpace:'nowrap',
              borderBottom: isAct ? `2.5px solid ${tab.color}` : '2.5px solid transparent',
              color: isAct ? tab.color : '#6b7280',
              fontWeight: isAct ? 800 : 600, fontSize:13,
              transition:'all 0.15s', marginBottom:'-2px',
            }}>
              <svg viewBox="0 0 24 24" fill="none" style={{width:15,height:15,flexShrink:0}}>
                <path fill={isAct ? tab.color : '#9ca3af'} d={tab.icon}/>
              </svg>
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  background: isAct ? tab.color : '#e5e7eb', color: isAct ? '#fff' : '#374151',
                  borderRadius:10, fontSize:10, fontWeight:800, padding:'1px 6px', minWidth:18, textAlign:'center'
                }}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
      <div className="luxury-users-section">
        <div className="luxury-section-header">
          <h2>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 27, height: 27, flexShrink: 0 }}>
              <circle cx="9" cy="7" r="4" fill="#3b82f6" />
              <path d="M2 21v-1a7 7 0 0 1 14 0v1" fill="#3b82f6" />
            </svg>
            Moderation Controls
          </h2>
          <p>Search, ban, kick, or mute any registered or guest user</p>
        </div>

        <div className="luxury-controls-section">
          <div className="luxury-search-bar">
            <div className="luxury-search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setUserPage(1); }}
                className="luxury-search-input"
              />
            </div>
          </div>

          <div className="luxury-filters">
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setUserPage(1); }} className="luxury-filter-select">
              <option value="all">All Types</option>
              <option value="registered">Registered</option>
              <option value="guest">Guest (Purush/Stree/Navrang)</option>
            </select>

            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setUserPage(1); }} className="luxury-filter-select">
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="banned">Banned</option>
              <option value="muted">Muted</option>
              <option value="kicked">Kicked</option>
            </select>
          </div>
        </div>

        <div className="luxury-users-table-container">
          {loading ? (
            <div className="luxury-loading-state">
              <div className="luxury-loading-spinner"></div>
              <span>Loading user data...</span>
            </div>
          ) : (
            <div className="luxury-users-table mkm-table">
              <div className="luxury-table-header mkm-table-header">
                <div className="luxury-th">User</div>
                <div className="luxury-th">Type & Status</div>
                <div className="luxury-th">Last Seen · Location</div>
                <div className="luxury-th">Moderation</div>
                <div className="luxury-th">Actions</div>
              </div>

              <div className="luxury-table-body">
                {filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE).map(u => {
                  const isOnline = onlineStatuses[u.uid]?.state === 'online';
                  const currentRoom = onlineStatuses[u.uid]?.currentRoomId;
                  const typeLabel = getRoleDisplayLabel({ role: u.role, gender: u.gender, isGuest: u.isGuest, badge: u.badge });

                  return (
                    <div key={u.uid} className="luxury-table-row mkm-row">
                      <div className="luxury-td user-profile-cell">
                        <div className="luxury-user-avatar-wrapper">
                          <img
                            src={u.photoURL || getDefaultAvatarUrl(u.uid, u.gender)}
                            alt={u.displayName}
                            className="luxury-user-avatar"
                            onError={(e) => { e.target.onerror = null; e.target.src = getDefaultAvatarUrl(u.uid, u.gender); }}
                          />
                          <div className={`luxury-user-status-indicator ${isOnline ? 'online' : 'offline'}`}></div>
                        </div>
                        <div className="luxury-user-details">
                          <div className="luxury-user-name">{u.displayName || 'Anonymous'}</div>
                          <div className="luxury-user-email">{u.email || (u.isGuest ? 'Guest account' : '')}</div>
                          <div className="luxury-user-id">ID: {u.uid.substring(0, 8)}...</div>
                        </div>
                      </div>

                      <div className="luxury-td status-role-cell">
                        <div className="luxury-status-section">
                          <div className={`luxury-status-badge ${isOnline ? 'online' : 'offline'}`}>
                            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                            {isOnline ? 'Online' : 'Offline'}
                          </div>
                          {currentRoom && (
                            <div className="luxury-current-room">
                              <svg viewBox="0 0 24 24" fill="none">
                                <path fill="#7c3aed" d="M20,2H4C2.9,2 2,2.9 2,4V16C2,17.1 2.9,18 4,18H8L12,22L16,18H20C21.1,18 22,17.1 22,16V4C22,2.9 21.1,2 20,2M20,16H15.17L12,19.17L8.83,16H4V4H20V16Z" />
                              </svg>
                              {currentRoom}
                            </div>
                          )}
                        </div>
                        <div className="luxury-role-section">
                          <span className={`luxury-role-badge role-${u.isGuest ? 'user' : (u.role === 'superowner' ? 'owner' : (u.role || 'user'))}`}>
                            {typeLabel.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Last Seen + Location cell */}
                      <div className="luxury-td" style={{fontSize:11,color:'#4b5563'}}>
                        {(() => {
                          const st = onlineStatuses[u.uid];
                          const lastChanged = st?.last_changed;
                          const country = st?.country || u.country || u.lastCountry || '';
                          let lastSeenStr = '—';
                          if (isOnline) {
                            lastSeenStr = '🟢 Now';
                          } else if (lastChanged) {
                            const diff = Date.now() - lastChanged;
                            const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
                            if (m < 2) lastSeenStr = 'Just now';
                            else if (m < 60) lastSeenStr = `${m}m ago`;
                            else if (h < 24) lastSeenStr = `${h}h ago`;
                            else if (d < 7) lastSeenStr = `${d}d ago`;
                            else lastSeenStr = new Date(lastChanged).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
                          }
                          return (
                            <div style={{display:'flex',flexDirection:'column',gap:3}}>
                              <div style={{display:'flex',alignItems:'center',gap:4}}>
                                <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11,flexShrink:0}}><path fill="#9ca3af" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
                                <span style={{fontWeight:700,color:isOnline?'#059669':'#374151'}}>{lastSeenStr}</span>
                              </div>
                              {country && country !== 'Unknown' && (
                                <div style={{display:'flex',alignItems:'center',gap:4}}>
                                  <svg viewBox="0 0 24 24" fill="none" style={{width:11,height:11,flexShrink:0}}><path fill="#9ca3af" d="M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0,9.5c-1.38,0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5,1.12 2.5,2.5-1.12,2.5-2.5,2.5z"/></svg>
                                  <span style={{color:'#6b7280'}}>{country}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="luxury-td">
                        <div className="luxury-moderation-status">
                          {u.isBanned && (
                            <span className="luxury-banned-badge" title={u.banInfo?.reason || ''}>
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" />
                              </svg>
                              BANNED
                            </span>
                          )}
                          {u.mutedInfo?.isMuted && (
                            <span className="luxury-muted-badge" title={u.mutedInfo?.reason || ''}>
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19M16.5,12C16.78,12 17,12.22 17,12.5V13.5C17,13.78 16.78,14 16.5,14H15.5C15.22,14 15,13.78 15,13.5V12.5C15,12.22 15.22,12 15.5,12H16.5Z" />
                              </svg>
                              MUTED
                            </span>
                          )}
                          {u.kickedFrom?.roomId && (
                            <span className="luxury-banned-badge" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }} title={u.kickedFrom?.reason || ''}>
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
                              </svg>
                              KICKED
                            </span>
                          )}
                          {!u.isBanned && !u.mutedInfo?.isMuted && !u.kickedFrom?.roomId && (
                            <span className="mkm-clean-badge">Clean</span>
                          )}
                        </div>
                      </div>

                      <div className="luxury-td actions-cell">
                        <div className="luxury-action-buttons">
                          {!u.isBanned ? (
                            <button className="luxury-action-btn ban-btn" onClick={() => handleModerateUser(u, 'ban')} title="Ban User">
                              <svg viewBox="0 0 24 24" fill="none"><path fill="#ffffff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.57,15.55 5.53,16.97L16.97,5.53C15.55,4.57 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.43,8.45 18.47,7.03L7.03,18.47C8.45,19.43 10.15,20 12,20Z" /></svg>
                              <span>Ban</span>
                            </button>
                          ) : (
                            <button className="luxury-action-btn unban-btn" onClick={() => handleModerateUser(u, 'unban')} title="Unban User">
                              <svg viewBox="0 0 24 24" fill="none"><path fill="#ffffff" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z" /></svg>
                              <span>Unban</span>
                            </button>
                          )}

                          {!u.mutedInfo?.isMuted ? (
                            <button className="luxury-action-btn mute-btn" onClick={() => handleModerateUser(u, 'mute')} title="Mute User">
                              <svg viewBox="0 0 24 24" fill="none"><path fill="#ffffff" d="M19,11C19,12.19 18.66,13.3 18.1,14.28L16.87,13.05C17.14,12.43 17.28,11.73 17.28,11H19M15,11.16L9,5.18V5A3,3 0 0,1 12,2A3,3 0 0,1 15,5L15,11.16M4.27,3L21,19.73L19.73,21L15.54,16.81C14.77,17.27 13.91,17.58 13,17.72V21H11V17.72C7.72,17.23 5,14.41 5,11H6.73C6.73,14 9.43,16.1 12,16.1C12.62,16.1 13.22,15.97 13.77,15.74L11.91,13.88C11.94,13.88 11.97,14 12,14A3,3 0 0,1 9,11V10.27L4.27,5.54L3,4.27L4.27,3Z" /></svg>
                              <span>Mute</span>
                            </button>
                          ) : (
                            <button className="luxury-action-btn unmute-btn" onClick={() => handleModerateUser(u, 'unmute')} title="Unmute User">
                              <svg viewBox="0 0 24 24" fill="none"><path fill="#ffffff" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" /></svg>
                              <span>Unmute</span>
                            </button>
                          )}

                          {u.kickedFrom?.roomId ? (
                            <button className="luxury-action-btn" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }} onClick={() => handleModerateUser(u, 'unkick')} title="Unkick User">
                              <svg viewBox="0 0 24 24" fill="none"><path fill="#ffffff" d="M16,13V10L11,15L16,20V17H22V13H16M14,2A2,2 0 0,0 12,4V6H14V4H5V20H14V18H12A2,2 0 0,1 10,16H5A2,2 0 0,1 3,14V4A2,2 0 0,1 5,2H14Z" /></svg>
                              <span>Unkick</span>
                            </button>
                          ) : (
                            <button className="luxury-action-btn kick-btn" onClick={() => handleModerateUser(u, 'kick')} title="Kick from Room">
                              <svg viewBox="0 0 24 24" fill="none"><path fill="#ffffff" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" /></svg>
                              <span>Kick</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="mkm-empty-state">No users match the current search/filters.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mkm-pagination">
            <button disabled={userPage <= 1} onClick={() => setUserPage(p => Math.max(1, p - 1))} className="luxury-btn-secondary">Previous</button>
            <span>Page {userPage} of {totalPages}</span>
            <button disabled={userPage >= totalPages} onClick={() => setUserPage(p => Math.min(totalPages, p + 1))} className="luxury-btn-secondary">Next</button>
          </div>
        )}
      </div>
      )} {/* end activeTab === 'users' */}

      {/* ── Reports & Ban Appeals Tab ── */}
      {(activeTab === 'reports' || activeTab === 'appeals') && (
        <div style={{padding:'20px 24px 40px'}}>
          <div className="luxury-section-header">
            <h2 style={{display:'flex',alignItems:'center',gap:10}}>
              <svg viewBox="0 0 24 24" fill="none" style={{width:28,height:28,flexShrink:0}}>
                <path fill={activeTab==='appeals'?'#10b981':'#f59e0b'} d="M11,4.5H13V15.5H11V4.5M13,17.5V19.5H11V17.5H13M2,22H22L12,2L2,22Z"/>
              </svg>
              {activeTab==='appeals' ? 'Ban Appeals' : 'Reports'}
            </h2>
            <p>User-submitted reports, flagged messages, and ban appeal requests</p>
          </div>

          {/* Sub-tabs */}
          <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
            {[
              {id:'all',label:'All',color:'#6366f1'},
              {id:'users',label:'User Reports',color:'#ef4444'},
              {id:'messages',label:'Message Reports',color:'#3b82f6'},
              {id:'appeals',label:'Ban Appeals',color:'#10b981'},
              {id:'pending',label:`Pending (${reports.filter(r=>r.status==='pending').length})`,color:'#f59e0b'},
            ].map(st => {
              const def = activeTab==='appeals' ? 'appeals' : 'all';
              const cur = reportSubTab || def;
              const isAct = cur===st.id;
              return (
                <button key={st.id} onClick={()=>setReportSubTab(st.id)} style={{
                  padding:'5px 12px',borderRadius:20,border:`1.5px solid ${isAct?st.color:'rgba(0,0,0,0.1)'}`,
                  background:isAct?st.color:'#fff',color:isAct?'#fff':'#374151',
                  fontSize:12,fontWeight:700,cursor:'pointer'
                }}>{st.label}</button>
              );
            })}
          </div>

          {reportsLoading ? (
            <div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}>Loading reports…</div>
          ) : (() => {
            const cur = reportSubTab || (activeTab==='appeals'?'appeals':'all');
            const filtered = reports.filter(r => {
              if (cur==='users') return r.reportType==='User';
              if (cur==='messages') return r.reportType==='Message'||!r.reportType;
              if (cur==='appeals') return r.status==='appeal'||r.status==='appeal_pending';
              if (cur==='pending') return r.status==='pending';
              return true;
            });
            const statusColors = {pending:'#f59e0b',resolved:'#10b981',dismissed:'#9ca3af',action_taken:'#6366f1',appeal_accepted:'#059669',appeal_rejected:'#ef4444',appeal_pending:'#f97316'};
            const fmtTime = (ts) => {
              if (!ts) return '—';
              const d = ts?.toDate ? ts.toDate() : new Date(ts);
              if (isNaN(d.getTime())) return '—';
              const diff = Date.now()-d.getTime();
              const m=Math.floor(diff/60000),h=Math.floor(diff/3600000),dy=Math.floor(diff/86400000);
              if(m<2)return 'Just now'; if(m<60)return `${m}m ago`; if(h<24)return `${h}h ago`; if(dy<7)return `${dy}d ago`;
              return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
            };
            if (filtered.length===0) return (
              <div style={{textAlign:'center',padding:'48px',background:'#f8fafc',borderRadius:16,border:'2px dashed #e2e8f0',color:'#9ca3af'}}>
                <p style={{margin:0,fontSize:14,fontWeight:700}}>No reports in this category</p>
              </div>
            );
            return (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {filtered.map(r => {
                  const sc = statusColors[r.status]||'#9ca3af';
                  const isAppeal = r.status==='appeal'||r.status==='appeal_pending';
                  return (
                    <div key={r.id} style={{background:'#fff',borderRadius:14,border:`1.5px solid ${r.status==='pending'?'#fde68a':'#e5e7eb'}`,padding:'14px 16px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:8}}>
                        <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:800,background:sc+'22',color:sc,border:`1px solid ${sc}44`}}>
                          {r.status?.replace(/_/g,' ')||'pending'}
                        </span>
                        <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:'#f3f4f6',color:'#374151'}}>
                          {r.reportType||'Message'}
                        </span>
                        {r.category && <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:'rgba(99,102,241,0.08)',color:'#6366f1'}}>{r.category}</span>}
                        <span style={{fontSize:11,color:'#9ca3af',marginLeft:'auto'}}>{fmtTime(r.timestamp)}</span>
                      </div>
                      {r.reason && <p style={{margin:'0 0 6px',fontSize:13,color:'#374151',lineHeight:1.5}}>"{r.reason}"</p>}
                      <div style={{display:'flex',gap:16,fontSize:11,color:'#6b7280',flexWrap:'wrap'}}>
                        {r.reportedByName && <span>By: <strong>{r.reportedByName}</strong></span>}
                        {r.reportedUserName && <span>Against: <strong style={{color:'#ef4444'}}>{r.reportedUserName}</strong></span>}
                        {r.roomId && <span>Room: <strong>{r.roomId}</strong></span>}
                      </div>
                      {isAppeal && r.appealMessage && (
                        <div style={{marginTop:8,padding:'8px 10px',background:'rgba(16,185,129,0.06)',borderRadius:8,border:'1px solid rgba(16,185,129,0.2)'}}>
                          <span style={{fontSize:11,fontWeight:700,color:'#059669'}}>Appeal: </span>
                          <span style={{fontSize:12,color:'#374151'}}>{r.appealMessage}</span>
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

      {/* ── Live Violations Tab ── */}
      {activeTab === 'violations' && (
        <div style={{padding:'20px 24px 40px'}}>
          <div className="luxury-section-header">
            <h2 style={{display:'flex',alignItems:'center',gap:10}}>
              <svg viewBox="0 0 24 24" fill="none" style={{width:28,height:28,flexShrink:0}}>
                <path fill="#ef4444" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7V13H13V7H11M11,15V17H13V15H11Z"/>
              </svg>
              Live Violations Feed
            </h2>
            <p>TingleBot AutoMod log — user, fault, and action taken</p>
          </div>

          {/* Filter + toggle */}
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
            <select value={violationsFilter} onChange={e=>setViolationsFilter(e.target.value)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid rgba(0,0,0,0.1)',fontSize:12,background:'#fff',cursor:'pointer'}}>
              <option value="all">All Types</option>
              <option value="SPAM">Spam</option>
              <option value="PROFANITY">Profanity</option>
              <option value="THREAT">Threat</option>
              <option value="EXCESSIVE_CAPS">Caps Abuse</option>
              <option value="EMOJI_SPAM">Emoji Spam</option>
            </select>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#6b7280',cursor:'pointer'}}>
              <input type="checkbox" checked={violationsShowResolved} onChange={e=>setViolationsShowResolved(e.target.checked)}/>
              Show Resolved
            </label>
            <span style={{marginLeft:'auto',fontSize:12,color:'#9ca3af'}}>{violations.filter(v=>!v.resolved).length} unresolved</span>
          </div>

          {violationsLoading ? (
            <div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}>Loading violations…</div>
          ) : (() => {
            const filtered = violations.filter(v => {
              if (!violationsShowResolved && v.resolved) return false;
              return violationsFilter==='all' || v.type===violationsFilter;
            });
            const SEV = {low:'#6b7280',medium:'#f59e0b',high:'#f97316',critical:'#dc2626'};
            const fmtTime = (ts) => {
              if (!ts) return '—';
              const d = ts?.toDate ? ts.toDate() : new Date(typeof ts==='number'?ts:ts);
              if (isNaN(d.getTime())) return '—';
              const diff = Date.now()-d.getTime();
              const m=Math.floor(diff/60000),h=Math.floor(diff/3600000);
              if(m<2)return 'Just now'; if(m<60)return `${m}m ago`; if(h<24)return `${h}h ago`;
              return d.toLocaleString('en-IN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
            };
            if (filtered.length===0) return (
              <div style={{textAlign:'center',padding:'48px',background:'#f8fafc',borderRadius:16,border:'2px dashed #e2e8f0',color:'#9ca3af'}}>
                <p style={{margin:0,fontSize:14,fontWeight:700}}>No violations to show</p>
              </div>
            );
            return (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {filtered.map(v => {
                  const sevColor = SEV[v.severity]||'#6b7280';
                  return (
                    <div key={v.id} style={{background:'#fff',borderRadius:12,border:`1.5px solid ${v.resolved?'#e5e7eb':'#fecaca'}`,padding:'12px 14px',boxShadow:'0 2px 6px rgba(0,0,0,0.04)',opacity:v.resolved?0.7:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:6}}>
                        <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:800,background:'rgba(239,68,68,0.1)',color:'#ef4444'}}>{v.type||'VIOLATION'}</span>
                        {v.severity && <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:sevColor+'18',color:sevColor}}>{v.severity}</span>}
                        {v.action && <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:'rgba(99,102,241,0.08)',color:'#6366f1'}}>{v.action}</span>}
                        {v.resolved && <span style={{padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,background:'#d1fae5',color:'#059669'}}>✓ Resolved</span>}
                        <span style={{fontSize:11,color:'#9ca3af',marginLeft:'auto'}}>{fmtTime(v.timestamp)}</span>
                      </div>
                      <div style={{display:'flex',gap:14,fontSize:11,color:'#6b7280',flexWrap:'wrap'}}>
                        {v.userName && <span>User: <strong style={{color:'#374151'}}>{v.userName}</strong></span>}
                        {v.roomId && <span>Room: <strong>{v.roomId}</strong></span>}
                        {v.message && <span style={{color:'#9ca3af',fontStyle:'italic'}}>"{v.message.slice?.(0,60)}{v.message?.length>60?'…':''}"</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

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

      <ToastContainer
        containerId="mod-panel"
        position="bottom-right"
        autoClose={4000}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default BanKickMutePanel;
