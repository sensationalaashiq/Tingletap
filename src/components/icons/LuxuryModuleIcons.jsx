import React from 'react';

// Crisp luxury vector icons (1.5px-1.75px strokes, rounded caps/joins, metallic accents)
// Zero Unicode emojis used anywhere.

export const MidnightVelvetIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="mvGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
    </defs>
    <path
      d="M20.2 14.5A8.5 8.5 0 0 1 9.5 3.8a8.5 8.5 0 1 0 10.7 10.7Z"
      stroke="url(#mvGrad)"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M16 5.5v3M14.5 7h3" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NavrangAuraIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="naGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="50%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
    <path
      d="M12 3l7 4.5v9L12 21l-7-4.5v-9L12 3Z"
      stroke="url(#naGrad)"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 3v18M5 7.5l7 4.5 7-4.5" stroke="url(#naGrad)" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
  </svg>
);

export const NeonLoungeIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="nlGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#818cf8" />
      </linearGradient>
    </defs>
    <path
      d="M13 2.5L5.5 13h6l-1 8.5L18.5 11h-6l.5-8.5Z"
      stroke="url(#nlGrad)"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const WarmMehfilIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="wmGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fda4af" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
    <path
      d="M12 3.5c2.8 3.2 4.5 5.8 4.5 8.6a4.5 4.5 0 1 1-9 0c0-1.7.7-3.4 2-5.1.4 1.2 1.2 2 2.2 2.4-.5-2.1-.2-4.1.3-5.9Z"
      stroke="url(#wmGrad)"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M7 19.5h10" stroke="url(#wmGrad)" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const MoodPresetIcon = ({ presetId, size = 18 }) => {
  if (presetId === 'navrang-aura') return <NavrangAuraIcon size={size} />;
  if (presetId === 'neon-lounge') return <NeonLoungeIcon size={size} />;
  if (presetId === 'warm-mehfil') return <WarmMehfilIcon size={size} />;
  return <MidnightVelvetIcon size={size} />;
};

export const LockPresetIcon = ({ locked = false, size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    {locked ? (
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    )}
    <circle cx="12" cy="15.5" r="1.2" fill={color} />
  </svg>
);

export const ShroudedEyeIcon = ({ size = 18, active = true, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2.5 12c2.2-4 5.6-6.2 9.5-6.2 3.9 0 7.3 2.2 9.5 6.2-2.2 4-5.6 6.2-9.5 6.2-3.9 0-7.3-2.2-9.5-6.2Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2.7" stroke={color} strokeWidth="1.6" />
    {active && (
      <path d="M4.5 19.5L19.5 4.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    )}
  </svg>
);

export const ActivitySparkIcon = ({ size = 20, color = '#ffffff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="4.5" width="7.5" height="7.5" rx="2" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="13" y="12" width="7.5" height="7.5" rx="2" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.75 3.5v5.5M14 6.25h5.5" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 16h5.5M7.25 13.25v5.5" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PollBarsIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="11" width="4" height="9" rx="1.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="10" y="4" width="4" height="16" rx="1.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="16.5" y="8" width="4" height="12" rx="1.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TriviaBuzzerIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 17.5a7 7 0 0 1 14 0" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 17.5h17v2.5h-17z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 4.5v2.5M6.8 7l1.6 1.8M17.2 7l-1.6 1.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const SpinWheelIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.6" />
    <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="1.5" />
    <path d="M12 3.5v6.5M12 14v6.5M3.5 12H10M14 12h6.5M6 6l4.6 4.6M13.4 13.4L18 18" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const TrophyCrestIcon = ({ size = 17, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 17l1.8-9.5L10.2 11 12 5.5 13.8 11l4.4-3.5L20 17H4Z" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 20h13" stroke={color} strokeWidth="1.65" strokeLinecap="round" />
  </svg>
);

export const IdentityEmblem = ({ identity = 'purush', size = 15 }) => {
  const norm = String(identity || 'purush').toLowerCase();
  if (norm === 'female' || norm === 'stree') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Stree">
        <circle cx="12" cy="9.5" r="5" stroke="#f472b6" strokeWidth="1.7" />
        <path d="M12 14.5v6M9.2 17.8h5.6" stroke="#f472b6" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (norm === 'other' || norm === 'transgender' || norm === 'navrang') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Navrang">
        <defs>
          <linearGradient id="navEmblemGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d="M12 3l8 9-8 9-8-9 8-9Z" stroke="url(#navEmblemGrad)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.2" stroke="url(#navEmblemGrad)" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Purush">
      <circle cx="10" cy="14" r="5" stroke="#60a5fa" strokeWidth="1.7" />
      <path d="M13.6 10.4L19.5 4.5M15 4.5h4.5V9" stroke="#60a5fa" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const LiveSignalIcon = ({ size = 16, color = '#f43f5e', pulse = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={pulse ? 'tl-svg-signal-pulse' : ''} aria-hidden="true">
    <circle cx="12" cy="12" r="2.3" stroke={color} strokeWidth="1.7" />
    <path d="M8.1 8.1a5.5 5.5 0 0 0 0 7.8M15.9 8.1a5.5 5.5 0 0 1 0 7.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.72" />
  </svg>
);

export const ScheduleCalendarIcon = ({ size = 17, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke={color} strokeWidth="1.6" />
    <path d="M8 3v4M16 3v4M3.5 10h17M8.5 14h3M8.5 17.2h6.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const BellReminderIcon = ({ active = false, size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4.5 2 6 2 6H4.5s2-1.5 2-6Z"
      fill={active ? color : 'none'}
      fillOpacity={active ? 0.22 : 0}
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 19a2.2 2.2 0 0 0 4 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const JumpRoomIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ExitWatchIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AtlasGlobeIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.65" />
    <ellipse cx="12" cy="12" rx="4" ry="9" stroke={color} strokeWidth="1.45" />
    <path d="M3.5 9.5h17M3.5 14.5h17" stroke={color} strokeWidth="1.45" strokeLinecap="round" />
  </svg>
);

export const WordTilesIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="8.5" height="8.5" rx="2" stroke={color} strokeWidth="1.6" />
    <rect x="12.5" y="11.5" width="8.5" height="8.5" rx="2" stroke={color} strokeWidth="1.6" />
    <path d="M5.75 9.8L7.25 6.4l1.5 3.4M6.2 8.9h2.1" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.1 14.2h3.3l-3.3 3.6h3.3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TimerClockIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="13" r="8" stroke={color} strokeWidth="1.65" />
    <path d="M12 9v4l2.5 1.8M9.5 3h5M12 3v2" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LockShieldIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2.8l7.5 3.2v5.4c0 4.9-3.2 8.7-7.5 9.8-4.3-1.1-7.5-4.9-7.5-9.8V6L12 2.8Z" stroke={color} strokeWidth="1.65" strokeLinejoin="round" />
    <rect x="9" y="11" width="6" height="4.8" rx="1.2" stroke={color} strokeWidth="1.5" />
    <path d="M10.2 11V9.5a1.8 1.8 0 0 1 3.6 0V11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const UnlockSparkIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2.8l7.5 3.2v5.4c0 4.9-3.2 8.7-7.5 9.8-4.3-1.1-7.5-4.9-7.5-9.8V6L12 2.8Z" stroke={color} strokeWidth="1.65" strokeLinejoin="round" />
    <path d="M9 12.2l2.1 2.1 4-4.2" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ExampleMagicIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M18.5 15l.8 2 .8.3-.8.3-.8 2-.8-2-.8-.3.8-.3.8-2Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export const CheckTickIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchLensIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="6.8" stroke={color} strokeWidth="1.7" />
    <path d="M16.2 16.2L20.5 20.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const CrownRoyalIcon = ({ size = 15, color = '#fbbf24' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3.5 17.5L5.5 7l4.8 4.2L12 5l1.7 6.2L18.5 7l2 10.5H3.5Z" stroke={color} strokeWidth="1.65" strokeLinejoin="round" />
    <path d="M5 20h14" stroke={color} strokeWidth="1.65" strokeLinecap="round" />
  </svg>
);

export const SendPaperPlaneIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 3L10 14M21 3l-6.5 18-3.8-7.2L3.5 10 21 3Z" stroke={color} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

