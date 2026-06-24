import React, { useState, useEffect, useCallback } from 'react';
import './StylishFontPopup.css';

const StylishFontPopup = ({ 
  isOpen, 
  onClose, 
  onApplyFont, 
  userRole, 
  userBadge, 
  isGuest,
  currentPreferences = {}
}) => {
  // State management with proper initialization
  const [fontSettings, setFontSettings] = useState({
    fontSize: '14px',
    fontColor: '#333333',
    fontFamily: 'inherit',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false
  });

  // Initialize state only once when popup opens or preferences change
  useEffect(() => {
    if (isOpen && currentPreferences) {
      const initialSettings = {
        fontSize: currentPreferences.fontSize || '14px',
        fontColor: currentPreferences.fontColor || '#333333',
        fontFamily: currentPreferences.fontFamily || 'inherit',
        isBold: currentPreferences.isBold || false,
        isItalic: currentPreferences.isItalic || false,
        isUnderline: currentPreferences.isUnderline || false,
        isStrikethrough: currentPreferences.isStrikethrough || false
      };
      setFontSettings(initialSettings);
    }
  }, [isOpen]);

  // Helper functions for user permissions
  const getColorPalette = useCallback(() => {
    const isStaff = ['owner', 'admin', 'moderator'].includes(userRole);
    const hasBadge = userBadge && userBadge !== null;

    const premiumColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F', '#A9DFBF',
      '#E8DAEF', '#D5DBDB', '#FADBD8', '#D1F2EB', '#FCF3CF', '#EBDEF0', '#D6EAF8', '#DBEAFE',
      '#FEF3E2', '#E8F5E8', '#FFE4E1', '#F0F8FF', '#FFF8DC', '#F5F5DC', '#E6E6FA', '#FFE4B5',
      '#D3D3D3', '#FF1493', '#00CED1', '#32CD32', '#FFD700', '#FF6347', '#40E0D0', '#EE82EE',
      '#90EE90', '#F0E68C', '#DDA0DD', '#87CEEB', '#F5DEB3', '#98FB98', '#FFB6C1', '#20B2AA',
      '#FF69B4', '#8A2BE2', '#DC143C', '#00FF7F', '#FF4500', '#1E90FF', '#FF1493', '#00CED1',
      '#FFD700', '#32CD32', '#FF6347', '#4169E1', '#FF69B4', '#00FA9A', '#FF4500', '#9370DB',
      '#228B22', '#FF0000', '#0000FF', '#FFA500', '#800080', '#008080', '#FFC0CB', '#A52A2A',
      '#808000', '#000080', '#800000', '#008000', '#C0C0C0', '#808080', '#000000', '#FFFFFF'
    ];

    const standardColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F', '#A9DFBF',
      '#E8DAEF', '#D5DBDB', '#FADBD8', '#D1F2EB', '#FCF3CF', '#EBDEF0', '#D6EAF8', '#DBEAFE',
      '#FEF3E2', '#E8F5E8', '#FFE4E1', '#F0F8FF', '#FFF8DC', '#F5F5DC', '#E6E6FA', '#FFE4B5',
      '#FF69B4', '#8A2BE2', '#DC143C', '#00FF7F', '#FF4500', '#1E90FF', '#228B22', '#9370DB'
    ];

    const basicColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F', '#A9DFBF',
      '#E8DAEF', '#D5DBDB', '#FADBD8', '#D1F2EB'
    ];

    const guestColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9'
    ];

    if (isStaff) return premiumColors;
    if (hasBadge) return standardColors;
    if (isGuest) return guestColors;
    return basicColors;
  }, [userRole, userBadge, isGuest]);

  const getFontFamilies = useCallback(() => {
    const isStaff = ['owner', 'admin', 'moderator'].includes(userRole);
    const hasBadge = userBadge && userBadge !== null;

    const basicFonts = [
      { name: 'Default Font', value: 'inherit' },
      { name: 'Arial', value: 'Arial, sans-serif' },
      { name: 'Times New Roman', value: 'Times New Roman, serif' },
      { name: 'Helvetica', value: 'Helvetica, sans-serif' },
      { name: 'Georgia', value: 'Georgia, serif' }
    ];

    const premiumFonts = [
      ...basicFonts,
      { name: 'Great Vibes', value: 'Great Vibes, cursive' },
      { name: 'Dancing Script', value: 'Dancing Script, cursive' },
      { name: 'Pacifico', value: 'Pacifico, cursive' },
      { name: 'Satisfy', value: 'Satisfy, cursive' },
      { name: 'Courgette', value: 'Courgette, cursive' },
      { name: 'Lobster', value: 'Lobster, cursive' },
      { name: 'Kaushan Script', value: 'Kaushan Script, cursive' },
      { name: 'Amatic SC', value: 'Amatic SC, cursive' },
      { name: 'Caveat', value: 'Caveat, cursive' },
      { name: 'Indie Flower', value: 'Indie Flower, cursive' },
      { name: 'Permanent Marker', value: 'Permanent Marker, cursive' },
      { name: 'Sacramento', value: 'Sacramento, cursive' },
      { name: 'Shadows Into Light', value: 'Shadows Into Light, cursive' },
      { name: 'Roboto', value: 'Roboto, sans-serif' },
      { name: 'Open Sans', value: 'Open Sans, sans-serif' },
      { name: 'Lato', value: 'Lato, sans-serif' },
      { name: 'Montserrat', value: 'Montserrat, sans-serif' },
      { name: 'Source Sans Pro', value: 'Source Sans Pro, sans-serif' },
      { name: 'Raleway', value: 'Raleway, sans-serif' },
      { name: 'Ubuntu', value: 'Ubuntu, sans-serif' }
    ];

    if (isGuest) return basicFonts.slice(0, 3);
    if (!hasBadge && !isStaff) return basicFonts;
    return premiumFonts;
  }, [userRole, userBadge, isGuest]);

  const canAccessStyles = useCallback(() => {
    const isStaff = ['owner', 'admin', 'moderator'].includes(userRole);
    const hasBadge = userBadge && userBadge !== null;
    return isStaff || hasBadge;
  }, [userRole, userBadge]);

  const canAccessFonts = useCallback(() => {
    return !isGuest;
  }, [isGuest]);

  // Event handlers with immediate state updates
  const handleColorSelect = useCallback((color) => {
    console.log('🎨 Color selected:', color);
    setFontSettings(prev => {
      const newSettings = {
        ...prev,
        fontColor: color
      };
      console.log('🎨 Updated font settings:', newSettings);
      return newSettings;
    });
  }, []);

  const handleFontFamilyChange = useCallback((e) => {
    const selectedFont = e.target.value;
    console.log('📝 Font family selected:', selectedFont);
    setFontSettings(prev => {
      const newSettings = {
        ...prev,
        fontFamily: selectedFont
      };
      console.log('📝 Updated font settings:', newSettings);
      return newSettings;
    });
  }, []);

  const handleFontSizeChange = useCallback((e) => {
    const selectedSize = e.target.value + 'px';
    console.log('📏 Font size selected:', selectedSize);
    setFontSettings(prev => {
      const newSettings = {
        ...prev,
        fontSize: selectedSize
      };
      console.log('📏 Updated font settings:', newSettings);
      return newSettings;
    });
  }, []);

  const handleStyleToggle = useCallback((styleType) => {
    console.log('🎭 Style toggle:', styleType);
    setFontSettings(prev => {
      const newSettings = {
        ...prev,
        [styleType]: !prev[styleType]
      };
      console.log('🎭 Updated font settings:', newSettings);
      return newSettings;
    });
  }, []);

  const handleReset = useCallback(() => {
    console.log('🔄 Resetting font settings');
    const defaultSettings = {
      fontSize: '14px',
      fontColor: '#333333',
      fontFamily: 'inherit',
      isBold: false,
      isItalic: false,
      isUnderline: false,
      isStrikethrough: false
    };
    setFontSettings(defaultSettings);
  }, []);

  const handleApply = useCallback(async () => {
    console.log('💬 StylishFontPopup: Applying GLOBAL MESSAGE TEXT styles');
    console.log('💾 Final settings being applied:', fontSettings);

    // Apply immediate styles first for instant feedback
    applyImmediateMessageStyles(fontSettings);

    // Apply to parent HomePage if available
    if (onApplyFont) {
      onApplyFont(fontSettings);
    }

    // Update global window preferences immediately to prevent resets
    window.chatFontPreferences = fontSettings;

    // Force override the global message styles system
    if (window.applyGlobalMessageStyles) {
      const currentUser = window.auth?.currentUser;
      if (currentUser) {
        const userName = currentUser.displayName || currentUser.email || 'Unknown User';
        window.applyGlobalMessageStyles(currentUser.uid, userName, fontSettings);
      }
    }

    // Save to Firebase with comprehensive user info
    try {
      let currentUserDisplayName = 'Unknown User';
      let currentUserId = null;

      if (window.auth && window.auth.currentUser) {
        currentUserDisplayName = window.auth.currentUser.displayName || window.auth.currentUser.email || 'Unknown User';
        currentUserId = window.auth.currentUser.uid;
      }

      if (!currentUserDisplayName || !currentUserId) {
        console.log('❌ No user info available for message styling');
        return;
      }

      // Save to localStorage for immediate persistence
      try {
        localStorage.setItem('messageFontPreferences', JSON.stringify(fontSettings));
        localStorage.setItem('chatFontSize', fontSettings.fontSize);
        localStorage.setItem('chatFontColor', fontSettings.fontColor);
        localStorage.setItem('chatFontFamily', fontSettings.fontFamily);
        localStorage.setItem('chatIsBold', fontSettings.isBold.toString());
        localStorage.setItem('chatIsItalic', fontSettings.isItalic.toString());
        localStorage.setItem('chatIsUnderline', fontSettings.isUnderline.toString());
        localStorage.setItem('chatIsStrikethrough', fontSettings.isStrikethrough.toString());

        // Also save as regular font preferences for broader compatibility
        localStorage.setItem('fontPreferences', JSON.stringify(fontSettings));
        localStorage.setItem('fontPrefsSource', 'stylishFontPopup');
        localStorage.setItem('fontPrefsLastUpdate', Date.now().toString());

        console.log('✅ Message preferences saved to localStorage');
      } catch (error) {
        console.error('❌ Error saving to localStorage:', error);
      }

      // Apply styles immediately with higher specificity
      applyGlobalMessageStylesDirect(currentUserId, currentUserDisplayName, fontSettings);

      // Also apply a general message text style for immediate effect
      applyImmediateMessageStyles(fontSettings);

      // Save to Firebase and apply global styles
      try {
        const { db } = await import('../firebase/config');
        const { doc, updateDoc, setDoc } = await import('firebase/firestore');

        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
          messageFontPreferences: fontSettings,
          fontPreferences: fontSettings, // Also update regular font preferences
          'settings.messageFontPreferences': fontSettings,
          'settings.fontPreferences': fontSettings,
          displayName: currentUserDisplayName,
          updatedAt: new Date().toISOString(),
          messageStyleLastUpdated: Date.now()
        });

        const globalStyleRef = doc(db, 'globalMessageStyles', currentUserId);
        await setDoc(globalStyleRef, {
          userId: currentUserId,
          userName: currentUserDisplayName,
          styles: fontSettings,
          timestamp: Date.now(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Broadcast changes
        window.dispatchEvent(new CustomEvent('globalMessageStylesUpdated', {
          detail: { 
            userId: currentUserId, 
            userName: currentUserDisplayName, 
            styles: fontSettings 
          }
        }));

        console.log('✅ Global message styles applied successfully');
      } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
      }
    } catch (error) {
      console.error('❌ Error in message styling process:', error);
    }

    // Close popup after successful application
    onClose();
  }, [fontSettings, onApplyFont, onClose]);

  // Apply immediate message styles for better persistence
  const applyImmediateMessageStyles = (userSettings) => {
    // Remove existing immediate styles
    const existingImmediateStyle = document.getElementById('immediate-message-styles');
    if (existingImmediateStyle) {
      existingImmediateStyle.remove();
    }

    const decorations = [];
    if (userSettings.isUnderline) decorations.push('underline');
    if (userSettings.isStrikethrough) decorations.push('line-through');

    // Create comprehensive immediate style rules for better persistence
    const immediateStyleRules = `
      /* Immediate Message Text Styling - High Priority */
      .message-content,
      .message-text,
      .chat-message-text,
      .user-message-text,
      .message-body,
      .message-content p,
      .message-text p,
      .chat-message-text p,
      .user-message-text p,
      .message-body p,
      div[class*="message"] p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      div[class*="chat"] p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      .chat-container .message-content,
      .chat-container .message-text,
      .messages-container .message-content,
      .messages-container .message-text {
          font-size: ${userSettings.fontSize} !important;
          color: ${userSettings.fontColor} !important;
          font-family: ${userSettings.fontFamily === 'inherit' ? 'inherit' : userSettings.fontFamily} !important;
          font-weight: ${userSettings.isBold ? 'bold' : 'normal'} !important;
          font-style: ${userSettings.isItalic ? 'italic' : 'normal'} !important;
          text-decoration: ${decorations.length > 0 ? decorations.join(' ') : 'none'} !important;
          line-height: 1.4 !important;
      }
    `;

    const immediateStyleElement = document.createElement('style');
    immediateStyleElement.id = 'immediate-message-styles';
    immediateStyleElement.textContent = immediateStyleRules;
    document.head.appendChild(immediateStyleElement);

    console.log('✅ Immediate message styles applied:', userSettings);
  };

  // Direct global message styling application
  const applyGlobalMessageStylesDirect = (userId, userName, userSettings) => {
    const existingGlobalStyle = document.getElementById(`global-message-styles-${userId}`);
    if (existingGlobalStyle) {
      existingGlobalStyle.remove();
    }

    const decorations = [];
    if (userSettings.isUnderline) decorations.push('underline');
    if (userSettings.isStrikethrough) decorations.push('line-through');

    const messageStyleRules = `
      [data-user-id="${userId}"] .message-body:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      [data-user-id="${userId}"] .message-body p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      [data-user-id="${userId}"] .message-content:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      [data-user-id="${userId}"] .message-content p:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      [data-user-id="${userId}"] .message-text:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      .message-container[data-user-id="${userId}"] .message-content:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      .message-container[data-user-id="${userId}"] .message-text:not(.message-displayname):not(.username):not(.user-name):not(.message-username),
      .message-container[data-user-id="${userId}"] .message-body:not(.message-displayname):not(.username):not(.user-name):not(.message-username) {
          font-size: ${userSettings.fontSize} !important;
          color: ${userSettings.fontColor} !important;
          font-family: ${userSettings.fontFamily === 'inherit' ? 'inherit' : userSettings.fontFamily} !important;
          font-weight: ${userSettings.isBold ? 'bold' : 'normal'} !important;
          font-style: ${userSettings.isItalic ? 'italic' : 'normal'} !important;
          text-decoration: ${decorations.length > 0 ? decorations.join(' ') : 'none'} !important;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = `global-message-styles-${userId}`;
    styleElement.textContent = messageStyleRules;
    document.head.appendChild(styleElement);

    console.log('✅ User-specific message styles applied for:', userName);
  };

  // SVG Icons
  const MessageIcon = () => (
    <svg className="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <path d="M13 8H7"/>
      <path d="M17 12H7"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  );

  const ColorPaletteIcon = () => (
    <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="13.5" cy="6.5" r=".5"/>
      <circle cx="17.5" cy="10.5" r=".5"/>
      <circle cx="8.5" cy="7.5" r=".5"/>
      <circle cx="6.5" cy="12.5" r=".5"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  );

  const FontIcon = () => (
    <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4,7 4,4 20,4 20,7"/>
      <line x1="9" y1="20" x2="15" y2="20"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  );

  const SizeIcon = () => (
    <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  );

  const StyleIcon = () => (
    <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );

  const PreviewIcon = () => (
    <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M1 4v6h6"/>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>
  );

  const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  );

  if (!isOpen) return null;

  const colorPalette = getColorPalette();
  const fontFamilies = getFontFamilies();

  return (
    <>
      <div 
        className="stylish-font-popup-backdrop" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000
        }}
      />
      <div className="stylish-font-popup">
        <div className="font-popup-header">
          <div className="popup-title">
            <MessageIcon />
            <span>Message Text Styling</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="font-popup-body">
          {/* Color Section */}
          <div className="font-section">
            <label className="section-label">
              <ColorPaletteIcon />
              Text Color ({colorPalette.length} Colors Available)
            </label>
            <div className="color-grid">
              {colorPalette.map((color, index) => (
                <button
                  key={`color-${index}-${color}`}
                  className={`color-swatch ${fontSettings.fontColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Selected: {fontSettings.fontColor}
            </div>
          </div>

          {/* Font Family Section */}
          {canAccessFonts() && (
            <div className="font-section">
              <label className="section-label">
                <FontIcon />
                Font Family ({fontFamilies.length} Options)
              </label>
              <select
                className="font-select"
                value={fontSettings.fontFamily}
                onChange={handleFontFamilyChange}
              >
                {fontFamilies.map((font, index) => (
                  <option key={`font-${index}-${font.value}`} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                Selected: {fontFamilies.find(f => f.value === fontSettings.fontFamily)?.name || 'Default'}
              </div>
            </div>
          )}

          {/* Font Size Section */}
          {canAccessFonts() && (
            <div className="font-section">
              <label className="section-label">
                <SizeIcon />
                Font Size
              </label>
              <div className="size-controls">
                <input
                  type="range"
                  min="10"
                  max="32"
                  value={parseInt(fontSettings.fontSize)}
                  onChange={handleFontSizeChange}
                  className="size-slider"
                />
                <span className="size-value">{fontSettings.fontSize}</span>
              </div>
            </div>
          )}

          {/* Style Options */}
          {canAccessStyles() && (
            <div className="font-section">
              <label className="section-label">
                <StyleIcon />
                Text Styles
              </label>
              <div className="style-toggles">
                <button
                  className={`style-toggle ${fontSettings.isBold ? 'active' : ''}`}
                  onClick={() => handleStyleToggle('isBold')}
                  title="Bold"
                >
                  <strong>B</strong>
                </button>
                <button
                  className={`style-toggle ${fontSettings.isItalic ? 'active' : ''}`}
                  onClick={() => handleStyleToggle('isItalic')}
                  title="Italic"
                >
                  <em>I</em>
                </button>
                <button
                  className={`style-toggle ${fontSettings.isUnderline ? 'active' : ''}`}
                  onClick={() => handleStyleToggle('isUnderline')}
                  title="Underline"
                >
                  <u>U</u>
                </button>
                <button
                  className={`style-toggle ${fontSettings.isStrikethrough ? 'active' : ''}`}
                  onClick={() => handleStyleToggle('isStrikethrough')}
                  title="Strikethrough"
                >
                  <s>S</s>
                </button>
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="font-section">
            <label className="section-label">
              <PreviewIcon />
              Live Preview
            </label>
            <div
              className="font-preview"
              style={{
                fontSize: fontSettings.fontSize,
                color: fontSettings.fontColor,
                fontFamily: fontSettings.fontFamily,
                fontWeight: fontSettings.isBold ? 'bold' : 'normal',
                fontStyle: fontSettings.isItalic ? 'italic' : 'normal',
                textDecoration: `${fontSettings.isUnderline ? 'underline ' : ''}${fontSettings.isStrikethrough ? 'line-through' : ''}`.trim() || 'none'
              }}
            >
              ✨ This is how your messages will appear to everyone! 💫
              <br />
              <small style={{ opacity: 0.7 }}>Your styling will be visible to all users in the chat.</small>
            </div>
          </div>
        </div>

        <div 
          className="font-popup-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            background: 'transparent',
            borderTop: '2px solid #8b5cf6',
            position: 'sticky',
            bottom: '0',
            zIndex: '999999',
            minHeight: '70px',
            visibility: 'visible',
            opacity: '1'
          }}
        >
          <button 
            className="action-btn reset-btn" 
            onClick={handleReset} 
            title="Reset to defaults"
            style={{
              visibility: 'visible',
              opacity: '1',
              zIndex: '999999',
              position: 'relative'
            }}
          >
            <RefreshIcon />
            <span>Reset</span>
          </button>
          <button 
            className="action-btn apply-btn" 
            onClick={handleApply} 
            title="Apply changes"
            style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff',
              WebkitTextFillColor: '#fff',
              border: 'none',
              boxShadow: '0 4px 16px rgba(99,102,241,.38)',
              visibility: 'visible',
              opacity: '1',
              zIndex: '999999',
              position: 'relative'
            }}
          >
            <CheckIcon />
            <span style={{ color: '#fff', WebkitTextFillColor: '#fff', fontWeight: 700 }}>Apply</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default StylishFontPopup;