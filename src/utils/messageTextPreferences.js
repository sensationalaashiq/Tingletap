
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

// Global storage for all users' message styles
if (typeof window !== 'undefined') {
  window.allUsersMessageStyles = window.allUsersMessageStyles || {};
  window.userMessageStyles = window.userMessageStyles || {};
  
  // Immediately load from localStorage on script load
  try {
    const cachedMessageStyles = localStorage.getItem('allGlobalMessageStyles');
    if (cachedMessageStyles) {
      const parsed = JSON.parse(cachedMessageStyles);
      window.allUsersMessageStyles = parsed;
      
      // Extract individual user styles for quick access
      Object.values(parsed).forEach(userStyle => {
        if (userStyle.userId && userStyle.styles) {
          window.userMessageStyles[userStyle.userId] = userStyle.styles;
        }
      });
      
      // Loaded cached message styles
      
      // Apply all cached styles immediately
      Object.values(parsed).forEach(userStyle => {
        if (userStyle.userId && userStyle.userName && userStyle.styles) {
          applyGlobalMessageStyles(userStyle.userId, userStyle.userName, userStyle.styles);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error loading cached message styles:', error);
  }
}

// Save message font preferences to localStorage and Firebase
export const saveMessageFontPreferences = async (preferences) => {
  try {
    // Save to localStorage immediately
    localStorage.setItem('messageFontPreferences', JSON.stringify(preferences));
    localStorage.setItem('chatFontSize', preferences.fontSize);
    localStorage.setItem('chatFontColor', preferences.fontColor);
    localStorage.setItem('chatFontFamily', preferences.fontFamily);
    localStorage.setItem('chatIsBold', preferences.isBold.toString());
    localStorage.setItem('chatIsItalic', preferences.isItalic.toString());
    localStorage.setItem('chatIsUnderline', preferences.isUnderline.toString());
    localStorage.setItem('chatIsStrikethrough', preferences.isStrikethrough.toString());

    console.log('✅ Message font preferences saved to localStorage');

    // Save to Firebase for persistence
    try {
      const { auth, db } = await import('../firebase/config');
      if (auth.currentUser) {
        const { doc, updateDoc, getDoc } = await import('firebase/firestore');
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        await updateDoc(userRef, {
          messageFontPreferences: preferences,
          'settings.messageFontPreferences': preferences,
          updatedAt: new Date().toISOString()
        });
        
        // Apply styles globally for ALL users to see
        const userName = userData.displayName || auth.currentUser.displayName || 'User';
        applyGlobalMessageStyles(auth.currentUser.uid, userName, preferences);

        // Store in global object for all users to access
        window.allUsersMessageStyles[auth.currentUser.uid] = {
          userId: auth.currentUser.uid,
          userName: userName,
          styles: preferences,
          timestamp: Date.now()
        };
        window.userMessageStyles[auth.currentUser.uid] = preferences;

        // Update localStorage cache immediately
        localStorage.setItem('allGlobalMessageStyles', JSON.stringify(window.allUsersMessageStyles));
        
        console.log('✅ Message font preferences saved to Firebase');
      }
    } catch (error) {
      console.error('❌ Error saving to Firebase:', error);
    }
  } catch (error) {
    console.error('❌ Error saving message font preferences:', error);
  }
};

// Get message font preferences with fallbacks
export const getMessageFontPreferences = () => {
  try {
    // Priority 1: Specific message font preferences
    const messagePrefsStr = localStorage.getItem('messageFontPreferences');
    if (messagePrefsStr) {
      const messagePrefs = JSON.parse(messagePrefsStr);
      console.log('✅ Message font preferences loaded from localStorage:', messagePrefs);
      return messagePrefs;
    }

    // Priority 2: Individual localStorage keys
    const individualPrefs = {
      fontSize: localStorage.getItem('chatFontSize') || MESSAGE_DEFAULTS.fontSize,
      fontColor: localStorage.getItem('chatFontColor') || MESSAGE_DEFAULTS.fontColor,
      fontFamily: localStorage.getItem('chatFontFamily') || MESSAGE_DEFAULTS.fontFamily,
      isBold: localStorage.getItem('chatIsBold') === 'true',
      isItalic: localStorage.getItem('chatIsItalic') === 'true',
      isUnderline: localStorage.getItem('chatIsUnderline') === 'true',
      isStrikethrough: localStorage.getItem('chatIsStrikethrough') === 'true'
    };

    return individualPrefs;
  } catch (error) {
    console.error('❌ Error loading message font preferences:', error);
    return MESSAGE_DEFAULTS;
  }
};

// Apply message text styles globally for a specific user - visible to ALL users
export const applyGlobalMessageStyles = (userId, userName, userSettings) => {
  if (!userId || !userName || !userSettings) return;
  
  console.log(`🎨 Applying GLOBAL message styles for user: ${userName} (${userId}) - visible to ALL users`);

  // Store global message styles for this user
  try {
    const allGlobalMessageStyles = JSON.parse(localStorage.getItem('allGlobalMessageStyles') || '{}');
    allGlobalMessageStyles[userId] = {
      userId,
      userName,
      styles: userSettings,
      timestamp: Date.now()
    };
    localStorage.setItem('allGlobalMessageStyles', JSON.stringify(allGlobalMessageStyles));
    console.log(`💾 Stored global message styles for ${userName}`);
  } catch (error) {
    console.error('❌ Error storing global message styles:', error);
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

// Load all users' global message styles with immediate cache loading
export const loadAllGlobalMessageStyles = () => {
  try {
    const allGlobalMessageStyles = JSON.parse(localStorage.getItem('allGlobalMessageStyles') || '{}');
    
    if (typeof window !== 'undefined') {
      window.allUsersMessageStyles = allGlobalMessageStyles;
      window.userMessageStyles = {};
      
      // Extract individual user styles for quick access
      Object.values(allGlobalMessageStyles).forEach(userStyle => {
        if (userStyle.userId && userStyle.styles) {
          window.userMessageStyles[userStyle.userId] = userStyle.styles;
        }
      });
    }
    
    // Apply all cached styles immediately
    Object.values(allGlobalMessageStyles).forEach(userStyle => {
      if (userStyle.userId && userStyle.userName && userStyle.styles) {
        applyGlobalMessageStyles(userStyle.userId, userStyle.userName, userStyle.styles);
      }
    });
    
    // Loaded global message styles successfully
  } catch (error) {
    console.error('❌ Error loading all global message styles:', error);
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

    // Save all styles to localStorage
    localStorage.setItem('allGlobalMessageStyles', JSON.stringify(allGlobalMessageStyles));
    
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

// Initialize global message styling system with immediate cache loading
export const initializeGlobalMessageStyles = () => {
  try {
    // First priority: Apply global text styles immediately
    applyMessageTextStyles();
    
    // Second priority: Load all cached user message styles immediately
    loadAllGlobalMessageStyles();

    // Background sync with Firebase (non-blocking) - immediate first sync
    setTimeout(() => {
      syncAllUsersMessageStyles();
    }, 10); // Reduced from 100ms to 10ms for faster initial sync
    
    // Set up more frequent initial syncing
    let syncAttempts = 0;
    const quickSyncInterval = setInterval(() => {
      syncAllUsersMessageStyles();
      syncAttempts++;
      if (syncAttempts >= 3) { // Try 3 quick syncs in first 30 seconds
        clearInterval(quickSyncInterval);
        // Then switch to less frequent syncing
        setInterval(() => {
          syncAllUsersMessageStyles();
        }, 60000);
      }
    }, 10000); // Every 10 seconds for first 30 seconds
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

  // Auto-initialize immediately when this module loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeGlobalMessageStyles();
    });
  } else {
    // DOM is already loaded - initialize immediately
    initializeGlobalMessageStyles();
  }

  // Reduce periodic reapplication frequency but keep it for stability
  if (!window.messageTextInterval) {
    window.messageTextInterval = setInterval(() => {
      applyMessageTextStyles();
      loadAllGlobalMessageStyles();
    }, 60000); // Every 60 seconds instead of 30
  }
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
