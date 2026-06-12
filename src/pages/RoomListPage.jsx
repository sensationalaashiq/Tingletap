import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, rtdb } from '../firebase/config';
import { doc, setDoc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StatusModal from '../components/StatusModal';
import AdultRoomModal from '../components/AdultRoomModal';
import BanKickModal from '../components/BanKickModal';
import './RoomListPage.css';

/* ══════════════════════════════════════════════════════
   PREMIUM SVG ICONS
══════════════════════════════════════════════════════ */
const Ico = ({ d, w = 24, h = 24, children, ...rest }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display:'block', flexShrink:0 }} {...rest}>
    {d ? <path d={d} {...rest} /> : children}
  </svg>
);

const ShieldIcon = () => (
  <Ico w={28} h={28}>
    <defs>
      <linearGradient id="rl-sh" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a855f7"/>
      </linearGradient>
    </defs>
    <path d="M14 2.5L4 7v5.5C4 18.3 8.3 23.5 14 25c5.7-1.5 10-6.7 10-12.5V7L14 2.5z" fill="url(#rl-sh)" stroke="none"/>
    <path d="M9.5 13l3 3L19 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const RoomsIcon = () => (
  <Ico w={26} h={26}>
    <defs>
      <linearGradient id="rl-ri" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5b5bd6"/><stop offset="100%" stopColor="#a855f7"/>
      </linearGradient>
    </defs>
    <path d="M3 12L13 3l10 9v10a1 1 0 0 1-1 1H15v-6h-4v6H4a1 1 0 0 1-1-1V12z" fill="url(#rl-ri)"/>
  </Ico>
);

const ScrollIcon = () => (
  <Ico w={24} h={24}>
    <defs>
      <linearGradient id="rl-sci" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" fill="url(#rl-sci)"/>
    <path d="M14 2v6h6M8 13h8M8 17h5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
  </Ico>
);

const AdminIcon = () => (
  <Ico w={18} h={18}>
    <path d="M9 1.5L2 4.5v4C2 12.2 5 15.9 9 17c4-1.1 7-4.8 7-8.5v-4L9 1.5z" fill="white" opacity=".9"/>
    <path d="M6 9l2 2 4-4" stroke="rgba(79,70,229,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const SpeakerIcon = () => (
  <Ico w={16} h={16}>
    <path d="M3 6v4h3l4 4V2L6 6H3zM14.5 8c0-1.8-1-3.3-2.5-4.1v8.2C13.5 11.3 14.5 9.8 14.5 8z" fill="white"/>
  </Ico>
);

const StopIcon = () => (
  <Ico w={16} h={16}>
    <rect x="3" y="3" width="10" height="10" rx="2" fill="white"/>
  </Ico>
);

const ArrowIcon = () => (
  <Ico w={18} h={18}>
    <path d="M4 9h10M10 5l4 4-4 4" stroke="#5b21b6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const UsersIcon = () => (
  <Ico w={14} h={14}>
    <circle cx="5.5" cy="5" r="2.5" fill="#5b21b6"/>
    <path d="M1 13c0-2.8 2-4.5 4.5-4.5S10 10.2 10 13" stroke="#5b21b6" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10.5" cy="5" r="2" fill="#8b5cf6"/>
    <path d="M10 13c.5-1.8 1.8-3 3-3" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/>
  </Ico>
);

const MicIcon = () => (
  <Ico w={13} h={13}>
    <rect x="4" y="1" width="5" height="8" rx="2.5" fill="#5b21b6"/>
    <path d="M2 7a5 5 0 0 0 9 0M6.5 12v1.5" stroke="#5b21b6" strokeWidth="1.4" strokeLinecap="round"/>
  </Ico>
);

const MusicNoteIcon = () => (
  <Ico w={13} h={13}>
    <path d="M5 10V3.5l7-1.5V8" stroke="#5b21b6" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="4" cy="10.5" r="1.8" fill="#5b21b6"/>
    <circle cx="11" cy="8.5" r="1.8" fill="#5b21b6"/>
  </Ico>
);

const FileIcon = () => (
  <Ico w={13} h={13}>
    <path d="M3 1.5h5l3 3V11.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" fill="#5b21b6"/>
    <path d="M8 1.5v3h3" stroke="white" strokeWidth="1.2"/>
  </Ico>
);

const DiamondIcon = () => (
  <Ico w={16} h={16}>
    <defs>
      <linearGradient id="rl-dg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/><stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M8 1.5L1 6.5 8 14.5 15 6.5 8 1.5z" fill="url(#rl-dg)"/>
    <path d="M1 6.5h14" stroke="white" strokeWidth="0.7" opacity="0.4"/>
  </Ico>
);

const HeartIcon = () => (
  <Ico w={13} h={13}>
    <defs>
      <linearGradient id="rl-hg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
    <path d="M6.5 11.5S1.5 8 1.5 4.5a3.3 3.3 0 0 1 5-2.85A3.3 3.3 0 0 1 11.5 4.5C11.5 8 6.5 11.5 6.5 11.5z" fill="url(#rl-hg)"/>
  </Ico>
);

/* ── Room Icons ── */
const getRoomIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes('indian') || n.includes('hindi'))
    return (
      <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
        <defs><linearGradient id="ri-in" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff9933"/><stop offset="50%" stopColor="#fff"/><stop offset="100%" stopColor="#138808"/>
        </linearGradient></defs>
        <circle cx="14" cy="14" r="12" fill="url(#ri-in)" stroke="rgba(255,255,255,.5)" strokeWidth="1.5"/>
        <circle cx="14" cy="14" r="4" fill="#000080" opacity=".85"/>
        <path d="M10.5 14l2 2L17.5 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  if (n.includes('gaming') || n.includes('game'))
    return (
      <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
        <defs><linearGradient id="ri-gm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#ec4899"/>
        </linearGradient></defs>
        <rect x="3" y="9" width="22" height="11" rx="5.5" fill="url(#ri-gm)"/>
        <circle cx="9" cy="14.5" r="2" fill="white" opacity=".9"/>
        <rect x="12.5" y="13" width="1.5" height="3.5" rx=".75" fill="white" opacity=".9"/>
        <rect x="11" y="14.5" width="4.5" height="1.5" rx=".75" fill="white" opacity=".9"/>
        <circle cx="20" cy="13" r="1.2" fill="white" opacity=".9"/>
        <circle cx="20" cy="16" r="1.2" fill="white" opacity=".9"/>
      </svg>
    );
  if (n.includes('music') || n.includes('song'))
    return (
      <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
        <defs><linearGradient id="ri-mu" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#dc2626"/>
        </linearGradient></defs>
        <circle cx="14" cy="14" r="12" fill="url(#ri-mu)"/>
        <path d="M11 8v10.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2h1V12l7-1.5v6c0 1.1-.9 2-2 2s-2-.9-2-2h1V8l-7 1.5z" fill="white" opacity=".9"/>
      </svg>
    );
  if (n.includes('adult') || n.includes('18+'))
    return (
      <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
        <defs><linearGradient id="ri-ad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient></defs>
        <circle cx="14" cy="14" r="12" fill="url(#ri-ad)"/>
        <text x="14" y="18.5" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="900" fontFamily="Inter,sans-serif">18+</text>
      </svg>
    );
  if (n.includes('universal') || n.includes('world'))
    return (
      <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
        <defs><linearGradient id="ri-un" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981"/><stop offset="50%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#3b82f6"/>
        </linearGradient></defs>
        <circle cx="14" cy="14" r="12" fill="url(#ri-un)"/>
        <circle cx="14" cy="14" r="8" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" fill="none"/>
        <path d="M6 14h16M14 6c2.7 0 5 3.6 5 8s-2.3 8-5 8-5-3.6-5-8 2.3-8 5-8z" stroke="white" strokeWidth="1.4" fill="none"/>
      </svg>
    );
  if (n.includes('staff') || n.includes('admin'))
    return (
      <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
        <defs><linearGradient id="ri-st" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/>
        </linearGradient></defs>
        <path d="M14 2l2.5 5 5.5.5-4 3.8 1.2 5.5-5.2-2.8-5.2 2.8 1.2-5.5-4-3.8 5.5-.5L14 2z" fill="url(#ri-st)" stroke="rgba(255,255,255,.3)" strokeWidth="1"/>
      </svg>
    );
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
      <defs><linearGradient id="ri-df" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a855f7"/>
      </linearGradient></defs>
      <rect x="2" y="4" width="20" height="16" rx="4" fill="url(#ri-df)"/>
      <path d="M2 13l4 5" stroke="url(#ri-df)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="8" cy="12" r="1.8" fill="white" opacity=".9"/>
      <circle cx="14" cy="12" r="1.8" fill="white" opacity=".9"/>
      <circle cx="20" cy="12" r="1.8" fill="white" opacity=".9"/>
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
    'linear-gradient(135deg,#ff9a9e 0%,#fecfef 100%)',
    'linear-gradient(135deg,#ff6b6b 0%,#4ecdc4 100%)',
    'linear-gradient(135deg,#8360c3 0%,#2ebf91 100%)',
    'linear-gradient(135deg,#ff8a80 0%,#ea6100 100%)',
    'linear-gradient(135deg,#667db6 0%,#0082c8 100%)',
    'linear-gradient(135deg,#d4fc79 0%,#96e6a1 100%)',
    'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)',
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
  const [isAdmin, setIsAdmin]       = useState(false);
  const [userRole, setUserRole]     = useState('user');
  const [voiceLang, setVoiceLang]   = useState('en-IN');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAdultModal, setShowAdultModal]   = useState(false);
  const [pendingAdultRoom, setPendingAdultRoom] = useState(null);
  const [showBanKickModal, setShowBanKickModal] = useState(false);
  const navigate = useNavigate();

  /* Live rooms */
  useEffect(() => {
    const q = query(collection(db, 'rooms'), orderBy('order'));
    return onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  /* Room user counts */
  useEffect(() => {
    return onValue(ref(rtdb, 'status'), (snap) => {
      const presences = snap.val() || {};
      const counts = {};
      Object.values(presences).forEach(u => {
        if (u.state === 'online' && u.currentRoomId)
          counts[u.currentRoomId] = (counts[u.currentRoomId] || 0) + 1;
      });
      setRoomCounts(counts);
    });
  }, []);

  /* User role */
  useEffect(() => {
    const cu = auth.currentUser;
    if (!cu) return;
    getDoc(doc(db, 'users', cu.uid)).then(snap => {
      if (snap.exists()) {
        const role = snap.data().role || 'user';
        setUserRole(role);
        if (['admin', 'owner', 'moderator'].includes(role)) setIsAdmin(true);
      }
    });
  }, []);

  /* Window events */
  useEffect(() => {
    window.openStatusModal = () => setShowStatusModal(true);
    return () => { delete window.openStatusModal; };
  }, []);

  const enhancedRules = [
    { title: 'Respect & Kindness', description: 'Treat everyone with respect. No harassment, hate speech, or bullying.' },
    { title: 'No Spam', description: 'Avoid spamming messages, links, or promotional content.' },
    { title: 'Privacy Protection', description: 'Do not share personal information or request others\' private details.' },
    { title: 'No Illegal Content', description: 'Posting illegal content will result in immediate ban and legal action.' },
    { title: 'Age Appropriate', description: 'Users must be 13+ years old. Adult content restricted to 18+ rooms only.' },
    { title: 'No Impersonation', description: 'Do not impersonate staff, moderators, or other users.' },
    { title: 'Follow Staff Instructions', description: 'Comply with moderator and admin directions promptly.' },
    { title: 'Report Issues', description: 'Report inappropriate behaviour using the in-chat report feature.' },
    { title: 'Use Appropriate Language', description: 'Keep conversations civil and avoid excessive profanity.' },
    { title: 'No Self-Promotion', description: 'Do not advertise products or services without permission.' },
    { title: 'Guest Restrictions', description: 'Guests can only send messages. Private messages and friend requests require registration.' },
    { title: 'Guest Session Limits', description: 'Guest sessions are temporary. Register for full features including customisation.' },
  ];

  const handleReadRules = () => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const synth = window.speechSynthesis;
    let i = 0;
    setIsSpeaking(true);
    const speakNext = () => {
      if (i >= enhancedRules.length) { setIsSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(`Rule ${i + 1}: ${enhancedRules[i].title}. ${enhancedRules[i].description}`);
      u.lang = voiceLang; u.pitch = 1.1; u.rate = 0.85;
      u.onend = () => { setTimeout(() => { i++; speakNext(); }, 900); };
      synth.speak(u);
    };
    speakNext();
  };

  const handleRoomClick = async (room) => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const gd = localStorage.getItem('guestUser');
    const cu  = auth.currentUser;
    let userId = null, role = 'guest';

    if (isGuest && gd) {
      try { userId = JSON.parse(gd).uid; }
      catch { toast.error('Please login to access rooms'); return; }
    } else if (cu) {
      userId = cu.uid; role = userRole || 'user';
    } else {
      toast.error('Please login to access rooms'); return;
    }

    try {
      if (userId) {
        const kick = await getDoc(doc(db, 'rooms', room.id, 'kickedUsers', userId));
        if (kick.exists()) { setShowBanKickModal(true); return; }
      }
    } catch {}

    const name = room.name.toLowerCase();
    if (name.includes('staff') || name.includes('admin')) {
      if (!['owner','admin','moderator'].includes(role.toLowerCase())) {
        toast.error('🚫 Staff Room is restricted to staff only'); return;
      }
      toast.success(`✅ Staff Access Granted — Welcome ${role}!`);
    }

    if (name.includes('adult') || name.includes('18+')) {
      setPendingAdultRoom(room); setShowAdultModal(true);
    } else {
      navigate(`/room/${room.id}`);
    }
  };

  /* Loading screen */
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
        <div className="rl-orb rl-orb-1" /><div className="rl-orb rl-orb-2" /><div className="rl-orb rl-orb-3" />
      </div>

      {/* ══ HEADER ══ */}
      <header className="rl-header">
        <div className="rl-header-inner">
          <div className="rl-brand">
            <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="rl-logo" />
            <div className="rl-brand-text">
              <span className="rl-brand-name">TingleTap</span>
              <span className="rl-brand-sub">Premium Chat Universe</span>
            </div>
          </div>
          {isAdmin && (
            <button className="rl-admin-btn" onClick={() => navigate('/admin-panel')}>
              <AdminIcon /> Admin Console
            </button>
          )}
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main className="rl-main">

        {/* Welcome Card */}
        <div className="rl-welcome">
          <div className="rl-welcome-icon"><ShieldIcon /></div>
          <h2 className="rl-welcome-title">Welcome to TingleTap</h2>
          <p className="rl-welcome-desc">Experience premium real-time conversations in our curated chat universes</p>
          <div className="rl-stats">
            <div className="rl-stat">
              <div className="rl-stat-num">{rooms.length}</div>
              <div className="rl-stat-lbl">Chat Rooms</div>
            </div>
            <div className="rl-stat">
              <div className="rl-stat-num">{totalOnline}</div>
              <div className="rl-stat-lbl">Online Now</div>
            </div>
          </div>
        </div>

        {/* Rooms Section */}
        <section className="rl-rooms-section">
          <div className="rl-section-head">
            <RoomsIcon />
            <h3 className="rl-section-title">Premium Chat Universes</h3>
            <span className="rl-section-count">{rooms.length} Rooms</span>
          </div>

          <div className="rl-grid">
            {rooms.map((room, idx) => (
              <div
                key={room.id}
                className="rl-card"
                style={{ background: getRoomGradient(room.name), animationDelay: `${idx * 0.07}s` }}
                onClick={() => handleRoomClick(room)}
              >
                <div className="rl-card-top" />

                <div className="rl-card-hrow">
                  <div className="rl-card-ico">{getRoomIcon(room.name)}</div>
                  <div className="rl-card-badge">
                    <UsersIcon />
                    {roomCounts[room.id] || 0}
                  </div>
                </div>

                <div className="rl-card-body">
                  <div className="rl-card-name">{room.name}</div>
                  <div className="rl-card-desc">{getRoomDesc(room.name)}</div>
                  <div className="rl-card-features">
                    <span className="rl-feat-tag"><MicIcon /> Voice</span>
                    <span className="rl-feat-tag"><FileIcon /> Files</span>
                    <span className="rl-feat-tag"><MusicNoteIcon /> Music</span>
                  </div>
                </div>

                <div className="rl-card-enter"><ArrowIcon /></div>
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
                  {isSpeaking ? 'Stop' : 'Listen'}
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

      {/* Footer */}
      <footer className="rl-footer">
        <div className="rl-footer-inner">
          <div className="rl-footer-brand">TingleTap™</div>
          <div className="rl-footer-copy">© 2026 · All rights reserved</div>
          <div className="rl-footer-craft">
            Crafted with <HeartIcon /> by <strong>Adrashtra Inc.</strong>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showStatusModal && <StatusModal onClose={() => setShowStatusModal(false)} />}
      {showAdultModal  && (
        <AdultRoomModal
          isOpen={showAdultModal}
          onConfirm={() => { navigate(`/room/${pendingAdultRoom.id}`); setShowAdultModal(false); setPendingAdultRoom(null); }}
          onCancel={() => { setShowAdultModal(false); setPendingAdultRoom(null); }}
          roomName={pendingAdultRoom?.name || 'Adult Room'}
        />
      )}
      {showBanKickModal && <BanKickModal isVisible onClose={() => setShowBanKickModal(false)} />}

      <ToastContainer position="bottom-center" autoClose={3000} theme="light"
        toastStyle={{ background:'rgba(255,255,255,.95)', backdropFilter:'blur(16px)', border:'1.5px solid rgba(99,102,241,.2)', borderRadius:'14px', color:'#1e1b4b', fontFamily:'Inter,sans-serif' }} />
    </div>
  );
};

export default RoomListPage;
