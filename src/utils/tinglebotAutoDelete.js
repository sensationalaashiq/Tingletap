import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Maximum lifetime for all ephemeral TingleBot room notifications (< 1 minute)
export const TINGLEBOT_TTL_MS = 50 * 1000;

const _scheduledDeletions = new Set();

/**
 * Schedule a Firestore TingleBot message for automatic deletion within ttlMs (default 50s).
 * Idempotent across duplicate snapshots/clients.
 */
export function scheduleTingleBotDeletion(roomId, msgId, delayMs = TINGLEBOT_TTL_MS) {
  if (!roomId || !msgId) return;
  const key = `${roomId}:${msgId}`;
  if (_scheduledDeletions.has(key)) return;
  _scheduledDeletions.add(key);

  const safeDelay = Math.max(0, Math.min(delayMs, TINGLEBOT_TTL_MS));
  setTimeout(() => {
    deleteDoc(doc(db, 'rooms', roomId, 'messages', msgId)).catch(() => {});
    // Keep key briefly so re-snapshots don't re-schedule; prune after 2m
    setTimeout(() => _scheduledDeletions.delete(key), 120 * 1000);
  }, safeDelay);
}

/**
 * Check whether a room message id already has a pending TingleBot auto-delete timer.
 */
export function hasScheduledTingleBotDeletion(roomId, msgId) {
  return _scheduledDeletions.has(`${roomId}:${msgId}`);
}

/**
 * Post a TingleBot notification message to a chat room and automatically delete it
 * after ttlMs (default 50 seconds, always under 1 minute) so the database stays clean.
 *
 * @param {string} roomId
 * @param {object} payload - { text, tinglebotType, uid?, targetUid?, omitBotFlags? }
 * @param {number} [ttlMs=50000]
 */
export async function postTingleBotRoomMessage(roomId, payload, ttlMs = TINGLEBOT_TTL_MS) {
  if (!roomId || !payload?.text) return null;
  try {
    const {
      text,
      tinglebotType = 'system',
      uid = 'tinglebot_system_official_2024',
      targetUid,
      omitBotFlags = false,
      extra = {},
    } = payload;

    const docData = {
      text,
      uid,
      displayName: 'TingleBot',
      tinglebotType,
      createdAt: serverTimestamp(),
      noReply: true,
      noReaction: true,
      noReport: true,
      noUnread: true,
      ...extra,
    };

    if (!omitBotFlags) {
      docData.isBot = true;
      docData.systemBot = true;
    }
    if (targetUid) {
      docData.targetUid = targetUid;
    }

    const ref = await addDoc(collection(db, 'rooms', roomId, 'messages'), docData);
    if (ref?.id) {
      scheduleTingleBotDeletion(roomId, ref.id, ttlMs);
    }
    return ref;
  } catch (err) {
    console.error('[TingleBot] Failed to post room message:', err?.message || err);
    return null;
  }
}
