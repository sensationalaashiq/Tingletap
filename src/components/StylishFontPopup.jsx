import React, { useState, useEffect, useCallback } from 'react';
import './StylishFontPopup.css';
import { getBadgeTier } from '../utils/badgeTier';

const StylishFontPopup = React.memo(({ 
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
    fontSize: '8px',
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
        fontSize: currentPreferences.fontSize || '8px',
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

  // Helper functions for user permissions — tier-aware
  const getColorPalette = useCallback(() => {
    const tier = getBadgeTier(userBadge, userRole, isGuest);

    const allColors = [
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
    ]; // 80 total

    if (tier === 'guest')   return allColors.slice(0, 10);  // 10 colors
    if (tier === 'member')  return allColors.slice(0, 16);  // 16 colors (20%)
    if (tier === 'tier1')   return allColors.slice(0, 24);  // 24 colors (30%)
    if (tier === 'tier2')   return allColors.slice(0, 48);  // 48 colors (60%)
    return allColors;                                        // 80 colors (100%)
  }, [userRole, userBadge, isGuest]);

  const getFontFamilies = useCallback(() => {
    const tier = getBadgeTier(userBadge, userRole, isGuest);

    const basicFonts = [
      { name: 'Default Font', value: 'inherit' },
      { name: 'Arial', value: 'Arial, sans-serif' },
      { name: 'Times New Roman', value: 'Times New Roman, serif' },
      { name: 'Helvetica', value: 'Helvetica, sans-serif' },
      { name: 'Georgia', value: 'Georgia, serif' }
    ];

    const premiumFonts = [
      ...basicFonts,
      // ── Elegant / Serif ──
      { name: 'Cinzel ✦', value: 'Cinzel, serif' },
      { name: 'Playfair Display', value: "'Playfair Display', serif" },
      { name: 'Cormorant ✦', value: "'Cormorant Garamond', serif" },
      { name: 'Abril Fatface', value: "'Abril Fatface', cursive" },
      // ── Cursive / Script ──
      { name: 'Great Vibes', value: 'Great Vibes, cursive' },
      { name: 'Dancing Script', value: 'Dancing Script, cursive' },
      { name: 'Kaushan Script', value: 'Kaushan Script, cursive' },
      { name: 'Sacramento', value: 'Sacramento, cursive' },
      { name: 'Forte (Pinyon)', value: "'Pinyon Script', cursive" },
      // ── Fun / Display ──
      { name: 'Pacifico', value: 'Pacifico, cursive' },
      { name: 'Lobster', value: 'Lobster, cursive' },
      { name: 'Righteous', value: 'Righteous, cursive' },
      { name: 'Bebas Neue', value: "'Bebas Neue', cursive" },
      { name: 'Amatic SC', value: "'Amatic SC', cursive" },
      // ── Handwritten ──
      { name: 'Caveat', value: 'Caveat, cursive' },
      { name: 'Indie Flower', value: "'Indie Flower', cursive" },
      { name: 'Permanent Marker', value: "'Permanent Marker', cursive" },
      // ── Modern / Tech ──
      { name: 'Orbitron ✦', value: 'Orbitron, sans-serif' },
      { name: 'Russo One', value: "'Russo One', sans-serif" },
      { name: 'Comfortaa', value: 'Comfortaa, cursive' },
      { name: 'Fredoka', value: 'Fredoka, sans-serif' },
      { name: 'Poiret One', value: "'Poiret One', cursive" },
      // ── Retro / Pixel ──
      { name: 'Pixel Retro ✦', value: "'Press Start 2P', cursive" },
    ]; // 24 total (5 basic + 19 premium)

    if (tier === 'guest')   return basicFonts.slice(0, 3);   // 3 fonts
    if (tier === 'member')  return basicFonts;                // 5 basic fonts
    if (tier === 'tier1')   return premiumFonts.slice(0, 8);  // 8 fonts (30%)
    if (tier === 'tier2')   return premiumFonts.slice(0, 15); // 15 fonts (60%)
    return premiumFonts;                                      // 24 fonts (100%)
  }, [userRole, userBadge, isGuest]);

  // Styles (bold/italic/underline/strikethrough) — tier1+ only
  const canAccessStyles = useCallback(() => {
    const tier = getBadgeTier(userBadge, userRole, isGuest);
    return !['guest', 'member'].includes(tier);
  }, [userRole, userBadge, isGuest]);

  // Font selector — member+ (everyone except guest)
  const canAccessFonts = useCallback(() => {
    return getBadgeTier(userBadge, userRole, isGuest) !== 'guest';
  }, [isGuest, userRole, userBadge]);

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
      fontSize: '11px',
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

  // Apply immediate message styles — SCOPED to the current user's UID only.
  // Previously used broad class selectors (.message-content, .message-body p …)
  // which overwrote every other user's message text on the page.
  const applyImmediateMessageStyles = (userSettings) => {
    const userId = window.auth?.currentUser?.uid;
    if (!userId) return;                          // no-op if not logged in

    // Remove existing immediate styles
    const existingImmediateStyle = document.getElementById('immediate-message-styles');
    if (existingImmediateStyle) existingImmediateStyle.remove();

    const decorations = [];
    if (userSettings.isUnderline) decorations.push('underline');
    if (userSettings.isStrikethrough) decorations.push('line-through');
    const decStr = decorations.length ? decorations.join(' ') : 'none';
    const ff = userSettings.fontFamily === 'inherit' ? 'inherit' : userSettings.fontFamily;

    // All selectors are scoped to [data-user-id="<uid>"] — safe for multi-user chat
    const immediateStyleRules = `
      /* Immediate message styles — own user only (${userId}) */
      [data-user-id="${userId}"] .message-body p,
      [data-user-id="${userId}"] .message-body,
      [data-user-id="${userId}"] .message-content p,
      [data-user-id="${userId}"] .message-content,
      [data-user-id="${userId}"] .message-text p,
      [data-user-id="${userId}"] .message-text {
          font-size: ${userSettings.fontSize} !important;
          color: ${userSettings.fontColor} !important;
          font-family: ${ff} !important;
          font-weight: ${userSettings.isBold ? 'bold' : 'normal'} !important;
          font-style: ${userSettings.isItalic ? 'italic' : 'normal'} !important;
          text-decoration: ${decStr} !important;
          line-height: 1.4 !important;
      }
    `;

    const immediateStyleElement = document.createElement('style');
    immediateStyleElement.id = 'immediate-message-styles';
    immediateStyleElement.textContent = immediateStyleRules;
    document.head.appendChild(immediateStyleElement);

    console.log('✅ Immediate message styles applied for own user:', userId);
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
    <div
      className="sfp-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100000,
      }}
    >
      <div
        className="stylish-font-popup"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="font-popup-header">
          <div className="popup-title">
            <svg className="title-icon" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ width:32, height:32, padding:6, background:'rgba(99,102,241,.1)', borderRadius:'50%', border:'1.5px solid rgba(99,102,241,.22)', flexShrink:0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M13 8H7M17 12H7"/>
            </svg>
            <span>Message Style</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            style={{ background: '#fff', border: '1.5px solid #e5e7eb', width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, color:'#6b7280' }}
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="font-popup-body">

          {/* Color */}
          <div className="font-section">
            <label className="section-label">
              <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
              Text Color
              <span style={{ marginLeft:'auto', fontSize:'.68rem', color:'#9ca3af', fontWeight:500, textTransform:'none', letterSpacing:0 }}>{fontSettings.fontColor}</span>
            </label>
            <div className="color-grid">
              {colorPalette.map((color, index) => (
                <button
                  key={`color-${index}-${color}`}
                  className={`color-swatch ${fontSettings.fontColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color, background: color, border: fontSettings.fontColor === color ? '2.5px solid #6366f1' : '2px solid transparent' }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Font Family */}
          {canAccessFonts() && (
            <div className="font-section">
              <label className="section-label">
                <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4,7 4,4 20,4 20,7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                Font
              </label>
              <select className="font-select" value={fontSettings.fontFamily} onChange={handleFontFamilyChange}>
                {fontFamilies.map((font, index) => (
                  <option key={`font-${index}-${font.value}`} value={font.value}>{font.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Font Size */}
          {canAccessFonts() && (
            <div className="font-section">
              <label className="section-label">
                <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
                Size
              </label>
              <div className="size-controls">
                <input type="range" min="10" max="32" value={parseInt(fontSettings.fontSize)} onChange={handleFontSizeChange} className="size-slider"/>
                <span className="size-value">{fontSettings.fontSize}</span>
              </div>
            </div>
          )}

          {/* Style toggles */}
          {canAccessStyles() && (
            <div className="font-section">
              <label className="section-label">
                <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Style
              </label>
              <div className="style-toggles">
                {[
                  { key: 'isBold', label: 'B', style: { fontWeight: 'bold' } },
                  { key: 'isItalic', label: 'I', style: { fontStyle: 'italic' } },
                  { key: 'isUnderline', label: 'U', style: { textDecoration: 'underline' } },
                  { key: 'isStrikethrough', label: 'S', style: { textDecoration: 'line-through' } },
                ].map(({ key, label, style }) => (
                  <button
                    key={key}
                    className={`style-toggle ${fontSettings[key] ? 'active' : ''}`}
                    onClick={() => handleStyleToggle(key)}
                    style={{
                      background: fontSettings[key] ? 'rgba(99,102,241,.12)' : '#fff',
                      border: `1.5px solid ${fontSettings[key] ? '#6366f1' : '#e5e7eb'}`,
                      color: fontSettings[key] ? '#4f46e5' : '#9ca3af',
                      ...style,
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="font-section">
            <label className="section-label">
              <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview
            </label>
            <div className="font-preview" style={{
              fontSize: fontSettings.fontSize,
              color: fontSettings.fontColor,
              fontFamily: fontSettings.fontFamily,
              fontWeight: fontSettings.isBold ? 'bold' : 'normal',
              fontStyle: fontSettings.isItalic ? 'italic' : 'normal',
              textDecoration: [fontSettings.isUnderline && 'underline', fontSettings.isStrikethrough && 'line-through'].filter(Boolean).join(' ') || 'none'
            }}>
              Your message will look like this in chat!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', gap:10, padding:'12px 18px 16px', borderTop:'1px solid rgba(99,102,241,.1)', flexShrink:0, background:'#fff' }}>
          <button onClick={handleReset} style={{
            flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            padding:'10px 14px', borderRadius:11,
            background:'#fff', border:'1.5px solid #e5e7eb', color:'#6b7280',
            fontSize:'.88rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
          }}>
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
              <path d="M3.5 6A7 7 0 1 1 3 10" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M1 6h4V2" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color:'#6b7280' }}>Reset</span>
          </button>
          <button onClick={handleApply} style={{
            flex:1.6, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            padding:'10px 14px', borderRadius:11,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border:'none', color:'#fff', WebkitTextFillColor:'#fff',
            fontSize:'.88rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
            boxShadow:'0 4px 16px rgba(99,102,241,.38)',
          }}>
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
              <path d="M3 10l5 5L17 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color:'#fff', WebkitTextFillColor:'#fff', fontWeight:700 }}>Apply Style</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default StylishFontPopup;