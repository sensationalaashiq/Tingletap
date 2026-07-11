// Shared helper for computing a user's *effective* online state from an RTDB
// status/{uid} entry: { state, last_changed, currentRoomId, ... }.
//
// Why this exists: presence relies on onDisconnect() + a heartbeat (see
// HomePage.jsx). onDisconnect() is best-effort — it can miss abrupt network
// drops, mobile app backgrounding, or process kills — so a stale `state:
// "online"` entry can linger in RTDB indefinitely until the next login
// triggers App.jsx's one-time cleanupStaleStatuses() sweep. Any UI that reads
// `status.state === 'online'` directly can therefore show offline users as
// online and NOT be real-time.
//
// Fix: treat a status entry as online only if state is 'online' AND its
// last_changed heartbeat is fresher than STALE_MS. This keeps admin/staff
// views truthful on every render without waiting for a separate cleanup pass.
// Matches the STALE_MS threshold already used by App.jsx's cleanup sweep and
// is comfortably larger than the 5-minute client heartbeat interval.

export const PRESENCE_STALE_MS = 8 * 60 * 1000; // 8 minutes

/**
 * @param {{state?: string, last_changed?: number} | undefined | null} status
 * @param {number} [now] - inject for testability; defaults to Date.now()
 * @returns {boolean} true only if genuinely online right now
 */
export function isEffectivelyOnline(status, now = Date.now()) {
  if (!status || status.state !== 'online') return false;
  // If we have no heartbeat timestamp at all, fall back to trusting `state`
  // (covers the brief window right after the initial write lands).
  if (!status.last_changed) return true;
  return (now - status.last_changed) < PRESENCE_STALE_MS;
}
