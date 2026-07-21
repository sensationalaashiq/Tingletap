import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import PremiumCopyright from '../components/PremiumCopyright';
import SEO from '../seo/SEO';
import { WebSiteSchema, OrganizationSchema, WebApplicationSchema, BreadcrumbSchema, ServiceSchema, FeaturesListSchema } from '../seo/StructuredData';
import { PAGES, SITE } from '../seo/seoConfig';

/* ═══════════════════════════════════════════════════════
   PREMIUM LUXURY SVG ICON LIBRARY
═══════════════════════════════════════════════════════ */

const CrystalSparkle = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L13.8 7.2L20 9L13.8 10.8L12 17L10.2 10.8L4 9L10.2 7.2L12 1Z" fill="currentColor"/>
    <path d="M20 16L20.9 19.1L24 20L20.9 20.9L20 24L19.1 20.9L16 20L19.1 19.1L20 16Z" fill="currentColor" opacity="0.6"/>
    <path d="M4 1L4.7 3.3L7 4L4.7 4.7L4 7L3.3 4.7L1 4L3.3 3.3L4 1Z" fill="currentColor" opacity="0.45"/>
  </svg>
);

const LuxuryBolt = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2L4 13H11L10 22L20.5 11H13.5L14 2Z" fill="currentColor"/>
    <path d="M14 2L4 13H11L10 22L20.5 11H13.5L14 2Z" fill="white" opacity="0.2"/>
  </svg>
);

const GoldTrophy = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 3H17V11C17 14.3 14.8 17 12 17C9.2 17 7 14.3 7 11V3Z" fill="currentColor"/>
    <path d="M4 5H7V9C5.3 9 4 7.7 4 6V5Z" fill="currentColor" opacity="0.7"/>
    <path d="M17 5H20V6C20 7.7 18.7 9 17 9V5Z" fill="currentColor" opacity="0.7"/>
    <path d="M10 17V20M8 23H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M9 20H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const LuxuryWhiteGem = ({ size = 16 }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M10 1.2L11.9 8.1L18.8 10L11.9 11.9L10 18.8L8.1 11.9L1.2 10L8.1 8.1L10 1.2Z" fill="white"/>
    <circle cx="10" cy="10" r="2.1" fill="white" opacity="0.55"/>
    <path d="M10 1.2L11.9 8.1L10 10L8.1 8.1L10 1.2Z" fill="white" opacity="0.28"/>
    <path d="M5.4 5.4L8.6 8.6" stroke="white" strokeWidth="0.6" strokeLinecap="round" opacity="0.35"/>
    <path d="M14.6 14.6L11.4 11.4" stroke="white" strokeWidth="0.6" strokeLinecap="round" opacity="0.35"/>
  </svg>
);

const CheckMark = ({ size = 14 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 8.5L6 12L13.5 4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CrossMark = ({ size = 12 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* Feature card icons — jewel / glass style */
const IconChatRooms = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="28" height="18" rx="6" fill="url(#ic1a)"/>
    <rect x="2" y="4" width="28" height="18" rx="6" fill="url(#ic1b)" opacity="0.3"/>
    <circle cx="10" cy="13" r="2.4" fill="white"/>
    <circle cx="16" cy="13" r="2.4" fill="white"/>
    <circle cx="22" cy="13" r="2.4" fill="white"/>
    <path d="M7 22L10 19H24" stroke="url(#ic1a)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="ic1a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient>
      <linearGradient id="ic1b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const TrendUpIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 17L9 11L13 15L21 7" stroke="url(#trendUpGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 7H21V13" stroke="url(#trendUpGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="trendUpGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4f46e5"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient>
    </defs>
  </svg>
);

const IconVoice = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="13" fill="url(#ic2a)"/>
    <circle cx="16" cy="16" r="13" fill="url(#ic2b)" opacity="0.25"/>
    <rect x="12" y="7" width="8" height="12" rx="4" fill="white"/>
    <path d="M9 17C9 20.9 12.1 24 16 24S23 20.9 23 17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 24V28M13 28H19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="ic2a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f43f5e"/><stop offset="100%" stopColor="#fb923c"/></linearGradient>
      <linearGradient id="ic2b" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconPrivate = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="14" width="26" height="15" rx="5" fill="url(#ic3a)"/>
    <rect x="3" y="14" width="26" height="15" rx="5" fill="url(#ic3b)" opacity="0.25"/>
    <path d="M9 14V11C9 7.7 11.7 5 15 5H17C20.3 5 23 7.7 23 11V14" stroke="url(#ic3a)" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="16" cy="21" r="2.8" fill="white"/>
    <path d="M16 23.8V26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="ic3a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#6366f1"/></linearGradient>
      <linearGradient id="ic3b" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconTools = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="16" r="8" fill="url(#ic4a)" opacity="0.9"/>
    <circle cx="22" cy="16" r="8" fill="url(#ic4b)" opacity="0.9"/>
    <circle cx="16" cy="16" r="5" fill="url(#ic4c)"/>
    <path d="M10 12V20M22 12V20M8 16H12M20 16H24" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <defs>
      <linearGradient id="ic4a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#6366f1"/></linearGradient>
      <linearGradient id="ic4b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#a855f7"/></linearGradient>
      <linearGradient id="ic4c" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#c084fc"/></linearGradient>
    </defs>
  </svg>
);

const IconPremium = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3L19.5 11H28L21.5 16L23.8 24L16 19.5L8.2 24L10.5 16L4 11H12.5L16 3Z" fill="url(#ic5a)"/>
    <path d="M16 3L19.5 11H28L21.5 16L23.8 24L16 19.5L8.2 24L10.5 16L4 11H12.5L16 3Z" fill="url(#ic5b)" opacity="0.35"/>
    <circle cx="16" cy="14.5" r="3.5" fill="white" opacity="0.9"/>
    <defs>
      <linearGradient id="ic5a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="50%" stopColor="#ef4444"/><stop offset="100%" stopColor="#dc2626"/></linearGradient>
      <linearGradient id="ic5b" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconShield = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3L5 8V15C5 21.6 9.8 27.7 16 29C22.2 27.7 27 21.6 27 15V8L16 3Z" fill="url(#ic6a)"/>
    <path d="M16 3L5 8V15C5 21.6 9.8 27.7 16 29C22.2 27.7 27 21.6 27 15V8L16 3Z" fill="url(#ic6b)" opacity="0.25"/>
    <path d="M10.5 16.5L14 20L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="ic6a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#059669"/></linearGradient>
      <linearGradient id="ic6b" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconTingleBot = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icbot1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a855f7"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient>
      <linearGradient id="icbot2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
    <rect x="3" y="9" width="26" height="18" rx="5" fill="url(#icbot1)"/>
    <rect x="3" y="9" width="26" height="18" rx="5" fill="url(#icbot2)" opacity="0.2"/>
    <circle cx="11" cy="18" r="2.5" fill="white" opacity="0.9"/>
    <circle cx="21" cy="18" r="2.5" fill="white" opacity="0.9"/>
    <path d="M12.5 22.5c1 1.5 5.5 1.5 7 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M12 9V6M20 9V6" stroke="url(#icbot1)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="5" r="1.5" fill="url(#icbot1)"/>
    <circle cx="20" cy="5" r="1.5" fill="url(#icbot1)"/>
  </svg>
);

const IconBroadcast = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icbc1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#dc2626"/></linearGradient>
      <linearGradient id="icbc2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
    <circle cx="16" cy="16" r="13" fill="url(#icbc1)" opacity="0.15"/>
    <circle cx="16" cy="16" r="4.5" fill="url(#icbc1)"/>
    <path d="M10.2 10.2a8 8 0 000 11.6" stroke="url(#icbc1)" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M21.8 10.2a8 8 0 010 11.6" stroke="url(#icbc1)" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M6.5 6.5a13.5 13.5 0 000 19" stroke="url(#icbc1)" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
    <path d="M25.5 6.5a13.5 13.5 0 010 19" stroke="url(#icbc1)" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

const IconEmoji = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icem1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient>
      <linearGradient id="icem2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
    <circle cx="16" cy="16" r="13" fill="url(#icem1)"/>
    <circle cx="16" cy="16" r="13" fill="url(#icem2)" opacity="0.18"/>
    <circle cx="11" cy="13" r="2" fill="white" opacity="0.9"/>
    <circle cx="21" cy="13" r="2" fill="white" opacity="0.9"/>
    <path d="M9 19c1.5 3.5 12.5 3.5 14 0" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M4 8l3-3M28 8l-3-3M6 25l2-2M26 25l-2-2" stroke="url(#icem1)" strokeWidth="1.8" strokeLinecap="round" opacity="0.55"/>
  </svg>
);

const IconRadio = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icrad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#2dd4bf"/><stop offset="100%" stopColor="#0d9488"/></linearGradient>
      <linearGradient id="icrad2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
    <rect x="2" y="11" width="28" height="17" rx="5" fill="url(#icrad1)"/>
    <rect x="2" y="11" width="28" height="17" rx="5" fill="url(#icrad2)" opacity="0.18"/>
    <circle cx="10" cy="19.5" r="4" fill="white" opacity="0.3"/>
    <circle cx="10" cy="19.5" r="2" fill="white" opacity="0.85"/>
    <path d="M17 15h8M17 19.5h8M17 24h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.85"/>
    <path d="M5 11L13 4h6" stroke="url(#icrad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="19" cy="4" r="1.5" fill="url(#icrad1)"/>
  </svg>
);

const IconGift = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icgift1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
      <linearGradient id="icgift2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
    <rect x="4" y="14" width="24" height="14" rx="3" fill="url(#icgift1)"/>
    <rect x="4" y="14" width="24" height="14" rx="3" fill="url(#icgift2)" opacity="0.2"/>
    <rect x="3" y="9" width="26" height="7" rx="3" fill="url(#icgift1)" opacity="0.85"/>
    <path d="M16 9V28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 12.5H28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <path d="M16 9C16 9 12 4 9 6s1 5 7 3z" fill="white" opacity="0.8"/>
    <path d="M16 9C16 9 20 4 23 6s-1 5-7 3z" fill="white" opacity="0.8"/>
  </svg>
);

const IconCTAHeart = ({ size = 44 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icheart" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="50%" stopColor="#a855f7"/><stop offset="100%" stopColor="#6366f1"/></linearGradient>
    </defs>
    <path d="M24 42C24 42 5 30 5 17C5 11.5 9.5 7 15 7C18.3 7 21.2 8.6 23 11.1C24.8 8.6 27.7 7 31 7C36.5 7 41 11.5 41 17C41 30 24 42 24 42Z" fill="url(#icheart)"/>
    <path d="M24 42C24 42 5 30 5 17C5 11.5 9.5 7 15 7C18.3 7 21.2 8.6 23 11.1C24.8 8.6 27.7 7 31 7C36.5 7 41 11.5 41 17C41 30 24 42 24 42Z" fill="white" opacity="0.15"/>
    <path d="M17 21L21.5 26L31.5 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DiamondGem = ({ size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="igem" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="50%" stopColor="#f0abfc"/><stop offset="100%" stopColor="#818cf8"/></linearGradient>
    </defs>
    <path d="M12 2L4 8L12 22L20 8L12 2Z" fill="url(#igem)"/>
    <path d="M4 8H20" stroke="white" strokeWidth="0.8" opacity="0.6"/>
    <path d="M8 2.5L4 8L12 22L8 2.5Z" fill="white" opacity="0.15"/>
    <path d="M16 2.5L20 8L12 22L16 2.5Z" fill="white" opacity="0.08"/>
  </svg>
);

const StarBadge = ({ size = 13 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.5L9.4 5.7H13.8L10.3 8.1L11.6 12.3L8 9.9L4.4 12.3L5.7 8.1L2.2 5.7H6.6L8 1.5Z" fill="currentColor"/>
  </svg>
);


/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [totalRooms, setTotalRooms] = useState(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Real room count via public Netlify function — no Firestore auth needed on the landing page.
  // Fix L-13: rooms collection is now auth-gated; this endpoint provides count-only public access.
  useEffect(() => {
    let cancelled = false;
    const fetchRoomCount = async () => {
      try {
        const res = await fetch('/.netlify/functions/getPublicRoomCount');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { count } = await res.json();
        if (!cancelled && typeof count === 'number') setTotalRooms(count);
      } catch (err) {
        console.warn('Room count fetch failed:', err?.message);
      }
    };
    fetchRoomCount();
    const iv = setInterval(fetchRoomCount, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  const features = [
    { Icon: IconChatRooms,  title: 'Real-Time Chat Rooms',        desc: '9+ themed rooms — Indian, International, Gaming, Music Lounge and Staff Rooms with live messaging, typing indicators and styled text.', tags: ['Live', 'Auto-Scroll', 'Styled Text'], bg: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))', color: '#6366f1' },
    { Icon: IconTingleBot,  title: 'TingleBot AutoMod',            desc: 'Built-in moderation bot that auto-detects spam, abuse, homoglyphs and toxic language in real-time — keeping every room clean 24/7.', tags: ['AutoMod', 'Anti-Spam', 'Guardian'], bg: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(109,40,217,0.08))', color: '#a855f7' },
    { Icon: IconBroadcast,  title: 'RJ Radio Shows',               desc: 'Verified RJs host live voice shows with synced YouTube music for all listeners. Background audio keeps playing even when the panel is minimized.', tags: ['RJ Live', 'Voice Shows', 'Background Play'], bg: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(220,38,38,0.08))', color: '#ef4444' },
    { Icon: IconRadio,      title: 'Live Broadcast',               desc: 'Any user can go live — one-to-one or one-to-all — with optional password protection. Start your own broadcast room and invite listeners instantly.', tags: ['Go Live', 'Password Lock', 'One-to-All'], bg: 'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(234,88,12,0.08))', color: '#f97316' },
    { Icon: IconVoice,      title: 'Broadcast Stage',              desc: 'During an RJ live show, audience members can request to join the stage and speak live alongside the RJ — creating a real mini-podcast experience.', tags: ['Stage', 'Speaker', 'Mini Podcast'], bg: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(109,40,217,0.08))', color: '#7c3aed' },
    { Icon: IconGift,       title: 'Virtual Gifts & Coin Wallet',  desc: 'Send roses, crowns and diamonds to your favourite RJ during live shows. Track coin earnings, view the leaderboard and buy coin packs.', tags: ['Coins', 'Gifts', 'Leaderboard'], bg: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.08))', color: '#f59e0b' },
    { Icon: IconEmoji,      title: 'Auto Translation',             desc: 'Messages are automatically translated into your preferred language in real-time — so language is never a barrier in any chat room.', tags: ['Translate', 'Multi-Language', 'Real-Time'], bg: 'linear-gradient(135deg,rgba(6,182,212,0.12),rgba(8,145,178,0.08))', color: '#06b6d4' },
    { Icon: IconTools,      title: 'Emoji Reactions',              desc: 'React to any message instantly with animated emoji. Express yourself with hearts, fire, laugh, sad and more — all in real-time.', tags: ['Reactions', 'Animated', 'Live'], bg: 'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.08))', color: '#eab308' },
    { Icon: IconPrivate,    title: 'Private Messaging',            desc: '1-on-1 private conversations with file sharing, voice messages, read receipts and draggable floating chat windows.', tags: ['Private', 'Files', 'History'], bg: 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(99,102,241,0.08))', color: '#7c3aed' },
    { Icon: IconPremium,    title: 'Premium Customization',        desc: 'Badge holders unlock gradient text effects, glowing animations, username FX, custom fonts and exclusive profile styling.', tags: ['Gradient', 'Animations', 'Badges'], bg: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.08))', color: '#d97706' },
    { Icon: IconShield,     title: 'Security & Moderation',        desc: 'VPN detection, device fingerprinting, TingleBot AutoMod, kick/ban/mute, IP banning and comprehensive reporting tools.', tags: ['VPN Shield', 'AutoMod', 'Reports'], bg: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.08))', color: '#10b981' },
    { Icon: IconChatRooms,  title: 'Voice & Media Sharing',        desc: 'Send voice messages, record audio in-chat and embed YouTube videos in real-time for the whole room to watch together.', tags: ['Voice', 'YouTube', 'Media'], bg: 'linear-gradient(135deg,rgba(244,63,94,0.12),rgba(251,146,60,0.08))', color: '#f43f5e' },
    { Icon: IconTools,      title: 'Advanced User Tools',          desc: 'Gender-based filtering, friend requests, user blocking, whisper messages, full profiles and status with rich text effects.', tags: ['Filters', 'Friends', 'Block'], bg: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.08))', color: '#3b82f6' },
  ];

  const tiers = [
    {
      name: 'Free User', price: '₹0', sub: 'Always Free',
      color: '#3b82f6', border: 'rgba(59,130,246,0.25)', glow: 'rgba(59,130,246,0.08)',
      btnStyle: { background: 'transparent', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.35)' },
      items: [
        ['All public chat rooms access', true], ['Basic text messaging', true],
        ['Voice message sending', true], ['Private messaging (1-on-1)', true],
        ['Friend requests system', true], ['Gender filter browsing', true],
        ['YouTube video sharing', false], ['Image & media uploads', false],
        ['Advanced text styling', false], ['Premium badges', false],
      ],
    },
    {
      name: 'Badge Holder', price: 'Premium', sub: 'Most Popular',
      color: '#7c3aed', border: 'rgba(124,58,237,0.4)', glow: 'rgba(124,58,237,0.12)',
      featured: true,
      btnStyle: { background: 'linear-gradient(135deg,#5b5bd6,#7c3aed,#a855f7)', color: '#fff', borderColor: 'transparent' },
      items: [
        ['Everything in Free User', true], ['YouTube video sharing', true],
        ['Image & media uploads', true], ['Advanced text styling', true],
        ['Gradient & glow effects', true], ['Username customization', true],
        ['Text animations', true], ['Premium badges display', true],
        ['Priority support access', true], ['Exclusive features first', true],
      ],
    },
    {
      name: 'Staff Access', price: 'Invite Only', sub: 'Elite Tier',
      color: '#b45309', border: 'rgba(180,83,9,0.28)', glow: 'rgba(251,191,36,0.07)',
      btnStyle: { background: 'transparent', color: '#b45309', borderColor: 'rgba(180,83,9,0.32)' },
      items: [
        ['Everything in Badge Holder', true], ['Staff room access', true],
        ['Kick / Ban / Mute powers', true], ['Full moderation panel', true],
        ['Advanced reporting tools', true], ['Real-time user monitoring', true],
        ['Admin panel access', true], ['Special role badges', true],
        ['All features — forever', true], ['Priority in all features', true],
      ],
    },
  ];

  return (
    <div className="lp-root">
      <SEO
        title={PAGES.landing.title}
        description={PAGES.landing.description}
        keywords={PAGES.landing.keywords}
        canonical={PAGES.landing.canonical}
        robots={PAGES.landing.robots}
        ogType={PAGES.landing.ogType}
      />
      <WebSiteSchema />
      <OrganizationSchema />
      <WebApplicationSchema />
      <ServiceSchema />
      <FeaturesListSchema />
      <BreadcrumbSchema crumbs={[{ name: 'Home', url: SITE.url }]} />
      {/* Ambient Background */}
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
      </div>

      {/* ══ HEADER ══ */}
      <header className={`lp-header${scrolled ? ' lp-header--scrolled' : ''}`}>
        <div className="lp-header-inner">
          <div className="lp-brand">
            <img src="/tingletap-logo.jpg" alt="TingleTap" className="lp-logo" />
            <div className="lp-brand-text">
              <span className="lp-brand-name">TingleTap</span>
              <span className="lp-brand-tag">Premium Chat Experience</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-btn-ghost" onClick={() => navigate('/login')}>
              Sign In
            </button>
            <button className="lp-btn-primary" onClick={() => navigate('/signup')}>
              <span>Get Started</span>
              <LuxuryWhiteGem size={15} />
            </button>
          </nav>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-badge lp-anim-fade">
            <CrystalSparkle size={14} />
            <span>India's Premier Chat Platform</span>
          </div>

          <h1 className="lp-hero-h1 lp-anim-up">
            Connect with India's<br />
            <span className="lp-grad">Most Vibrant</span><br />
            Chat Community
          </h1>

          <p className="lp-hero-p lp-anim-up lp-d1">
            Real-time conversations with voice messages, private chats,
            gender filters and premium customization. Beautifully crafted for real connections.
          </p>

          <div className="lp-stats lp-anim-up lp-d2">
            <div className="lp-stat">
              <span className="lp-stat-n">{totalRooms !== null ? `${totalRooms}+` : '—'}</span>
              <span className="lp-stat-l">Chat Rooms</span>
            </div>
            <div className="lp-stat-sep" />
            <div className="lp-stat">
              <span className="lp-stat-growing-icon"><TrendUpIcon size={18} /></span>
              <span className="lp-stat-l lp-stat-growing">Users Growing</span>
            </div>
          </div>

          <div className="lp-hero-btns lp-anim-up lp-d3">
            <button className="lp-cta-main" onClick={() => navigate('/rooms')}>
              <span>Start Chatting Now</span>
              <LuxuryWhiteGem size={18} />
              <span className="lp-shimmer" aria-hidden="true" />
            </button>
            <button className="lp-cta-outline" onClick={() => navigate('/signup')}>
              <span>Create Free Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="lp-section lp-features-section">
        <div className="lp-container">
          <div className="lp-sec-head lp-anim-up">
            <div className="lp-badge">
              <LuxuryBolt size={14} />
              <span>Features</span>
            </div>
            <h2 className="lp-sec-h2">Everything You Need to <span className="lp-grad">Chat Like a Pro</span></h2>
            <p className="lp-sec-sub">India's most feature-rich platform, built for real meaningful connections</p>
          </div>
          <div className="lp-features-grid">
            {features.map(({ Icon, title, desc, tags, bg, color }, i) => (
              <div key={i} className="lp-feat-card lp-anim-up" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="lp-feat-icon-wrap" style={{ background: bg }}>
                  <Icon size={30} />
                </div>
                <h3 className="lp-feat-title">{title}</h3>
                <p className="lp-feat-desc">{desc}</p>
                <div className="lp-feat-tags">
                  {tags.map((t, j) => (
                    <span key={j} className="lp-tag" style={{ color, background: `${color}14`, borderColor: `${color}38` }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PLANS ══ */}
      <section className="lp-section lp-tiers-section">
        <div className="lp-container">
          <div className="lp-sec-head lp-anim-up">
            <div className="lp-badge">
              <GoldTrophy size={14} />
              <span>Plans</span>
            </div>
            <h2 className="lp-sec-h2">Choose Your <span className="lp-grad">Experience Level</span></h2>
            <p className="lp-sec-sub">From free users to premium badge holders — find your perfect tier</p>
          </div>
          <div className="lp-tiers-grid">
            {tiers.map((t, i) => (
              <div
                key={i}
                className={`lp-tier${t.featured ? ' lp-tier-featured' : ''} lp-anim-up`}
                style={{ '--tb': t.border, '--tg': t.glow, animationDelay: `${i * 0.1}s` }}
              >
                {t.featured && (
                  <div className="lp-tier-badge">
                    <StarBadge size={13} />
                    <span>Most Popular</span>
                  </div>
                )}
                <div className="lp-tier-head">
                  <h3 className="lp-tier-name" style={{ color: t.color }}>{t.name}</h3>
                  <div className="lp-tier-price">{t.price}</div>
                  <div className="lp-tier-sub">{t.sub}</div>
                </div>
                <div className="lp-tier-line" style={{ background: `linear-gradient(90deg, ${t.color}, transparent)` }} />
                <ul className="lp-tier-list">
                  {t.items.map(([label, ok], j) => (
                    <li key={j} className={`lp-tier-item${ok ? '' : ' lp-no'}`}>
                      <span className="lp-tier-ic" style={{ color: ok ? t.color : '#94a3b8', background: ok ? `${t.color}14` : 'rgba(148,163,184,0.1)' }}>
                        {ok ? <CheckMark size={13} /> : <CrossMark size={11} />}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className="lp-tier-btn"
                  style={t.btnStyle}
                  onClick={() => {
                    if (t.name === 'Staff Access') { setShowStaffModal(true); return; }
                    navigate(t.name === 'Free User' ? '/rooms' : '/signup');
                  }}
                >
                  {t.name === 'Free User' ? 'Start For Free' : t.name === 'Badge Holder' ? 'Get Badge Access' : 'Learn More'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section className="lp-cta-section">
        <div className="lp-container">
          <div className="lp-cta-inner lp-anim-up">
            <div className="lp-cta-icon-wrap">
              <IconCTAHeart size={48} />
            </div>
            <h2 className="lp-cta-h2">
              Ready to Join India's Best<br />
              <span className="lp-grad">Chat Community?</span>
            </h2>
            <p className="lp-cta-p">
              Our community is growing every day. Join free today.
            </p>
            <div className="lp-hero-btns" style={{ maxWidth: 460, margin: '0 auto' }}>
              <button className="lp-cta-main" onClick={() => navigate('/rooms')}>
                <span>Start Chatting Now</span>
                <LuxuryWhiteGem size={18} />
                <span className="lp-shimmer" aria-hidden="true" />
              </button>
              <button className="lp-cta-outline" onClick={() => navigate('/login')}>
                <span>Sign In to Account</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="lp-footer">
        <div className="lp-footer-bg" aria-hidden="true">
          <div className="lp-footer-orb lp-footer-orb-1" />
          <div className="lp-footer-orb lp-footer-orb-2" />
          <div className="lp-footer-orb lp-footer-orb-3" />
        </div>

        <div className="lp-footer-inner">
          <div className="lp-footer-main">

            {/* Brand */}
            <div className="lp-footer-brand-col">
              <div className="lp-footer-brand">
                <img src="/tingletap-logo.jpg" alt="TingleTap" className="lp-footer-logo" />
                <div>
                  <h3 className="lp-footer-brand-name">TingleTap</h3>
                  <p className="lp-footer-brand-tag">India's Premium Chat Experience</p>
                </div>
              </div>
              <p className="lp-footer-desc">
                Connect with a growing community across India in our beautifully designed platform.
                Real-time conversations with premium customization and powerful features.
              </p>
              <div className="lp-footer-stats">
                <div className="lp-footer-stat">
                  <span className="lp-fs-num">{totalRooms !== null ? `${totalRooms}+` : '—'}</span>
                  <span className="lp-fs-lbl">Chat Rooms</span>
                </div>
                <div className="lp-fs-sep" />
                <div className="lp-footer-stat">
                  <span className="lp-fs-num">24/7</span>
                  <span className="lp-fs-lbl">Support</span>
                </div>
              </div>
            </div>

            {/* Right column: social icons + quick links */}
            <div className="lp-footer-links">

              {/* ── Follow Us ── */}
              <div className="lp-footer-col lp-footer-social-col">
                <h4 className="lp-footer-col-title">Follow Us</h4>
                <div className="lp-footer-social-row">

                  {/* Instagram */}
                  <a href="https://www.instagram.com/tingletap" target="_blank" rel="noopener noreferrer" className="lp-social-btn lp-social-instagram" aria-label="TingleTap on Instagram">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>

                  {/* Facebook */}
                  <a href="https://www.facebook.com/share/18uwA1Ybpd/" target="_blank" rel="noopener noreferrer" className="lp-social-btn lp-social-facebook" aria-label="TingleTap on Facebook">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>

                  {/* X / Twitter */}
                  <a href="https://x.com/tingletaps" target="_blank" rel="noopener noreferrer" className="lp-social-btn lp-social-x" aria-label="TingleTap on X">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.26 5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>

                  {/* YouTube */}
                  <a href="https://youtube.com/@tingletaps" target="_blank" rel="noopener noreferrer" className="lp-social-btn lp-social-youtube" aria-label="TingleTap on YouTube">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>

                  {/* LinkedIn */}
                  <a href="https://www.linkedin.com/in/tingle-tap-b8aa38253" target="_blank" rel="noopener noreferrer" className="lp-social-btn lp-social-linkedin" aria-label="TingleTap on LinkedIn">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>

                  {/* Threads */}
                  <a href="https://www.threads.com/@tingletap" target="_blank" rel="noopener noreferrer" className="lp-social-btn lp-social-threads" aria-label="TingleTap on Threads">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.01v-.017c0-3.578.85-6.43 2.495-8.483C5.845 1.208 8.6.026 12.18.001h.014c2.746.018 5.143.908 6.951 2.572 1.881 1.729 2.917 4.1 3.099 7.02l.012.217h-3.035l-.019-.207c-.174-1.95-.928-3.499-2.24-4.604-1.253-1.058-2.858-1.589-4.773-1.589h-.016c-3.084.022-5.318.973-6.644 2.831C4.2 7.611 3.605 9.605 3.605 12c0 2.393.595 4.388 1.834 6.096 1.327 1.858 3.568 2.809 6.66 2.831h.016c2.484-.018 4.42-.619 5.757-1.789 1.306-1.143 2.04-2.784 2.178-4.865l.017-.254h3.023l-.011.262c-.216 2.9-1.268 5.208-3.129 6.858C17.735 22.976 15.188 24 12.186 24zM13.69 5.76c1.49.098 2.827.613 3.774 1.536.956.919 1.498 2.25 1.614 3.96l.03.432h-1.92l-.018-.237c-.111-1.46-.603-2.491-1.462-3.063-.81-.539-1.877-.792-3.165-.772-.78.012-1.553.176-2.298.49-.722.304-1.329.76-1.803 1.354-.54.674-.851 1.474-1.002 2.34H5.62c.147-.998.451-1.906.913-2.72.518-.912 1.232-1.65 2.121-2.196.87-.534 1.85-.841 2.897-.919a8.37 8.37 0 0 1 2.139.013zm-.014 7.354c-.34 0-.676.03-.998.09-.562.105-1.046.347-1.437.72-.388.371-.65.87-.78 1.481-.1.47-.115.954-.044 1.438.07.484.236.921.492 1.302.32.472.765.82 1.323 1.034.505.192 1.07.284 1.678.274 1.198-.019 2.112-.417 2.716-1.183.55-.696.839-1.683.852-2.936v-.02l-.003-.2h-3.8z"/>
                    </svg>
                  </a>

                </div>
              </div>

              {/* ── Support & Legal ── */}
              <div className="lp-footer-col" style={{marginTop: 28}}>
                <h4 className="lp-footer-col-title">Support & Legal</h4>
                <ul>
                  <li><button onClick={() => navigate('/about')}>About TingleTap</button></li>
                  <li><button onClick={() => navigate('/contact')}>Contact Support</button></li>
                  <li><button onClick={() => navigate('/faq')}>FAQ & Help</button></li>
                  <li><button onClick={() => navigate('/privacy')}>Privacy Policy</button></li>
                  <li><button onClick={() => navigate('/terms')}>Terms of Service</button></li>
                  <li><button onClick={() => navigate('/disclaimer')}>Disclaimer</button></li>
                </ul>
              </div>
            </div>

          </div>

          <div className="lp-footer-divider" />

        </div>
      </footer>
      <PremiumCopyright />

      {/* ══ STAFF ACCESS MODAL ══ */}
      {showStaffModal && (
        <div className="lp-staff-overlay" onClick={() => setShowStaffModal(false)}>
          <div className="lp-staff-modal" onClick={e => e.stopPropagation()}>
            <button className="lp-staff-modal-close" onClick={() => setShowStaffModal(false)}>✕</button>

            <div style={{ textAlign: 'center' }}>
              <div className="lp-staff-modal-icon">
                <svg viewBox="0 0 40 40" width="38" height="38" fill="none">
                  <defs>
                    <linearGradient id="sc-g" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24"/>
                      <stop offset="100%" stopColor="#d97706"/>
                    </linearGradient>
                  </defs>
                  <path d="M6 32L10 16L20 24L30 10L36 20L32 32H8Z" fill="url(#sc-g)" opacity="0.15"/>
                  <path d="M8 28L13 14L20 22L28 12L34 20L30 28H10Z" fill="url(#sc-g)"/>
                  <circle cx="8" cy="14" r="3" fill="#fbbf24"/>
                  <circle cx="20" cy="8" r="3.5" fill="#f59e0b"/>
                  <circle cx="32" cy="14" r="3" fill="#fbbf24"/>
                  <path d="M13 28H27V32H13Z" fill="#d97706" opacity="0.5"/>
                  <path d="M11 32H29" stroke="#b45309" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="lp-staff-modal-elite">Staff Access · Invite Only · Elite Tier</div>
              <span className="lp-staff-modal-title">Staff Access</span>
              <span className="lp-staff-modal-sub">
                Our Staff members are the backbone of TingleTap. They are handpicked by the core team for their dedication, positive attitude and the trust they have built within the community. This is not a role you apply for. It is one you earn.
              </span>
            </div>

            <div className="lp-staff-modal-divider" />

            <span className="lp-staff-section-label">What Staff Members Get</span>
            <ul className="lp-staff-perk-list">
              {[
                ['Everything in Badge Holder, plus a lot more', '★'],
                ['Access to private Staff-only rooms', '🔒'],
                ['Kick, Ban and Mute capabilities on users', '🛡'],
                ['Full moderation and admin panel access', '⚙'],
                ['Real-time user activity monitoring', '👁'],
                ['Special Staff role badge shown to everyone', '🏅'],
                ['Priority access to all new features', '⚡'],
                ['Your Staff role stays for as long as you are active', '∞'],
              ].map(([text, icon]) => (
                <li key={text} className="lp-staff-perk-item">
                  <span className="lp-staff-perk-dot">{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <div className="lp-staff-modal-divider" />

            <span className="lp-staff-section-label">How to Become Staff</span>
            <div className="lp-staff-steps">
              {[
                ['Be genuinely active in TingleTap for a good period of time', '1'],
                ['Be helpful to other users and contribute positively to the community', '2'],
                ['Keep a clean record — no bans, no serious warnings', '3'],
                ['If you are a good fit, our core team will reach out to you directly', '4'],
              ].map(([text, num]) => (
                <div key={num} className="lp-staff-step">
                  <span className="lp-staff-step-num">{num}</span>
                  <span className="lp-staff-step-text">{text}</span>
                </div>
              ))}
            </div>

            <div className="lp-staff-contact-box">
              Staff spots are limited and very rarely open up. We do not accept direct applications. If you feel you are the right fit, just keep being a great community member and we will notice.
              <br /><br />
              <strong>Have a question?</strong> Reach us through the <strong>Contact Support</strong> page.
            </div>

            <button className="lp-staff-cta-btn" onClick={() => { setShowStaffModal(false); navigate('/contact'); }}>
              Contact Support
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
