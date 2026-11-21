// src/utils/youtubeUtils.js
// Enterprise-grade YouTube link parsing and embed URL generation

/**
 * Robustly extracts the 11-character YouTube video ID from any YouTube URL format:
 * - standard: https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - short: https://youtu.be/dQw4w9WgXcQ
 * - shorts: https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - embed: https://www.youtube.com/embed/dQw4w9WgXcQ or youtube-nocookie.com/embed/dQw4w9WgXcQ
 * - mobile: https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - music: https://music.youtube.com/watch?v=dQw4w9WgXcQ
 * - live: https://www.youtube.com/live/dQw4w9WgXcQ
 * - direct 11-char ID: dQw4w9WgXcQ
 */
export const extractYouTubeVideoId = (input) => {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // Direct 11-character alphanumeric/dash ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return raw;
  }

  try {
    const urlObj = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    const host = urlObj.hostname.toLowerCase();

    // youtu.be/<id>
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const cleanPath = urlObj.pathname.replace(/^\/+/, '');
      const possibleId = cleanPath.split(/[\/?#&]/)[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(possibleId)) {
        return possibleId;
      }
    }

    // youtube.com / youtube-nocookie.com
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      // ?v=<id> parameter
      const v = urlObj.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }

      // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
      const segments = urlObj.pathname.split('/').filter(Boolean);
      const keyIndex = segments.findIndex(s => ['embed', 'shorts', 'live', 'v'].includes(s.toLowerCase()));
      if (keyIndex !== -1 && segments[keyIndex + 1]) {
        const segId = segments[keyIndex + 1].split(/[?&#]/)[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(segId)) {
          return segId;
        }
      }
    }
  } catch {
    // If URL constructor fails, fall back to safe regex
  }

  // Regex patterns targeting standard YouTube URLs
  const patterns = [
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+?&v=))([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/i
  ];

  for (const regex of patterns) {
    const match = raw.match(regex);
    if (match && match[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
      return match[1];
    }
  }

  return null;
};

/**
 * Returns a clean, secure YouTube embed URL with optimal options
 */
export const getYouTubeEmbedUrl = (input, options = {}) => {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;

  const autoplay = options.autoplay ? 1 : 0;
  const controls = options.controls !== undefined ? (options.controls ? 1 : 0) : 1;
  const loop = options.loop ? 1 : 0;

  let query = `autoplay=${autoplay}&controls=${controls}&rel=0&playsinline=1&modestbranding=1&enablejsapi=1`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    query += `&origin=${encodeURIComponent(window.location.origin)}`;
  }
  if (loop) {
    query += `&loop=1&playlist=${videoId}`;
  }

  return `https://www.youtube.com/embed/${videoId}?${query}`;
};
