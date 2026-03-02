import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, rtdb } from '../firebase/config';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StatusModal from '../components/StatusModal';
import AdultRoomModal from '../components/AdultRoomModal';
import BanKickModal from '../components/BanKickModal';

const RoomListPage = () => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [rooms, setRooms] = useState([]);
  const [roomCounts, setRoomCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAdultModal, setShowAdultModal] = useState(false);
  const [pendingAdultRoom, setPendingAdultRoom] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [showBanKickModal, setShowBanKickModal] = useState(false);
  const navigate = useNavigate();

  const pageBackgroundColors = {
    roomListPage: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)',
    welcomePage: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
    loginPage: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    signupPage: 'linear-gradient(135deg, #ffdde1 0%, #ee9ca7 100%)',
    disclaimerPage: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    aboutPage: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
    landingPage: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    contactPage: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    faqPage: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    forgotPasswordPage: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    resetPasswordPage: 'linear-gradient(135deg, #ffdde1 0%, #ee9ca7 100%)',
    termsPage: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  };

  const pageTextColors = {
    roomListPage: '#2d3748',
    welcomePage: '#333',
    loginPage: '#2c3e50',
    signupPage: '#4a148c',
    disclaimerPage: '#1565c0',
    aboutPage: '#2e7d32',
    landingPage: '#d65108',
    contactPage: '#e53935',
    faqPage: '#0277bd',
    forgotPasswordPage: '#d65108',
    resetPasswordPage: '#4a148c',
    termsPage: '#1565c0',
  };

  const currentPath = window.location.pathname;
  const pageKey = currentPath.split('/').pop() || 'roomListPage'; // Default to roomListPage if no specific page found

  let containerBackground = styles.container.background;
  let textColor = styles.container.color;

  if (pageKey !== 'homepage' && pageBackgroundColors[pageKey]) {
    containerBackground = pageBackgroundColors[pageKey];
    textColor = pageTextColors[pageKey] || '#2d3748';
  }

  useEffect(() => {
    const q = query(collection(db, 'rooms'), orderBy('order'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const presenceRef = ref(rtdb, 'status');
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const presences = snapshot.val() || {};
      const counts = {};
      Object.values(presences).forEach(user => {
        if (user.state === 'online' && user.currentRoomId) {
          counts[user.currentRoomId] = (counts[user.currentRoomId] || 0) + 1;
        }
      });
      setRoomCounts(counts);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const role = userData.role || 'user';
        setUserRole(role);
        if (['admin', 'owner', 'moderator'].includes(role)) setIsAdmin(true);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    const handleThemeChange = (e) => {
      setIsDarkMode(e.detail.isDarkMode);
    };

    window.openStatusModal = () => {
      setShowStatusModal(true);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      delete window.openStatusModal;
    };
  }, []);

  const getRoomGradient = (name) => {
    const luxuryGradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
      'linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)',
      'linear-gradient(135deg, #ff8a80 0%, #ea6100 100%)',
      'linear-gradient(135deg, #667db6 0%, #0082c8 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return luxuryGradients[Math.abs(hash) % luxuryGradients.length];
  };

  const getRoomIcon = (name) => {
    const roomName = name.toLowerCase();

    if (roomName.includes('indian') || roomName.includes('hindi')) {
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <defs>
            <linearGradient id="indianGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff9933"/>
              <stop offset="50%" stopColor="#ffffff"/>
              <stop offset="100%" stopColor="#138808"/>
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="url(#indianGradient)" stroke="#ffffff" strokeWidth="2"/>
          <circle cx="16" cy="16" r="4" fill="#000080" stroke="#ffffff" strokeWidth="1.5"/>
          <path d="M12 16L14 18L20 12" stroke="#ffffff" strokeWidth="2.5" fill="none"/>
        </svg>
      );
    }

    if (roomName.includes('gaming') || roomName.includes('game')) {
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <defs>
            <linearGradient id="gamingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6"/>
              <stop offset="100%" stopColor="#ec4899"/>
            </linearGradient>
          </defs>
          <rect x="4" y="10" width="24" height="12" rx="6" fill="url(#gamingGradient)" stroke="#ffffff" strokeWidth="2"/>
          <circle cx="10" cy="16" r="2" fill="#ffffff"/>
          <circle cx="22" cy="14" r="1.5" fill="#ffffff"/>
          <circle cx="22" cy="18" r="1.5" fill="#ffffff"/>
          <rect x="14" y="14" width="1.5" height="4" fill="#ffffff"/>
          <rect x="12" y="16" width="5" height="1.5" fill="#ffffff"/>
        </svg>
      );
    }

    if (roomName.includes('music') || roomName.includes('song')) {
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <defs>
            <linearGradient id="musicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b"/>
              <stop offset="100%" stopColor="#dc2626"/>
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="url(#musicGradient)" stroke="#ffffff" strokeWidth="2"/>
          <path d="M12 8v12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2h1V12l8-2v8c0 1.1-.9 2-2 2s-2-.9-2-2h1V8l-8 2z" fill="#ffffff"/>
        </svg>
      );
    }

    if (roomName.includes('adult') || roomName.includes('18+')) {
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <defs>
            <linearGradient id="adultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="url(#adultGradient)" stroke="#ffffff" strokeWidth="2"/>
          <text x="16" y="20" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">18+</text>
        </svg>
      );
    }

    if (roomName.includes('universal') || roomName.includes('world')) {
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <defs>
            <linearGradient id="universalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981"/>
              <stop offset="50%" stopColor="#06b6d4"/>
              <stop offset="100%" stopColor="#3b82f6"/>
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="url(#universalGradient)" stroke="#ffffff" strokeWidth="2"/>
          <circle cx="16" cy="16" r="10" stroke="#ffffff" strokeWidth="2" fill="none"/>
          <path d="M8 16h16M16 8c3.31 0 6 3.59 6 8s-2.69 8-6 8M10 16c0-4.41 2.69-8 6-8s6 3.59 6 8-2.69 8-6 8" stroke="#ffffff" strokeWidth="1.5" fill="none"/>
        </svg>
      );
    }

    if (roomName.includes('staff') || roomName.includes('admin')) {
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <defs>
            <linearGradient id="staffGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24"/>
              <stop offset="100%" stopColor="#f59e0b"/>
            </linearGradient>
          </defs>
          <path d="M16 2l3.09 6.26L25 9.27l-4 3.9.94 5.51L16 16.18l-5.94 2.5L11 13.17 7 9.27l5.91-.01L16 2z" fill="url(#staffGradient)" stroke="#ffffff" strokeWidth="2"/>
          {!['owner', 'admin', 'moderator'].includes(userRole.toLowerCase()) && (
            <>
              <circle cx="16" cy="16" r="12" fill="rgba(0,0,0,0.7)"/>
              <path d="M16,19C14.34,19 13,17.66 13,16C13,14.34 14.34,13 16,13C17.66,13 19,14.34 19,16C19,17.66 17.66,19 16,19M22,24V14H10V24H22M22,12C23.1,12 24,12.9 24,14V24C24,25.1 23.1,26 22,26H10C8.9,26 8,25.1 8,24V14C8,12.9 8.9,12 10,12H11V10C11,7.24 13.24,5 16,5C18.76,5 21,7.24 21,10V12H22M16,7C14.34,7 13,8.34 13,10V12H19V10C19,8.34 17.66,7 16,7Z" fill="#ffffff"/>
            </>
          )}
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
        <defs>
          <linearGradient id="defaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea"/>
            <stop offset="100%" stopColor="#764ba2"/>
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill="url(#defaultGradient)" stroke="#ffffff" strokeWidth="2"/>
        <path d="M16 8c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#ffffff"/>
      </svg>
    );
  };

  const enhancedRules = [
    {
      title: 'Respect & Kindness',
      description: 'Treat everyone with respect. No harassment, hate speech, or bullying.'
    },
    {
      title: 'No Spam',
      description: 'Avoid spamming messages, links, or promotional content.'
    },
    {
      title: 'Privacy Protection',
      description: 'Do not share personal information or request others\' private details.'
    },
    {
      title: 'No Illegal Content',
      description: 'Posting illegal content will result in immediate ban and legal action.'
    },
    {
      title: 'Age Appropriate',
      description: 'Users must be 13+ years old. Adult content restricted to 18+ rooms only.'
    },
    {
      title: 'No Impersonation',
      description: 'Do not impersonate staff, moderators, or other users.'
    },
    {
      title: 'Follow Staff Instructions',
      description: 'Comply with moderator and admin directions promptly.'
    },
    {
      title: 'Report Issues',
      description: 'Report inappropriate behavior using the report feature.'
    },
    {
      title: 'Use Appropriate Language',
      description: 'Keep conversations civil and avoid excessive profanity.'
    },
    {
      title: 'No Self-Promotion',
      description: 'Do not advertise products, services, or other platforms without permission.'
    },
    {
      title: "Guest User Restrictions",
      description: "Guests can only send messages and view profiles. Private messages, friend requests, and advanced features require a registered account."
    },
    {
      title: "Guest Session Limits",
      description: "Guest sessions are temporary. Register for full features including private messaging, friend system, and customization options."
    }
  ];

  const handleReadRules = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const synth = window.speechSynthesis;
    let i = 0;
    setIsSpeaking(true);

    const speakNext = () => {
      if (i >= enhancedRules.length) {
        setIsSpeaking(false);
        return;
      }

      const ruleText = `Rule ${i + 1}: ${enhancedRules[i].title}. ${enhancedRules[i].description}`;
      const utter = new SpeechSynthesisUtterance(ruleText);
      utter.lang = voiceLang;
      utter.pitch = 1.1;
      utter.rate = 0.85;
      utter.volume = 1;
      utter.onend = () => {
        setTimeout(() => {
          i++;
          speakNext();
        }, 1000);
      };
      synth.speak(utter);
    };

    speakNext();
  };

  const handleRoomClick = async (room) => {
    // Check for guest or authenticated user
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const guestData = localStorage.getItem('guestUser');
    const currentUser = auth.currentUser;

    let userId = null;
    let currentUserRole = 'guest';

    // Get user ID and role
    if (isGuest && guestData) {
      try {
        const parsedGuestData = JSON.parse(guestData);
        userId = parsedGuestData.uid;
        currentUserRole = 'guest';
      } catch (error) {
        console.error("Error parsing guest data:", error);
        toast.error("🔐 Please login to access rooms");
        return;
      }
    } else if (currentUser) {
      userId = currentUser.uid;
      currentUserRole = userRole || 'user';
    } else {
      toast.error("🔐 Please login to access rooms");
      return;
    }

    // Check kick status
    try {
      if (userId) {
        const kickedUserDocRef = doc(db, 'rooms', room.id, 'kickedUsers', userId);
        const kickDoc = await getDoc(kickedUserDocRef);

        if (kickDoc.exists()) {
          setShowBanKickModal(true);
          return;
        }
      }
    } catch (error) {
      console.error("Error checking kick status:", error);
    }

    // Check staff room access
    if (room.name.toLowerCase().includes('staff') || room.name.toLowerCase().includes('admin')) {
      const allowedRoles = ['owner', 'admin', 'moderator'];

      if (!allowedRoles.includes(currentUserRole.toLowerCase())) {
        toast.error("🚫 Access Denied: Staff Room is restricted to Staff Members only");
        return;
      }

      toast.success(`✅ Staff Room Access Granted - Welcome ${currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}!`);
    }

    // Check adult room access
    if (room.name.toLowerCase().includes('adult') || room.name.toLowerCase().includes('18+')) {
      setPendingAdultRoom(room);
      setShowAdultModal(true);
    } else {
      navigate(`/room/${room.id}`);
    }
  };

  const handleAdultRoomConfirm = () => {
    if (pendingAdultRoom) {
      navigate(`/room/${pendingAdultRoom.id}`);
      setShowAdultModal(false);
      setPendingAdultRoom(null);
    }
  };

  const handleAdultRoomCancel = () => {
    setShowAdultModal(false);
    setPendingAdultRoom(null);
  };

  const handleStatusUpdate = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      await setDoc(doc(db, 'status', uid), {
        state: 'online',
        statusText: newStatus
      }, { merge: true });

      setShowStatusModal(false);
      setNewStatus('');
      toast.success("Status updated successfully!");
    } catch (err) {
      console.error("Status update failed", err);
      toast.error("Failed to update status.");
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.luxurySpinner}>
            <div style={styles.spinnerRing}></div>
            <div style={styles.spinnerRing}></div>
            <div style={styles.spinnerRing}></div>
          </div>
          <h2 style={styles.loadingText}>TingleTap</h2>
          <p style={styles.loadingSubtext}>Preparing your luxury experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.container,
      background: containerBackground,
      color: textColor
    }}>
      <div style={styles.backgroundOverlay}></div>
      <div style={styles.floatingParticles}>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{...styles.particle, animationDelay: `${i * 0.3}s`}}></div>
        ))}
      </div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

          @keyframes luxuryFadeIn {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes luxurySlideIn {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
          }

          @keyframes luxurySpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes luxuryFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(2deg); }
          }

          @keyframes luxuryPulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
          }

          @keyframes particleFloat {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
          }

          @keyframes shimmerEffect {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          .luxury-glass {
            background: rgba(255, 255, 255, 0.6);
            border: 1px solid rgba(138, 43, 226, 0.2);
            border-radius: 20px;
            transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
            position: relative;
            overflow: hidden;
          }

          .luxury-glass::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(138,43,226,0.1), transparent);
            transition: left 0.8s ease;
          }

          .luxury-glass:hover::before {
            left: 100%;
          }

          .luxury-glass:hover {
            background: rgba(255, 255, 255, 0.75);
            border-color: rgba(138, 43, 226, 0.35);
            transform: translateY(-5px);
            box-shadow: 
              0 25px 50px rgba(138, 43, 226, 0.2),
              0 15px 30px rgba(255, 255, 255, 0.2) inset;
          }

          .room-card {
            transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
            cursor: pointer;
          }

          .room-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 
              0 30px 60px rgba(138, 43, 226, 0.25),
              0 0 40px rgba(255, 255, 255, 0.3) inset;
          }

          .room-card:hover .room-icon {
            transform: scale(1.1) rotate(5deg);
            animation: luxuryFloat 2s ease-in-out infinite;
          }

          .premium-button {
            background: linear-gradient(135deg, #8A2BE2 0%, #BA55D3 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            padding: 10px 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(138, 43, 226, 0.3);
          }

          .premium-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s ease;
          }

          .premium-button:hover::before {
            left: 100%;
          }

          .premium-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(138, 43, 226, 0.45);
          }

          @media (max-width: 768px) {
            .room-card {
              min-height: 140px !important;
            }
            .luxury-glass {
              border-radius: 14px !important;
            }
          }

          @media (max-width: 640px) {
            .luxury-header-content {
              gap: 0.8rem !important;
            }
            .luxury-brand-text .luxury-brand-name {
              font-size: 1.5rem !important;
            }
            .luxury-brand-text .luxury-brand-subtitle {
              font-size: 0.75rem !important;
            }
            .premium-button {
              padding: 8px 14px !important;
              font-size: 0.8rem !important;
              min-width: 90px !important;
            }
          }
        `}
      </style>

      {/* Header Section */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.brandSection}>
            <div style={styles.logoContainer}>
              <img 
                src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
                alt="TingleTap Logo" 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  background: 'white, linear-gradient(45deg, #ff0080, #ff1493, #ff4081, #e91e63, #9c27b0, #8a2be2, #673ab7, #3f51b5, #2196f3, #00bcd4, #20b2aa, #009688, #4caf50, #32cd32, #8bc34a, #cddc39, #ffeb3b, #ffd700, #ffc107, #ff9800, #ff8c00, #ff5722, #f44336, #dc143c, #ff0080)',
                  backgroundClip: 'padding-box, border-box',
                  objectFit: 'contain',
                  padding: '2px',
                  boxShadow: '0 3px 12px rgba(102, 126, 234, 0.3)'
                }}
              />
            </div>
            <div style={styles.brandText}>
              <h1 style={styles.title}>TingleTap</h1>
              <p style={styles.subtitle}>Premium Chat Universe</p>
            </div>
          </div>

          {(['owner', 'admin'].includes(userRole.toLowerCase())) && (
            <button
              onClick={() => navigate('/admin-panel')}
              style={styles.adminButton}
              className="premium-button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C14.8,12.6 13.9,13.5 12.8,13.5H11.2C10.1,13.5 9.2,12.6 9.2,11.5V10C9.2,8.6 10.6,7 12,7Z" fill="white" stroke="white" strokeWidth="0.5"/>
              </svg>
              Admin Console
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Welcome Section */}
        <section style={styles.welcomeSection}>
          <div style={styles.welcomeCard} className="luxury-glass">
            <div style={styles.welcomeIcon}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" fill="#8b5cf6"/>
              </svg>
            </div>
            <h2 style={styles.welcomeTitle}>Welcome to TingleTap</h2>
            <p style={styles.welcomeText}>Experience luxury conversations in our premium chat universes</p>
            <div style={styles.statsContainer}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{rooms.length}</div>
                <div style={styles.statLabel}>Luxury Rooms</div>
              </div>
              <div style={styles.statDivider}></div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{Object.values(roomCounts).reduce((a, b) => a + b, 0)}</div>
                <div style={styles.statLabel}>Active Members</div>
              </div>
            </div>
          </div>
        </section>

        {/* Rooms Grid */}
        <section style={styles.roomsSection}>
          <div style={styles.sectionHeader}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{marginRight: '12px'}}>
              <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" fill="#8b5cf6"/>
            </svg>
            <h3 style={styles.sectionTitle}>Premium Chat Universes</h3>
          </div>
          <div style={styles.roomsGrid}>
            {rooms.map((room, index) => (
              <div 
                key={room.id} 
                onClick={() => handleRoomClick(room)}
                style={{
                  ...styles.roomCard,
                  background: getRoomGradient(room.name),
                  animationDelay: `${index * 0.1}s`
                }}
                className="room-card luxury-glass"
              >
                <div style={styles.roomHeader}>
                  <div style={styles.roomIconWrapper}>
                    <div style={styles.roomIcon} className="room-icon">
                      {getRoomIcon(room.name)}
                    </div>
                  </div>
                  <div style={styles.roomBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{marginRight: '4px'}}>
                      <defs>
                        <linearGradient id={`userCountGradient-${room.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24"/>
                          <stop offset="100%" stopColor="#f59e0b"/>
                        </linearGradient>
                      </defs>
                      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9M15 9.5V11L21 12V10L15 9.5Z" fill={`url(#userCountGradient-${room.id})`} stroke="#ffffff" strokeWidth="0.5"/>
                    </svg>
                    {roomCounts[room.id] || 0}
                  </div>
                </div>

                <div style={styles.roomContent}>
                  <h4 style={styles.roomName}>{room.name}</h4>
                  <p style={styles.roomDescription}>
                    {room.name.toLowerCase().includes('indian') && 'Immerse yourself in Indian culture, traditions, and vibrant conversations'}
                    {room.name.toLowerCase().includes('gaming') && 'Elite gaming community for tournaments, strategies, and live match experiences'}
                    {room.name.toLowerCase().includes('music') && 'Premium music lounge for discovering and sharing extraordinary musical journeys'}
                    {room.name.toLowerCase().includes('adult') && 'Sophisticated adult discussions in a refined, moderated environment'}
                    {room.name.toLowerCase().includes('universal') && 'Global luxury chat connecting cultures and languages worldwide'}
                    {room.name.toLowerCase().includes('staff') && `Executive Lounge - Premium staff communications (${['owner', 'admin', 'moderator'].includes(userRole.toLowerCase()) ? 'VIP Access' : 'Restricted'})`}
                    {!room.name.toLowerCase().match(/(indian|gaming|music|adult|universal|staff)/) && 'Premium conversations with distinguished members'}
                  </p>

                  <div style={styles.featuresList}>
                    <span style={styles.featureBadge}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{marginRight: '4px'}}>
                        <defs>
                          <linearGradient id="voiceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#667eea"/>
                            <stop offset="100%" stopColor="#764ba2"/>
                          </linearGradient>
                        </defs>
                        <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" fill="url(#voiceGradient)" stroke="#ffffff" strokeWidth="0.5"/>
                      </svg>
                      Voice
                    </span>
                    <span style={styles.featureBadge}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{marginRight: '4px'}}>
                        <defs>
                          <linearGradient id="filesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f093fb"/>
                            <stop offset="100%" stopColor="#f5576c"/>
                          </linearGradient>
                        </defs>
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9H18V20H6V4H13V9Z" fill="url(#filesGradient)" stroke="#ffffff" strokeWidth="0.5"/>
                      </svg>
                      Files
                    </span>
                    <span style={styles.featureBadge}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{marginRight: '4px'}}>
                        <defs>
                          <linearGradient id="musicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#4facfe"/>
                            <stop offset="100%" stopColor="#00f2fe"/>
                          </linearGradient>
                        </defs>
                        <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" fill="url(#musicGradient)" stroke="#ffffff" strokeWidth="0.5"/>
                      </svg>
                      Music
                    </span>
                  </div>
                </div>

                <div style={styles.enterButton}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rules Section */}
        <section style={styles.rulesSection}>
          <div style={styles.rulesCard} className="luxury-glass">
            <div style={styles.rulesHeader}>
              <div style={styles.rulesIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9H18V20H6V4H13V9H18V20Z" fill="#8b5cf6"/>
                </svg>
              </div>
              <h3 style={styles.rulesTitle}>Community Excellence Standards</h3>
              <div style={styles.rulesControls}>
                <button onClick={handleReadRules} style={styles.audioButton} className="premium-button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '6px'}}>
                    <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" fill="white" stroke="white" strokeWidth="0.3"/>
                  </svg>
                  {isSpeaking ? 'Stop' : 'Listen'}
                </button>
                <select 
                  value={voiceLang} 
                  onChange={e => setVoiceLang(e.target.value)} 
                  style={styles.langSelect}
                >
                  <option value="en-IN">English</option>
                  <option value="hi-IN">हिन्दी</option>
                </select>
              </div>
            </div>

            <div style={styles.rulesContainer}>
              {enhancedRules.map((rule, idx) => (
                <div key={idx} style={styles.ruleItem} className="luxury-glass">
                  <div style={styles.ruleNumber}>{idx + 1}</div>
                  <div style={styles.ruleContent}>
                    <h4 style={styles.ruleTitle}>{rule.title}</h4>
                    <p style={styles.ruleDescription}>{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Status Modal */}
      {showStatusModal && (
        <StatusModal onClose={() => setShowStatusModal(false)} />
      )}

      {/* Adult Room Confirmation Modal */}
      {showAdultModal && (
        <AdultRoomModal
          isOpen={showAdultModal}
          onConfirm={handleAdultRoomConfirm}
          onCancel={handleAdultRoomCancel}
          roomName={pendingAdultRoom?.name || 'Adult Room'}
        />
      )}

      {/* Ban/Kick Modal */}
      {showBanKickModal && (
        <BanKickModal 
          isVisible={true}
          onClose={() => setShowBanKickModal(false)}
        />
      )}

      <ToastContainer 
        position="bottom-center" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(138, 43, 226, 0.3)',
          borderRadius: '12px',
          color: '#2d3748'
        }}
      />

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.copyrightContainer}>
            <div style={styles.copyrightDiamond}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#diamondGradient1)" stroke="#ffffff" strokeWidth="1"/>
                <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="url(#diamondGradient2)" stroke="#ffffff" strokeWidth="1"/>
                <defs>
                  <linearGradient id="diamondGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                  <linearGradient id="diamondGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f093fb" />
                    <stop offset="100%" stopColor="#f5576c" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p style={styles.copyrightText}>
              <span style={styles.copyrightYear}>© 2024</span>
              <span style={styles.copyrightBrand}>TingleTap™</span>
            </p>
            <p style={styles.copyrightSubtext}>
              All rights reserved • Developed by Adrashtra Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)',
    fontFamily: "'Poppins', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    color: '#2d3748'
  },

  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(186, 85, 211, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(221, 160, 221, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(230, 230, 250, 0.2) 0%, transparent 50%)
    `,
    zIndex: 0
  },

  floatingParticles: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 1
  },

  particle: {
    position: 'absolute',
    width: '4px',
    height: '4px',
    background: 'rgba(138, 43, 226, 0.4)',
    borderRadius: '50%',
    animation: 'particleFloat 15s linear infinite',
    left: `${Math.random() * 100}%`,
    animationDuration: `${10 + Math.random() * 10}s`
  },

  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)',
    fontFamily: "'Poppins', sans-serif"
  },

  loadingContent: {
    textAlign: 'center',
    color: '#2d3748'
  },

  luxurySpinner: {
    position: 'relative',
    width: '80px',
    height: '80px',
    margin: '0 auto 2rem'
  },

  spinnerRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    border: '3px solid transparent',
    borderTop: '3px solid #8A2BE2',
    borderRadius: '50%',
    animation: 'luxurySpin 1.2s linear infinite'
  },

  loadingText: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    fontFamily: "'Playfair Display', serif",
    color: '#2d3748'
  },

  loadingSubtext: {
    fontSize: '1rem',
    opacity: 0.7,
    fontWeight: '300',
    color: '#4a5568'
  },

  header: {
    position: 'relative',
    zIndex: 10,
    padding: '1.5rem 1rem',
    animation: 'luxurySlideIn 0.8s ease-out'
  },

  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },

  brandSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem'
  },

  logoContainer: {
    animation: 'luxuryFloat 3s ease-in-out infinite'
  },

  brandText: {
    display: 'flex',
    flexDirection: 'column'
  },

  title: {
    fontSize: '2rem',
    fontWeight: '800',
    margin: '0',
    fontFamily: "'Playfair Display', serif",
    background: 'linear-gradient(135deg, #8A2BE2 0%, #BA55D3 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },

  subtitle: {
    fontSize: '0.85rem',
    margin: '0',
    opacity: 0.8,
    fontWeight: '500',
    letterSpacing: '0.1em',
    color: '#4a5568'
  },

  adminButton: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontFamily: "'Inter', sans-serif",
    padding: '10px 16px',
    minWidth: '120px',
    whiteSpace: 'nowrap'
  },

  main: {
    position: 'relative',
    zIndex: 2,
    padding: '0 1rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },

  welcomeSection: {
    marginBottom: '2rem',
    animation: 'luxuryFadeIn 0.8s ease-out 0.2s both'
  },

  welcomeCard: {
    padding: '1.5rem',
    textAlign: 'center',
    maxWidth: '600px',
    margin: '0 auto',
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(15px)'
  },

  welcomeIcon: {
    marginBottom: '0.8rem',
    animation: 'luxuryPulse 2s ease-in-out infinite'
  },

  welcomeTitle: {
    fontSize: '1.6rem',
    fontWeight: '700',
    marginBottom: '0.8rem',
    fontFamily: "'Playfair Display', serif",
    color: '#2d3748'
  },

  welcomeText: {
    fontSize: '0.95rem',
    opacity: 0.8,
    marginBottom: '1.5rem',
    lineHeight: '1.5',
    color: '#4a5568'
  },

  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem'
  },

  statBox: {
    textAlign: 'center'
  },

  statNumber: {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '0.3rem',
    color: '#8A2BE2'
  },

  statLabel: {
    fontSize: '0.75rem',
    opacity: 0.7,
    fontWeight: '500',
    color: '#4a5568'
  },

  statDivider: {
    width: '1px',
    height: '30px',
    background: 'rgba(138, 43, 226, 0.3)'
  },

  roomsSection: {
    marginBottom: '2rem',
    animation: 'luxuryFadeIn 0.8s ease-out 0.4s both'
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem'
  },

  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    fontFamily: "'Playfair Display', serif",
    color: '#2d3748'
  },

  roomsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '0.75rem',
    '@media (max-width: 640px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '0.6rem'
    }
  },

  roomCard: {
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '140px',
    borderRadius: '14px',
    overflow: 'hidden',
    position: 'relative',
    animation: 'luxuryFadeIn 0.6s ease-out both',
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(15px)',
    border: '1.5px solid rgba(138, 43, 226, 0.25)',
    boxShadow: '0 4px 12px rgba(138, 43, 226, 0.15)',
    '@media (max-width: 640px)': {
      minHeight: '120px',
      borderRadius: '12px'
    }
  },

  roomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0.875rem 0',
    '@media (max-width: 640px)': {
      padding: '0.6rem 0.75rem 0'
    }
  },

  roomIconWrapper: {
    display: 'flex',
    alignItems: 'center'
  },

  roomIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.25)',
    border: '2px solid rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.3)',
    '@media (max-width: 640px)': {
      width: '32px',
      height: '32px'
    }
  },

  roomBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    color: '#ffffff',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '0.8rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
    border: '1.5px solid rgba(255, 255, 255, 0.3)',
    zIndex: 2
  },

  roomContent: {
    padding: '0.7rem 0.875rem',
    flex: 1
  },

  roomName: {
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '0.35rem',
    fontFamily: "'Inter', sans-serif",
    color: '#ffffff',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },

  roomDescription: {
    fontSize: '0.75rem',
    opacity: 1,
    lineHeight: '1.35',
    marginBottom: '0.7rem',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    color: '#ffffff',
    fontWeight: '600',
    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
  },

  featuresList: {
    display: 'flex',
    gap: '0.35rem',
    flexWrap: 'wrap'
  },

  featureBadge: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: '700',
    border: '1.5px solid rgba(138, 43, 226, 0.3)',
    color: '#5b21b6',
    boxShadow: '0 2px 8px rgba(138, 43, 226, 0.25), 0 1px 3px rgba(255, 255, 255, 0.5) inset',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease'
  },

  enterButton: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#ffffff',
    border: '2px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '24px',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
    zIndex: 2,
    fontWeight: '700',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  rulesSection: {
    animation: 'luxuryFadeIn 0.8s ease-out 0.6s both'
  },

  rulesCard: {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto'
  },

  rulesHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },

  rulesIcon: {
    marginBottom: '1rem'
  },

  rulesTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    fontFamily: "'Playfair Display', serif",
    color: '#2d3748'
  },

  rulesControls: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },

  audioButton: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem'
  },

  langSelect: {
    background: 'rgba(138, 43, 226, 0.1)',
    border: '1px solid rgba(138, 43, 226, 0.3)',
    borderRadius: '12px',
    padding: '8px 12px',
    color: '#2d3748',
    fontSize: '0.85rem',
    fontWeight: '500'
  },

  rulesContainer: {
    display: 'grid',
    gap: '1rem'
  },

  ruleItem: {
    display: 'flex',
    gap: '1rem',
    padding: '1.5rem',
    alignItems: 'flex-start',
    borderRadius: '16px'
  },

  ruleNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: '700',
    flexShrink: 0
  },

  ruleContent: {
    flex: 1
  },

  ruleTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    fontFamily: "'Inter', sans-serif",
    color: '#2d3748'
  },

  ruleDescription: {
    fontSize: '0.85rem',
    opacity: 0.8,
    lineHeight: '1.5',
    margin: '0',
    color: '#4a5568'
  },

  footer: {
    position: 'relative',
    zIndex: 10,
    padding: '2.5rem 1.5rem',
    marginTop: '3rem',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
    borderTop: '2px solid rgba(139, 92, 246, 0.2)'
  },

  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center'
  },

  copyrightContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },

  copyrightDiamond: {
    animation: 'luxuryFloat 3s ease-in-out infinite',
    filter: 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.4))'
  },

  copyrightText: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    margin: '0',
    fontSize: '1rem',
    fontWeight: '600'
  },

  copyrightYear: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: '1.1rem'
  },

  copyrightBrand: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: '800',
    fontSize: '1.2rem',
    letterSpacing: '0.5px',
    textShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
  },

  copyrightVersion: {
    color: '#6b7280',
    fontSize: '0.9rem',
    fontWeight: '500',
    letterSpacing: '0.5px'
  },

  copyrightSubtext: {
    margin: '0',
    fontSize: '0.85rem',
    color: '#9ca3af',
    fontWeight: '400',
    letterSpacing: '0.3px',
    fontStyle: 'italic'
  }
};

export default RoomListPage;