// src/utils/badgeRenderHelper.jsx
// Centralized, ultra-premium badge and staff insignia renderer for TingleTap
import React from 'react';
import { Badges } from '../data/Badges';

export const OWNER_CROWN_SVG = (size = 16, title = 'Owner / High Command') => (
  <span className="inline-badge badge-owner-crown" title={title} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="bh_owner_crown_g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M2 7l4.5 5 5.5-8 5.5 8 4.5-5-2 11H4L2 7z" fill="url(#bh_owner_crown_g)" filter="drop-shadow(0 1px 4px rgba(245,158,11,0.6))" />
      <circle cx="2" cy="7" r="1.5" fill="#fef08a" />
      <circle cx="12" cy="4" r="1.8" fill="#fef08a" />
      <circle cx="22" cy="7" r="1.5" fill="#fef08a" />
      <circle cx="7" cy="14" r="1.2" fill="#ef4444" />
      <circle cx="12" cy="14" r="1.4" fill="#38bdf8" />
      <circle cx="17" cy="14" r="1.2" fill="#10b981" />
    </svg>
  </span>
);

export const ADMIN_SHIELD_SVG = (size = 15, title = 'Administrator') => (
  <span className="inline-badge badge-admin-shield" title={title} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="bh_admin_shield_g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" fill="url(#bh_admin_shield_g)" filter="drop-shadow(0 1px 4px rgba(239,68,68,0.5))" />
      <path d="M12 6.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5L12 6.5z" fill="#ffffff" />
    </svg>
  </span>
);

export const MODERATOR_SHIELD_SVG = (size = 15, title = 'Moderator') => (
  <span className="inline-badge badge-mod-shield" title={title} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="bh_mod_shield_g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" fill="url(#bh_mod_shield_g)" filter="drop-shadow(0 1px 4px rgba(16,185,129,0.5))" />
      <path d="M9 12l2 2 4-4" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

export const RJ_MIC_SVG = (size = 15, title = 'Radio Jockey') => (
  <span className="inline-badge badge-rj-mic" title={title} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="bh_rj_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="9" y="2" width="6" height="11" rx="3" fill="url(#bh_rj_grad)" filter="drop-shadow(0 1px 4px rgba(236,72,153,0.5))" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" stroke="#a855f7" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  </span>
);

/**
 * Renders the accurate badge for any user based on their badge string or role
 */
export const renderUserBadge = (userOrProps, size = 16) => {
  if (!userOrProps) return null;
  const badgeKey = userOrProps.badge;
  const role = (userOrProps.role || '').toLowerCase();

  // 1. Custom acquired VIP Badge
  if (badgeKey && Badges[badgeKey]) {
    return (
      <span
        className={`inline-badge badge-${badgeKey}`}
        title={Badges[badgeKey].name || 'VIP Badge'}
        style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: Badges[badgeKey].svg }}
      />
    );
  }

  // 2. Staff Roles
  if (['owner', 'superowner', 'godfather'].includes(role)) {
    return OWNER_CROWN_SVG(size, 'Owner / Founder');
  }
  if (['admin', 'high_council'].includes(role)) {
    return ADMIN_SHIELD_SVG(size, 'Administrator');
  }
  if (['moderator', 'guardian', 'mod'].includes(role)) {
    return MODERATOR_SHIELD_SVG(size, 'Moderator');
  }
  if (['rj', 'radio_jockey'].includes(role)) {
    return RJ_MIC_SVG(size, 'Radio Jockey');
  }

  return null;
};
