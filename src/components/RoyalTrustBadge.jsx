import React, { useState } from 'react';
import { getRankFromScore, TRUST_RANKS } from '../utils/trustSystem';
import './RoyalTrustBadge.css';

const BADGE_SVGS = {
  squire: (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="badge-svg">
      <defs>
        <linearGradient id="sq-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4A882" />
          <stop offset="50%" stopColor="#8B7355" />
          <stop offset="100%" stopColor="#6B5A45" />
        </linearGradient>
        <linearGradient id="sq-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="sq-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8B7355" floodOpacity="0.5"/>
        </filter>
      </defs>
      <path d="M40 8 L56 14 L64 28 L64 50 C64 62 52 72 40 75 C28 72 16 62 16 50 L16 28 L24 14 Z"
        fill="url(#sq-grad)" filter="url(#sq-shadow)" />
      <path d="M40 12 L54 17 L61 29 L61 49 C61 60 50 70 40 72 C30 70 19 60 19 49 L19 29 L26 17 Z"
        fill="url(#sq-shine)" opacity="0.3" />
      <path d="M40 22 L43 32 L53 32 L45 38 L48 48 L40 42 L32 48 L35 38 L27 32 L37 32 Z"
        fill="rgba(255,255,255,0.85)" />
      <path d="M40 8 L56 14 L64 28 L64 50 C64 62 52 72 40 75 C28 72 16 62 16 50 L16 28 L24 14 Z"
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>
  ),
  noble: (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="badge-svg">
      <defs>
        <linearGradient id="no-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8E8E8" />
          <stop offset="40%" stopColor="#C8C8C8" />
          <stop offset="100%" stopColor="#A0A0A0" />
        </linearGradient>
        <linearGradient id="no-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="no-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#A0A0A0" floodOpacity="0.6"/>
        </filter>
      </defs>
      <circle cx="40" cy="40" r="32" fill="url(#no-grad)" filter="url(#no-shadow)" />
      <circle cx="40" cy="40" r="32" fill="url(#no-shine)" />
      <circle cx="40" cy="40" r="28" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <path d="M40 16 L40 22 M40 58 L40 64 M16 40 L22 40 M58 40 L64 40" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M40 20 C40 20 38 28 32 30 C26 32 22 40 22 40 C22 40 26 48 32 50 C38 52 40 60 40 60 C40 60 42 52 48 50 C54 48 58 40 58 40 C58 40 54 32 48 30 C42 28 40 20 40 20Z"
        fill="rgba(255,255,255,0.75)" />
      <circle cx="40" cy="40" r="6" fill="rgba(200,200,200,0.9)" />
      <circle cx="40" cy="40" r="3" fill="rgba(255,255,255,0.9)" />
    </svg>
  ),
  regent: (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="badge-svg">
      <defs>
        <linearGradient id="rg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#FF8C00" />
        </linearGradient>
        <radialGradient id="rg-glow" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,180,0.8)" />
          <stop offset="100%" stopColor="rgba(255,180,0,0)" />
        </radialGradient>
        <filter id="rg-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#FFD700" floodOpacity="0.7"/>
        </filter>
      </defs>
      <ellipse cx="40" cy="42" rx="28" ry="24" fill="url(#rg-grad)" filter="url(#rg-shadow)" />
      <ellipse cx="40" cy="42" rx="28" ry="24" fill="url(#rg-glow)" />
      <path d="M16 42 L16 38 L22 30 L28 42 L34 22 L40 38 L46 22 L52 42 L58 30 L64 38 L64 42 Z"
        fill="url(#rg-grad)" filter="url(#rg-shadow)" />
      <path d="M16 42 L16 38 L22 30 L28 42 L34 22 L40 38 L46 22 L52 42 L58 30 L64 38 L64 42 Z"
        fill="url(#rg-glow)" />
      <rect x="14" y="42" width="52" height="7" rx="3" fill="url(#rg-grad)" />
      <circle cx="22" cy="30" r="4" fill="#FF6B00" stroke="#FFD700" strokeWidth="1.5" />
      <circle cx="40" cy="22" r="5" fill="#FF4500" stroke="#FFD700" strokeWidth="2" />
      <circle cx="58" cy="30" r="4" fill="#FF6B00" stroke="#FFD700" strokeWidth="1.5" />
      <rect x="14" y="49" width="52" height="4" rx="2" fill="rgba(255,180,0,0.8)" />
      <path d="M14 42 L66 42" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
    </svg>
  ),
  monarch: (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="badge-svg">
      <defs>
        <linearGradient id="mo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9B59B6" />
          <stop offset="50%" stopColor="#764ba2" />
          <stop offset="100%" stopColor="#667eea" />
        </linearGradient>
        <linearGradient id="mo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
        <radialGradient id="mo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200,150,255,0.6)" />
          <stop offset="100%" stopColor="rgba(100,50,180,0)" />
        </radialGradient>
        <filter id="mo-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#9B59B6" floodOpacity="0.8"/>
        </filter>
      </defs>
      <path d="M14 70 L14 32 L26 32 L26 18 L32 24 L40 10 L48 24 L54 18 L54 32 L66 32 L66 70 Z"
        fill="url(#mo-grad)" filter="url(#mo-shadow)" />
      <path d="M14 70 L14 32 L26 32 L26 18 L32 24 L40 10 L48 24 L54 18 L54 32 L66 32 L66 70 Z"
        fill="url(#mo-glow)" />
      <rect x="18" y="38" width="10" height="10" rx="2" fill="url(#mo-gold)" opacity="0.9" />
      <rect x="34" y="34" width="12" height="14" rx="2" fill="url(#mo-gold)" />
      <rect x="52" y="38" width="10" height="10" rx="2" fill="url(#mo-gold)" opacity="0.9" />
      <rect x="18" y="54" width="44" height="10" rx="2" fill="rgba(255,215,0,0.3)" />
      <rect x="12" y="68" width="56" height="6" rx="3" fill="url(#mo-gold)" />
      <path d="M14 32 L66 32" stroke="url(#mo-gold)" strokeWidth="2" />
      <circle cx="40" cy="10" r="4" fill="#FFD700" />
      <circle cx="26" cy="18" r="3" fill="#FFD700" />
      <circle cx="54" cy="18" r="3" fill="#FFD700" />
    </svg>
  ),
  eternal_crown: (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className="badge-svg">
      <defs>
        <linearGradient id="ec-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="33%" stopColor="#7B2FBE" />
          <stop offset="66%" stopColor="#FF6B6B" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id="ec-gem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0FBFF" />
          <stop offset="40%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#0088AA" />
        </linearGradient>
        <radialGradient id="ec-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,212,255,0.7)" />
          <stop offset="100%" stopColor="rgba(0,212,255,0)" />
        </radialGradient>
        <filter id="ec-shadow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#00D4FF" floodOpacity="0.9"/>
        </filter>
        <filter id="ec-glow-filter">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#ec-glow)" />
      <path d="M40 6 L46 20 L60 14 L54 28 L70 30 L58 40 L66 54 L52 50 L50 66 L40 56 L30 66 L28 50 L14 54 L22 40 L10 30 L26 28 L20 14 L34 20 Z"
        fill="url(#ec-grad)" filter="url(#ec-shadow)" />
      <path d="M40 6 L46 20 L60 14 L54 28 L70 30 L58 40 L66 54 L52 50 L50 66 L40 56 L30 66 L28 50 L14 54 L22 40 L10 30 L26 28 L20 14 L34 20 Z"
        fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <polygon points="40,22 43,31 52,31 45,37 48,46 40,40 32,46 35,37 28,31 37,31"
        fill="url(#ec-gem)" filter="url(#ec-glow-filter)" />
      <circle cx="40" cy="34" r="4" fill="rgba(255,255,255,0.9)" />
    </svg>
  )
};

const RoyalTrustBadge = React.memo(({ trustScore, trustRank, showTooltip = true, size = 'md', showLabel = true }) => {
  const [hovered, setHovered] = useState(false);

  const score = trustScore ?? 10;
  const rank = trustRank ? TRUST_RANKS[trustRank] : getRankFromScore(score);
  if (!rank) return null;

  const sizeClasses = {
    sm: 'rtb-size-sm',
    md: 'rtb-size-md',
    lg: 'rtb-size-lg',
    xl: 'rtb-size-xl'
  };

  return (
    <div
      className={`royal-trust-badge rtb-rank-${rank.id} ${sizeClasses[size] || 'rtb-size-md'} ${rank.animated ? 'rtb-animated' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ '--rank-color': rank.color, '--rank-glow': rank.glowColor }}
    >
      <div className="rtb-badge-icon" aria-label={rank.name}>
        {BADGE_SVGS[rank.id]}
      </div>
      {showLabel && (
        <div className="rtb-badge-label">
          <span className="rtb-rank-name">{rank.name}</span>
          <span className="rtb-score">{score}/100</span>
        </div>
      )}
      {showTooltip && hovered && (
        <div className="rtb-tooltip">
          <div className="rtb-tooltip-header">
            <span className="rtb-tooltip-emoji">{rank.emoji}</span>
            <span className="rtb-tooltip-name">{rank.name}</span>
          </div>
          <div className="rtb-tooltip-score">
            <div className="rtb-score-bar">
              <div
                className="rtb-score-fill"
                style={{ width: `${score}%`, background: rank.gradient }}
              />
            </div>
            <span className="rtb-score-text">Trust Score: {score}/100</span>
          </div>
          <p className="rtb-tooltip-desc">{rank.description}</p>
          <div className="rtb-perks">
            <span className="rtb-perks-title">Unlocked Perks:</span>
            <ul>
              {rank.perks.slice(0, 3).map((perk, i) => (
                <li key={i}>✦ {perk}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
});

export const TrustBadgeInline = ({ trustScore, trustRank }) => {
  const score = trustScore ?? 10;
  const rank = trustRank ? TRUST_RANKS[trustRank] : getRankFromScore(score);
  if (!rank) return null;
  return (
    <span
      className={`trust-badge-inline rtb-rank-${rank.id}`}
      title={`${rank.name} — Trust Score: ${score}/100`}
      style={{ '--rank-color': rank.color, '--rank-glow': rank.glowColor }}
    >
      <span className="tbi-icon">{BADGE_SVGS[rank.id]}</span>
    </span>
  );
};

export default RoyalTrustBadge;
