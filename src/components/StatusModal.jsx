
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import './StatusModal.css';

const StatusModal = ({ onClose }) => {
  const [newStatus, setNewStatus] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  
  // Font styling states
  const [fontFamily, setFontFamily] = useState('inherit');
  const [fontSize, setFontSize] = useState('14');
  const [fontWeight, setFontWeight] = useState('normal');
  const [fontStyle, setFontStyle] = useState('normal');
  const [textDecoration, setTextDecoration] = useState('none');
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientStart, setGradientStart] = useState('#667eea');
  const [gradientEnd, setGradientEnd] = useState('#764ba2');
  const [gradientDirection, setGradientDirection] = useState('to right');
  const [textColor, setTextColor] = useState('#333333');
  const [textShadow, setTextShadow] = useState('none');
  const [animation, setAnimation] = useState('none');
  const [premiumStyle, setPremiumStyle] = useState('none');

  const statusPresets = [
    { emoji: '😊', text: 'Happy and content', color: '#10b981' },
    { emoji: '💼', text: 'Working hard', color: '#3b82f6' },
    { emoji: '🎵', text: 'Listening to music', color: '#8b5cf6' },
    { emoji: '🎮', text: 'Gaming time', color: '#f59e0b' },
    { emoji: '📚', text: 'Studying', color: '#06b6d4' },
    { emoji: '☕', text: 'Coffee break', color: '#a78bfa' },
    { emoji: '🌙', text: 'Feeling sleepy', color: '#6b7280' },
    { emoji: '🚀', text: 'Productive mood', color: '#ef4444' },
    { emoji: '🎨', text: 'Creative flow', color: '#ec4899' },
    { emoji: '🔥', text: 'On fire today', color: '#f97316' },
    { emoji: '😴', text: 'Do not disturb', color: '#64748b' },
    { emoji: '🎉', text: 'Celebrating', color: '#84cc16' }
  ];

  const fontFamilies = [
    { name: 'Default', value: 'inherit' },
    { name: 'Playfair Display', value: 'Playfair Display, serif' },
    { name: 'Cormorant Garamond', value: 'Cormorant Garamond, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Great Vibes', value: 'Great Vibes, cursive' },
    { name: 'Dancing Script', value: 'Dancing Script, cursive' },
    { name: 'Allura', value: 'Allura, cursive' },
    { name: 'Pacifico', value: 'Pacifico, cursive' },
    { name: 'Satisfy', value: 'Satisfy, cursive' },
    { name: 'Courgette', value: 'Courgette, cursive' },
    { name: 'Mr De Haviland', value: 'Mr De Haviland, cursive' },
    { name: 'Lobster', value: 'Lobster, cursive' },
    { name: 'Kaushan Script', value: 'Kaushan Script, cursive' },
    { name: 'Amatic SC', value: 'Amatic SC, cursive' },
    { name: 'Caveat', value: 'Caveat, cursive' },
    { name: 'Indie Flower', value: 'Indie Flower, cursive' },
    { name: 'Permanent Marker', value: 'Permanent Marker, cursive' },
    { name: 'Sacramento', value: 'Sacramento, cursive' },
    { name: 'Shadows Into Light', value: 'Shadows Into Light, cursive' },
    { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
    { name: 'Fira Code', value: 'Fira Code, monospace' }
  ];

  const textShadows = [
    { name: 'None', value: 'none' },
    { name: 'Soft Glow', value: '0 0 10px currentColor' },
    { name: 'Strong Glow', value: '0 0 20px currentColor, 0 0 30px currentColor' },
    { name: 'Drop Shadow', value: '2px 2px 4px rgba(0,0,0,0.5)' },
    { name: 'Embossed', value: '1px 1px 0px rgba(255,255,255,0.8), -1px -1px 0px rgba(0,0,0,0.3)' },
    { name: 'Neon', value: '0 0 5px #ff0080, 0 0 10px #ff0080, 0 0 15px #ff0080' }
  ];

  const animations = [
    { name: 'None', value: 'none' },
    { name: 'Pulse', value: 'pulse 2s ease-in-out infinite' },
    { name: 'Bounce', value: 'bounce 1s ease-in-out infinite' },
    { name: 'Shake', value: 'shake 0.5s ease-in-out infinite' },
    { name: 'Glow', value: 'glow 2s ease-in-out infinite alternate' },
    { name: 'Rainbow', value: 'rainbow 3s linear infinite' }
  ];

  const premiumStyles = [
    { 
      name: 'None', 
      value: 'none',
      style: {}
    },
    { 
      name: '✨ Gold Foil', 
      value: 'gold-foil',
      style: {
        background: 'linear-gradient(135deg, #FFD700, #C7A86B, #FFD700)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        fontWeight: '700',
        textShadow: '0 2px 4px rgba(255, 215, 0, 0.3)',
        animation: 'goldShine 3s ease-in-out infinite'
      }
    },
    { 
      name: '🖤 Matte Luxe', 
      value: 'matte-luxe',
      style: {
        color: '#2d2d2d',
        fontWeight: '600',
        textShadow: '1px 1px 2px rgba(255,255,255,0.1), inset 0 1px 0 rgba(0,0,0,0.1)',
        letterSpacing: '0.5px'
      }
    },
    { 
      name: '👑 Royal Script', 
      value: 'royal-script',
      style: {
        fontFamily: 'Playfair Display, serif',
        color: '#1a1a1a',
        fontWeight: '700',
        fontStyle: 'italic',
        textShadow: '0 0 1px #C7A86B, 0 0 2px #FFD700',
        letterSpacing: '1px'
      }
    },
    { 
      name: '🌑 Velvet Shadow', 
      value: 'velvet-shadow',
      style: {
        color: '#4a4a4a',
        fontWeight: '600',
        textShadow: '3px 3px 6px rgba(0,0,0,0.4), 1px 1px 2px rgba(0,0,0,0.3)',
        letterSpacing: '0.3px'
      }
    },
    { 
      name: '🤍 Pearl White', 
      value: 'pearl-white',
      style: {
        color: '#ffffff',
        fontWeight: '600',
        textShadow: '0 0 8px rgba(255,255,255,0.6), 1px 1px 2px rgba(200,200,255,0.3)',
        background: 'linear-gradient(135deg, #ffffff, #f0f8ff, #ffffff)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text'
      }
    },
    { 
      name: '▪️ Minimal Mono', 
      value: 'minimal-mono',
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        color: '#333333',
        fontWeight: '500',
        letterSpacing: '1px',
        fontSize: '13px'
      }
    }
  ];

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const statusToSet = selectedPreset || newStatus;
    if (!statusToSet.trim()) {
      toast.error("❌ Please enter a status or select a preset!");
      return;
    }

    const statusData = {
      status: statusToSet,
      statusStyles: {
        fontFamily,
        fontSize: fontSize + 'px',
        fontWeight,
        fontStyle,
        textDecoration,
        gradientEnabled,
        gradientStart,
        gradientEnd,
        gradientDirection,
        textColor,
        textShadow,
        animation,
        premiumStyle
      }
    };

    try {
      await setDoc(doc(db, 'users', user.uid), statusData, { merge: true });
      onClose();
      toast.success("✅ Status updated with custom styling!", {
        position: "bottom-center",
        autoClose: 2000,
        theme: "dark"
      });
    } catch (error) {
      toast.error("❌ Failed to update status.");
    }
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(`${preset.emoji} ${preset.text}`);
    setNewStatus('');
  };

  const handleClearStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, 'users', user.uid), { status: '' }, { merge: true });
      onClose();
      toast.success("✅ Status cleared!", {
        position: "bottom-center",
        autoClose: 2000,
        theme: "dark"
      });
    } catch (error) {
      toast.error("❌ Failed to clear status.");
    }
  };

  const getPreviewStyles = () => {
    const selectedPremiumStyle = premiumStyles.find(style => style.value === premiumStyle);
    
    if (premiumStyle !== 'none' && selectedPremiumStyle) {
      return selectedPremiumStyle.style;
    }

    return {
      fontFamily,
      fontSize: fontSize + 'px',
      fontWeight,
      fontStyle,
      textDecoration,
      color: gradientEnabled ? 'transparent' : textColor,
      background: gradientEnabled ? 
        `linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd})` : 'none',
      WebkitBackgroundClip: gradientEnabled ? 'text' : 'initial',
      backgroundClip: gradientEnabled ? 'text' : 'initial',
      textShadow: textShadow === 'none' ? 'none' : textShadow,
      animation: animation === 'none' ? 'none' : animation
    };
  };

  return (
    <div className="status-modal-overlay" onClick={onClose}>
      <div className="status-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="status-modal-header">
          <h2>🟢 Update Your Status</h2>
          <button className="status-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="status-modal-content">
          <div className="status-input-section">
            <label className="status-label">Custom Status Message</label>
            <input
              type="text"
              placeholder="What's on your mind?"
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value);
                setSelectedPreset('');
              }}
              className="status-input"
              maxLength={100}
            />
          </div>

          <div className="status-divider">
            <span>OR</span>
          </div>

          <div className="status-presets-section">
            <label className="status-label">Quick Status Presets</label>
            <div className="status-presets-grid">
              {statusPresets.map((preset, index) => (
                <button
                  key={index}
                  className={`status-preset-btn ${selectedPreset === `${preset.emoji} ${preset.text}` ? 'selected' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                  style={{
                    '--preset-color': preset.color
                  }}
                >
                  <span className="preset-emoji">{preset.emoji}</span>
                  <span className="preset-text">{preset.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="font-styling-section">
            <label className="status-label">🎨 Font Styling & Effects</label>
            
            {/* Premium Styles Section */}
            <div className="premium-styles-section">
              <label className="premium-label">✨ Ultra Premium Styles</label>
              <div className="premium-styles-grid">
                {premiumStyles.map(style => (
                  <button
                    key={style.value}
                    className={`premium-style-btn ${premiumStyle === style.value ? 'selected' : ''}`}
                    onClick={() => setPremiumStyle(style.value)}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="styling-grid">
              <div className="style-group">
                <label>Font Family</label>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="style-select">
                  {fontFamilies.map(font => (
                    <option key={font.value} value={font.value}>{font.name}</option>
                  ))}
                </select>
              </div>

              <div className="style-group">
                <label>Font Size</label>
                <input
                  type="range"
                  min="10"
                  max="14"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="style-range"
                />
                <span className="range-value">{fontSize}px</span>
              </div>

              <div className="style-group">
                <label>Font Weight</label>
                <select value={fontWeight} onChange={(e) => setFontWeight(e.target.value)} className="style-select">
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="lighter">Light</option>
                  <option value="bolder">Extra Bold</option>
                </select>
              </div>

              <div className="style-group">
                <label>Font Style</label>
                <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} className="style-select">
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                  <option value="oblique">Oblique</option>
                </select>
              </div>

              <div className="style-group">
                <label>Text Decoration</label>
                <select value={textDecoration} onChange={(e) => setTextDecoration(e.target.value)} className="style-select">
                  <option value="none">None</option>
                  <option value="underline">Underline</option>
                  <option value="overline">Overline</option>
                  <option value="line-through">Strikethrough</option>
                </select>
              </div>

              <div className="style-group">
                <label>Text Shadow</label>
                <select value={textShadow} onChange={(e) => setTextShadow(e.target.value)} className="style-select">
                  {textShadows.map(shadow => (
                    <option key={shadow.value} value={shadow.value}>{shadow.name}</option>
                  ))}
                </select>
              </div>

              <div className="style-group">
                <label>Animation</label>
                <select value={animation} onChange={(e) => setAnimation(e.target.value)} className="style-select">
                  {animations.map(anim => (
                    <option key={anim.value} value={anim.value}>{anim.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="color-mode-section">
              <div className="mode-toggles">
                <button
                  className={`mode-toggle ${!gradientEnabled ? 'active' : ''}`}
                  onClick={() => setGradientEnabled(false)}
                >
                  🎨 Solid Color
                </button>
                <button
                  className={`mode-toggle ${gradientEnabled ? 'active' : ''}`}
                  onClick={() => setGradientEnabled(true)}
                >
                  🌈 Gradient
                </button>
              </div>

              {!gradientEnabled ? (
                <div className="color-picker-group">
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="color-input"
                  />
                </div>
              ) : (
                <div className="gradient-controls">
                  <div className="color-picker-group">
                    <label>Start Color</label>
                    <input
                      type="color"
                      value={gradientStart}
                      onChange={(e) => setGradientStart(e.target.value)}
                      className="color-input"
                    />
                  </div>
                  <div className="color-picker-group">
                    <label>End Color</label>
                    <input
                      type="color"
                      value={gradientEnd}
                      onChange={(e) => setGradientEnd(e.target.value)}
                      className="color-input"
                    />
                  </div>
                  <div className="style-group">
                    <label>Direction</label>
                    <select value={gradientDirection} onChange={(e) => setGradientDirection(e.target.value)} className="style-select">
                      <option value="to right">Left to Right</option>
                      <option value="to left">Right to Left</option>
                      <option value="to bottom">Top to Bottom</option>
                      <option value="to top">Bottom to Top</option>
                      <option value="45deg">Diagonal ↗</option>
                      <option value="135deg">Diagonal ↘</option>
                      <option value="225deg">Diagonal ↙</option>
                      <option value="315deg">Diagonal ↖</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="status-preview">
            {(selectedPreset || newStatus) && (
              <div className="preview-container">
                <span className="preview-label">Preview:</span>
                <span 
                  className="preview-text styled-status-preview"
                  style={getPreviewStyles()}
                >
                  {selectedPreset || newStatus}
                </span>
              </div>
            )}
          </div>

          <div className="status-modal-actions">
            <button className="status-btn secondary" onClick={handleClearStatus}>
              Clear Status
            </button>
            <button className="status-btn cancel" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="status-btn primary" 
              onClick={handleUpdate}
              disabled={!selectedPreset && !newStatus.trim()}
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusModal;
