
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, rtdb } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, where, limit, startAfter, getDocs } from 'firebase/firestore';
import { ref, onValue, remove } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import { toast } from 'react-toastify';
import AdminBanKickModal from '../components/AdminBanKickModal';
import { IPBanSystem } from '../utils/ipBanSystem';
import { DeviceBanSystem } from '../utils/deviceBanSystem';
import './AdminPanelPage.css';

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
    bannedDevices: 0
  });
  
  // Moderation states  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [actionType, setActionType] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  
  // Pagination
  const [userPage, setUserPage] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);
  const USERS_PER_PAGE = 15;

  // Check admin permissions
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setCurrentUserProfile(userData);
        if (!['owner', 'admin', 'moderator'].includes(userData.role)) {
          toast.error('Access denied. Admin privileges required.');
          navigate('/');
        }
      } else {
        navigate('/');
      }
    });
    
    return () => unsubscribe();
  }, [user, navigate]);

  // Real-time users data
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      
      // Calculate stats
      const onlineCount = Object.keys(onlineStatuses).filter(uid => 
        onlineStatuses[uid]?.state === 'online'
      ).length;
      
      setStats(prev => ({
        ...prev,
        totalUsers: usersData.length,
        onlineUsers: onlineCount,
        bannedUsers: usersData.filter(user => user.isBanned).length,
        mutedUsers: usersData.filter(user => user.mutedInfo?.isMuted).length
      }));
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [onlineStatuses]);

  // Real-time user status from RTDB
  useEffect(() => {
    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const statuses = snapshot.val() || {};
      setOnlineStatuses(statuses);
    });
    
    return () => unsubscribe();
  }, []);

  // Real-time rooms data
  useEffect(() => {
    const roomsQuery = query(collection(db, 'rooms'), orderBy('name'));
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

  // Real-time banned IPs data
  useEffect(() => {
    const bannedIPsQuery = query(collection(db, 'bannedIPs'), where('isActive', '!=', false));
    const unsubscribe = onSnapshot(bannedIPsQuery, (snapshot) => {
      const ipsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBannedIPs(ipsData);
      
      setStats(prev => ({
        ...prev,
        bannedIPs: ipsData.length
      }));
    });
    
    return () => unsubscribe();
  }, []);

  // Real-time banned devices data
  useEffect(() => {
    const bannedDevicesQuery = query(collection(db, 'bannedDevices'), where('isActive', '!=', false));
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

  // Moderation functions
  const handleModerateUser = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setIsModalVisible(true);
  };

  const handleDeleteProfile = async (targetUser) => {
    const confirmed = window.confirm(
      `⚠️ DANGER: Are you sure you want to PERMANENTLY DELETE ${targetUser.displayName}'s profile?\n\nThis action CANNOT be undone and will:\n- Remove all user data\n- Delete all messages\n- Ban their IP address\n\nType "DELETE" to confirm this irreversible action.`
    );
    
    if (!confirmed) return;
    
    const confirmText = prompt('Type "DELETE" to confirm permanent deletion:');
    if (confirmText !== 'DELETE') {
      toast.error('Profile deletion cancelled - incorrect confirmation.');
      return;
    }

    try {
      // First ban the user and their IP
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, { 
        isBanned: true,
        banInfo: {
          reason: 'Profile deleted by administrator',
          bannedBy: currentUserProfile?.displayName || 'Admin',
          bannedAt: new Date().toISOString(),
          deletedProfile: true
        }
      });

      // Ban their IP
      try {
        await IPBanSystem.banUserWithIP(
          targetUser.uid,
          {
            displayName: targetUser.displayName,
            email: targetUser.email
          },
          {
            reason: 'Profile deleted by administrator',
            bannedBy: currentUserProfile?.displayName || 'Admin',
            location: 'Admin Panel - Profile Deletion'
          }
        );
      } catch (ipError) {
        console.error('IP ban failed during profile deletion:', ipError);
      }

      // Remove from online status
      remove(ref(rtdb, `status/${targetUser.uid}`));

      // Delete the user document
      await deleteDoc(userRef);
      
      toast.success(`🗑️ ${targetUser.displayName}'s profile has been permanently deleted.`);
    } catch (error) {
      console.error('Profile deletion error:', error);
      toast.error('Failed to delete profile. Please try again.');
    }
  };

  const handleConfirmAction = async (actionData) => {
    if (!selectedUser) return;
    
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      
      switch (actionType) {
        case 'ban':
          await updateDoc(userRef, { 
            isBanned: true,
            banInfo: {
              ...actionData,
              bannedAt: new Date().toISOString()
            }
          });
          
          remove(ref(rtdb, `status/${selectedUser.uid}`));
          
          try {
            const ipBanResults = await IPBanSystem.banUserWithIP(
              selectedUser.uid,
              {
                displayName: selectedUser.displayName,
                email: selectedUser.email
              },
              {
                reason: actionData.reason || 'User account banned by administrator',
                bannedBy: currentUserProfile?.displayName || 'Admin',
                userAgent: navigator.userAgent,
                location: 'Admin Panel Ban',
                country: selectedUser.country || 'Unknown'
              }
            );
            
            if (ipBanResults.ipBanned && ipBanResults.bannedIP) {
              toast.success(`${selectedUser.displayName} has been banned. IP ${ipBanResults.bannedIP} is also banned.`);
            } else {
              toast.success(`${selectedUser.displayName} has been banned.`);
            }
          } catch (ipError) {
            toast.warning(`${selectedUser.displayName} has been banned, but IP ban failed: ${ipError.message}`);
          }
          break;
          
        case 'unban':
          await updateDoc(userRef, { 
            isBanned: false,
            banInfo: null
          });
          
          try {
            const unbannedIPs = await IPBanSystem.unbanUserIP(selectedUser.uid);
            if (unbannedIPs && unbannedIPs.length > 0) {
              toast.success(`${selectedUser.displayName} has been unbanned. IP(s) ${unbannedIPs.join(', ')} are also unbanned.`);
            } else {
              toast.success(`${selectedUser.displayName} has been unbanned.`);
            }
          } catch (ipError) {
            toast.warning(`${selectedUser.displayName} has been unbanned, but IP unban failed: ${ipError.message}`);
          }
          break;
          
        case 'mute':
          await updateDoc(userRef, {
            'mutedInfo.isMuted': true,
            'mutedInfo.mutedAt': new Date().toISOString(),
            'mutedInfo.mutedBy': currentUserProfile?.displayName,
            'mutedInfo.reason': actionData.reason,
            'mutedInfo.duration': actionData.duration
          });
          toast.success(`${selectedUser.displayName} has been muted.`);
          break;
          
        case 'unmute':
          await updateDoc(userRef, {
            'mutedInfo.isMuted': false,
            'mutedInfo.mutedAt': null,
            'mutedInfo.mutedBy': null,
            'mutedInfo.reason': null
          });
          toast.success(`${selectedUser.displayName} has been unmuted.`);
          break;
          
        case 'kick':
          if (onlineStatuses[selectedUser.uid]?.currentRoomId) {
            remove(ref(rtdb, `status/${selectedUser.uid}/currentRoomId`));
          }
          toast.success(`${selectedUser.displayName} has been kicked.`);
          break;
      }
    } catch (error) {
      console.error('Moderation error:', error);
      toast.error('Action failed. Please try again.');
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
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

  // Get user's real device/location info with proper fallbacks
  const getUserDeviceInfo = (user) => {
    const status = onlineStatuses[user.uid];
    const isOnline = status?.state === 'online';
    
    // Get IP - prefer current status for online users, last known for offline
    const lastIP = isOnline 
      ? (status?.ip || user.lastIP || 'Unknown')
      : (user.lastIP || status?.ip || 'Unknown');
    
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
      ? (status?.country || user.country || user.lastLocation || status?.location || 'Unknown')
      : (user.country || user.lastLocation || status?.country || status?.location || 'Unknown');
    
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
    
    // Get last seen info
    const lastSeen = status?.lastSeen || user.lastLoginAt || user.lastSeenAt || status?.connectedAt || 'Unknown';
    
    return {
      deviceId: deviceId,
      ip: lastIP,
      location: location,
      device: deviceType,
      browser: browser,
      os: os,
      lastSeen: lastSeen,
      userAgent: userAgent,
      isOnline: isOnline
    };
  };

  if (!currentUserProfile || !['owner', 'admin', 'moderator'].includes(currentUserProfile.role)) {
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
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                </svg>
                {currentUserProfile?.role?.toUpperCase()}
              </div>
              <div className="luxury-admin-profile">
                <span className="luxury-admin-name">{currentUserProfile?.displayName}</span>
                <span className="luxury-admin-email">{currentUserProfile?.email}</span>
              </div>
              <button className="luxury-btn-secondary" onClick={() => navigate('/')}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
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
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16,4C16.88,4 17.67,4.38 18.18,5C18.69,4.38 19.48,4 20.36,4C21.8,4 23,5.2 23,6.64C23,8.09 21.8,9.29 20.36,9.29C19.48,9.29 18.69,8.91 18.18,8.29C17.67,8.91 16.88,9.29 16,9.29C14.56,9.29 13.36,8.09 13.36,6.64C13.36,5.2 14.56,4 16,4M12.93,9.39C13.19,9.93 13.59,10.4 14.09,10.75C13.66,11.03 13.32,11.46 13.16,11.97C12.71,11.96 12.32,12.35 12.32,12.8C12.32,13.25 12.71,13.64 13.16,13.63C13.32,14.14 13.66,14.57 14.09,14.85C13.59,15.2 13.19,15.67 12.93,16.21C11.76,15.35 11,14.04 11,12.6C11,11.16 11.76,9.85 12.93,9.39M16,17C14.56,17 13.36,15.8 13.36,14.36C13.36,12.91 14.56,11.71 16,11.71C17.44,11.71 18.64,12.91 18.64,14.36C18.64,15.8 17.44,17 16,17M9,12C10.11,12 11,11.11 11,10C11,8.89 10.11,8 9,8C7.89,8 7,8.89 7,10C7,11.11 7.89,12 9,12M9,13C6.67,13 2,14.17 2,16.5V19H16V16.5C16,14.17 11.33,13 9,13Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.totalUsers}</div>
                <div className="luxury-stat-label">Total Users</div>
              </div>
            </div>
            
            <div className="luxury-stat-card success">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.onlineUsers}</div>
                <div className="luxury-stat-label">Online Now</div>
              </div>
            </div>
            
            <div className="luxury-stat-card warning">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19M16.5,12C16.78,12 17,12.22 17,12.5V13.5C17,13.78 16.78,14 16.5,14H15.5C15.22,14 15,13.78 15,13.5V12.5C15,12.22 15.22,12 15.5,12H16.5Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.mutedUsers}</div>
                <div className="luxury-stat-label">Muted Users</div>
              </div>
            </div>
            
            <div className="luxury-stat-card danger">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.bannedUsers}</div>
                <div className="luxury-stat-label">Banned Users</div>
              </div>
            </div>
            
            <div className="luxury-stat-card info">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
                </svg>
              </div>
              <div className="luxury-stat-content">
                <div className="luxury-stat-number">{stats.totalRooms}</div>
                <div className="luxury-stat-label">Total Rooms</div>
              </div>
            </div>
            
            <div className="luxury-stat-card security">
              <div className="luxury-stat-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.11,7 14,7.89 14,9C14,10.11 13.11,11 12,11C10.89,11 10,10.11 10,9C10,7.89 10.89,7 12,7M17,18H7V16.5C7,15.12 9.24,14 12,14C14.76,14 17,15.12 17,16.5V18Z"/>
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
              { id: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z"/></svg> },
              { id: 'users', label: 'User Management', icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16,4C16.88,4 17.67,4.38 18.18,5C18.69,4.38 19.48,4 20.36,4C21.8,4 23,5.2 23,6.64C23,8.09 21.8,9.29 20.36,9.29C19.48,9.29 18.69,8.91 18.18,8.29C17.67,8.91 16.88,9.29 16,9.29C14.56,9.29 13.36,8.09 13.36,6.64C13.36,5.2 14.56,4 16,4M12.93,9.39C13.19,9.93 13.59,10.4 14.09,10.75C13.66,11.03 13.32,11.46 13.16,11.97C12.71,11.96 12.32,12.35 12.32,12.8C12.32,13.25 12.71,13.64 13.16,13.63C13.32,14.14 13.66,14.57 14.09,14.85C13.59,15.2 13.19,15.67 12.93,16.21C11.76,15.35 11,14.04 11,12.6C11,11.16 11.76,9.85 12.93,9.39M16,17C14.56,17 13.36,15.8 13.36,14.36C13.36,12.91 14.56,11.71 16,11.71C17.44,11.71 18.64,12.91 18.64,14.36C18.64,15.8 17.44,17 16,17M9,12C10.11,12 11,11.11 11,10C11,8.89 10.11,8 9,8C7.89,8 7,8.89 7,10C7,11.11 7.89,12 9,12M9,13C6.67,13 2,14.17 2,16.5V19H16V16.5C16,14.17 11.33,13 9,13Z"/></svg> },
              { id: 'rooms', label: 'Room Control', icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/></svg> },
              { id: 'security', label: 'Security Center', icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.11,7 14,7.89 14,9C14,10.11 13.11,11 12,11C10.89,11 10,10.11 10,9C10,7.89 10.89,7 12,7M17,18H7V16.5C7,15.12 9.24,14 12,14C14.76,14 17,15.12 17,16.5V18Z"/></svg> }
            ].map(tab => (
              <button
                key={tab.id}
                className={`luxury-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="luxury-tab-icon">{tab.icon}</div>
                <span className="luxury-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="luxury-main-content">
          {activeTab === 'dashboard' && (
            <div className="luxury-dashboard-section">
              <div className="luxury-section-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z"/>
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
                        <img src={user.photoURL || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}`} alt="" />
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
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16,4C16.88,4 17.67,4.38 18.18,5C18.69,4.38 19.48,4 20.36,4C21.8,4 23,5.2 23,6.64C23,8.09 21.8,9.29 20.36,9.29C19.48,9.29 18.69,8.91 18.18,8.29C17.67,8.91 16.88,9.29 16,9.29C14.56,9.29 13.36,8.09 13.36,6.64C13.36,5.2 14.56,4 16,4M12.93,9.39C13.19,9.93 13.59,10.4 14.09,10.75C13.66,11.03 13.32,11.46 13.16,11.97C12.71,11.96 12.32,12.35 12.32,12.8C12.32,13.25 12.71,13.64 13.16,13.63C13.32,14.14 13.66,14.57 14.09,14.85C13.59,15.2 13.19,15.67 12.93,16.21C11.76,15.35 11,14.04 11,12.6C11,11.16 11.76,9.85 12.93,9.39M16,17C14.56,17 13.36,15.8 13.36,14.36C13.36,12.91 14.56,11.71 16,11.71C17.44,11.71 18.64,12.91 18.64,14.36C18.64,15.8 17.44,17 16,17M9,12C10.11,12 11,11.11 11,10C11,8.89 10.11,8 9,8C7.89,8 7,8.89 7,10C7,11.11 7.89,12 9,12M9,13C6.67,13 2,14.17 2,16.5V19H16V16.5C16,14.17 11.33,13 9,13Z"/>
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
                    <option value="owner">Owner</option>
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
                                  src={user.photoURL || `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}`}
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
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
                                    </svg>
                                    {currentRoom}
                                  </div>
                                )}
                              </div>
                              
                              <div className="luxury-role-section">
                                <span className={`luxury-role-badge role-${user.role || 'user'}`}>
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                                  </svg>
                                  {user.role?.toUpperCase() || 'USER'}
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
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
                                  </svg>
                                  <span>{deviceInfo.device}</span>
                                </div>
                                <div className="luxury-device-item">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                  </svg>
                                  <span>{deviceInfo.browser}</span>
                                </div>
                                <div className="luxury-device-item">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
                                  </svg>
                                  <span>{deviceInfo.os}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="luxury-td location-ip-cell">
                              <div className="luxury-location-details">
                                <div className="luxury-location-item">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
                                  </svg>
                                  <span className="luxury-device-id" title={deviceInfo.deviceId}>
                                    Device: {deviceInfo.deviceId !== 'Unknown' ? deviceInfo.deviceId.substring(0, 12) + '...' : 'Unknown'}
                                  </span>
                                </div>
                                <div className="luxury-location-item">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/>
                                  </svg>
                                  <span>{deviceInfo.location}</span>
                                </div>
                                <div className="luxury-location-item">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17,12C17,14.42 16.28,16.58 14.9,18.9L12,22L9.1,18.9C7.72,16.58 7,14.42 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"/>
                                  </svg>
                                  <span className="luxury-ip-address">{deviceInfo.ip}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="luxury-td actions-cell">
                              <div className="luxury-action-buttons">
                                {!user.isBanned ? (
                                  <button 
                                    className="luxury-action-btn ban-btn"
                                    onClick={() => handleModerateUser(user, 'ban')}
                                    title="Ban User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                                    </svg>
                                  </button>
                                ) : (
                                  <button 
                                    className="luxury-action-btn unban-btn"
                                    onClick={() => handleModerateUser(user, 'unban')}
                                    title="Unban User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                                    </svg>
                                  </button>
                                )}
                                
                                {!user.mutedInfo?.isMuted ? (
                                  <button 
                                    className="luxury-action-btn mute-btn"
                                    onClick={() => handleModerateUser(user, 'mute')}
                                    title="Mute User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19M16.5,12C16.78,12 17,12.22 17,12.5V13.5C17,13.78 16.78,14 16.5,14H15.5C15.22,14 15,13.78 15,13.5V12.5C15,12.22 15.22,12 15.5,12H16.5Z"/>
                                    </svg>
                                  </button>
                                ) : (
                                  <button 
                                    className="luxury-action-btn unmute-btn"
                                    onClick={() => handleModerateUser(user, 'unmute')}
                                    title="Unmute User"
                                  >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                                    </svg>
                                  </button>
                                )}
                                
                                <button 
                                  className="luxury-action-btn kick-btn"
                                  onClick={() => handleModerateUser(user, 'kick')}
                                  title="Kick User"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17,12C17,14.42 16.28,16.58 14.9,18.9L12,22L9.1,18.9C7.72,16.58 7,14.42 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"/>
                                  </svg>
                                </button>
                                
                                <button 
                                  className="luxury-action-btn delete-btn"
                                  onClick={() => handleDeleteProfile(user)}
                                  title="Delete Profile"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                  </svg>
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
              <div className="luxury-section-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
                  </svg>
                  Room Management
                </h2>
                <p>Monitor and control all chat rooms</p>
              </div>
              
              <div className="luxury-rooms-grid">
                {rooms.map(room => (
                  <div key={room.id} className="luxury-room-card">
                    <div className="luxury-room-header">
                      <div className="luxury-room-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
                        </svg>
                      </div>
                      <div className="luxury-room-info">
                        <h3 className="luxury-room-name">{room.name}</h3>
                        <p className="luxury-room-description">{room.description || 'No description'}</p>
                      </div>
                    </div>
                    
                    <div className="luxury-room-stats">
                      <div className="luxury-room-stat">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16,4C16.88,4 17.67,4.38 18.18,5C18.69,4.38 19.48,4 20.36,4C21.8,4 23,5.2 23,6.64C23,8.09 21.8,9.29 20.36,9.29C19.48,9.29 18.69,8.91 18.18,8.29C17.67,8.91 16.88,9.29 16,9.29C14.56,9.29 13.36,8.09 13.36,6.64C13.36,5.2 14.56,4 16,4M12.93,9.39C13.19,9.93 13.59,10.4 14.09,10.75C13.66,11.03 13.32,11.46 13.16,11.97C12.71,11.96 12.32,12.35 12.32,12.8C12.32,13.25 12.71,13.64 13.16,13.63C13.32,14.14 13.66,14.57 14.09,14.85C13.59,15.2 13.19,15.67 12.93,16.21C11.76,15.35 11,14.04 11,12.6C11,11.16 11.76,9.85 12.93,9.39M16,17C14.56,17 13.36,15.8 13.36,14.36C13.36,12.91 14.56,11.71 16,11.71C17.44,11.71 18.64,12.91 18.64,14.36C18.64,15.8 17.44,17 16,17M9,12C10.11,12 11,11.11 11,10C11,8.89 10.11,8 9,8C7.89,8 7,8.89 7,10C7,11.11 7.89,12 9,12M9,13C6.67,13 2,14.17 2,16.5V19H16V16.5C16,14.17 11.33,13 9,13Z"/>
                        </svg>
                        <span>{Object.values(onlineStatuses).filter(s => s.currentRoomId === room.id).length} users</span>
                      </div>
                      <div className="luxury-room-stat">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
                        </svg>
                        <span>Active</span>
                      </div>
                    </div>
                    
                    <div className="luxury-room-actions">
                      <button className="luxury-btn-secondary">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                        </svg>
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="luxury-security-section">
              <div className="luxury-section-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.11,7 14,7.89 14,9C14,10.11 13.11,11 12,11C10.89,11 10,10.11 10,9C10,7.89 10.89,7 12,7M17,18H7V16.5C7,15.12 9.24,14 12,14C14.76,14 17,15.12 17,16.5V18Z"/>
                  </svg>
                  Security Center
                </h2>
                <p>Monitor banned IPs and security threats</p>
              </div>
              
              <div className="luxury-security-grid">
                <div className="luxury-security-card">
                  <h3>Banned IP Addresses</h3>
                  <div className="luxury-banned-ips-list">
                    {bannedIPs.slice(0, 10).map(ipBan => (
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
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="luxury-security-card">
                  <h3>Security Metrics</h3>
                  <div className="luxury-security-metrics">
                    <div className="luxury-security-metric">
                      <span className="luxury-metric-label">Blocked Attempts</span>
                      <span className="luxury-metric-value">{bannedIPs.length}</span>
                    </div>
                    <div className="luxury-security-metric">
                      <span className="luxury-metric-label">Active Bans</span>
                      <span className="luxury-metric-value">{stats.bannedUsers}</span>
                    </div>
                    <div className="luxury-security-metric">
                      <span className="luxury-metric-label">Threat Level</span>
                      <span className="luxury-metric-value status-low">Low</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
    </>
  );
};

export default AdminPanelPage;
