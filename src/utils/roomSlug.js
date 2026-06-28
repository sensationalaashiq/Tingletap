/**
 * Converts a room name to a URL-friendly slug.
 * "Indian Chat"  → "indian-chat"
 * "Universal Chat" → "universal-chat"
 * "Adult Chat"   → "adult-chat"
 * "Gaming Room"  → "gaming-room"
 * "Loco Poco"    → "loco-poco"
 */
export const nameToSlug = (name = '') =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

/**
 * Returns the slug to navigate to for a given room object.
 * Prefers the stored slug field; falls back to generating from name.
 */
export const getRoomSlug = (room) =>
    room?.slug || nameToSlug(room?.name || '');
