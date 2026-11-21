// src/utils/badgeRenderHelper.jsx
// Centralized, ultra-premium badge and staff insignia renderer for TingleTap
import React from 'react';
import { Badges } from '../data/Badges';
import { normalizeRole, resolveBadgeKey } from './roleUtils';

export const OWNER_CROWN_SVG = (size = 16, title = 'Owner / Godfather') => (
  <span className="inline-badge badge-owner-crown" title={title} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0, background: 'transparent', boxShadow: 'none' }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="bh_owner_crown_g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="bh_owner_band_g" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="50%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M2.5 8.5L6.5 13 9 6.5l3 5.5 3-5.5L17.5 13l4-4.5-1.5 9.5H4L2.5 8.5z" fill="url(#bh_owner_crown_g)" stroke="#92400e" strokeWidth="0.7" strokeLinejoin="round" />
      <rect x="3.8" y="18.2" width="16.4" height="3" rx="1.2" fill="url(#bh_owner_band_g)" stroke="#92400e" strokeWidth="0.6" />
      <circle cx="2.5" cy="7.6" r="1.45" fill="#fef08a" stroke="#b45309" strokeWidth="0.4" />
      <circle cx="9" cy="5.8" r="1.5" fill="#fef08a" stroke="#b45309" strokeWidth="0.4" />
      <circle cx="12" cy="4.4" r="1.7" fill="#fffbeb" stroke="#b45309" strokeWidth="0.45" />
      <circle cx="15" cy="5.8" r="1.5" fill="#fef08a" stroke="#b45309" strokeWidth="0.4" />
      <circle cx="21.5" cy="7.6" r="1.45" fill="#fef08a" stroke="#b45309" strokeWidth="0.4" />
      <circle cx="7.5" cy="14.6" r="1.2" fill="#ef4444" />
      <circle cx="12" cy="14.2" r="1.45" fill="#38bdf8" />
      <circle cx="16.5" cy="14.6" r="1.2" fill="#10b981" />
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
  const iconSize = typeof size === 'number' ? size : (size?.size || 16);

  // 1. Custom acquired VIP Badge (case-insensitive + alias lookup)
  const resolvedBadge = resolveBadgeKey(userOrProps.badge);
  if (resolvedBadge && Badges[resolvedBadge]) {
    return (
      <span
        className={`inline-badge badge-${resolvedBadge}`}
        title={Badges[resolvedBadge].name || 'VIP Badge'}
        style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0, background: 'transparent', boxShadow: 'none' }}
        dangerouslySetInnerHTML={{ __html: Badges[resolvedBadge].svg }}
      />
    );
  }

  // 2. Staff & RJ Roles
  const normRole = normalizeRole(userOrProps.role);
  if (normRole === 'owner') {
    return OWNER_CROWN_SVG(iconSize, 'Godfather / Owner');
  }
  if (normRole === 'admin') {
    return ADMIN_SHIELD_SVG(iconSize, 'Administrator');
  }
  if (normRole === 'moderator') {
    return MODERATOR_SHIELD_SVG(iconSize, 'Moderator');
  }
  if (normRole === 'rj') {
    return RJ_MIC_SVG(iconSize, 'Radio Jockey');
  }

  return null;
};
