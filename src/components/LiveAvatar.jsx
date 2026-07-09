import React from 'react';
import { useLivePhotoURL } from '../utils/liveUsernames';
import { getDefaultAvatarUrl } from '../utils/roleUtils';

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
 * Never call hooks inside .map() — this component exists so each row can
 * mount its own instance safely instead.
 */
export default function LiveAvatarImg({ uid, gender, fallbackPhotoURL, className, alt = 'avatar', ...rest }) {
  const livePhoto = useLivePhotoURL(uid);
  const src = isRealUpload(livePhoto)
    ? livePhoto
    : isRealUpload(fallbackPhotoURL)
      ? fallbackPhotoURL
      : getDefaultAvatarUrl(uid, gender);

  return <img src={src} alt={alt} className={className} {...rest} />;
}
