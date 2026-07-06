/**
 * AchievementsSection — TingleTap
 *
 * Premium Achievement Title cards for the profile modal (VPM).
 * Displays all 5 titles with unlocked/locked state.
 * Fully consistent with the TingleTap lavender design system.
 * SVG icons only. No emoji. Dark-mode compatible. Responsive.
 */

import React from 'react';
import { getAchievementsDisplay } from '../utils/achievementSystem';
import '../styles/AchievementsSection.css';

/* ── Inline SVG icons for status badges ─────────────────────────────────── */
const CheckIcon = () => (
  <svg viewBox="0 0 14 14" width="9" height="9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 7l3.2 3.2 5.8-6.4" stroke="#065f46" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 14 14" width="9" height="9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2.5" y="6" width="9" height="7" rx="1.5" stroke="#9ca3af" strokeWidth="1.5"/>
    <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6"
      stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 18 18" width="13" height="13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3h6v5.5a3 3 0 01-6 0V3z" fill="#7c3aed" opacity=".85"/>
    <path d="M3.5 4H6v3.5A2.5 2.5 0 013.5 5V4zM12 4h2.5v1A2.5 2.5 0 0112 7.5V4z"
      fill="#7c3aed" opacity=".4"/>
    <rect x="8.25" y="11" width="1.5" height="3" fill="#7c3aed" opacity=".7"/>
    <rect x="5.5" y="14" width="7" height="1.5" rx=".75" fill="#7c3aed"/>
  </svg>
);

/* ── Component ───────────────────────────────────────────────────────────── */
const AchievementsSection = ({ userProfile }) => {
  // Guests never earn achievements
  if (!userProfile || userProfile.isGuest || userProfile.role === 'guest') return null;

  const items = getAchievementsDisplay(userProfile);
  const unlockedCount = items.filter(i => i.unlocked).length;

  return (
    <div className="ach-section">

      {/* Header */}
      <div className="ach-section-header">
        <TrophyIcon />
        <span className="ach-section-title">Achievements</span>
        <span className="ach-count-pill">{unlockedCount} / {items.length}</span>
      </div>

      {/* Cards */}
      <div className="ach-grid">
        {items.map(item => (
          <div
            key={item.id}
            className={`ach-card ${item.unlocked ? 'unlocked' : 'locked'}`}
            style={item.unlocked ? {
              background:  item.gradient,
              boxShadow:   `0 4px 14px ${item.glowColor}, 0 1px 4px rgba(0,0,0,0.07)`,
              borderColor: 'rgba(255,255,255,0.68)',
            } : {}}
          >
            {/* Hover tooltip (unlocked only) */}
            {item.unlocked && (
              <div className="ach-desc-tooltip">{item.description}</div>
            )}

            {/* SVG icon */}
            <div
              className="ach-icon-wrap"
              dangerouslySetInnerHTML={{ __html: item.svg }}
            />

            {/* Title name */}
            <div className="ach-card-name">{item.name}</div>

            {/* Status */}
            <div className={`ach-status-badge ${item.unlocked ? 'earned' : 'locked-state'}`}>
              {item.unlocked
                ? <><CheckIcon /><span>Earned</span></>
                : <><LockIcon /><span>Locked</span></>
              }
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default AchievementsSection;
