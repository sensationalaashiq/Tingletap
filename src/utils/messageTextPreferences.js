
// Message Text Preferences Utility
// This handles GLOBAL MESSAGE TEXT styling - visible to ALL users (like professional chat apps)

const MESSAGE_DEFAULTS = {
  fontSize: '11px',
  fontColor: '#333333',
  fontFamily: 'inherit',
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false
};

// Global storage for all users' message styles (in-memory only — never localStorage)
if (typeof window !== 'undefined') {
  window.allUsersMessageStyles = window.allUsersMessageStyles || {};
  window.userMessageStyles = window.userMessageStyles || {};
}

// Network writes are debounced per-uid (500ms trailing) so rapid consecutive
// style changes collapse into a single Firestore write pair instead of one
// pair per change. The local/instant UI application is NOT debounced.
const _messageWriteTimers = {};
const _messagePendingPrefs = {};

const _flushMessagePreferencesToFirestore = async (uid) => {
  const preferences = _messagePendingPrefs[uid];
  delete _messageWriteTimers[uid];
  delete _messagePendingPrefs[uid];
  if (!preferences) return;

  try {
    const { auth, db } = await import('../firebase/config');
    if (!auth.currentUser || auth.currentUser.uid !== uid) return;

    const isGuest = auth.currentUser.isAnonymous === true || localStorage.getItem('isGuest') === 'true';

    const { doc, updateDoc, getDoc, setDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : {};

    if (!isGuest) {
      await updateDoc(userRef, {
        messageFontPreferences: preferences,
        'settings.messageFontPreferences': preferences,
        updatedAt: new Date().toISOString()
      });
    }

    const userName = userData.displayName || auth.currentUser.displayName || 'User';

    // Write to globalMessageStyles for real-time cross-user sync
    const globalStyleRef = doc(db, 'globalMessageStyles', uid);
    await setDoc(globalStyleRef, {
      userId: uid,
      userName,
      styles: preferences,
      timestamp: Date.now()
    }, { merge: true });

    console.log('✅ Message font preferences saved to Firebase');
  } catch (error) {
    console.error('❌ Error saving message font preferences:', error);
  }
};

// Save message font preferences to Firestore only (never localStorage)
export const saveMessageFontPreferences = async (preferences) => {
  try {
    const { auth } = await import('../firebase/config');
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const userName = auth.currentUser.displayName || 'User';

    // Instant local application (never debounced)
    applyGlobalMessageStyles(uid, userName, preferences);
    window.allUsersMessageStyles[uid] = { userId: uid, userName, styles: preferences, timestamp: Date.now() };
    window.userMessageStyles[uid] = preferences;

    // Debounced network write (500ms)
    _messagePendingPrefs[uid] = preferences;
    if (_messageWriteTimers[uid]) clearTimeout(_messageWriteTimers[uid]);
    _messageWriteTimers[uid] = setTimeout(() => _flushMessagePreferencesToFirestore(uid), 500);
  } catch (error) {
    console.error('❌ Error saving message font preferences:', error);
  }
};

// Get message font preferences from in-memory globals (Firestore-sourced) or defaults
export const getMessageFontPreferences = () => {
  try {
    const currentUser = window.auth?.currentUser;
    if (currentUser && window.userMessageStyles && window.userMessageStyles[currentUser.uid]) {
      return window.userMessageStyles[currentUser.uid];
    }
    return { ...MESSAGE_DEFAULTS };
  } catch (error) {
    return { ...MESSAGE_DEFAULTS };
  }
};

// Apply message text styles globally for a specific user - visible to ALL users
export const applyGlobalMessageStyles = (userId, userName, userSettings) => {
  if (!userId || !userName || !userSettings) return;
  
  console.log(`🎨 Applying GLOBAL message styles for user: ${userName} (${userId}) - visible to ALL users`);

  // Store in global objects (in-memory only)
  if (typeof window !== 'undefined') {
    window.allUsersMessageStyles = window.allUsersMessageStyles || {};
    window.userMessageStyles = window.userMessageStyles || {};
    window.allUsersMessageStyles[userId] = { userId, userName, styles: userSettings, timestamp: Date.now() };
    window.userMessageStyles[userId] = userSettings;
  }

  // Remove existing global message style for this user
  const existingGlobalStyle = document.getElementById(`global-message-styles-${userId}`);
  if (existingGlobalStyle) {
    existingGlobalStyle.remove();
  }

  const decorations = [];
  if (userSettings.isUnderline) decorations.push('underline');
  if (userSettings.isStrikethrough) decorations.push('line-through');

  // Create comprehensive global style rules for this user's messages - visible to ALL users
  const messageStyleRules = `
    /* Global Message Styling for ${userName} - visible to ALL users */
    [data-user-id="${userId}"] .message-body:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    [data-user-id="${userId}"] .message-body p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    [data-user-id="${userId}"] .message-content:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    [data-user-id="${userId}"] .message-content p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    [data-user-id="${userId}"] .message-text:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    [data-user-id="${userId}"] .chat-message-text:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-container[data-user-id="${userId}"] .message-body:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-container[data-user-id="${userId}"] .message-body p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-container[data-user-id="${userId}"] .message-content:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-container[data-user-id="${userId}"] .message-content p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-row[data-user-id="${userId}"] .message-body:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-row[data-user-id="${userId}"] .message-body p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-row[data-user-id="${userId}"] .message-content:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-row[data-user-id="${userId}"] .message-content p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-item[data-user-id="${userId}"] .message-body:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-item[data-user-id="${userId}"] .message-body p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-item[data-user-id="${userId}"] .message-content:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-item[data-user-id="${userId}"] .message-content p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-row-wrapper[data-user-id="${userId}"] .message-body:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-row-wrapper[data-user-id="${userId}"] .message-body p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-row-wrapper[data-user-id="${userId}"] .message-content:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
    .message-row-wrapper[data-user-id="${userId}"] .message-content p:not(.message-displayname):not(.username):not(.user-name):not(.message-username) {
        font-size: ${userSettings.fontSize} !important;
        color: ${userSettings.fontColor} !important;
        -webkit-text-fill-color: ${userSettings.fontColor} !important;
        font-family: ${userSettings.fontFamily === 'inherit' ? 'inherit' : userSettings.fontFamily} !important;
        font-weight: ${userSettings.isBold ? 'bold' : 'normal'} !important;
        font-style: ${userSettings.isItalic ? 'italic' : 'normal'} !important;
        text-decoration: ${decorations.length > 0 ? decorations.join(' ') : 'none'} !important;
        text-shadow: 0 0 3px rgba(255,255,255,0.45), 0 0 5px rgba(0,0,0,0.45) !important;
    }

    /* PROTECTION: Ensure usernames are NEVER affected by message styling */
    [data-user-id="${userId}"] .message-displayname,
    [data-user-id="${userId}"] .message-username,
    [data-user-id="${userId}"] .username,
    [data-user-id="${userId}"] .displayname,
    [data-user-id="${userId}"] .user-name,
    [data-user-id="${userId}"] .profile-name,
    .message-container[data-user-id="${userId}"] .message-displayname,
    .message-container[data-user-id="${userId}"] .message-username,
    .message-container[data-user-id="${userId}"] .username,
    .message-container[data-user-id="${userId}"] .displayname,
    .message-container[data-user-id="${userId}"] .user-name {
      /* USERNAME STYLING IS HANDLED BY SEPARATE USERNAME UTILITIES */
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.id = `global-message-styles-${userId}`;
  styleElement.textContent = messageStyleRules;
  document.head.appendChild(styleElement);

  console.log(`✅ Global message styles applied for ${userName} - visible to ALL users`);
};

// Apply message text styles globally
export const applyMessageTextStyles = () => {
  try {
    const preferences = getMessageFontPreferences();

    // Build CSS for message text styling
    let messageStyles = `
      font-size: ${preferences.fontSize} !important;
      color: ${preferences.fontColor} !important;
      font-family: ${preferences.fontFamily} !important;
      font-weight: ${preferences.isBold ? 'bold' : 'normal'} !important;
      font-style: ${preferences.isItalic ? 'italic' : 'normal'} !important;
    `;

    const decorations = [];
    if (preferences.isUnderline) decorations.push('underline');
    if (preferences.isStrikethrough) decorations.push('line-through');
    messageStyles += `text-decoration: ${decorations.length > 0 ? decorations.join(' ') : 'none'} !important;`;

    // Remove existing message text styles
    const existingStyle = document.getElementById('global-message-text-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element for message text
    const styleElement = document.createElement('style');
    styleElement.id = 'global-message-text-styles';
    styleElement.textContent = `
      .message-content, .message-text, .chat-message-text, .user-message-text {
        ${messageStyles}
      }
    `;
    document.head.appendChild(styleElement);

    console.log('✅ Global message text styles applied');
  } catch (error) {
    console.error('❌ Error applying message text styles:', error);
  }
};

// Load all users' global message styles — in-memory only, never localStorage
export const loadAllGlobalMessageStyles = () => {
  try {
    if (typeof window !== 'undefined') {
      window.allUsersMessageStyles = window.allUsersMessageStyles || {};
      window.userMessageStyles = window.userMessageStyles || {};
    }
    // Actual styles come from Firestore via initializeGlobalMessageStyles listener
  } catch (error) {
    console.error('❌ Error initializing message styles:', error);
  }
};

// Enhanced sync with real-time updates from Firebase
export const syncAllUsersMessageStyles = async () => {
  // Syncing all users message styles from Firebase

  try {
    const { db } = await import('../firebase/config');
    const { collection, getDocs } = await import('firebase/firestore');

    // First, do initial sync
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    let syncedCount = 0;
    const allGlobalMessageStyles = {};

    snapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.messageFontPreferences && userData.displayName) {
        const userId = doc.id;
        const userName = userData.displayName;
        const preferences = userData.messageFontPreferences;

        // Store in global message styles
        allGlobalMessageStyles[userId] = {
          userId,
          userName,
          styles: preferences,
          timestamp: Date.now()
        };

        // Apply styles immediately
        applyGlobalMessageStyles(userId, userName, preferences);
        syncedCount++;
      }
    });

    // Update global window objects
    if (typeof window !== 'undefined') {
      window.allUsersMessageStyles = { ...window.allUsersMessageStyles, ...allGlobalMessageStyles };
      
      // Extract individual user styles for quick access
      Object.values(allGlobalMessageStyles).forEach(userStyle => {
        if (userStyle.userId && userStyle.styles) {
          window.userMessageStyles[userStyle.userId] = userStyle.styles;
        }
      });
    }

    console.log(`✅ Synced ${syncedCount} users' message styles from Firebase`);

  } catch (error) {
    console.error('❌ Error syncing message styles from Firebase:', error);
  }
};

// Clear all message styles — call on logout
export const clearAllMessageStyles = () => {
  document.querySelectorAll('[id^="global-message-styles-"]').forEach(el => el.remove());
  document.getElementById('global-message-text-styles')?.remove();
  document.getElementById('immediate-message-styles')?.remove();
  window.allUsersMessageStyles = {};
  window.userMessageStyles = {};
  window.chatFontPreferences = null;
  if (window._messageStylesUnsubscribe) {
    window._messageStylesUnsubscribe();
    window._messageStylesUnsubscribe = null;
  }
  if (window.messageTextInterval) {
    clearInterval(window.messageTextInterval);
    window.messageTextInterval = null;
  }
};

// Initialize global message styling with room-scoped Firestore listeners.
// Pass roomParticipantUids (string[]) to subscribe only to styles for users
// currently in the room.  Call with an empty array to unsubscribe everything.
// Returns a combined unsubscribe function.
export const initializeGlobalMessageStyles = (roomParticipantUids = []) => {
  // Tear down any previous chunk listeners
  if (window._messageStylesUnsubscribes) {
    window._messageStylesUnsubscribes.forEach(fn => { try { fn(); } catch {} });
  }
  window._messageStylesUnsubscribes = [];

  // Backward-compat alias so callers that still hold the old handle can unsubscribe
  window._messageStylesUnsubscribe = () => {
    if (window._messageStylesUnsubscribes) {
      window._messageStylesUnsubscribes.forEach(fn => { try { fn(); } catch {} });
      window._messageStylesUnsubscribes = [];
    }
  };

  // Do not open any listeners until we have UIDs to watch
  if (!roomParticipantUids || roomParticipantUids.length === 0) {
    return () => {};
  }

  const CHUNK_SIZE = 30;
  const chunks = [];
  for (let i = 0; i < roomParticipantUids.length; i += CHUNK_SIZE) {
    chunks.push(roomParticipantUids.slice(i, i + CHUNK_SIZE));
  }

  (async () => {
    try {
      const { db, auth } = await import('../firebase/config');
      const { collection, query, where, documentId, onSnapshot } = await import('firebase/firestore');

      if (!auth.currentUser) return;

      chunks.forEach(chunk => {
        const q = query(
          collection(db, 'globalMessageStyles'),
          where(documentId(), 'in', chunk)
        );

        const unsub = onSnapshot(
          q,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                if (data.userId && data.userName && data.styles) {
                  // Merge into the global in-memory store
                  window.allUsersMessageStyles = window.allUsersMessageStyles || {};
                  window.allUsersMessageStyles[data.userId] = {
                    userId: data.userId,
                    userName: data.userName,
                    styles: data.styles,
                    timestamp: Date.now()
                  };
                  applyGlobalMessageStyles(data.userId, data.userName, data.styles);
                }
              }
            });
          },
          (error) => {
            if (error?.code === 'permission-denied') return;
            console.error('❌ Message styles listener error:', error);
          }
        );

        if (window._messageStylesUnsubscribes) {
          window._messageStylesUnsubscribes.push(unsub);
        }
      });
    } catch (error) {
      if (error?.code !== 'permission-denied') {
        console.error('❌ Error setting up message styles listeners:', error);
      }
    }
  })();

  return () => {
    if (window._messageStylesUnsubscribes) {
      window._messageStylesUnsubscribes.forEach(fn => { try { fn(); } catch {} });
      window._messageStylesUnsubscribes = [];
    }
  };
};

// Make functions globally available
if (typeof window !== 'undefined') {
  window.applyGlobalMessageStyles = applyGlobalMessageStyles;
  window.saveMessageFontPreferences = saveMessageFontPreferences;
  window.getMessageFontPreferences = getMessageFontPreferences;
  window.applyMessageTextStyles = applyMessageTextStyles;
  window.loadAllGlobalMessageStyles = loadAllGlobalMessageStyles;
  window.syncAllUsersMessageStyles = syncAllUsersMessageStyles;

  // Listen for global message style updates
  window.addEventListener('globalMessageStylesUpdated', (event) => {
    const { userId, userName, styles } = event.detail;
    applyGlobalMessageStyles(userId, userName, styles);
  });

  // Listen for force sync events from other users
  window.addEventListener('forceMessageStyleSync', (event) => {
    const { userId, userName, styles, action } = event.detail;
    console.log(`📡 Force sync received for ${userName}: ${action}`);
    applyGlobalMessageStyles(userId, userName, styles);
  });

  // DO NOT auto-initialize here — listeners require auth and must only start after login.
  // initializeGlobalMessageStyles() is called by App.jsx once the user is authenticated.
}

// Backward compatibility exports
export const getFontPreferences = getMessageFontPreferences;
export default {
  saveMessageFontPreferences,
  getMessageFontPreferences,
  applyGlobalMessageStyles,
  applyMessageTextStyles,
  loadAllGlobalMessageStyles,
  syncAllUsersMessageStyles,
  initializeGlobalMessageStyles
};
