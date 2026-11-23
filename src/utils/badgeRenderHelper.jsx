// src/utils/badgeRenderHelper.jsx
// Centralized static badge renderer using exact artwork from Badges.jsx
// Scopes internal SVG IDs per instance so <linearGradient> / xlink:href never collide across DOM nodes.
import React, { useId, useMemo } from 'react';
import { Badges } from '../data/Badges';
import { normalizeRole, resolveBadgeKey } from './roleUtils';

const staticSpanStyle = (size = 15) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: `${size}px`,
  height: `${size}px`,
  verticalAlign: 'middle',
  marginLeft: '3px',
  flexShrink: 0,
  background: 'transparent',
  boxShadow: 'none',
  border: 'none',
  filter: 'none',
  animation: 'none',
  transition: 'none',
  transform: 'none',
  overflow: 'visible',
});

function scopeSvgIds(svg, prefix) {
  if (!svg || !prefix) return svg || '';
  const ids = [];
  svg.replace(/\bid="([^"]+)"/g, (_, id) => {
    ids.push(id);
    return '';
  });
  if (ids.length === 0) return svg;
  let out = svg;
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const scoped = `${prefix}_${id}`;
    out = out
      .replace(new RegExp(`\\bid="${escaped}"`, 'g'), `id="${scoped}"`)
      .replace(new RegExp(`url\\(#${escaped}\\)`, 'g'), `url(#${scoped})`)
      .replace(new RegExp(`href="#${escaped}"`, 'g'), `href="#${scoped}"`);
  }
  return out;
}

export const StaticBadgeIcon = ({ svg, className, title, size = 15 }) => {
  const reactId = useId();
  const safePrefix = useMemo(() => `ttb_${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [reactId]);
  const scopedSvg = useMemo(() => scopeSvgIds(svg, safePrefix), [svg, safePrefix]);

  return (
    <span
      className={className}
      title={title}
      style={staticSpanStyle(size)}
      dangerouslySetInnerHTML={{ __html: scopedSvg }}
    />
  );
};

export const OWNER_CROWN_SVG = (size = 15, title = 'Godfather / Owner') => (
  <StaticBadgeIcon
    svg={Badges.the_olympian.svg}
    className="inline-badge badge-the_olympian"
    title={title}
    size={size}
  />
);

export const ADMIN_SHIELD_SVG = (size = 15, title = 'High Council / Admin') => (
  <StaticBadgeIcon
    svg={Badges.titans.svg}
    className="inline-badge badge-titans"
    title={title}
    size={size}
  />
);

export const MODERATOR_SHIELD_SVG = (size = 15, title = 'Guardian / Moderator') => (
  <StaticBadgeIcon
    svg={Badges.spartans.svg}
    className="inline-badge badge-spartans"
    title={title}
    size={size}
  />
);

export const RJ_MIC_SVG = (size = 15, title = 'Radio Jockey') => (
  <StaticBadgeIcon
    svg={Badges.rj.svg}
    className="inline-badge badge-rj"
    title={title}
    size={size}
  />
);

/**
 * Renders the accurate static badge for any user based on their role & badge.
 * Uses exact SVGs from Badges.jsx with zero animations, shadows, or backgrounds.
 */
export const renderUserBadge = (userOrProps, size = 15) => {
  if (!userOrProps) return null;
  const iconSize = typeof size === 'number' ? size : (size?.size || 15);

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
      <StaticBadgeIcon
        svg={Badges[resolvedBadge].svg}
        className={`inline-badge badge-${resolvedBadge}`}
        title={Badges[resolvedBadge].name || 'Badge'}
        size={adjustedSize}
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
