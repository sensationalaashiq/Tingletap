// src/utils/giftSystem.js
// Gift catalog definitions and gift sending for TingleTap

/* ══════════════════════════════════════════════════
   GIFT CATALOG
   Each gift has a unique animated SVG icon (inline)
══════════════════════════════════════════════════ */

export const GIFT_CATALOG = [
  {
    id: 'gift_rose',
    name: 'Rose',
    coinCost: 10,
    tier: 'basic',
    description: 'A beautiful rose',
    order: 1,
    color: '#f43f5e',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rose_g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb7185"/>
            <stop offset="100%" stop-color="#e11d48"/>
          </linearGradient>
          <linearGradient id="rose_stem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4ade80"/>
            <stop offset="100%" stop-color="#16a34a"/>
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="28" rx="16" ry="14" fill="url(#rose_g1)" opacity="0.9"/>
        <path d="M22 24 Q32 14 42 24 Q32 18 22 24Z" fill="#fda4af"/>
        <path d="M20 30 Q32 42 44 30 Q32 36 20 30Z" fill="#fda4af" opacity="0.6"/>
        <path d="M32 42 L32 58" stroke="url(#rose_stem)" stroke-width="3" stroke-linecap="round"/>
        <path d="M32 50 Q24 46 22 40" stroke="url(#rose_stem)" stroke-width="2" stroke-linecap="round" fill="none"/>
        <ellipse cx="32" cy="28" rx="8" ry="6" fill="#fda4af" opacity="0.5"/>
      </svg>`,
  },
  {
    id: 'gift_heart',
    name: 'Heart',
    coinCost: 25,
    tier: 'basic',
    description: 'Send some love',
    order: 2,
    color: '#ec4899',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="heart_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f472b6"/>
            <stop offset="100%" stop-color="#be185d"/>
          </linearGradient>
        </defs>
        <path d="M32 54 L12 34 C6 28 6 18 14 14 C18 12 22 13 26 16 L32 22 L38 16 C42 13 46 12 50 14 C58 18 58 28 52 34 Z" fill="url(#heart_g)"/>
        <path d="M20 20 Q18 28 32 40" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </svg>`,
  },
  {
    id: 'gift_star',
    name: 'Star',
    coinCost: 50,
    tier: 'premium',
    description: 'Shine bright',
    order: 3,
    color: '#f59e0b',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="star_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fde68a"/>
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
          <filter id="star_glow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d="M32 8 L37.5 24 L55 24 L41 34 L46.5 50 L32 40 L17.5 50 L23 34 L9 24 L26.5 24 Z" fill="url(#star_g)" filter="url(#star_glow)"/>
        <path d="M32 14 L36 24 L32 22 L28 24 Z" fill="rgba(255,255,255,0.4)"/>
      </svg>`,
  },
  {
    id: 'gift_diamond',
    name: 'Diamond',
    coinCost: 100,
    tier: 'premium',
    description: 'Rare and precious',
    order: 4,
    color: '#06b6d4',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dia_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a5f3fc"/>
            <stop offset="50%" stop-color="#06b6d4"/>
            <stop offset="100%" stop-color="#0e7490"/>
          </linearGradient>
          <linearGradient id="dia_top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e0f7fa"/>
            <stop offset="100%" stop-color="#67e8f9"/>
          </linearGradient>
        </defs>
        <polygon points="32,8 50,24 32,56 14,24" fill="url(#dia_g)"/>
        <polygon points="32,8 50,24 32,28 14,24" fill="url(#dia_top)"/>
        <polygon points="32,8 42,16 32,22 22,16" fill="rgba(255,255,255,0.6)"/>
        <line x1="14" y1="24" x2="50" y2="24" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      </svg>`,
  },
  {
    id: 'gift_crown',
    name: 'Crown',
    coinCost: 200,
    tier: 'elite',
    description: 'Royal treatment',
    order: 5,
    color: '#a855f7',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="crown_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e9d5ff"/>
            <stop offset="50%" stop-color="#a855f7"/>
            <stop offset="100%" stop-color="#7c3aed"/>
          </linearGradient>
          <linearGradient id="crown_jewel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f0abfc"/>
            <stop offset="100%" stop-color="#e879f9"/>
          </linearGradient>
        </defs>
        <path d="M8 44 L14 20 L24 32 L32 14 L40 32 L50 20 L56 44 Z" fill="url(#crown_g)"/>
        <rect x="8" y="44" width="48" height="8" rx="4" fill="url(#crown_g)"/>
        <circle cx="14" cy="20" r="4" fill="url(#crown_jewel)"/>
        <circle cx="50" cy="20" r="4" fill="url(#crown_jewel)"/>
        <circle cx="32" cy="14" r="5" fill="#fde68a"/>
        <circle cx="32" cy="48" r="3" fill="url(#crown_jewel)"/>
      </svg>`,
  },
  {
    id: 'gift_fire',
    name: 'Fire',
    coinCost: 150,
    tier: 'elite',
    description: 'You are on fire!',
    order: 6,
    color: '#f97316',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fire_g" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fde68a"/>
            <stop offset="40%" stop-color="#f97316"/>
            <stop offset="100%" stop-color="#dc2626"/>
          </linearGradient>
          <linearGradient id="fire_inner" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fef3c7"/>
            <stop offset="100%" stop-color="#fbbf24"/>
          </linearGradient>
        </defs>
        <path d="M32 6 C32 6 44 18 44 28 C44 32 42 36 38 38 C38 28 34 24 32 20 C30 24 26 28 26 38 C22 36 20 32 20 28 C20 18 32 6 32 6Z" fill="url(#fire_g)"/>
        <path d="M32 22 C32 22 38 30 38 36 C38 40 35 44 32 44 C29 44 26 40 26 36 C26 30 32 22 32 22Z" fill="url(#fire_inner)"/>
        <ellipse cx="32" cy="52" rx="10" ry="4" fill="#dc2626" opacity="0.3"/>
      </svg>`,
  },
  {
    id: 'gift_rocket',
    name: 'Rocket',
    coinCost: 500,
    tier: 'legendary',
    description: 'To the moon!',
    order: 7,
    color: '#6366f1',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rocket_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#c7d2fe"/>
            <stop offset="100%" stop-color="#4338ca"/>
          </linearGradient>
          <linearGradient id="rocket_flame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fde68a"/>
            <stop offset="100%" stop-color="#f97316"/>
          </linearGradient>
        </defs>
        <path d="M32 6 C32 6 44 16 44 32 L44 48 L32 56 L20 48 L20 32 C20 16 32 6 32 6Z" fill="url(#rocket_g)"/>
        <ellipse cx="32" cy="26" rx="7" ry="7" fill="#a5b4fc" opacity="0.8"/>
        <ellipse cx="32" cy="26" rx="4" ry="4" fill="#e0e7ff"/>
        <path d="M44 36 L52 44 L44 44 Z" fill="#818cf8"/>
        <path d="M20 36 L12 44 L20 44 Z" fill="#818cf8"/>
        <path d="M26 48 L32 58 L38 48 Z" fill="url(#rocket_flame)"/>
      </svg>`,
  },
  {
    id: 'gift_trophy',
    name: 'Trophy',
    coinCost: 300,
    tier: 'legendary',
    description: 'You are a champion!',
    order: 8,
    color: '#eab308',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="trophy_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="50%" stop-color="#eab308"/>
            <stop offset="100%" stop-color="#a16207"/>
          </linearGradient>
        </defs>
        <path d="M16 10 L48 10 L48 30 C48 40 40 48 32 48 C24 48 16 40 16 30 Z" fill="url(#trophy_g)"/>
        <path d="M16 14 L8 14 L8 22 C8 26 10 30 16 32" stroke="#eab308" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M48 14 L56 14 L56 22 C56 26 54 30 48 32" stroke="#eab308" stroke-width="3" fill="none" stroke-linecap="round"/>
        <rect x="26" y="48" width="12" height="6" fill="#ca8a04"/>
        <rect x="20" y="54" width="24" height="4" rx="2" fill="url(#trophy_g)"/>
        <path d="M24 24 L29 28 L32 18 L35 28 L40 24" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`,
  },
  {
    id: 'gift_mic',
    name: 'Mic',
    coinCost: 75,
    tier: 'premium',
    description: 'You are the star!',
    order: 9,
    color: '#8b5cf6',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mic_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ddd6fe"/>
            <stop offset="100%" stop-color="#7c3aed"/>
          </linearGradient>
        </defs>
        <rect x="22" y="8" width="20" height="28" rx="10" fill="url(#mic_g)"/>
        <path d="M16 30 C16 42 48 42 48 30" stroke="#8b5cf6" stroke-width="3" fill="none" stroke-linecap="round"/>
        <line x1="32" y1="42" x2="32" y2="56" stroke="#7c3aed" stroke-width="3" stroke-linecap="round"/>
        <line x1="22" y1="56" x2="42" y2="56" stroke="#7c3aed" stroke-width="3" stroke-linecap="round"/>
        <rect x="27" y="16" width="4" height="10" rx="2" fill="rgba(255,255,255,0.5)"/>
      </svg>`,
  },
  {
    id: 'gift_rainbow',
    name: 'Rainbow',
    coinCost: 1000,
    tier: 'legendary',
    description: 'Pure magic!',
    order: 10,
    color: '#6366f1',
    renderIcon: (size = 48) => `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rb1" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="16%" stop-color="#f97316"/>
            <stop offset="33%" stop-color="#eab308"/>
            <stop offset="50%" stop-color="#22c55e"/>
            <stop offset="66%" stop-color="#3b82f6"/>
            <stop offset="83%" stop-color="#8b5cf6"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
        <path d="M8 44 C8 24 20 10 32 10 C44 10 56 24 56 44" stroke="url(#rb1)" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M16 44 C16 28 23 18 32 18 C41 18 48 28 48 44" stroke="rgba(255,255,255,0.6)" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="14" cy="50" r="5" fill="#fef9c3"/>
        <circle cx="50" cy="50" r="5" fill="#fef9c3"/>
      </svg>`,
  },
];

export function getGiftById(id) {
  return GIFT_CATALOG.find(g => g.id === id) || null;
}

export const GIFT_TIERS = {
  basic:     { label: 'Basic',     color: '#6b7280', gradient: 'linear-gradient(135deg,#e5e7eb,#9ca3af)' },
  premium:   { label: 'Premium',   color: '#3b82f6', gradient: 'linear-gradient(135deg,#bfdbfe,#3b82f6)' },
  elite:     { label: 'Elite',     color: '#a855f7', gradient: 'linear-gradient(135deg,#e9d5ff,#7c3aed)' },
  legendary: { label: 'Legendary', color: '#f59e0b', gradient: 'linear-gradient(135deg,#fde68a,#d97706)' },
};
