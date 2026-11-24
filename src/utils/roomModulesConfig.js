// Shared configuration & pure helpers for Tingletap 5 core room modules

export const ROOM_MOOD_PRESETS = [
  {
    id: 'midnight-velvet',
    label: 'Midnight Velvet',
    subtitle: 'Deep obsidian & amber rim',
    swatchGradient: 'linear-gradient(135deg, #0b0c15 0%, #1c1726 55%, #b8860b 100%)',
    accentColor: '#eab308',
    borderGlow: 'rgba(234, 179, 8, 0.34)',
  },
  {
    id: 'navrang-aura',
    label: 'Navrang Aura',
    subtitle: 'Rich prism gradient mesh',
    swatchGradient: 'linear-gradient(135deg, #1b1035 0%, #6d28d9 48%, #ec4899 82%, #06b6d4 100%)',
    accentColor: '#c084fc',
    borderGlow: 'rgba(192, 132, 252, 0.36)',
  },
  {
    id: 'neon-lounge',
    label: 'Neon Lounge',
    subtitle: 'Deep indigo & electric cyan',
    swatchGradient: 'linear-gradient(135deg, #070d24 0%, #1e1b4b 52%, #06b6d4 100%)',
    accentColor: '#22d3ee',
    borderGlow: 'rgba(34, 211, 238, 0.38)',
  },
  {
    id: 'warm-mehfil',
    label: 'Warm Mehfil',
    subtitle: 'Charcoal & rose-copper glow',
    swatchGradient: 'linear-gradient(135deg, #171214 0%, #3b1922 54%, #e17b60 100%)',
    accentColor: '#fb7185',
    borderGlow: 'rgba(251, 113, 133, 0.36)',
  },
];

export const VALID_MOOD_IDS = ROOM_MOOD_PRESETS.map((m) => m.id);

export const getMoodPreset = (presetId) =>
  ROOM_MOOD_PRESETS.find((m) => m.id === presetId) || ROOM_MOOD_PRESETS[0];

export const getIdentityKey = (userOrGender) => {
  const raw = typeof userOrGender === 'string'
    ? userOrGender
    : (userOrGender?.identity || userOrGender?.gender || '');
  const g = raw.toLowerCase().trim();
  if (g === 'female' || g === 'stree' || g === 'woman') return 'stree';
  if (g === 'other' || g === 'transgender' || g === 'non-binary' || g === 'navrang') return 'navrang';
  return 'purush';
};

export const getIdentityLabel = (identityKey) => {
  const key = getIdentityKey(identityKey);
  if (key === 'stree') return 'Stree';
  if (key === 'navrang') return 'Navrang';
  return 'Purush';
};

export const getIdentityColors = (identityKey) => {
  const key = getIdentityKey(identityKey);
  if (key === 'stree') {
    return {
      color: '#f472b6',
      bg: 'rgba(236, 72, 153, 0.14)',
      border: 'rgba(244, 114, 182, 0.32)',
    };
  }
  if (key === 'navrang') {
    return {
      color: '#c084fc',
      bg: 'rgba(139, 92, 246, 0.15)',
      border: 'rgba(192, 132, 252, 0.34)',
    };
  }
  return {
    color: '#60a5fa',
    bg: 'rgba(59, 130, 246, 0.14)',
    border: 'rgba(96, 165, 250, 0.32)',
  };
};

export const parseTimeToMinutes = (hhmm) => {
  if (typeof hhmm !== 'string' || !hhmm.includes(':')) return 0;
  const [hStr, mStr] = hhmm.split(':');
  const h = Math.max(0, Math.min(23, parseInt(hStr, 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  return h * 60 + m;
};

export const formatMinutes12h = (totalMinutes) => {
  const norm = ((Number(totalMinutes) || 0) % 1440 + 1440) % 1440;
  const h24 = Math.floor(norm / 60);
  const mins = norm % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${period}`;
};

export const formatTimeRange12h = (startMinutes, durationMinutes = 60) => {
  const dur = Math.max(15, Math.min(480, Number(durationMinutes) || 60));
  return `${formatMinutes12h(startMinutes)} - ${formatMinutes12h((Number(startMinutes) || 0) + dur)}`;
};

export const classifyShowStatus = (show, nowDate = new Date()) => {
  if (!show) return 'later';
  if (show.statusOverride === 'live') return 'live';
  if (show.statusOverride === 'ended') return 'ended';

  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const start = typeof show.startMinutes === 'number'
    ? show.startMinutes
    : parseTimeToMinutes(show.startTime || '00:00');
  const dur = Math.max(15, Math.min(480, Number(show.durationMinutes) || 60));
  const end = start + dur;

  // Handle overnight wrap cleanly if end > 1440
  if (end <= 1440) {
    if (nowMinutes >= start && nowMinutes < end) return 'live';
    if (nowMinutes < start) return nowMinutes >= start - 180 ? 'upnext' : 'later';
    return 'ended';
  }
  const wrappedEnd = end - 1440;
  if (nowMinutes >= start || nowMinutes < wrappedEnd) return 'live';
  if (nowMinutes < start) return nowMinutes >= start - 180 ? 'upnext' : 'later';
  return 'later';
};

export const SILENT_WATCH_STORAGE_KEY = (uid) => `tl_silent_watch_${uid || 'anon'}`;
export const SHOW_REMINDERS_STORAGE_KEY = 'tl_show_reminders_v1';
