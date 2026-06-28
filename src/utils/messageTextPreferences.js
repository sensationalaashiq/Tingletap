
// Message Text Preferences Utility
// This handles GLOBAL MESSAGE TEXT styling - visible to ALL users (like professional chat apps)

const MESSAGE_DEFAULTS = {
  fontSize: '10px',
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

// Save message font preferences to Firestore only (never localStorage)
export const saveMessageFontPreferences = async (preferences) => {
  try {
    const { auth, db } = await import('../firebase/config');
    if (!auth.currentUser) return;

    const isGuest = auth.currentUser.isAnonymous === true || localStorage.getItem('isGuest') === 'true';

    const { doc, updateDoc, getDoc, setDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', auth.currentUser.uid);
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
    const globalStyleRef = doc(db, 'globalMessageStyles', auth.currentUser.uid);
    await setDoc(globalStyleRef, {
      userId: auth.currentUser.uid,
      userName,
      styles: preferences,
      timestamp: Date.now()
    }, { merge: true });

    // Apply styles globally for ALL users to see
    applyGlobalMessageStyles(auth.currentUser.uid, userName, preferences);

    // Store in global in-memory object
    window.allUsersMessageStyles[auth.currentUser.uid] = {
      userId: auth.currentUser.uid,
      userName,
      styles: preferences,
      timestamp: Date.now()
    };
    window.userMessageStyles[auth.currentUser.uid] = preferences;

    console.log('✅ Message font preferences saved to Firebase');
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
        font-family: ${userSettings.fontFamily === 'inherit' ? 'inherit' : userSettings.fontFamily} !important;
        font-weight: ${userSettings.isBold ? 'bold' : 'normal'} !important;
        font-style: ${userSettings.isItalic ? 'italic' : 'normal'} !important;
        text-decoration: ${decorations.length > 0 ? decorations.join(' ') : 'none'} !important;
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

// Initialize global message styling with real-time Firestore listener
export const initializeGlobalMessageStyles = () => {
  try {
    setTimeout(async () => {
      try {
        const { db, auth } = await import('../firebase/config');
        const { collection, onSnapshot } = await import('firebase/firestore');

        // Only start the listener once a user is authenticated
        if (!auth.currentUser) return;

        if (window._messageStylesUnsubscribe) window._messageStylesUnsubscribe();
        window._messageStylesUnsubscribe = onSnapshot(
          collection(db, 'globalMessageStyles'),
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                if (data.userId && data.userName && data.styles) {
                  applyGlobalMessageStyles(data.userId, data.userName, data.styles);
                }
              }
            });
          },
          (error) => {
            // permission-denied is expected until Firestore rules are deployed — skip silently
            if (error?.code === 'permission-denied') return;
            console.error('❌ Message styles listener error:', error);
          }
        );
      } catch (error) {
        if (error?.code !== 'permission-denied') {
          console.error('❌ Error setting up message styles listener:', error);
        }
      }
    }, 200);
  } catch (error) {
    console.error('❌ Error initializing global message styles:', error);
  }
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
