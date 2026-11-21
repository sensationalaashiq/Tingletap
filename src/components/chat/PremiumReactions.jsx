import React, { useState, useRef } from 'react';
import './PremiumReactions.css';

/* ══════════════════════════════════════════════════════════════
   PREMIUM MULTI-COLOR LUXURY SVG REACTION ICONS
   ══════════════════════════════════════════════════════════════ */

export const REACTION_ICONS = {
  ruby_heart: {
    id: 'ruby_heart',
    label: 'Ruby Love',
    legacyEmoji: '❤️',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_heart_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff2a6d" />
            <stop offset="45%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>
          <radialGradient id="pr_heart_shine" cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#ff758f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#pr_heart_grad)" filter="drop-shadow(0 2px 6px rgba(225,29,72,0.45))" />
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#pr_heart_shine)" />
        <ellipse cx="7.5" cy="7" rx="2.5" ry="1.4" transform="rotate(-30 7.5 7)" fill="white" opacity="0.6" />
      </svg>
    )
  },
  gold_crown: {
    id: 'gold_crown',
    label: 'Imperial Crown',
    legacyEmoji: '👑',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_crown_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff3b0" />
            <stop offset="40%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="pr_crown_band" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="50%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path d="M2.5 8.5L6.5 13 9 6.5l3 5.5 3-5.5L17.5 13l4-4.5-1.5 9.5H4L2.5 8.5z" fill="url(#pr_crown_grad)" stroke="#92400e" strokeWidth="0.7" strokeLinejoin="round" />
        <rect x="3.8" y="18.2" width="16.4" height="3" rx="1.2" fill="url(#pr_crown_band)" stroke="#92400e" strokeWidth="0.6" />
        <circle cx="2.5" cy="7.6" r="1.45" fill="#fef08a" stroke="#b45309" strokeWidth="0.4" />
        <circle cx="9" cy="5.8" r="1.5" fill="#fef08a" stroke="#b45309" strokeWidth="0.4" />
        <circle cx="12" cy="4.4" r="1.7" fill="#fffbeb" stroke="#b45309" strokeWidth="0.45" />
        <circle cx="15" cy="5.8" r="1.5" fill="#fef08a" stroke="#b45309" strokeWidth="0.4" />
        <circle cx="21.5" cy="7.6" r="1.45" fill="#fef08a" stroke="#b45309" strokeWidth="0.4" />
        <circle cx="7.5" cy="14.6" r="1.2" fill="#e11d48" />
        <circle cx="12" cy="14.2" r="1.45" fill="#38bdf8" />
        <circle cx="16.5" cy="14.6" r="1.2" fill="#10b981" />
      </svg>
    )
  },
  diamond_gem: {
    id: 'diamond_gem',
    label: 'Blue Diamond',
    legacyEmoji: '💎',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_gem_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <path d="M7 3h10l5 6-10 12L2 9l5-6z" fill="url(#pr_gem_grad)" filter="drop-shadow(0 2px 7px rgba(6,182,212,0.45))" />
        <path d="M7 3l5 6 5-6M2 9h20M12 9l-3 12M12 9l3 12" stroke="white" strokeWidth="0.8" strokeOpacity="0.75" />
        <polygon points="7,3 12,9 17,3" fill="white" opacity="0.3" />
      </svg>
    )
  },
  fire_flame: {
    id: 'fire_flame',
    label: 'Wildfire',
    legacyEmoji: '🔥',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_fire_outer" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="pr_fire_inner" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="60%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <path d="M12 2c-.5 2.5-3 5-3 8 0 1.5.5 3 2 4-1.5 0-3-1-3-3 0 5 4 8 7 8s6-3.5 6-8.5c0-4-3-6-4.5-8-.5 2-1 3-2 3-1-1-1.5-2.5-1.5-3.5z" fill="url(#pr_fire_outer)" filter="drop-shadow(0 2px 7px rgba(249,115,22,0.5))" />
        <path d="M12 9c-.3 1.5-1.8 3-1.8 4.8 0 .9.3 1.8 1.2 2.4-.9 0-1.8-.6-1.8-1.8 0 3 2.4 4.8 4.2 4.8s3.6-2.1 3.6-5.1c0-2.4-1.8-3.6-2.7-4.8-.3 1.2-.6 1.8-1.2 1.8-.6-.6-.9-1.5-.9-2.1z" fill="url(#pr_fire_inner)" />
      </svg>
    )
  },
  laugh_joy: {
    id: 'laugh_joy',
    label: 'Joyful Laugh',
    legacyEmoji: '😂',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_face_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#pr_face_grad)" filter="drop-shadow(0 2px 6px rgba(234,179,8,0.4))" />
        <path d="M7 8.5C7.8 7.3 9.3 7 10 7M17 8.5C16.2 7.3 14.7 7 14 7" stroke="#78350f" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M7 13c1.5 4 8.5 4 10 0H7z" fill="#78350f" />
        <path d="M8.5 13c1 1.8 6 1.8 7 0H8.5z" fill="#f87171" />
        {/* Tear drops */}
        <path d="M4 11c0 1.5 1.5 3 2.5 3s1-1.5 1-2.5C7.5 10 5.5 8 4 11z" fill="#38bdf8" />
        <path d="M20 11c0 1.5-1.5 3-2.5 3s-1-1.5-1-2.5C16.5 10 18.5 8 20 11z" fill="#38bdf8" />
      </svg>
    )
  },
  royal_thumbs: {
    id: 'royal_thumbs',
    label: 'Respect / Salute',
    legacyEmoji: '👍',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_thumb_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <path d="M4 10v10h4V10H4zm6 10h7.5c1.1 0 1.9-.8 2-1.9l1-6.5c.1-.8-.2-1.6-.8-2.1-.6-.5-1.3-.5-1.7-.5h-4.5s.7-2.5.7-4.2c0-1.8-1-2.8-2.3-2.8-.8 0-1.4.5-1.7 1.2L8.5 9v11h1.5z" fill="url(#pr_thumb_grad)" filter="drop-shadow(0 2px 6px rgba(37,99,235,0.4))" />
        <rect x="3.5" y="9.5" width="4.5" height="10.5" rx="1.5" stroke="#93c5fd" strokeWidth="0.8" />
      </svg>
    )
  },
  star_burst: {
    id: 'star_burst',
    label: 'Superstar',
    legacyEmoji: '🌟',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_star_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
        <path d="M12 2l2.6 6.3L21 9.4l-5 4.3 1.5 6.8L12 17l-5.5 3.5 1.5-6.8-5-4.3 6.4-1.1L12 2z" fill="url(#pr_star_grad)" filter="drop-shadow(0 2px 7px rgba(250,204,21,0.5))" />
        <circle cx="12" cy="12" r="3" fill="#ffffff" opacity="0.6" />
      </svg>
    )
  },
  rocket_blast: {
    id: 'rocket_blast',
    label: 'Rocket Party',
    legacyEmoji: '🚀',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_rocket_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <path d="M13.5 2.5s4 1 6 6c1 2.5.5 6 .5 6l-6-6s-3.5-.5-6 .5c-5 2-6 6-6 6s3-1 6-2l3.5-3.5L13.5 2.5z" fill="url(#pr_rocket_grad)" filter="drop-shadow(0 2px 6px rgba(168,85,247,0.45))" />
        <circle cx="14.5" cy="8.5" r="2" fill="#38bdf8" />
        <circle cx="14.5" cy="8.5" r="1" fill="#ffffff" />
        <path d="M4 17l-2 5 5-2L4 17z" fill="#f97316" />
        <path d="M5.5 18.5l-1.5 3.5 3.5-1.5L5.5 18.5z" fill="#fbbf24" />
      </svg>
    )
  },
  party_popper: {
    id: 'party_popper',
    label: 'Celebration',
    legacyEmoji: '🎉',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_popper_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <polygon points="3,21 6,10 14,18" fill="url(#pr_popper_grad)" />
        <circle cx="14" cy="8" r="1.5" fill="#ec4899" />
        <circle cx="18" cy="11" r="1.5" fill="#38bdf8" />
        <circle cx="11" cy="4" r="1.5" fill="#10b981" />
        <circle cx="17" cy="4" r="1.5" fill="#eab308" />
        <path d="M14 6l2 2M16 3l1 3M19 8l3-1M12 8l-2-2" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  },
  mind_blown: {
    id: 'mind_blown',
    label: 'Mind Blown',
    legacyEmoji: '🤯',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <circle cx="12" cy="14" r="8" fill="#facc15" />
        <path d="M6 10c0-3 3-5 6-5s6 2 6 5" fill="#f97316" />
        <ellipse cx="12" cy="7" rx="8" ry="3.5" fill="#ea580c" opacity="0.8" />
        <circle cx="9" cy="14" r="1.5" fill="#78350f" />
        <circle cx="15" cy="14" r="1.5" fill="#78350f" />
        <ellipse cx="12" cy="18" rx="2.5" ry="2" fill="#78350f" />
        <path d="M5 5l2 2M19 5l-2 2M12 2v2" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  },
  magic_sparkle: {
    id: 'magic_sparkle',
    label: 'Magic Aura',
    legacyEmoji: '✨',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_magic_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" fill="url(#pr_magic_grad)" filter="drop-shadow(0 2px 6px rgba(168,85,247,0.5))" />
        <path d="M19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="#38bdf8" />
        <path d="M5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" fill="#fbbf24" />
      </svg>
    )
  },
  angel_blessed: {
    id: 'angel_blessed',
    label: 'Blessed',
    legacyEmoji: '😇',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <ellipse cx="12" cy="4" rx="7" ry="1.8" fill="none" stroke="#facc15" strokeWidth="2" filter="drop-shadow(0 0 4px #facc15)" />
        <circle cx="12" cy="14" r="8" fill="#facc15" />
        <circle cx="9.5" cy="12.5" r="1.3" fill="#78350f" />
        <circle cx="14.5" cy="12.5" r="1.3" fill="#78350f" />
        <path d="M9 16c1 1.5 5 1.5 6 0" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  },
  clap_hands: {
    id: 'clap_hands',
    label: 'Applause',
    legacyEmoji: '👏',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_clap_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path d="M14.5 12.5l3.5-3.5a2.1 2.1 0 0 0-3-3l-4 4-2-2a2.1 2.1 0 0 0-3 3l5 5m1.5-1.5l2-2" stroke="url(#pr_clap_grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 2px 5px rgba(245,158,11,0.5))" />
        <path d="M5 19l4-4M3 13l3 1M8 21l1-3" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  },
  gem_hundred: {
    id: 'gem_hundred',
    label: '100% Top',
    legacyEmoji: '💯',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_100_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff416c" />
            <stop offset="100%" stopColor="#ff4b2b" />
          </linearGradient>
        </defs>
        <text x="1" y="16" fill="url(#pr_100_grad)" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-1">100</text>
        <path d="M2 19.5h20M4 22h16" stroke="url(#pr_100_grad)" strokeWidth="1.8" strokeLinecap="round" filter="drop-shadow(0 1px 4px rgba(255,75,43,0.5))" />
      </svg>
    )
  },
  cool_sunglasses: {
    id: 'cool_sunglasses',
    label: 'Super Cool',
    legacyEmoji: '😎',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_cool_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#pr_cool_grad)" filter="drop-shadow(0 2px 6px rgba(234,179,8,0.4))" />
        <path d="M4 10h16M4 10c.5 3 2.5 4 4.5 4s3.5-1 4-4M12 10c.5 3 2.5 4 4.5 4s3.5-1 4-4" fill="#0f172a" stroke="#020617" strokeWidth="1.2" />
        <path d="M6 11l2 2M14 11l2 2" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <path d="M9 17c1.5 1.5 4.5 1.5 6 0" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  },
  crying_tears: {
    id: 'crying_tears',
    label: 'Tears of Emotion',
    legacyEmoji: '😭',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_cry_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#pr_cry_grad)" />
        <path d="M7 9.5c.8-1 2.2-1 3 0M14 9.5c.8-1 2.2-1 3 0" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 17c1.5-2 6.5-2 8 0" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* Waterfall tears */}
        <path d="M8 10v10M16 10v10" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" filter="drop-shadow(0 2px 4px rgba(2,132,199,0.5))" />
        <path d="M8.5 11v8M16.5 11v8" stroke="#bae6fd" strokeWidth="1" strokeLinecap="round" />
      </svg>
    )
  },
  velvet_rose: {
    id: 'velvet_rose',
    label: 'Red Rose',
    legacyEmoji: '🌹',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_rose_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="40%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#9f1239" />
          </linearGradient>
        </defs>
        <path d="M12 21c0-4.5 1-7.5 3-10M13 14c-2 0-4 1-5 2M14 17c2 0 4 .5 5 1" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14 4a4 4 0 0 0-4 4c0 3 3 5 5 5s5-2 5-5a4 4 0 0 0-6-4z" fill="url(#pr_rose_grad)" filter="drop-shadow(0 2px 6px rgba(225,29,72,0.5))" />
        <path d="M12 5.5a2 2 0 1 1 2 2" stroke="#fda4af" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  },
  lightning_bolt: {
    id: 'lightning_bolt',
    label: 'Electric Volt',
    legacyEmoji: '⚡',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_volt_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="url(#pr_volt_grad)" stroke="#ffffff" strokeWidth="0.8" filter="drop-shadow(0 0 8px rgba(250,204,21,0.7))" />
      </svg>
    )
  },
  gold_trophy: {
    id: 'gold_trophy',
    label: 'Champion Trophy',
    legacyEmoji: '🏆',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_trophy_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
        </defs>
        <path d="M6 4h12v6c0 3.3-2.7 6-6 6s-6-2.7-6-6V4z" fill="url(#pr_trophy_grad)" filter="drop-shadow(0 2px 7px rgba(234,179,8,0.5))" />
        <path d="M6 6H3c0 2.5 1.5 4 3 4M18 6h3c0 2.5-1.5 4-3 4" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 16v3M8 21h8" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="12,7 13,9 15,9 13.5,10.5 14,12.5 12,11.2 10,12.5 10.5,10.5 9,9 11,9" fill="#ffffff" opacity="0.85" />
      </svg>
    )
  },
  namaste_pray: {
    id: 'namaste_pray',
    label: 'Namaste / Respect',
    legacyEmoji: '🙏',
    render: (size = 20) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <defs>
          <linearGradient id="pr_pray_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path d="M10 4c0-.5.5-1 1-1h2c.5 0 1 .5 1 1v12l-2 4-2-4V4z" fill="url(#pr_pray_grad)" filter="drop-shadow(0 2px 6px rgba(245,158,11,0.45))" />
        <path d="M7 9l3-2v9l-2 3-1-3V9zM17 9l-3-2v9l2 3 1-3V9z" fill="url(#pr_pray_grad)" opacity="0.9" />
        <circle cx="12" cy="2" r="1.5" fill="#fef08a" />
      </svg>
    )
  }
};

export const REACTION_KEY_LIST = Object.keys(REACTION_ICONS);

/**
 * Resolves a reaction key or legacy emoji character to an SVG renderer
 */
export const renderReactionIcon = (keyOrEmoji, size = 18) => {
  // Direct match by ID
  if (REACTION_ICONS[keyOrEmoji]) {
    return REACTION_ICONS[keyOrEmoji].render(size);
  }
  // Match by legacyEmoji
  const found = Object.values(REACTION_ICONS).find(r => r.legacyEmoji === keyOrEmoji);
  if (found) {
    return found.render(size);
  }
  // Fallback to text emoji
  return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{keyOrEmoji}</span>;
};

/**
 * Premium Reaction Bar Component
 */
export const PremiumReactionBar = ({
  reactions = {},
  currentUid = null,
  onReact,
  allUsers = {}
}) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [copiedUid, setCopiedUid] = useState(null);
  const copyTimeoutRef = useRef(null);

  const handleCopyUid = (uid, e) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(uid);
      setCopiedUid(uid);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedUid(null), 1800);
    } catch {
      // Fallback
      setCopiedUid(uid);
    }
  };

  const activeReactions = Object.entries(reactions).filter(
    ([, uids]) => Array.isArray(uids) && uids.length > 0
  );

  if (activeReactions.length === 0) return null;

  return (
    <div className="prem-rxn-bar">
      {activeReactions.map(([key, uids]) => {
        const hasReacted = currentUid && uids.includes(currentUid);
        const resolvedNames = uids.map(uid => {
          const u = allUsers[uid];
          return u?.displayName || u?.username || `User_${uid.slice(0, 5)}`;
        });
        const tooltipText = `Reacted by: ${resolvedNames.join(', ')} (UIDs: ${uids.join(', ')})`;

        return (
          <div
            key={key}
            className="prem-rxn-chip-wrapper"
            onMouseEnter={() => setActiveTooltip(key)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <button
              type="button"
              className={`prem-rxn-chip ${hasReacted ? 'prem-rxn-chip--mine' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onReact(key);
              }}
              title={tooltipText}
            >
              <span className="prem-rxn-icon">
                {renderReactionIcon(key, 17)}
              </span>
              <span className="prem-rxn-count">{uids.length}</span>
            </button>

            {/* Floating Luxury Tooltip showing user details and reactor User IDs */}
            {activeTooltip === key && (
              <div
                className="prem-rxn-tooltip"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setActiveTooltip(key)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <div className="prem-rxn-tooltip-title">
                  <span>{REACTION_ICONS[key]?.label || 'Reactions'}</span>
                  <span className="prem-rxn-tooltip-count">{uids.length}</span>
                </div>
                <div className="prem-rxn-tooltip-users">
                  {uids.slice(0, 10).map(uid => {
                    const u = allUsers[uid];
                    const name = u?.displayName || u?.username || 'User';
                    const isCopied = copiedUid === uid;
                    return (
                      <div key={uid} className="prem-rxn-tooltip-tag">
                        <span className="prem-rxn-user-name" title={name}>{name}</span>
                        <button
                          type="button"
                          className={`prem-rxn-tooltip-uid-btn ${isCopied ? 'copied' : ''}`}
                          onClick={(e) => handleCopyUid(uid, e)}
                          title="Click to copy User ID"
                        >
                          <span className="prem-rxn-uid-label">ID:</span>
                          <span className="prem-rxn-uid-value">{uid}</span>
                          {isCopied ? (
                            <span className="prem-rxn-copied-badge">Copied!</span>
                          ) : (
                            <svg className="prem-rxn-copy-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })}
                  {uids.length > 10 && (
                    <span className="prem-rxn-tooltip-more">+{uids.length - 10} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Premium Reaction Picker Component
 */
export const PremiumReactionPicker = ({
  reactions = {},
  currentUid = null,
  onSelect,
  onClose,
  position = { x: 0, y: 0 }
}) => {
  return (
    <>
      <div className="prem-rxn-overlay" onClick={onClose} />
      <div
        className="prem-rxn-picker-card"
        style={{ left: position.x, top: position.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="prem-rxn-picker-head">
          <span className="prem-rxn-picker-title">React to message</span>
          <span className="prem-rxn-picker-sub">Instant VIP reaction</span>
        </div>
        <div className="prem-rxn-picker-grid">
          {REACTION_KEY_LIST.map(key => {
            const item = REACTION_ICONS[key];
            const alreadyReacted = Array.isArray(reactions[key]) && currentUid && reactions[key].includes(currentUid);

            return (
              <button
                key={key}
                type="button"
                className={`prem-rxn-btn ${alreadyReacted ? 'prem-rxn-btn--active' : ''}`}
                onClick={() => onSelect(key)}
                title={item.label}
              >
                <div className="prem-rxn-btn-icon">
                  {item.render(17)}
                </div>
                <span className="prem-rxn-btn-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
