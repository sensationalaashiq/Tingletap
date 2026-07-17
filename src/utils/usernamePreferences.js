
// Username preferences utility for managing username styling only
export const USERNAME_DEFAULTS = {
  usernameFontSize: '12px',
  usernameFontColor: '#000000',
  usernameFontFamily: 'inherit',
  usernameIsBold: true,
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

// Global storage for all users' username styles (in-memory only — never localStorage)
if (typeof window !== 'undefined') {
  window.allUsersUsernameStyles = window.allUsersUsernameStyles || {};
  window.userUsernameStyles = window.userUsernameStyles || {};
}

// Network writes are debounced per-uid (500ms trailing) so rapid consecutive
// style changes (e.g. dragging a color/slider control) collapse into a single
// Firestore write pair instead of one pair per change. The local/instant UI
// application (below) is NOT debounced — it still happens immediately.
const _usernameWriteTimers = {};
const _usernamePendingPrefs = {};

const _flushUsernamePreferencesToFirestore = async (uid) => {
  const usernamePrefs = _usernamePendingPrefs[uid];
  delete _usernameWriteTimers[uid];
  delete _usernamePendingPrefs[uid];
  if (!usernamePrefs) return;

  try {
    const { auth, db } = await import('../firebase/config');
    const { doc, updateDoc, getDoc, setDoc } = await import('firebase/firestore');

    if (!auth.currentUser || auth.currentUser.uid !== uid || auth.currentUser.isAnonymous) return;

    const userRef = doc(db, 'users', uid);
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

    const userName = userData.displayName || auth.currentUser.displayName || 'User';

    // Also write to globalUsernameStyles collection for real-time cross-user sync
    const globalStyleRef = doc(db, 'globalUsernameStyles', uid);
    await setDoc(globalStyleRef, {
      userId: uid,
      userName: userName,
      styles: usernamePrefs,
      timestamp: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('❌ Error saving username preferences to Firebase:', error);
  }
};

// Save USERNAME font preferences to Firestore only (never localStorage)
export const saveUsernameFontPreferences = async (preferences) => {
  try {
    const usernamePrefs = {
      usernameFontSize: preferences.usernameFontSize || '12px',
      usernameFontColor: preferences.usernameFontColor || '#000000',
      usernameFontFamily: preferences.usernameFontFamily || 'inherit',
      usernameIsBold: preferences.usernameIsBold !== undefined ? preferences.usernameIsBold : true,
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

    try {
      const { auth } = await import('../firebase/config');

      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        const uid = auth.currentUser.uid;
        const userName = auth.currentUser.displayName || 'User';

        // Instant local application (never debounced) — updates this user's
        // own view and broadcasts to already-connected peers immediately.
        applyGlobalUsernameStylesForUser(uid, userName, usernamePrefs);
        window.allUsersUsernameStyles[uid] = { userId: uid, userName, styles: usernamePrefs, timestamp: Date.now() };
        window.userUsernameStyles[uid] = usernamePrefs;
        window.dispatchEvent(new CustomEvent('userSpecificUsernameStylesChanged', {
          detail: { userId: uid, userName, styles: usernamePrefs }
        }));
        setTimeout(() => { forceApplyAllUsersStyles(); }, 100);

        // Debounced network write (500ms) — collapses rapid consecutive saves
        // (e.g. dragging a slider) into a single Firestore write pair.
        _usernamePendingPrefs[uid] = usernamePrefs;
        if (_usernameWriteTimers[uid]) clearTimeout(_usernameWriteTimers[uid]);
        _usernameWriteTimers[uid] = setTimeout(() => _flushUsernamePreferencesToFirestore(uid), 500);
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

// Load USERNAME font preferences from in-memory globals (Firestore-sourced) or defaults
export const getUsernameFontPreferences = () => {
  try {
    const currentUser = window.auth?.currentUser;
    if (currentUser && window.userUsernameStyles && window.userUsernameStyles[currentUser.uid]) {
      return window.userUsernameStyles[currentUser.uid];
    }
    return { ...USERNAME_DEFAULTS };
  } catch (error) {
    return { ...USERNAME_DEFAULTS };
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
  }

  // Check if user has TRULY custom styles — only inject CSS when something is
  // genuinely non-default. Previously `usernameIsBold ||` was always truthy
  // (bold=true is the DEFAULT), causing every user with any Firestore prefs doc
  // to get CSS injected even with fully-default settings. That CSS overrode the
  // Georgia font-family and the dark --username-color CSS variable, making
  // names look faded/different from users who have no prefs doc at all.
  const DEFAULT_COLORS = new Set(['#000000', '#1f2937', '#1a1a1a', '']);
  const hasCustomStyles = 
    (userSettings.usernameFontSize && userSettings.usernameFontSize !== '12px' && userSettings.usernameFontSize !== '11px') ||
    (userSettings.usernameFontColor && !DEFAULT_COLORS.has(userSettings.usernameFontColor.toLowerCase())) ||
    (userSettings.usernameFontFamily && userSettings.usernameFontFamily !== 'inherit') ||
    userSettings.usernameIsBold === false ||       // only custom when explicitly NOT bold
    userSettings.usernameIsItalic ||
    userSettings.usernameIsUnderline ||
    userSettings.usernameIsStrikethrough ||
    (userSettings.usernameTextShadow && userSettings.usernameTextShadow !== 'none') ||
    userSettings.usernameGradientEnabled ||
    userSettings.usernameOutlineEnabled ||
    (userSettings.usernameLetterSpacing && userSettings.usernameLetterSpacing !== '0px') ||
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

  // Font basics — only inject properties that are genuinely non-default so we
  // don't override the CSS class's Georgia font-family, bold weight, or dark
  // color for users who have effectively-default Firestore prefs.
  const fontSize = Math.min(parseInt(userSettings.usernameFontSize) || 12, 16);
  customStyles += `font-size: ${fontSize}px !important;\n`;
  // Only override font-family when explicitly set — 'inherit' means "use CSS default (Georgia)"
  if (userSettings.usernameFontFamily && userSettings.usernameFontFamily !== 'inherit') {
    customStyles += `font-family: ${userSettings.usernameFontFamily} !important;\n`;
  }
  customStyles += `font-weight: ${userSettings.usernameIsBold === false ? 'normal' : 'bold'} !important;\n`;
  customStyles += `font-style: ${userSettings.usernameIsItalic ? 'italic' : 'normal'} !important;\n`;

  // Text decorations
  const decorations = [];
  if (userSettings.usernameIsUnderline) decorations.push('underline');
  if (userSettings.usernameIsStrikethrough) decorations.push('line-through');
  if (decorations.length > 0) {
    customStyles += `text-decoration: ${decorations.join(' ')} !important;\n`;
  }

  // Letter spacing — only inject when non-zero
  if (userSettings.usernameLetterSpacing && userSettings.usernameLetterSpacing !== '0px') {
    customStyles += `letter-spacing: ${userSettings.usernameLetterSpacing} !important;\n`;
  }

  // Outline
  if (userSettings.usernameOutlineEnabled) {
    customStyles += `-webkit-text-stroke: ${userSettings.usernameOutlineSize || '1px'} solid ${userSettings.usernameOutlineColor || '#000000'} !important;\n`;
  } else {
    customStyles += `-webkit-text-stroke: none !important;\n`;
  }

  // Color, gradient, and text-shadow — handled together so the halo logic
  // can depend on whether a custom flat color is being injected.
  const chosenShadow = userSettings.usernameTextShadow;
  if (userSettings.usernameGradientEnabled) {
    const gradientType = userSettings.usernameGradientDirection === 'radial' ? 'radial-gradient' : 'linear-gradient';
    const direction = userSettings.usernameGradientDirection === 'radial' ? 'circle' : userSettings.usernameGradientDirection;
    const gradient = `${gradientType}(${direction}, ${userSettings.usernameGradientStart}, ${userSettings.usernameGradientEnd})`;
    customStyles += `background: ${gradient} !important;\n`;
    customStyles += `-webkit-background-clip: text !important;\n`;
    customStyles += `background-clip: text !important;\n`;
    customStyles += `-webkit-text-fill-color: transparent !important;\n`;
    customStyles += `color: transparent !important;\n`;
    // Gradient: honour user-chosen shadow or clear it
    if (chosenShadow && chosenShadow !== 'none') {
      customStyles += `text-shadow: ${chosenShadow} !important;\n`;
    } else {
      customStyles += `text-shadow: none !important;\n`;
    }
  } else {
    customStyles += `background: none !important;\n`;
    customStyles += `-webkit-background-clip: unset !important;\n`;
    customStyles += `background-clip: unset !important;\n`;
    customStyles += `-webkit-text-fill-color: unset !important;\n`;
    // Inject flat color only when genuinely custom — default blacks/greys let
    // the CSS theme variable (--username-color) control the color so it adapts
    // automatically to Light, Dark, Burgundy, Aurora, Sunset, etc.
    const isCustomFlatColor = userSettings.usernameFontColor &&
      !DEFAULT_COLORS.has(userSettings.usernameFontColor.toLowerCase());
    if (isCustomFlatColor) {
      customStyles += `color: ${userSettings.usernameFontColor} !important;\n`;
      if (chosenShadow && chosenShadow !== 'none') {
        customStyles += `text-shadow: ${chosenShadow} !important;\n`;
      } else {
        customStyles += `text-shadow: none !important;\n`;
      }
    } else {
      // Default color: CSS theme variable (--username-color) controls it.
      // Still honour any explicitly chosen text-shadow — only omit it when
      // the user has not set one.
      if (chosenShadow && chosenShadow !== 'none') {
        customStyles += `text-shadow: ${chosenShadow} !important;\n`;
      } else {
        customStyles += `text-shadow: none !important;\n`;
      }
    }
  }

  // Animation
  if (userSettings.usernameAnimationEnabled) {
    customStyles += `animation: ${userSettings.usernameAnimationType} ${userSettings.usernameAnimationDuration} infinite !important;\n`;
  } else {
    customStyles += `animation: none !important;\n`;
  }

  // Create comprehensive CSS targeting ALL possible username locations
  // Uses high-specificity selectors (html body prefix) to beat base CSS rules
  const globalStyleRules = `
    /* GLOBAL USERNAME styling for: ${userName} (${userId}) - visible to ALL users */

    /* HIGH-SPECIFICITY chat message selectors - beats base CSS */
    html body .chat-feed .message-row-wrapper[data-user-id="${userId}"] .message-displayname,
    html body .chat-feed .message-row-wrapper[data-user-id="${userId}"] .message-username,
    html body .message-row-wrapper[data-user-id="${userId}"] .message-displayname,
    html body .message-row-wrapper[data-user-id="${userId}"] .message-username,
    html body .message-row-wrapper[data-user-id="${userId}"] .displayname,
    html body .message-row-wrapper[data-user-id="${userId}"] .username,

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
    .sb-list-username[data-user-uid="${userId}"] .sb-username-text,
    .sb-username-text[data-user-uid="${userId}"],
    .sb-username-text[data-user-id="${userId}"],

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
    .name-display[data-user-id="${userId}"],

    /* ── ViewProfile modal ── */
    .vpm-name[data-user-id="${userId}"],
    .vpm-name[data-user-uid="${userId}"],

    /* ── Settings sidebar: friends list + team tab ── */
    .sf-friend-name[data-user-id="${userId}"],
    .sf-friend-name[data-user-uid="${userId}"],

    /* ── Settings sidebar: account tab profile name ── */
    .modern-profile-name[data-user-id="${userId}"],
    .modern-profile-name[data-user-uid="${userId}"],

    /* ── Welcome Dashboard (always own user) ── */
    .wd-chip-name[data-user-id="${userId}"],
    .wd-drop-uname[data-user-id="${userId}"],
    .wd-hero-name[data-user-id="${userId}"],
    .wd-panel-uname[data-user-id="${userId}"] {
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
        usernameSpan.setAttribute('data-has-custom-style', 'true');
      }
    });
    // Also mark all direct .message-displayname elements with this userId
    document.querySelectorAll(`.message-displayname[data-user-id="${userId}"]`).forEach(el => {
      el.setAttribute('data-has-custom-style', 'true');
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

// Load all users' global username styles from in-memory globals (no localStorage)
export const loadAllGlobalUsernameStyles = () => {
  if (typeof window !== 'undefined' && window.allUsersUsernameStyles) {
    Object.values(window.allUsersUsernameStyles).forEach(userStyle => {
      if (userStyle.userId && userStyle.userName && userStyle.styles) {
        applyGlobalUsernameStylesForUser(userStyle.userId, userStyle.userName, userStyle.styles);
      }
    });
  }
};

// Enhanced function to sync all users' styles from Firebase
export const syncAllUsersStyles = async () => {
  try {
    const { db } = await import('../firebase/config');
    const { collection, getDocs, query, limit } = await import('firebase/firestore');

    console.log('🔄 Syncing all users username styles from Firebase...');

    // Cap at 200 docs — avoids an unbounded full-collection scan on large user bases.
    const usersRef = query(collection(db, 'users'), limit(200));
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
          usernameIsBold: userData.settings.usernameIsBold !== undefined ? userData.settings.usernameIsBold : true,
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
          usernameOutlineSize: userData.settings.usernameOutlineSize || '1px',
          usernameFontSize: userData.settings.usernameFontSize || '12px'
        };
      }

      if (usernameStyles && usernameStyles.usernameFontSize) {
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

    // Store all styles globally (in-memory only)
    if (typeof window !== 'undefined') {
      window.allUsersUsernameStyles = { ...window.allUsersUsernameStyles, ...allStyles };
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

// Clear all username styles — call on logout
export const clearAllUsernameStyles = () => {
  document.querySelectorAll('[id^="global-username-styles-"]').forEach(el => el.remove());
  window.allUsersUsernameStyles = {};
  window.userUsernameStyles = {};
  if (window._usernameStylesUnsubscribe) {
    window._usernameStylesUnsubscribe();
    window._usernameStylesUnsubscribe = null;
  }
};

// Initialize username styling with room-scoped Firestore listeners.
// Pass roomParticipantUids (string[]) to subscribe only to styles for users
// currently in the room.  Call with an empty array to unsubscribe everything.
// Returns a combined unsubscribe function.
export const initializeUsernameStyles = (roomParticipantUids = []) => {
  // Tear down any previous chunk listeners
  if (window._usernameStylesUnsubscribes) {
    window._usernameStylesUnsubscribes.forEach(fn => { try { fn(); } catch {} });
  }
  window._usernameStylesUnsubscribes = [];

  // Backward-compat alias
  window._usernameStylesUnsubscribe = () => {
    if (window._usernameStylesUnsubscribes) {
      window._usernameStylesUnsubscribes.forEach(fn => { try { fn(); } catch {} });
      window._usernameStylesUnsubscribes = [];
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
          collection(db, 'globalUsernameStyles'),
          where(documentId(), 'in', chunk)
        );

        const unsub = onSnapshot(
          q,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                if (data.userId && data.userName && data.styles) {
                  window.allUsersUsernameStyles = window.allUsersUsernameStyles || {};
                  window.userUsernameStyles = window.userUsernameStyles || {};
                  // Merge into the global in-memory store
                  window.allUsersUsernameStyles[data.userId] = {
                    userId: data.userId,
                    userName: data.userName,
                    styles: data.styles,
                    timestamp: Date.now()
                  };
                  window.userUsernameStyles[data.userId] = data.styles;
                  applyGlobalUsernameStylesForUser(data.userId, data.userName, data.styles);
                }
              }
            });
          },
          (error) => {
            if (error?.code === 'permission-denied') return;
            console.error('❌ Username styles listener error:', error);
          }
        );

        if (window._usernameStylesUnsubscribes) {
          window._usernameStylesUnsubscribes.push(unsub);
        }
      });
    } catch (error) {
      if (error?.code !== 'permission-denied') {
        console.error('❌ Error setting up username styles listeners:', error);
      }
    }
  })();

  return () => {
    if (window._usernameStylesUnsubscribes) {
      window._usernameStylesUnsubscribes.forEach(fn => { try { fn(); } catch {} });
      window._usernameStylesUnsubscribes = [];
    }
  };
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

  // DO NOT auto-initialize here — listeners require auth and must only start after login.
  // initializeUsernameStyles() is called by App.jsx once the user is authenticated.
}
