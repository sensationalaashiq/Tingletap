
// Username preferences utility for managing username styling only
export const USERNAME_DEFAULTS = {
  usernameFontSize: '12px',
  usernameFontColor: '#000000',
  usernameFontFamily: 'inherit',
  usernameIsBold: false,
  usernameIsItalic: false,
  usernameIsUnderline: false,
  usernameIsStrikethrough: false,
  usernameGradientEnabled: false,
  usernameGradientStart: '#ff0000',
  usernameGradientEnd: '#0000ff',
  usernameGradientDirection: 'to right',
  usernameTextShadow: 'none',
  usernameLetterSpacing: '0px',
  usernameAnimationEnabled: false,
  usernameAnimationType: 'pulse',
  usernameAnimationDuration: '2s',
  usernameOutlineEnabled: false,
  usernameOutlineColor: '#000000',
  usernameOutlineSize: '1px'
};

// Global storage for all users' username styles
if (typeof window !== 'undefined') {
  window.allUsersUsernameStyles = window.allUsersUsernameStyles || {};
  window.userUsernameStyles = window.userUsernameStyles || {};
  
  // Immediately load from localStorage on script load
  try {
    const cachedStyles = localStorage.getItem('allUsersUsernameStyles');
    if (cachedStyles) {
      const parsed = JSON.parse(cachedStyles);
      window.allUsersUsernameStyles = parsed;
      
      // Extract individual user styles for quick access
      Object.values(parsed).forEach(userStyle => {
        if (userStyle.userId && userStyle.styles) {
          window.userUsernameStyles[userStyle.userId] = userStyle.styles;
        }
      });
      
      // Loaded cached username styles
      
      // Apply all cached styles immediately
      Object.values(parsed).forEach(userStyle => {
        if (userStyle.userId && userStyle.userName && userStyle.styles) {
          applyGlobalUsernameStylesForUser(userStyle.userId, userStyle.userName, userStyle.styles);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error loading cached username styles:', error);
  }
}

// Save USERNAME font preferences to localStorage and Firebase
export const saveUsernameFontPreferences = async (preferences) => {
  try {
    const usernamePrefs = {
      usernameFontSize: preferences.usernameFontSize || '12px',
      usernameFontColor: preferences.usernameFontColor || '#000000',
      usernameFontFamily: preferences.usernameFontFamily || 'inherit',
      usernameIsBold: preferences.usernameIsBold || false,
      usernameIsItalic: preferences.usernameIsItalic || false,
      usernameIsUnderline: preferences.usernameIsUnderline || false,
      usernameIsStrikethrough: preferences.usernameIsStrikethrough || false,
      usernameGradientEnabled: preferences.usernameGradientEnabled || false,
      usernameGradientStart: preferences.usernameGradientStart || '#ff0000',
      usernameGradientEnd: preferences.usernameGradientEnd || '#0000ff',
      usernameGradientDirection: preferences.usernameGradientDirection || 'to right',
      usernameTextShadow: preferences.usernameTextShadow || 'none',
      usernameLetterSpacing: preferences.usernameLetterSpacing || '0px',
      usernameAnimationEnabled: preferences.usernameAnimationEnabled || false,
      usernameAnimationType: preferences.usernameAnimationType || 'pulse',
      usernameAnimationDuration: preferences.usernameAnimationDuration || '2s',
      usernameOutlineEnabled: preferences.usernameOutlineEnabled || false,
      usernameOutlineColor: preferences.usernameOutlineColor || '#000000',
      usernameOutlineSize: preferences.usernameOutlineSize || '1px'
    };

    // Save username preferences to localStorage
    localStorage.setItem('usernameFontPreferences', JSON.stringify(usernamePrefs));
    Object.entries(usernamePrefs).forEach(([key, value]) => {
      localStorage.setItem(key, value.toString());
    });

    // Save to Firebase and apply globally
    try {
      const { auth, db } = await import('../firebase/config');
      const { doc, updateDoc, getDoc } = await import('firebase/firestore');

      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.exists() ? userDoc.data() : {};

        await updateDoc(userRef, {
          usernameFontPreferences: usernamePrefs,
          'settings.usernameFontSize': usernamePrefs.usernameFontSize,
          'settings.usernameFontColor': usernamePrefs.usernameFontColor,
          'settings.usernameFontFamily': usernamePrefs.usernameFontFamily,
          'settings.usernameIsBold': usernamePrefs.usernameIsBold,
          'settings.usernameIsItalic': usernamePrefs.usernameIsItalic,
          'settings.usernameIsUnderline': usernamePrefs.usernameIsUnderline,
          'settings.usernameIsStrikethrough': usernamePrefs.usernameIsStrikethrough,
          'settings.usernameGradientEnabled': usernamePrefs.usernameGradientEnabled,
          'settings.usernameGradientStart': usernamePrefs.usernameGradientStart,
          'settings.usernameGradientEnd': usernamePrefs.usernameGradientEnd,
          'settings.usernameGradientDirection': usernamePrefs.usernameGradientDirection,
          'settings.usernameAnimationEnabled': usernamePrefs.usernameAnimationEnabled,
          'settings.usernameAnimationType': usernamePrefs.usernameAnimationType,
          'settings.usernameAnimationDuration': usernamePrefs.usernameAnimationDuration,
          'settings.usernameTextShadow': usernamePrefs.usernameTextShadow,
          'settings.usernameLetterSpacing': usernamePrefs.usernameLetterSpacing,
          'settings.usernameOutlineEnabled': usernamePrefs.usernameOutlineEnabled,
          'settings.usernameOutlineColor': usernamePrefs.usernameOutlineColor,
          'settings.usernameOutlineSize': usernamePrefs.usernameOutlineSize,
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Username preferences saved to Firebase');

        // Apply styles globally for ALL users to see
        const userName = userData.displayName || auth.currentUser.displayName || 'User';
        applyGlobalUsernameStylesForUser(auth.currentUser.uid, userName, usernamePrefs);

        // Store in global object for all users to access
        window.allUsersUsernameStyles[auth.currentUser.uid] = {
          userId: auth.currentUser.uid,
          userName: userName,
          styles: usernamePrefs,
          timestamp: Date.now()
        };
        window.userUsernameStyles[auth.currentUser.uid] = usernamePrefs;

        // Update localStorage cache immediately
        localStorage.setItem('allUsersUsernameStyles', JSON.stringify(window.allUsersUsernameStyles));

        // Broadcast change event for other components
        window.dispatchEvent(new CustomEvent('userSpecificUsernameStylesChanged', {
          detail: {
            userId: auth.currentUser.uid,
            userName: userName,
            styles: usernamePrefs
          }
        }));

        // Force update all components
        setTimeout(() => {
          forceApplyAllUsersStyles();
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error saving username preferences to Firebase:', error);
    }

    console.log('🎨 Username preferences saved - visible to ALL users');
    return usernamePrefs;
  } catch (error) {
    console.error('Error saving username font preferences:', error);
    return preferences;
  }
};

// Load USERNAME font preferences
export const getUsernameFontPreferences = () => {
  try {
    // Priority 1: localStorage 'usernameFontPreferences'
    const savedPrefs = localStorage.getItem('usernameFontPreferences');
    if (savedPrefs) {
      const parsed = JSON.parse(savedPrefs);
      return parsed;
    }

    // Priority 2: Individual localStorage items
    const prefs = {
      usernameFontSize: localStorage.getItem('usernameFontSize') || '12px',
      usernameFontColor: localStorage.getItem('usernameFontColor') || '#000000',
      usernameFontFamily: localStorage.getItem('usernameFontFamily') || 'inherit',
      usernameIsBold: localStorage.getItem('usernameIsBold') === 'true',
      usernameIsItalic: localStorage.getItem('usernameIsItalic') === 'true',
      usernameIsUnderline: localStorage.getItem('usernameIsUnderline') === 'true',
      usernameIsStrikethrough: localStorage.getItem('usernameIsStrikethrough') === 'true',
      usernameTextShadow: localStorage.getItem('usernameTextShadow') || 'none',
      usernameGradientEnabled: localStorage.getItem('usernameGradientEnabled') === 'true',
      usernameGradientStart: localStorage.getItem('usernameGradientStart') || '#ff0000',
      usernameGradientEnd: localStorage.getItem('usernameGradientEnd') || '#0000ff',
      usernameGradientDirection: localStorage.getItem('usernameGradientDirection') || 'to right',
      usernameLetterSpacing: localStorage.getItem('usernameLetterSpacing') || '0px',
      usernameAnimationEnabled: localStorage.getItem('usernameAnimationEnabled') === 'true',
      usernameAnimationType: localStorage.getItem('usernameAnimationType') || 'pulse',
      usernameAnimationDuration: localStorage.getItem('usernameAnimationDuration') || '2s',
      usernameOutlineEnabled: localStorage.getItem('usernameOutlineEnabled') === 'true',
      usernameOutlineColor: localStorage.getItem('usernameOutlineColor') || '#000000',
      usernameOutlineSize: localStorage.getItem('usernameOutlineSize') || '1px'
    };

    return prefs;
  } catch (error) {
    console.error('Error loading username font preferences:', error);
    return USERNAME_DEFAULTS;
  }
};

// Apply global username styles for a specific user - visible to ALL users
export const applyGlobalUsernameStylesForUser = (userId, userName, userSettings) => {
  if (!userId || !userName || !userSettings) return;
  
  console.log(`🎨 Applying GLOBAL username styles for user: ${userName} (${userId}) - visible to ALL users`);

  // Store in global objects
  if (typeof window !== 'undefined') {
    window.allUsersUsernameStyles = window.allUsersUsernameStyles || {};
    window.userUsernameStyles = window.userUsernameStyles || {};
    
    window.allUsersUsernameStyles[userId] = {
      userId,
      userName,
      styles: userSettings,
      timestamp: Date.now()
    };
    window.userUsernameStyles[userId] = userSettings;

    // Store in localStorage for persistence
    try {
      localStorage.setItem('allUsersUsernameStyles', JSON.stringify(window.allUsersUsernameStyles));
    } catch (error) {
      console.error('❌ Error storing global username styles:', error);
    }
  }

  // Check if user has custom styles
  const hasCustomStyles = 
    userSettings.usernameFontSize !== '12px' ||
    userSettings.usernameFontColor !== '#000000' ||
    userSettings.usernameFontFamily !== 'inherit' ||
    userSettings.usernameIsBold ||
    userSettings.usernameIsItalic ||
    userSettings.usernameIsUnderline ||
    userSettings.usernameIsStrikethrough ||
    userSettings.usernameTextShadow !== 'none' ||
    userSettings.usernameGradientEnabled ||
    userSettings.usernameOutlineEnabled ||
    userSettings.usernameLetterSpacing !== '0px' ||
    userSettings.usernameAnimationEnabled;

  // Remove existing styles for this user
  const existingStyle = document.getElementById(`global-username-styles-${userId}`);
  if (existingStyle) {
    existingStyle.remove();
  }

  if (!hasCustomStyles) {
    console.log('✅ Using default username styles for', userName);
    return;
  }

  // Build comprehensive CSS for this user's username
  let customStyles = '';

  // Font basics
  const fontSize = Math.min(parseInt(userSettings.usernameFontSize) || 12, 16);
  customStyles += `font-size: ${fontSize}px !important;\n`;
  customStyles += `font-family: ${userSettings.usernameFontFamily !== 'inherit' ? userSettings.usernameFontFamily : 'inherit'} !important;\n`;
  customStyles += `font-weight: ${userSettings.usernameIsBold ? 'bold' : 'normal'} !important;\n`;
  customStyles += `font-style: ${userSettings.usernameIsItalic ? 'italic' : 'normal'} !important;\n`;

  // Text decorations
  const decorations = [];
  if (userSettings.usernameIsUnderline) decorations.push('underline');
  if (userSettings.usernameIsStrikethrough) decorations.push('line-through');
  customStyles += `text-decoration: ${decorations.length > 0 ? decorations.join(' ') : 'none'} !important;\n`;

  // Letter spacing
  customStyles += `letter-spacing: ${userSettings.usernameLetterSpacing} !important;\n`;

  // Text shadow
  customStyles += `text-shadow: ${userSettings.usernameTextShadow || 'none'} !important;\n`;

  // Outline
  if (userSettings.usernameOutlineEnabled) {
    customStyles += `-webkit-text-stroke: ${userSettings.usernameOutlineSize || '1px'} solid ${userSettings.usernameOutlineColor || '#000000'} !important;\n`;
  } else {
    customStyles += `-webkit-text-stroke: none !important;\n`;
  }

  // Color or gradient
  if (userSettings.usernameGradientEnabled) {
    const gradientType = userSettings.usernameGradientDirection === 'radial' ? 'radial-gradient' : 'linear-gradient';
    const direction = userSettings.usernameGradientDirection === 'radial' ? 'circle' : userSettings.usernameGradientDirection;
    const gradient = `${gradientType}(${direction}, ${userSettings.usernameGradientStart}, ${userSettings.usernameGradientEnd})`;

    customStyles += `background: ${gradient} !important;\n`;
    customStyles += `-webkit-background-clip: text !important;\n`;
    customStyles += `-webkit-text-fill-color: transparent !important;\n`;
    customStyles += `background-clip: text !important;\n`;
  } else {
    customStyles += `color: ${userSettings.usernameFontColor} !important;\n`;
    customStyles += `background: none !important;\n`;
    customStyles += `-webkit-background-clip: initial !important;\n`;
    customStyles += `-webkit-text-fill-color: initial !important;\n`;
    customStyles += `background-clip: initial !important;\n`;
  }

  // Animation
  if (userSettings.usernameAnimationEnabled) {
    customStyles += `animation: ${userSettings.usernameAnimationType} ${userSettings.usernameAnimationDuration} infinite !important;\n`;
  } else {
    customStyles += `animation: none !important;\n`;
  }

  // Create comprehensive CSS targeting ALL possible username locations
  const globalStyleRules = `
    /* GLOBAL USERNAME styling for: ${userName} (${userId}) - visible to ALL users */

    /* Chat messages - all possible selectors */
    .message-container[data-user-id="${userId}"] .message-displayname,
    .message-container[data-user-id="${userId}"] .message-username,
    .message-container[data-user-id="${userId}"] .displayname,
    .message-container[data-user-id="${userId}"] .username,
    .message-item[data-user-id="${userId}"] .message-displayname,
    .message-item[data-user-id="${userId}"] .message-username,
    .message-item[data-user-id="${userId}"] .displayname,
    .message-item[data-user-id="${userId}"] .username,
    .chat-message[data-user-id="${userId}"] .message-displayname,
    .chat-message[data-user-id="${userId}"] .message-username,
    .chat-message[data-user-id="${userId}"] .displayname,
    .chat-message[data-user-id="${userId}"] .username,
    .user-message[data-user-id="${userId}"] .message-displayname,
    .user-message[data-user-id="${userId}"] .message-username,
    .user-message[data-user-id="${userId}"] .displayname,
    .user-message[data-user-id="${userId}"] .username,
    .message[data-user-id="${userId}"] .message-displayname,
    .message[data-user-id="${userId}"] .message-username,
    .message[data-user-id="${userId}"] .displayname,
    .message[data-user-id="${userId}"] .username,
    [data-user-id="${userId}"] .message-displayname,
    [data-user-id="${userId}"] .message-username,
    [data-user-id="${userId}"] .displayname,
    [data-user-id="${userId}"] .username,
    [data-sender-id="${userId}"] .message-displayname,
    [data-sender-id="${userId}"] .message-username,
    [data-sender-id="${userId}"] .displayname,
    [data-sender-id="${userId}"] .username,

    /* Message rows with user data */
    .message-row-wrapper[data-user-id="${userId}"] .message-displayname,
    .message-row-wrapper[data-user-id="${userId}"] .message-username,
    .message-row-wrapper[data-user-id="${userId}"] .displayname,
    .message-row-wrapper[data-user-id="${userId}"] .username,

    /* Sidebar usernames */
    .sidebar .user-item[data-user-id="${userId}"] .user-name,
    .sidebar .user-item[data-user-id="${userId}"] .displayname,
    .sidebar .user-item[data-user-id="${userId}"] .username,
    .sidebar .user-item[data-user-id="${userId}"] .list-username,
    .sidebar .user-item[data-user-id="${userId}"] .sidebar-username,
    .sidebar [data-user-id="${userId}"] .user-name,
    .sidebar [data-user-id="${userId}"] .displayname,
    .sidebar [data-user-id="${userId}"] .username,
    .sidebar [data-user-id="${userId}"] .list-username,
    .sidebar [data-user-id="${userId}"] .sidebar-username,
    .user-list .user-item[data-user-id="${userId}"] .user-name,
    .user-list .user-item[data-user-id="${userId}"] .displayname,
    .user-list .user-item[data-user-id="${userId}"] .username,
    .user-list .user-item[data-user-id="${userId}"] .list-username,
    .user-list [data-user-id="${userId}"] .user-name,
    .user-list [data-user-id="${userId}"] .displayname,
    .user-list [data-user-id="${userId}"] .username,
    .user-list [data-user-id="${userId}"] .list-username,
    .user-list-item[data-user-id="${userId}"] .list-username,
    .user-list-item[data-user-id="${userId}"] .user-name,
    .user-list-item[data-user-id="${userId}"] .displayname,
    .user-list-item[data-user-id="${userId}"] .username,

    /* Profile modal usernames */
    .profile-modal [data-user-id="${userId}"] .modal-display-name,
    .profile-modal [data-user-id="${userId}"] .profile-name,
    .profile-modal [data-user-id="${userId}"] .username,
    .profile-modal [data-user-id="${userId}"] .displayname,
    .modern-profile-container [data-user-id="${userId}"] .modal-display-name,
    .modern-profile-container [data-user-id="${userId}"] .profile-name,
    .modern-profile-container [data-user-id="${userId}"] .username,
    .modern-profile-container [data-user-id="${userId}"] .displayname,
    .modal-display-name[data-user-uid="${userId}"],
    .profile-name[data-user-uid="${userId}"],

    /* Dropdown usernames */
    .dropdown-menu [data-user-id="${userId}"] .dropdown-username,
    .dropdown-menu [data-user-id="${userId}"] .user-name,
    .dropdown-menu [data-user-id="${userId}"] .displayname,
    .dropdown-menu [data-user-id="${userId}"] .username,
    .modern-sidebar-dropdown [data-user-id="${userId}"] .dropdown-username,
    .modern-sidebar-dropdown [data-user-id="${userId}"] .user-name,
    .modern-sidebar-dropdown [data-user-id="${userId}"] .displayname,
    .modern-sidebar-dropdown [data-user-id="${userId}"] .username,
    .modern-user-dropdown [data-user-id="${userId}"] .dropdown-username,
    .modern-user-dropdown [data-user-id="${userId}"] .user-name,
    .modern-user-dropdown [data-user-id="${userId}"] .displayname,
    .modern-user-dropdown [data-user-id="${userId}"] .username,

    /* Settings sidebar usernames */
    .settings-sidebar [data-user-id="${userId}"] .username,
    .settings-sidebar [data-user-id="${userId}"] .displayname,
    .settings-sidebar [data-user-id="${userId}"] .user-name,
    .settings-sidebar [data-user-id="${userId}"] .modern-profile-name,
    .settings-tab-content [data-user-id="${userId}"] .username,
    .settings-tab-content [data-user-id="${userId}"] .displayname,
    .settings-tab-content [data-user-id="${userId}"] .user-name,
    .settings-tab-content [data-user-id="${userId}"] .modern-profile-name,

    /* Generic selectors */
    [data-user-uid="${userId}"].username,
    [data-user-uid="${userId}"].displayname,
    [data-user-uid="${userId}"].user-name,
    [data-user-uid="${userId}"].list-username,
    [data-user-uid="${userId}"].sidebar-username,
    [data-user-uid="${userId}"].modal-display-name,
    [data-user-uid="${userId}"].profile-name,
    [data-user-uid="${userId}"].dropdown-username,
    [data-user-uid="${userId}"].message-displayname,
    [data-user-uid="${userId}"].message-username,
    [data-user-uid="${userId}"].sb-list-username,
    [data-user-uid="${userId}"].sb-profile-name,

    /* Username elements by user ID */
    .username[data-user-id="${userId}"],
    .displayname[data-user-id="${userId}"],
    .user-name[data-user-id="${userId}"],
    .message-displayname[data-user-id="${userId}"],
    .message-username[data-user-id="${userId}"],
    .list-username[data-user-id="${userId}"],
    .sidebar-username[data-user-id="${userId}"],
    .modal-display-name[data-user-id="${userId}"],
    .profile-name[data-user-id="${userId}"],
    .modern-profile-name[data-user-id="${userId}"],
    .dropdown-username[data-user-id="${userId}"],
    .sb-list-username[data-user-id="${userId}"],
    .sb-profile-name[data-user-id="${userId}"],

    /* Additional specific selectors for better coverage */
    [data-username="${userName}"][data-user-id="${userId}"],
    .chat-username[data-user-id="${userId}"],
    .sender-name[data-user-id="${userId}"],
    .author-name[data-user-id="${userId}"],
    .user-label[data-user-id="${userId}"],
    .display-name[data-user-id="${userId}"],
    .name-display[data-user-id="${userId}"] {
      ${customStyles}
    }

    /* Animation keyframes */
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }

    @keyframes bounce {
      0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
      40%, 43% { transform: translateY(-10px); }
      70% { transform: translateY(-5px); }
      90% { transform: translateY(-2px); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
      20%, 40%, 60%, 80% { transform: translateX(2px); }
    }

    @keyframes glow {
      0%, 100% { text-shadow: 0 0 5px currentColor; }
      50% { text-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
    }

    @keyframes fadeInOut {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    @keyframes rainbow {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
  `;

  // Create and inject the style element
  const styleElement = document.createElement('style');
  styleElement.id = `global-username-styles-${userId}`;
  styleElement.textContent = globalStyleRules;
  document.head.appendChild(styleElement);

  console.log('✅ Global username styles applied for:', userName, '- visible to ALL users');

  // Apply styles to existing DOM elements immediately
  setTimeout(() => {
    const usernameElements = document.querySelectorAll(`[data-user-id="${userId}"], [data-user-uid="${userId}"]`);
    usernameElements.forEach(element => {
      const usernameSpan = element.querySelector('.message-displayname, .displayname, .username, .user-name, .message-username, .list-username, .sidebar-username, .modal-display-name, .profile-name, .dropdown-username');
      if (usernameSpan) {
        usernameSpan.setAttribute('data-user-id', userId);
        usernameSpan.setAttribute('data-user-uid', userId);
        usernameSpan.setAttribute('data-username', userName);
      }
    });
  }, 50);
};

// Force apply all users' styles
export const forceApplyAllUsersStyles = () => {
  if (typeof window !== 'undefined' && window.allUsersUsernameStyles) {
    Object.values(window.allUsersUsernameStyles).forEach(userStyle => {
      if (userStyle.userId && userStyle.userName && userStyle.styles) {
        applyGlobalUsernameStylesForUser(userStyle.userId, userStyle.userName, userStyle.styles);
      }
    });
    console.log(`🔄 Force applied ${Object.keys(window.allUsersUsernameStyles).length} users' styles`);
  }
};

// Load all users' global username styles with immediate cache loading
export const loadAllGlobalUsernameStyles = () => {
  try {
    // Load from localStorage immediately
    const allGlobalUsernameStyles = JSON.parse(localStorage.getItem('allGlobalUsernameStyles') || '{}');
    const allUsersUsernameStyles = JSON.parse(localStorage.getItem('allUsersUsernameStyles') || '{}');
    
    // Merge both sources
    const mergedStyles = { ...allGlobalUsernameStyles, ...allUsersUsernameStyles };
    
    if (typeof window !== 'undefined') {
      window.allUsersUsernameStyles = mergedStyles;
      window.userUsernameStyles = {};
      
      // Extract individual user styles for quick access
      Object.values(mergedStyles).forEach(userStyle => {
        if (userStyle.userId && userStyle.styles) {
          window.userUsernameStyles[userStyle.userId] = userStyle.styles;
        }
      });
    }
    
    // Apply all cached styles immediately
    Object.values(mergedStyles).forEach(userStyle => {
      if (userStyle.userId && userStyle.userName && userStyle.styles) {
        applyGlobalUsernameStylesForUser(userStyle.userId, userStyle.userName, userStyle.styles);
      }
    });
    
    console.log(`✅ Loaded ${Object.keys(mergedStyles).length} users' global username styles`);
  } catch (error) {
    console.error('❌ Error loading all global username styles:', error);
  }
};

// Enhanced function to sync all users' styles from Firebase
export const syncAllUsersStyles = async () => {
  try {
    const { db } = await import('../firebase/config');
    const { collection, getDocs } = await import('firebase/firestore');

    console.log('🔄 Syncing all users username styles from Firebase...');

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    let syncedCount = 0;
    const allStyles = {};
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;
      const userName = userData.displayName || 'User';

      // Check for username preferences in multiple locations
      let usernameStyles = null;

      if (userData.usernameFontPreferences) {
        usernameStyles = userData.usernameFontPreferences;
      } else if (userData.settings) {
        // Extract from settings object
        usernameStyles = {
          usernameFontSize: userData.settings.usernameFontSize || '12px',
          usernameFontColor: userData.settings.usernameFontColor || '#000000',
          usernameFontFamily: userData.settings.usernameFontFamily || 'inherit',
          usernameIsBold: userData.settings.usernameIsBold || false,
          usernameIsItalic: userData.settings.usernameIsItalic || false,
          usernameIsUnderline: userData.settings.usernameIsUnderline || false,
          usernameIsStrikethrough: userData.settings.usernameIsStrikethrough || false,
          usernameGradientEnabled: userData.settings.usernameGradientEnabled || false,
          usernameGradientStart: userData.settings.usernameGradientStart || '#ff0000',
          usernameGradientEnd: userData.settings.usernameGradientEnd || '#0000ff',
          usernameGradientDirection: userData.settings.usernameGradientDirection || 'to right',
          usernameTextShadow: userData.settings.usernameTextShadow || 'none',
          usernameLetterSpacing: userData.settings.usernameLetterSpacing || '0px',
          usernameAnimationEnabled: userData.settings.usernameAnimationEnabled || false,
          usernameAnimationType: userData.settings.usernameAnimationType || 'pulse',
          usernameAnimationDuration: userData.settings.usernameAnimationDuration || '2s',
          usernameOutlineEnabled: userData.settings.usernameOutlineEnabled || false,
          usernameOutlineColor: userData.settings.usernameOutlineColor || '#000000',
          usernameOutlineSize: userData.settings.usernameOutlineSize || '1px'
        };
      }

      if (usernameStyles) {
        allStyles[userId] = {
          userId,
          userName,
          styles: usernameStyles,
          timestamp: Date.now()
        };
        
        applyGlobalUsernameStylesForUser(userId, userName, usernameStyles);
        syncedCount++;
      }
    });

    // Store all styles globally
    if (typeof window !== 'undefined') {
      window.allUsersUsernameStyles = { ...window.allUsersUsernameStyles, ...allStyles };
      
      // Update localStorage cache
      try {
        localStorage.setItem('allUsersUsernameStyles', JSON.stringify(window.allUsersUsernameStyles));
      } catch (error) {
        console.error('Error storing all users styles:', error);
      }
    }

    console.log(`✅ Synced ${syncedCount} users' username styles from Firebase`);
  } catch (error) {
    console.error('❌ Error syncing users styles from Firebase:', error);
    
    // On Firebase error, ensure we still have cached data applied
    if (typeof window !== 'undefined' && window.allUsersUsernameStyles) {
      console.log('🔄 Applying cached username styles due to Firebase error...');
      Object.values(window.allUsersUsernameStyles).forEach(userStyle => {
        if (userStyle.userId && userStyle.userName && userStyle.styles) {
          applyGlobalUsernameStylesForUser(userStyle.userId, userStyle.userName, userStyle.styles);
        }
      });
      console.log('✅ Cached username styles re-applied');
    }
  }
};

// Apply global username styles
export const applyGlobalUsernameStyles = () => {
  try {
    const { auth } = window;
    if (!auth?.currentUser) {
      console.log('❌ No authenticated user for username styling');
      return;
    }

    const currentUserId = auth.currentUser.uid;
    const currentUserName = auth.currentUser.displayName || 'User';
    const preferences = getUsernameFontPreferences();

    console.log('🎨 Applying username styles for:', currentUserName);
    applyGlobalUsernameStylesForUser(currentUserId, currentUserName, preferences);

    console.log('✅ Username styles applied for:', currentUserName);
  } catch (error) {
    console.error('❌ Error applying username styles:', error);
  }
};

// Initialize username styling with immediate cache loading
export const initializeUsernameStyles = () => {
  try {
    // First priority: Load ALL cached styles immediately with NO delay
    loadAllGlobalUsernameStyles();
    
    // Apply current user styles if available
    if (window.auth?.currentUser) {
      applyGlobalUsernameStyles();
    }
    
    // Background sync with Firebase (non-blocking) - immediate first sync
    setTimeout(() => {
      syncAllUsersStyles();
    }, 10); // Reduced from 100ms to 10ms for faster initial sync
    
    // Set up more frequent initial syncing for better user experience
    let syncAttempts = 0;
    const quickSyncInterval = setInterval(() => {
      syncAllUsersStyles();
      syncAttempts++;
      if (syncAttempts >= 3) { // Try 3 quick syncs in first 30 seconds
        clearInterval(quickSyncInterval);
        // Then switch to less frequent syncing
        setInterval(() => {
          syncAllUsersStyles();
        }, 60000);
      }
    }, 10000); // Every 10 seconds for first 30 seconds
  } catch (error) {
    console.error('❌ Error initializing username styles:', error);
  }
};

// Fixed applyUsernameStyles function that works globally
export const applyUsernameStyles = async (userProfile) => {
  try {
    const { auth } = window;
    if (!auth?.currentUser || !userProfile) {
      console.log('❌ No authenticated user or profile for username styling');
      return;
    }

    const currentUserId = auth.currentUser.uid;
    const currentUserName = userProfile.displayName || auth.currentUser.displayName || 'User';
    const preferences = getUsernameFontPreferences();

    console.log('🎨 Applying username styles for:', currentUserName);

    // Apply global username styles for this user - visible to ALL users
    applyGlobalUsernameStylesForUser(currentUserId, currentUserName, preferences);

    console.log('✅ Username styles applied for:', currentUserName);
  } catch (error) {
    console.error('❌ Error applying username styles:', error);
  }
};

// Make functions globally available
if (typeof window !== 'undefined') {
  window.applyGlobalUsernameStyles = applyGlobalUsernameStyles;
  window.applyGlobalUsernameStylesForUser = applyGlobalUsernameStylesForUser;
  window.loadAllGlobalUsernameStyles = loadAllGlobalUsernameStyles;
  window.syncAllUsersStyles = syncAllUsersStyles;
  window.applyUsernameStyles = applyUsernameStyles;
  window.saveUsernameFontPreferences = saveUsernameFontPreferences;
  window.getUsernameFontPreferences = getUsernameFontPreferences;
  window.initializeUsernameStyles = initializeUsernameStyles;
  window.forceApplyAllUsersStyles = forceApplyAllUsersStyles;

  // Listen for username style updates from other users
  window.addEventListener('usernameStylesUpdated', (event) => {
    const { userId, userName, styles } = event.detail;
    applyGlobalUsernameStylesForUser(userId, userName, styles);
  });

  // Listen for user-specific style changes
  window.addEventListener('userSpecificUsernameStylesChanged', (event) => {
    const { userId, userName, styles } = event.detail;
    applyGlobalUsernameStylesForUser(userId, userName, styles);
    
    // Force update all instances
    setTimeout(() => {
      forceApplyAllUsersStyles();
    }, 100);
  });

  // Auto-initialize immediately when this module loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeUsernameStyles();
    });
  } else {
    // DOM is already loaded - initialize immediately
    initializeUsernameStyles();
  }
}
