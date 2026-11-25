// src/utils/theatreMediaParser.js
// Validates and parses YouTube and direct MP4 watch-party URLs for the Theatre cinema room.

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(rawUrl = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const candidate = parsed.pathname.split('/').filter(Boolean)[0] || '';
      return YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const v = parsed.searchParams.get('v');
      if (v && YOUTUBE_ID_REGEX.test(v)) return v;

      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
        return YOUTUBE_ID_REGEX.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isDirectMp4Url(rawUrl = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const pathLower = parsed.pathname.toLowerCase();
    if (pathLower.endsWith('.mp4') || pathLower.endsWith('.m4v') || pathLower.endsWith('.webm')) {
      return true;
    }
    const formatHint = (parsed.searchParams.get('mime') || parsed.searchParams.get('type') || '').toLowerCase();
    return formatHint.includes('mp4');
  } catch {
    return false;
  }
}

export function parseTheatreMediaUrl(rawUrl = '', customTitle = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Please paste a YouTube or direct .mp4 video link.' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Must start with https:// or http://' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only http:// and https:// video links are supported.' };
  }

  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId) {
    return {
      valid: true,
      sourceType: 'youtube',
      videoId: ytId,
      normalizedUrl: `https://www.youtube.com/watch?v=${ytId}`,
      title: String(customTitle || '').trim() || `YouTube Feature (${ytId})`,
    };
  }

  if (isDirectMp4Url(trimmed)) {
    const filename = parsed.pathname.split('/').filter(Boolean).pop() || 'Theatre Stream';
    const cleanName = decodeURIComponent(filename).replace(/\.(mp4|m4v|webm)$/i, '').replace(/[_-]+/g, ' ');
    return {
      valid: true,
      sourceType: 'mp4',
      videoId: null,
      normalizedUrl: parsed.toString(),
      title: String(customTitle || '').trim() || cleanName || 'Direct Cinema Stream',
    };
  }

  return {
    valid: false,
    error: 'Unsupported link. Paste a valid YouTube link or a direct .mp4 stream URL.',
  };
}

export function formatTheatreClock(totalSec = 0) {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(rem)}` : `${pad(mins)}:${pad(rem)}`;
}
