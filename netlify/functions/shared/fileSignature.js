// netlify/functions/shared/fileSignature.js
// Server-side content-type validation via magic bytes ("file signatures").
//
// Why: every upload function previously trusted the client-supplied
// `contentType` string alone. A malicious client can label a script or an
// arbitrary payload as "image/png" and it would sail through unchanged —
// especially risky for public-bucket uploads (chat images, avatars) that get
// served back with that same claimed Content-Type. This checks the first
// bytes of the actual file against known signatures for each allowed MIME
// type, so the declared type must match what was actually uploaded.

function hasPrefix(buf, bytes, offset = 0) {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function matchesAscii(buf, str, offset = 0) {
  return hasPrefix(buf, Array.from(str, c => c.charCodeAt(0)), offset);
}

const CHECKS = {
  'image/jpeg': (buf) => hasPrefix(buf, [0xFF, 0xD8, 0xFF]),
  'image/png':  (buf) => hasPrefix(buf, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  'image/gif':  (buf) => matchesAscii(buf, 'GIF87a') || matchesAscii(buf, 'GIF89a'),
  'image/webp': (buf) => matchesAscii(buf, 'RIFF') && matchesAscii(buf, 'WEBP', 8),

  'audio/webm': (buf) => hasPrefix(buf, [0x1A, 0x45, 0xDF, 0xA3]), // EBML container (webm/mkv)
  'audio/ogg':  (buf) => matchesAscii(buf, 'OggS'),
  'audio/wav':  (buf) => matchesAscii(buf, 'RIFF') && matchesAscii(buf, 'WAVE', 8),
  'audio/mp4':  (buf) => matchesAscii(buf, 'ftyp', 4), // ISO base media container (m4a)
  'audio/mpeg': (buf) =>
    matchesAscii(buf, 'ID3') ||
    hasPrefix(buf, [0xFF, 0xFB]) || hasPrefix(buf, [0xFF, 0xF3]) ||
    hasPrefix(buf, [0xFF, 0xF2]) || hasPrefix(buf, [0xFF, 0xFA]),

  'video/webm': (buf) => hasPrefix(buf, [0x1A, 0x45, 0xDF, 0xA3]), // same EBML container as audio/webm
  'video/ogg':  (buf) => matchesAscii(buf, 'OggS'),
  // ISO base media family (mp4/mov) — box type sits at offset 4.
  'video/mp4':       (buf) => ['ftyp', 'moov', 'free', 'mdat', 'wide', 'skip'].some(box => matchesAscii(buf, box, 4)),
  'video/quicktime': (buf) => ['ftyp', 'moov', 'free', 'mdat', 'wide', 'skip'].some(box => matchesAscii(buf, box, 4)),
};

/**
 * Returns true if `buffer`'s actual content matches the claimed `contentType`.
 * Unknown content types (not in CHECKS) are allowed through — this only
 * hardens the types we explicitly accept elsewhere via MIME allow-lists.
 */
export function verifyFileSignature(buffer, contentType) {
  const check = CHECKS[contentType];
  if (!check) return true; // no signature defined — allow-list elsewhere already gates the type
  try {
    return check(buffer);
  } catch {
    return false;
  }
}
