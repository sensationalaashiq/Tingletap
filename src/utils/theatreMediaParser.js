// src/utils/theatreMediaParser.js
// Validates and parses all YouTube, YouTube Music, and direct MP4 watch-party URLs for Theatre Cinema.

import { extractYouTubeVideoId as extractRobustYouTubeId } from './youtubeUtils';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(rawUrl = '') {
  return extractRobustYouTubeId(rawUrl);
}

export function extractYouTubeStartSeconds(rawUrl = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return 0;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    const tRaw = parsed.searchParams.get('t') || parsed.searchParams.get('start') || '';
    if (!tRaw) return 0;
    if (/^\d+$/.test(tRaw)) return Math.max(0, Number(tRaw));
    const h = /(\d+)h/i.exec(tRaw)?.[1] || 0;
    const m = /(\d+)m/i.exec(tRaw)?.[1] || 0;
    const s = /(\d+)s/i.exec(tRaw)?.[1] || 0;
    return Math.max(0, Number(h) * 3600 + Number(m) * 60 + Number(s));
  } catch {
    return 0;
  }
}

export function isDirectMp4Url(rawUrl = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return false;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const pathLower = parsed.pathname.toLowerCase();
    if (pathLower.endsWith('.mp4') || pathLower.endsWith('.m4v') || pathLower.endsWith('.webm')) {
      return true;
    }
    const formatHint = (parsed.searchParams.get('mime') || parsed.searchParams.get('type') || '').toLowerCase();
    return formatHint.includes('mp4') || formatHint.includes('webm');
  } catch {
    return false;
  }
}

export function parseTheatreMediaUrl(rawUrl = '', customTitle = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Please paste a YouTube, YouTube Music, or direct .mp4 video link.' };
  }

  // Reject unsafe schemes explicitly before auto-normalizing scheme-less links
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return { valid: false, error: 'Only http:// and https:// video links are supported.' };
  }

  const normalizedInput = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId && YOUTUBE_ID_REGEX.test(ytId)) {
    const startSec = extractYouTubeStartSeconds(trimmed);
    return {
      valid: true,
      sourceType: 'youtube',
      videoId: ytId,
      startSec,
      normalizedUrl: `https://www.youtube.com/watch?v=${ytId}`,
      title: String(customTitle || '').trim() || `YouTube Feature (${ytId})`,
    };
  }

  let parsed;
  try {
    parsed = new URL(normalizedInput);
  } catch {
    return { valid: false, error: 'Invalid URL format. Paste a valid YouTube or direct .mp4 link.' };
  }

  if (isDirectMp4Url(normalizedInput)) {
    const filename = parsed.pathname.split('/').filter(Boolean).pop() || 'Theatre Stream';
    const cleanName = decodeURIComponent(filename).replace(/\.(mp4|m4v|webm)$/i, '').replace(/[_-]+/g, ' ');
    return {
      valid: true,
      sourceType: 'mp4',
      videoId: null,
      startSec: 0,
      normalizedUrl: parsed.toString(),
      title: String(customTitle || '').trim() || cleanName || 'Direct Cinema Stream',
    };
  }

  return {
    valid: false,
    error: 'Unsupported link. Paste a YouTube, Shorts, Live, Music, or direct .mp4 video link.',
  };
}

export async function fetchYouTubeVideoTitle(videoId) {
  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3200);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const title = typeof data?.title === 'string' ? data.title.trim() : '';
    return title ? title.slice(0, 120) : null;
  } catch {
    return null;
  }
}

export function formatTheatreClock(totalSec = 0) {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(rem)}` : `${pad(mins)}:${pad(rem)}`;
}
