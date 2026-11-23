// src/utils/badgeRenderHelper.jsx
// Centralized static badge renderer using exact artwork from Badges.jsx
import React from 'react';
import { Badges } from '../data/Badges';
import { normalizeRole, resolveBadgeKey } from './roleUtils';

const staticSpanStyle = (size = 16) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: `${size}px`,
  height: `${size}px`,
  verticalAlign: 'middle',
  marginLeft: '4px',
  flexShrink: 0,
  background: 'transparent',
  boxShadow: 'none',
  border: 'none',
  filter: 'none',
  animation: 'none',
  transition: 'none',
  transform: 'none',
});

export const OWNER_CROWN_SVG = (size = 16, title = 'Godfather / Owner') => (
  <span
    className="inline-badge badge-the_olympian"
    title={title}
    style={staticSpanStyle(size)}
    dangerouslySetInnerHTML={{ __html: Badges.the_olympian.svg }}
  />
);

export const ADMIN_SHIELD_SVG = (size = 15, title = 'High Council / Admin') => (
  <span
    className="inline-badge badge-titans"
    title={title}
    style={staticSpanStyle(size)}
    dangerouslySetInnerHTML={{ __html: Badges.titans.svg }}
  />
);

export const MODERATOR_SHIELD_SVG = (size = 15, title = 'Guardian / Moderator') => (
  <span
    className="inline-badge badge-spartans"
    title={title}
    style={staticSpanStyle(size)}
    dangerouslySetInnerHTML={{ __html: Badges.spartans.svg }}
  />
);

export const RJ_MIC_SVG = (size = 15, title = 'Radio Jockey') => (
  <span
    className="inline-badge badge-rj"
    title={title}
    style={staticSpanStyle(size)}
    dangerouslySetInnerHTML={{ __html: Badges.rj.svg }}
  />
);

/**
 * Renders the accurate static badge for any user based on their role & badge.
 * Uses exact SVGs from Badges.jsx with zero animations, shadows, or backgrounds.
 */
export const renderUserBadge = (userOrProps, size = 16) => {
  if (!userOrProps) return null;
  const iconSize = typeof size === 'number' ? size : (size?.size || 16);

  // Check normalized role (evaluates both role and reserved badges)
  const normRole = normalizeRole(userOrProps);
  if (normRole === 'owner') {
    return OWNER_CROWN_SVG(iconSize, 'Godfather');
  }

  // Custom or assigned badge from Badges.jsx
  const resolvedBadge = resolveBadgeKey(userOrProps.badge);
  if (resolvedBadge && Badges[resolvedBadge]) {
    const adjustedSize =
      resolvedBadge === 'emerald_empress' || resolvedBadge === 'sapphire_goddess'
        ? Math.max(iconSize, 16)
        : iconSize;
    return (
      <span
        className={`inline-badge badge-${resolvedBadge}`}
        title={Badges[resolvedBadge].name || 'Badge'}
        style={staticSpanStyle(adjustedSize)}
        dangerouslySetInnerHTML={{ __html: Badges[resolvedBadge].svg }}
      />
    );
  }

  // Staff / RJ fallback by role
  if (normRole === 'admin') {
    return ADMIN_SHIELD_SVG(iconSize, 'High Council');
  }
  if (normRole === 'moderator') {
    return MODERATOR_SHIELD_SVG(iconSize, 'Guardian');
  }
  if (normRole === 'rj') {
    return RJ_MIC_SVG(iconSize, 'RJ');
  }

  return null;
};
