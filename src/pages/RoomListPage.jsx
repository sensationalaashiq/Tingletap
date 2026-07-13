import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumCopyright from '../components/PremiumCopyright';
import { auth, db, rtdb } from '../firebase/config';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import useRoomsListener from '../hooks/useRoomsListener';
import { DeviceFingerprint } from '../utils/deviceFingerprint';
import { ref, onValue } from 'firebase/database';
import { pt } from '../utils/premiumToast';
import StatusModal from '../components/StatusModal';
import AdultRoomModal from '../components/AdultRoomModal';
import { getRoomSlug } from '../utils/roomSlug';
import BanKickModal from '../components/BanKickModal';
import { isKickExpired, autoCheckUnkick } from '../utils/modExpiryService';
import './RoomListPage.css';

/* FIX 19: Cache external geolocation lookups in sessionStorage for 1 hour so we
   don't hit the external API on every room-list visit. Behavior/data shape unchanged. */
const GEO_CACHE_KEY = 'rl_geo_cache_v1';
const GEO_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const fetchGeoWithCache = () => {
  try {
    const cachedRaw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached && cached.geo && (Date.now() - cached.ts) < GEO_CACHE_TTL_MS) {
        return Promise.resolve(cached.geo);
      }
    }
  } catch {}

  return fetch('https://ipwho.is/')
    .then(r => r.json())
    .then(geo => {
      try {
        sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), geo }));
      } catch {}
      return geo;
    });
};

/* ══════════════════════════════════════════════════════
   PREMIUM SVG ICONS
══════════════════════════════════════════════════════ */
const Ico = ({ w = 24, h = 24, children }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display:'block', flexShrink:0 }}>
    {children}
  </svg>
);

const ShieldIcon = () => (
  <Ico w={30} h={30}>
    <defs><linearGradient id="rl-sh" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
    <path d="M15 2.5L4 7.5v5.5C4 19.3 8.8 24.5 15 26c6.2-1.5 11-6.7 11-13V7.5L15 2.5z" fill="url(#rl-sh)"/>
    <path d="M10.5 14l3.5 3.5L21 10" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const AdminIcon = () => (
  <Ico w={18} h={18}>
    <defs><linearGradient id="rl-adm" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
    <path d="M9 1.5L2 4.5v4C2 12.2 5 15.9 9 17c4-1.1 7-4.8 7-8.5v-4L9 1.5z" fill="url(#rl-adm)"/>
    <path d="M6 9l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const SpeakerIcon = () => (
  <Ico w={16} h={16}>
    <path d="M3 6v4h3l4 4V2L6 6H3zM13.5 8c0-1.8-1-3.3-2.5-4v8C12.5 11.3 13.5 9.8 13.5 8z" fill="white"/>
  </Ico>
);

const StopIcon = () => (
  <Ico w={16} h={16}>
    <rect x="3" y="3" width="10" height="10" rx="2" fill="white"/>
  </Ico>
);

const ArrowRightIcon = () => (
  <Ico w={20} h={20}>
    <path d="M4 10h12M12 6l4 4-4 4" stroke="#5b21b6" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const UsersIcon = () => (
  <Ico w={15} h={15}>
    <circle cx="5.5" cy="5" r="2.5" fill="#5b21b6"/>
    <path d="M1 13c0-2.8 2-4.5 4.5-4.5S10 10.2 10 13" stroke="#5b21b6" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="11" cy="5" r="2" fill="#8b5cf6"/>
    <path d="M10.5 13c.5-1.8 1.8-3 2.5-3" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/>
  </Ico>
);

const MicIcon = () => (
  <Ico w={14} h={14}>
    <rect x="4.5" y="1" width="5" height="8" rx="2.5" fill="#5b21b6"/>
    <path d="M2 7.5a5 5 0 0 0 10 0M7 12.5v1.5" stroke="#5b21b6" strokeWidth="1.4" strokeLinecap="round"/>
  </Ico>
);

const MusicIcon = () => (
  <Ico w={14} h={14}>
    <path d="M5 10.5V4l7-1.5V9" stroke="#5b21b6" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="4" cy="10.5" r="1.8" fill="#5b21b6"/>
    <circle cx="11" cy="9" r="1.8" fill="#5b21b6"/>
  </Ico>
);

const FileIcon = () => (
  <Ico w={14} h={14}>
    <path d="M3 1.5h5l3 3V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" fill="#5b21b6"/>
    <path d="M8 1.5v3h3" stroke="white" strokeWidth="1.2"/>
  </Ico>
);

const ScrollIcon = () => (
  <Ico w={22} h={22}>
    <defs><linearGradient id="rl-sci" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs>
    <path d="M13 2H5.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2H17a2 2 0 0 0 2-2V7.5L13 2z" fill="url(#rl-sci)"/>
    <path d="M13 2v5.5H18.5M7 11h8M7 15h5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
  </Ico>
);

const SparkleIcon = () => (
  <Ico w={16} h={16}>
    <path d="M8 1l1.2 3.8L13.5 5.5 10 7.2 8 11l-2-3.8L2.5 5.5 6 3.8 8 1z" fill="#8b5cf6"/>
    <path d="M13 10.5l.6 1.9L15.5 13l-1.9.6L13 15.5l-.6-1.9L10.5 13l1.9-.6L13 10.5z" fill="#c4b5fd" opacity=".7"/>
  </Ico>
);

const DiamondIcon = () => (
  <Ico w={14} h={14}>
    <defs><linearGradient id="rl-dg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <path d="M7 1.5L1 6.5 7 13.5 13 6.5 7 1.5z" fill="url(#rl-dg2)"/>
    <path d="M1 6.5h12" stroke="white" strokeWidth="0.7" opacity=".4"/>
  </Ico>
);

const LockBadgeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
    <rect x="3.5" y="9" width="13" height="9" rx="2.2" fill="#7c3aed"/>
    <rect x="6.5" y="4" width="7" height="7" rx="3.5" fill="none" stroke="#7c3aed" strokeWidth="2.2"/>
    <circle cx="10" cy="13.5" r="1.5" fill="white"/>
  </svg>
);

/* ── Room-specific gradient icons ── */
const getRoomIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes('indian') || n.includes('hindi'))
    return (
      <svg viewBox="0 0 30 30" width="28" height="28" fill="none">
        <defs><linearGradient id="ri-in" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff9933"/><stop offset="50%" stopColor="#fff"/><stop offset="100%" stopColor="#138808"/></linearGradient></defs>
        <circle cx="15" cy="15" r="13" fill="url(#ri-in)" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
        <circle cx="15" cy="15" r="4.5" fill="#000080" opacity=".85"/>
        <path d="M11.5 15l2.5 2.5L18.5 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  if (n.includes('gaming') || n.includes('game'))
    return (
      <svg viewBox="0 0 30 30" width="28" height="28" fill="none">
        <defs><linearGradient id="ri-gm" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#ec4899"/></linearGradient></defs>
        <rect x="3" y="9.5" width="24" height="12" rx="6" fill="url(#ri-gm)"/>
        <circle cx="9.5" cy="15.5" r="2.2" fill="white" opacity=".9"/>
        <rect x="13.5" y="14" width="1.5" height="3.5" rx=".75" fill="white" opacity=".9"/>
        <rect x="12" y="15.5" width="4.5" height="1.5" rx=".75" fill="white" opacity=".9"/>
        <circle cx="21" cy="14" r="1.3" fill="white" opacity=".9"/>
        <circle cx="21" cy="17" r="1.3" fill="white" opacity=".9"/>
      </svg>
    );
  if (n.includes('music') || n.includes('song'))
    return (
      <svg viewBox="0 0 30 30" width="28" height="28" fill="none">
        <defs><linearGradient id="ri-mu" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#dc2626"/></linearGradient></defs>
        <circle cx="15" cy="15" r="13" fill="url(#ri-mu)"/>
        <path d="M11 9v11c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2h1V13l7-1.5v6.5c0 1.1-.9 2-2 2s-2-.9-2-2h1V9l-7 1.5z" fill="white" opacity=".9"/>
      </svg>
    );
  if (n.includes('adult') || n.includes('18+'))
    return (
      <svg viewBox="0 0 30 30" width="28" height="28" fill="none">
        <defs><linearGradient id="ri-ad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ef4444"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
        <circle cx="15" cy="15" r="13" fill="url(#ri-ad)"/>
        <text x="15" y="19.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="Inter,sans-serif">18+</text>
      </svg>
    );
  if (n.includes('universal') || n.includes('world'))
    return (
      <svg viewBox="0 0 30 30" width="28" height="28" fill="none">
        <defs><linearGradient id="ri-un" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981"/><stop offset="50%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#3b82f6"/></linearGradient></defs>
        <circle cx="15" cy="15" r="13" fill="url(#ri-un)"/>
        <circle cx="15" cy="15" r="9" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" fill="none"/>
        <path d="M2 15h26M15 2c3 0 5.5 5.8 5.5 13S18 28 15 28s-5.5-5.8-5.5-13S12 2 15 2z" stroke="white" strokeWidth="1.4" fill="none"/>
      </svg>
    );
  if (n.includes('staff') || n.includes('admin'))
    return (
      <svg viewBox="0 0 30 30" width="28" height="28" fill="none">
        <defs><linearGradient id="ri-st" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
        <path d="M15 2l3 8.5 8.5.5-6.5 5 2.5 8-7.5-5-7.5 5 2.5-8L3.5 11l8.5-.5L15 2z" fill="url(#ri-st)" stroke="rgba(255,255,255,.3)" strokeWidth="1"/>
      </svg>
    );
  return (
    <svg viewBox="0 0 30 30" width="28" height="28" fill="none">
      <defs><linearGradient id="ri-df" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
      <rect x="2" y="4.5" width="22" height="17" rx="4.5" fill="url(#ri-df)"/>
      <path d="M2 14l4.5 6" stroke="url(#ri-df)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="8.5" cy="13" r="2" fill="white" opacity=".9"/>
      <circle cx="15" cy="13" r="2" fill="white" opacity=".9"/>
      <circle cx="21.5" cy="13" r="2" fill="white" opacity=".9"/>
    </svg>
  );
};

const getRoomGradient = (name) => {
  const gradients = [
    'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
    'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
    'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
    'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
    'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
    'linear-gradient(135deg,#ff6b6b 0%,#4ecdc4 100%)',
    'linear-gradient(135deg,#8360c3 0%,#2ebf91 100%)',
    'linear-gradient(135deg,#ff8a80 0%,#ea6100 100%)',
    'linear-gradient(135deg,#667db6 0%,#0082c8 100%)',
    'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)',
    'linear-gradient(135deg,#c94b4b 0%,#4b134f 100%)',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return gradients[Math.abs(h) % gradients.length];
};

const getRoomDesc = (name) => {
  const n = name.toLowerCase();
  if (n.includes('indian') || n.includes('hindi')) return 'Immerse in Indian culture, traditions & vibrant conversations';
  if (n.includes('gaming') || n.includes('game')) return 'Elite gaming community — tournaments, strategies & live matches';
  if (n.includes('music') || n.includes('song')) return 'Premium music lounge for discovering & sharing musical journeys';
  if (n.includes('adult') || n.includes('18+')) return 'Sophisticated adult discussions in a refined, moderated space';
  if (n.includes('universal') || n.includes('world')) return 'Global luxury chat connecting cultures & languages worldwide';
  if (n.includes('staff') || n.includes('admin')) return 'Executive lounge for premium staff communications';
  return 'Premium conversations with distinguished community members';
};

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const RoomListPage = () => {
  const [rooms, setRooms]           = useState([]);
  const [roomCounts, setRoomCounts] = useState({});
  const [loading, setLoading]       = useState(true);
  const [isOwner, setIsOwner]       = useState(false);
  const [userRole, setUserRole]     = useState('user');
  const [voiceLang, setVoiceLang]   = useState('en-IN');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAdultModal, setShowAdultModal]   = useState(false);
  const [pendingAdultRoom, setPendingAdultRoom] = useState(null);
  const [showBanKickModal, setShowBanKickModal] = useState(false);
  const [kickModalData, setKickModalData] = useState(null);
  // Password room modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwRoom, setPwRoom] = useState(null);
  const [showPwText, setShowPwText] = useState(false);
  const navigate = useNavigate();

  // Shared listener (deduped with Sidebar.jsx) — avoids two independent
  // onSnapshot subscriptions on the same 'rooms' query when both are mounted.
  const sharedRooms = useRoomsListener();
  useEffect(() => {
    setRooms(sharedRooms);
    setLoading(false);
  }, [sharedRooms]);

  // ── Room occupancy counts — scoped to roomCounts/{roomId}/{uid} entries ──
  // Each online user writes a lightweight true entry under their room.
  // This avoids downloading the full status/ tree (which contains all user data)
  // just to count room members.
  useEffect(() => {
    return onValue(ref(rtdb, 'roomCounts'), (snap) => {
      const data = snap.val() || {};
      const counts = {};
      Object.entries(data).forEach(([roomId, members]) => {
        if (members && typeof members === 'object') {
          counts[roomId] = Object.keys(members).length;
        }
      });
      setRoomCounts(counts);
    });
  }, []);

  // Helper: detect OS and browser from userAgent
  const detectOSAndBrowser = (ua) => {
    let os = 'Unknown';
    if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Other';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
    else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
    else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Safari/i.test(ua)) browser = 'Safari';

    return { os, browser };
  };

  useEffect(() => {
    const cu = auth.currentUser;
    if (!cu) return;
    getDoc(doc(db, 'users', cu.uid)).then(snap => {
      if (snap.exists()) {
        let role = snap.data().role || 'user';
        // Legacy 'superowner' values are normalized to 'owner' for local display only.
        // We intentionally do NOT write this back from the client — Firestore rules
        // correctly reject client self-writes to the `role` field (and 'superowner'
        // isn't recognized as staff), so persisting this migration must go through a
        // server-verified path (see moderationAction.js), not a client updateDoc.
        if (role === 'superowner') {
          role = 'owner';
        }
        setUserRole(role);
        setIsOwner(role === 'owner');
      }
    });

    // Save device fingerprint with proper OS detection (not navigator.platform)
    const ua = navigator.userAgent;
    const { os: detectedOS, browser: detectedBrowser } = detectOSAndBrowser(ua);
    Promise.all([
      DeviceFingerprint.generateFingerprint(),
      DeviceFingerprint.getDeviceModelAsync(),
    ]).then(([deviceId, deviceModel]) => {
      if (!deviceId) return;
      const deviceInfo = {
        browser: detectedBrowser,
        os: detectedOS,
        userAgent: ua,
        deviceModel: deviceModel || DeviceFingerprint._parseDeviceModel(ua),
        deviceType: /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop',
        lastSeen: new Date().toISOString()
      };
      updateDoc(doc(db, 'users', cu.uid), {
        lastDeviceId: deviceId,
        lastDeviceInfo: deviceInfo
      }).catch(() => {});
    }).catch(() => {});

    // Fetch real IP + geolocation and store for Admin Panel
    fetchGeoWithCache()
      .then(geo => {
        if (geo && geo.success && geo.ip) {
          updateDoc(doc(db, 'users', cu.uid), {
            lastIP: geo.ip,
            lastLat: geo.latitude ?? null,
            lastLon: geo.longitude ?? null,
            lastCity: geo.city || '',
            lastCountry: geo.country || '',
            lastLocation: [geo.city, geo.country].filter(Boolean).join(', ') || 'Unknown'
          }).catch(() => {});
        }
      }).catch(() => {});
  }, []);

  // Save IP + location + device info for GUEST users → guestSessions collection
  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (!isGuest) return;
    const gd = localStorage.getItem('guestUser');
    if (!gd) return;
    try {
      const guestUser = JSON.parse(gd);
      const guestUid = guestUser?.uid;
      if (!guestUid) return;
      const ua = navigator.userAgent;
      const { os: gOS, browser: gBrowser } = (typeof detectOSAndBrowser === 'function')
        ? detectOSAndBrowser(ua)
        : { os: 'Unknown', browser: 'Chrome' };
      const gDeviceType = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? 'Mobile' : 'Desktop';

      DeviceFingerprint.generateFingerprint().then(gDeviceId => {
        fetchGeoWithCache()
          .then(geo => {
            if (!geo || !geo.success) return;
            updateDoc(doc(db, 'guestSessions', guestUid), {
              ip: geo.ip || '',
              lat: geo.latitude ?? null,
              lon: geo.longitude ?? null,
              city: geo.city || '',
              region: geo.region || '',
              country: geo.country || '',
              os: gOS,
              browser: gBrowser,
              deviceType: gDeviceType,
              deviceId: gDeviceId || '',
              lastLocationUpdate: new Date().toISOString()
            }).catch(() => {});
          }).catch(() => {});
      }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    window.openStatusModal = () => setShowStatusModal(true);
    return () => { delete window.openStatusModal; };
  }, []);

  // Auto-show kick modal if user was just kicked
  useEffect(() => {
    const shouldShow = localStorage.getItem('showKickModal');
    if (shouldShow === 'true') {
      localStorage.removeItem('showKickModal');
      try {
        const raw = localStorage.getItem('lastKickData');
        if (raw) {
          const kd = JSON.parse(raw);
          setKickModalData({
            roomName:     kd.roomName     || 'the room',
            reason:       kd.reason       || 'You were removed by a moderator.',
            kickedBy:     kd.kickedBy     || 'An administrator',
            kickedAt:     kd.kickedAt ? new Date(kd.kickedAt) : new Date(),
            duration:     kd.kickDuration || kd.duration || null,
            kickDuration: kd.kickDuration || kd.duration || null,
            kickUntil:    kd.kickUntil    || null,
            roomId:       kd.roomId       || null,
          });
          setShowBanKickModal(true);
        }
      } catch {}
    }
  }, []);

  const enhancedRules = [
    { title: 'Respect & Kindness', description: 'Treat everyone with respect. No harassment, hate speech, or bullying of any kind.' },
    { title: 'No Spam', description: 'Avoid spamming messages, links, or promotional content in chat rooms.' },
    { title: 'Privacy Protection', description: 'Do not share personal information or request others\' private details.' },
    { title: 'No Illegal Content', description: 'Posting illegal content will result in immediate ban and legal action.' },
    { title: 'Age Appropriate', description: 'Users must be 18+ years old. Adult content is restricted to 18+ verified rooms only.' },
    { title: 'No Impersonation', description: 'Do not impersonate staff, moderators, or other users under any circumstances.' },
    { title: 'Follow Staff Instructions', description: 'Comply with moderator and admin directions promptly and respectfully.' },
    { title: 'Report Issues', description: 'Report inappropriate behaviour using the in-chat report feature immediately.' },
    { title: 'Use Appropriate Language', description: 'Keep conversations civil and avoid excessive profanity or offensive language.' },
    { title: 'No Self-Promotion', description: 'Do not advertise products, services, or external channels without permission.' },
    { title: 'Guest Restrictions', description: 'Guests can only send messages. Private messages and friend requests require registration.' },
    { title: 'Guest Session Limits', description: 'Guest sessions are temporary. Register for full features including customisation.' },
  ];

  const handleReadRules = () => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    let i = 0;
    setIsSpeaking(true);
    const speakNext = () => {
      if (i >= enhancedRules.length) { setIsSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(`Rule ${i + 1}: ${enhancedRules[i].title}. ${enhancedRules[i].description}`);
      u.lang = voiceLang; u.pitch = 1.1; u.rate = 0.85;
      u.onend = () => { setTimeout(() => { i++; speakNext(); }, 900); };
      window.speechSynthesis.speak(u);
    };
    speakNext();
  };

  // Navigate into a room, handling adult rooms
  const proceedToRoom = (room) => {
    const name = room.name.toLowerCase();
    if (name.includes('adult') || name.includes('18+')) {
      const stored = localStorage.getItem('ageVerified');
      if (stored) {
        try {
          const { expiry } = JSON.parse(stored);
          if (Date.now() < expiry) { navigate(`/room/${room.id}`); return; }
          else localStorage.removeItem('ageVerified');
        } catch { localStorage.removeItem('ageVerified'); }
      }
      setPendingAdultRoom(room); setShowAdultModal(true);
    } else {
      navigate(`/room/${room.id}`);
    }
  };

  const handleRoomClick = async (room) => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const gd = localStorage.getItem('guestUser');
    const cu  = auth.currentUser;
    let userId = null, role = 'guest';

    if (isGuest && gd) {
      try { userId = JSON.parse(gd).uid; }
      catch { return; }
    } else if (cu) {
      userId = cu.uid; role = userRole || 'user';
    } else {
      return;
    }

    try {
      if (userId) {
        const kick = await getDoc(doc(db, 'rooms', room.id, 'kickedUsers', userId));
        if (kick.exists()) {
          const kd = kick.data();
          // ── If the kick has already expired, silently clean up and allow entry ──
          if (isKickExpired(kd)) {
            deleteDoc(doc(db, 'rooms', room.id, 'kickedUsers', userId)).catch(() => {});
            updateDoc(doc(db, 'users', userId), { kickedFrom: null }).catch(() => {});
            // fall through to allow room entry
          } else {
            // Active kick — show the modal
            setKickModalData({
              roomName:     room.name,
              reason:       kd.reason       || 'No reason specified',
              kickedBy:     'Administrator',
              kickedAt:     kd.kickedAt?.toDate ? kd.kickedAt.toDate() : (kd.kickedAt?.seconds ? new Date(kd.kickedAt.seconds * 1000) : new Date()),
              duration:     kd.kickDuration || kd.duration || null,
              kickDuration: kd.kickDuration || kd.duration || null,
              kickUntil:    kd.kickUntil    || null,
              roomId:       kd.roomId       || room.id,
            });
            setShowBanKickModal(true);
            return;
          }
        }
      }
    } catch {}

    const name = room.name.toLowerCase();
    if (name.includes('staff') || name.includes('admin')) {
      if (!['owner','admin','moderator'].includes(role.toLowerCase())) {
        return;
      }
    }

    // Password-protected room check
    if (room.password) {
      setPwRoom(room);
      setPwInput('');
      setPwError('');
      setShowPwText(false);
      setShowPasswordModal(true);
      return;
    }

    proceedToRoom(room);
  };

  if (loading) return (
    <div className="rl-loading">
      <div className="rl-loader-ring" />
      <div className="rl-loading-name">TingleTap</div>
      <div className="rl-loading-sub">Preparing your premium experience…</div>
    </div>
  );

  const totalOnline = Object.values(roomCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="rl-root">
      {/* Ambient orbs */}
      <div className="rl-bg" aria-hidden="true">
        <div className="rl-orb rl-orb-1"/><div className="rl-orb rl-orb-2"/><div className="rl-orb rl-orb-3"/>
      </div>

      {/* ══ FLOATING ADMIN CONSOLE (Owner only) ══ */}
      {isOwner && (
        <div className="rl-admin-float-wrap">
          <button className="rl-admin-float" onClick={() => navigate('/admin-panel')} title="Admin Console">
            <AdminIcon />
            <span className="rl-admin-pulse" />
          </button>
        </div>
      )}

      {/* ══ MAIN ══ */}
      <main className="rl-main">

        {/* Floating Brand Hero */}
        <div className="rl-brand-hero">
          <div className="rl-brand-logo-wrap">
            <img src="/tingletap-logo.jpg" alt="TingleTap" className="rl-brand-logo" />
            <div className="rl-logo-ring" />
          </div>
          <div className="rl-brand-info">
            <div className="rl-brand-name">TingleTap</div>
            <div className="rl-brand-tagline">Premium Chat Universe</div>
          </div>
          <div className="rl-brand-pill">
            <SparkleIcon />
            <span>{totalOnline} online now</span>
          </div>
        </div>

        {/* Rooms Section */}
        <section className="rl-rooms-section">
          <div className="rl-section-head">
            <div className="rl-section-head-left">
              <DiamondIcon />
              <h3 className="rl-section-title">Premium Chat Universes</h3>
            </div>
            <span className="rl-section-count">{rooms.length} Rooms</span>
          </div>

          <div className="rl-grid">
            {rooms.map((room, idx) => (
              <div
                key={room.id}
                className="rl-card"
                style={{ '--card-bg': getRoomGradient(room.name), animationDelay: `${idx * 0.07}s` }}
                onClick={() => handleRoomClick(room)}
              >
                <div className="rl-card-shimmer" />
                <div className="rl-card-inner">
                  {/* Left: icon */}
                  <div className="rl-card-icon-col">
                    <div className="rl-card-ico">{getRoomIcon(room.name)}</div>
                  </div>

                  {/* Center: content */}
                  <div className="rl-card-body">
                    <div className="rl-card-name">{room.name}</div>
                    <div className="rl-card-desc">{getRoomDesc(room.name)}</div>
                    <div className="rl-card-features">
                      <span className="rl-feat-tag"><MicIcon /><span>Voice</span></span>
                      <span className="rl-feat-tag"><FileIcon /><span>Files</span></span>
                      <span className="rl-feat-tag"><MusicIcon /><span>Music</span></span>
                    </div>
                  </div>

                  {/* Right: count + badges + arrow */}
                  <div className="rl-card-right">
                    {(room.name.toLowerCase().includes('adult') || room.name.toLowerCase().includes('18+') || room.type === 'adult') && (
                      <div title="Adults Only — 18+" style={{
                        display:'flex', alignItems:'center', gap:4,
                        background:'linear-gradient(135deg,rgba(236,72,153,0.18),rgba(168,85,247,0.18))',
                        border:'1.5px solid rgba(236,72,153,0.45)',
                        borderRadius:20, padding:'3px 9px', marginBottom:5,
                        boxShadow:'0 0 10px rgba(236,72,153,0.25)',
                        animation:'rlAdultPulse 2.5s ease-in-out infinite'
                      }}>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#ec4899" opacity="0.3"/>
                          <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="900" fill="#ec4899" fontFamily="sans-serif">18</text>
                        </svg>
                        <span style={{ fontSize:10, fontWeight:800, color:'#ec4899', letterSpacing:'0.06em' }}>18+</span>
                      </div>
                    )}
                    {room.password && (
                      <div title="Password Protected" style={{
                        display:'flex', alignItems:'center', gap:4,
                        background:'linear-gradient(135deg,#7c3aed,#a855f7)',
                        border:'1.5px solid rgba(255,255,255,0.25)',
                        borderRadius:20, padding:'3px 9px', marginBottom:5,
                        boxShadow:'0 0 10px rgba(124,58,237,0.55)'
                      }}>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="#fff">
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                        <span style={{ fontSize:10, fontWeight:800, color:'#fff', letterSpacing:'0.04em' }}>LOCK</span>
                      </div>
                    )}
                    <div className="rl-card-badge">
                      <UsersIcon />
                      <span>{roomCounts[room.id] || 0}</span>
                    </div>
                    <div className="rl-card-enter"><ArrowRightIcon /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rules Section */}
        <section className="rl-rules-section">
          <div className="rl-rules-card">
            <div className="rl-rules-head">
              <div className="rl-rules-left">
                <ScrollIcon />
                <h3 className="rl-rules-title">Community Excellence Standards</h3>
              </div>
              <div className="rl-rules-controls">
                <button className="rl-audio-btn" onClick={handleReadRules}>
                  {isSpeaking ? <StopIcon /> : <SpeakerIcon />}
                  <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                </button>
                <select className="rl-lang-sel" value={voiceLang} onChange={e => setVoiceLang(e.target.value)}>
                  <option value="en-IN">English</option>
                  <option value="hi-IN">हिन्दी</option>
                </select>
              </div>
            </div>

            <div className="rl-rules-list">
              {enhancedRules.map((rule, i) => (
                <div key={i} className="rl-rule-item" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="rl-rule-num">{i + 1}</div>
                  <div className="rl-rule-content">
                    <div className="rl-rule-title">{rule.title}</div>
                    <div className="rl-rule-desc">{rule.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PremiumCopyright />

      {showStatusModal && <StatusModal onClose={() => setShowStatusModal(false)} />}
      {showAdultModal  && (
        <AdultRoomModal
          isOpen={showAdultModal}
          onConfirm={() => { navigate(`/room/${pendingAdultRoom?.id}`); setShowAdultModal(false); setPendingAdultRoom(null); }}
          onCancel={() => { setShowAdultModal(false); setPendingAdultRoom(null); }}
          roomName={pendingAdultRoom?.name || 'Adult Room'}
        />
      )}
      {showBanKickModal && (
        <BanKickModal
          isVisible
          onClose={() => { setShowBanKickModal(false); setKickModalData(null); }}
          kickInfo={kickModalData}
        />
      )}

      {/* ── Password Room Modal — dark premium design (matches Sidebar) ── */}
      {showPasswordModal && pwRoom && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:'16px',
          fontFamily:'Inter,-apple-system,sans-serif'
        }} onClick={e => { if (e.target === e.currentTarget) { setShowPasswordModal(false); setPwRoom(null); } }}>
          <div style={{
            background:'linear-gradient(150deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)',
            border:'1.5px solid rgba(99,102,241,0.4)',
            borderRadius:20, width:'100%', maxWidth:380,
            overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.6),0 0 60px rgba(99,102,241,0.15)'
          }}>
            {/* Header */}
            <div style={{ padding:'28px 24px 20px', borderBottom:'1px solid rgba(99,102,241,0.2)', textAlign:'center' }}>
              <div style={{
                width:64, height:64, borderRadius:'50%',
                background:'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))',
                border:'2px solid rgba(99,102,241,0.4)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 14px', boxShadow:'0 0 0 8px rgba(99,102,241,0.06)'
              }}>
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                  <defs>
                    <linearGradient id="rlPwLockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#818cf8"/>
                      <stop offset="100%" stopColor="#a78bfa"/>
                    </linearGradient>
                  </defs>
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="url(#rlPwLockGrad)"/>
                </svg>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:'#e2e8f0', marginBottom:6, letterSpacing:'-0.02em' }}>Password Required</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>
                <span style={{ color:'#a5b4fc', fontWeight:600 }}>{pwRoom.name}</span> is password-protected
              </div>
            </div>

            {/* Body */}
            <div style={{ padding:'20px 24px' }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                  <input
                    type={showPwText ? 'text' : 'password'}
                    value={pwInput}
                    onChange={e => { setPwInput(e.target.value); setPwError(''); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (pwInput.trim() === pwRoom.password) {
                          setShowPasswordModal(false);
                          proceedToRoom(pwRoom);
                        } else {
                          setPwError('Incorrect password. Please try again.');
                          setPwInput('');
                        }
                      }
                    }}
                    placeholder="Enter room password…"
                    autoFocus
                    style={{
                      width:'100%', padding:'12px 44px 12px 14px', borderRadius:12,
                      border:`1.5px solid ${pwError ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.3)'}`,
                      background:'rgba(255,255,255,0.06)', color:'#e2e8f0',
                      fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit'
                    }}
                  />
                  <button type="button" onClick={() => setShowPwText(p => !p)} style={{
                    position:'absolute', right:12, background:'none', border:'none',
                    cursor:'pointer', color:'#a5b4fc', padding:0, lineHeight:0
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width:18, height:18 }}>
                      {showPwText
                        ? <path fill="#a5b4fc" d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/>
                        : <path fill="#a5b4fc" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                      }
                    </svg>
                  </button>
                </div>
                {pwError && <div style={{ fontSize:12, color:'#f87171', marginTop:6, paddingLeft:4 }}>{pwError}</div>}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button
                  onClick={() => { setShowPasswordModal(false); setPwRoom(null); setPwInput(''); setPwError(''); }}
                  style={{
                    flex:'0 0 100px', height:44, borderRadius:12,
                    border:'1.5px solid rgba(255,255,255,0.12)',
                    background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.65)',
                    fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit'
                  }}
                >Cancel</button>
                <button
                  onClick={() => {
                    if (pwInput.trim() === pwRoom.password) {
                      setShowPasswordModal(false);
                      proceedToRoom(pwRoom);
                    } else {
                      setPwError('Incorrect password. Please try again.');
                      setPwInput('');
                    }
                  }}
                  style={{
                    flex:1, height:44, borderRadius:12, border:'none',
                    background:'linear-gradient(135deg,#6366f1,#7c3aed)',
                    color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
                    fontFamily:'inherit', boxShadow:'0 4px 16px rgba(99,102,241,0.4)'
                  }}
                >Enter Room</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoomListPage;
