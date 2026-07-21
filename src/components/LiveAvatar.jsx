import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLivePhotoURL } from '../utils/liveUsernames';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import { extractR2Key } from '../services/r2StorageService';

// randomuser.me URLs are our own generated defaults, never a real upload —
// treat them the same as "no photo" so a stale denormalized copy of one
// never wins over a genuinely uploaded photo.
const isRealUpload = (url) => !!url && !url.includes('randomuser.me');

/**
 * LiveAvatarImg — the single source of truth for "what avatar do we show
 * for this uid" everywhere in the app (sidebar, private messages,
 * conversations tray, admin panel, dropdowns, chat).
 *
 * Resolution order:
 *   1. The user's LIVE photoURL from Firestore (shared refcounted listener
 *      via useLivePhotoURL — always current, never a stale denormalized copy).
 *   2. A fallback photoURL passed in by the caller (e.g. a value already on
 *      hand from a message/report doc) — only if it looks like a real upload.
 *   3. The same deterministic generated avatar every time for this uid, so
 *      un-uploaded users still look consistent across the whole app instead
 *      of "random" per surface.
 *
 * Signed-URL expiry recovery:
 *   All R2 media is served via 7-day signed URLs. If a URL expires, onError
 *   fires and we automatically fetch a fresh signed URL via getMediaUrl —
 *   the key is extracted from the expired URL's path or from the optional
 *   photoKey prop. Requires the viewer to be a registered (non-guest) user.
 *
 * Never call hooks inside .map() — this component exists so each row can
 * mount its own instance safely instead.
 */
export default function LiveAvatarImg({
  uid,
  gender,
  fallbackPhotoURL,
  photoKey,
  className,
  alt = 'avatar',
  ...rest
}) {
  const livePhoto = useLivePhotoURL(uid);
  const baseSrc = isRealUpload(livePhoto)
    ? livePhoto
    : isRealUpload(fallbackPhotoURL)
      ? fallbackPhotoURL
      : getDefaultAvatarUrl(uid, gender);

  const [displaySrc, setDisplaySrc] = useState(baseSrc);
  const retried = useRef(false);

  // Sync displaySrc when the live Firestore photo changes (e.g. user updates their DP).
  useEffect(() => {
    setDisplaySrc(baseSrc);
    retried.current = false;
  }, [baseSrc]); // baseSrc is a string — safe dep

  const handleError = useCallback(() => {
    if (retried.current) return; // only one retry per src
    retried.current = true;
    // Key is either explicitly passed or embedded in the expired signed URL's path.
    const key = photoKey || extractR2Key(displaySrc);
    if (!key) return;
    // Dynamic import avoids a top-level circular dep and keeps the bundle leaner.
    import('../services/r2StorageService').then(({ getMediaUrl }) =>
      getMediaUrl(key).then(freshUrl => {
        retried.current = false; // allow re-retry if the fresh URL also expires
        setDisplaySrc(freshUrl);
      })
    ).catch(() => { /* stay on current src / show browser broken-image icon */ });
  }, [photoKey, displaySrc]);

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
      {...rest}
    />
  );
}
