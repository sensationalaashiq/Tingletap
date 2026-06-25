import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import './StatusModal.css';

const StatusModal = ({ onClose }) => {
  const [newStatus, setNewStatus] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

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
    { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
    { name: 'Fira Code', value: 'Fira Code, monospace' }
  ];

  const textShadows = [
    { name: 'None', value: 'none' },
    { name: 'Soft Glow', value: '0 0 10px currentColor' },
    { name: 'Strong Glow', value: '0 0 20px currentColor, 0 0 30px currentColor' },
    { name: 'Drop Shadow', value: '2px 2px 4px rgba(0,0,0,0.5)' },
    { name: 'Neon', value: '0 0 5px #ff0080, 0 0 10px #ff0080, 0 0 15px #ff0080' }
  ];

  const animations = [
    { name: 'None', value: 'none' },
    { name: 'Pulse', value: 'pulse 2s ease-in-out infinite' },
    { name: 'Bounce', value: 'bounce 1s ease-in-out infinite' },
    { name: 'Glow', value: 'glow 2s ease-in-out infinite alternate' },
    { name: 'Rainbow', value: 'rainbow 3s linear infinite' }
  ];

  const premiumStyles = [
    { name: 'None', value: 'none', style: {} },
    {
      name: '✨ Gold Foil', value: 'gold-foil',
      style: { background: 'linear-gradient(135deg, #FFD700, #C7A86B, #FFD700)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700' }
    },
    {
      name: '🖤 Matte Luxe', value: 'matte-luxe',
      style: { color: '#2d2d2d', fontWeight: '600', letterSpacing: '0.5px' }
    },
    {
      name: '👑 Royal Script', value: 'royal-script',
      style: { fontFamily: 'Playfair Display, serif', color: '#1a1a1a', fontWeight: '700', fontStyle: 'italic' }
    },
    {
      name: '🌑 Velvet Shadow', value: 'velvet-shadow',
      style: { color: '#4a4a4a', fontWeight: '600', textShadow: '3px 3px 6px rgba(0,0,0,0.4)' }
    },
    {
      name: '▪️ Minimal Mono', value: 'minimal-mono',
      style: { fontFamily: 'JetBrains Mono, monospace', color: '#333333', fontWeight: '500', letterSpacing: '1px' }
    }
  ];

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const statusToSet = selectedPreset || newStatus;
    if (!statusToSet.trim()) { toast.error('❌ Please enter a status or select a preset!'); return; }
    const statusData = {
      status: statusToSet,
      statusStyles: { fontFamily, fontSize: fontSize + 'px', fontWeight, fontStyle, textDecoration, gradientEnabled, gradientStart, gradientEnd, gradientDirection, textColor, textShadow, animation, premiumStyle }
    };
    try {
      await setDoc(doc(db, 'users', user.uid), statusData, { merge: true });
      onClose();
      toast.success('✅ Status updated!', { position: 'bottom-center', autoClose: 2000, theme: 'dark' });
    } catch { toast.error('❌ Failed to update status.'); }
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
      toast.success('✅ Status cleared!', { position: 'bottom-center', autoClose: 2000, theme: 'dark' });
    } catch { toast.error('❌ Failed to clear status.'); }
  };

  const getPreviewStyles = () => {
    const sel = premiumStyles.find(s => s.value === premiumStyle);
    if (premiumStyle !== 'none' && sel) return sel.style;
    return {
      fontFamily, fontSize: fontSize + 'px', fontWeight, fontStyle, textDecoration,
      color: gradientEnabled ? 'transparent' : textColor,
      background: gradientEnabled ? `linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd})` : 'none',
      WebkitBackgroundClip: gradientEnabled ? 'text' : 'initial',
      backgroundClip: gradientEnabled ? 'text' : 'initial',
      textShadow: textShadow === 'none' ? 'none' : textShadow,
      animation: animation === 'none' ? 'none' : animation
    };
  };

  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-card" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sm-header">
          <div className="sm-icon-ring">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <h2 className="sm-title">Change Status</h2>
          <p className="sm-sub">Set your current mood or activity</p>
          <button className="sm-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="sm-body">

          {/* Custom input */}
          <div className="sm-section">
            <label className="sm-label">Custom Message</label>
            <input
              type="text"
              placeholder="What's on your mind?"
              value={newStatus}
              onChange={e => { setNewStatus(e.target.value); setSelectedPreset(''); }}
              className="sm-input"
              maxLength={100}
            />
          </div>

          <div className="sm-divider"><span>OR CHOOSE A PRESET</span></div>

          {/* Presets */}
          <div className="sm-presets">
            {statusPresets.map((preset, i) => (
              <button
                key={i}
                className={`sm-preset-btn${selectedPreset === `${preset.emoji} ${preset.text}` ? ' selected' : ''}`}
                onClick={() => handlePresetSelect(preset)}
                style={{ '--pc': preset.color }}
              >
                <span className="sm-preset-emoji">{preset.emoji}</span>
                <span className="sm-preset-text">{preset.text}</span>
              </button>
            ))}
          </div>

          <div className="sm-divider"><span>STYLING & EFFECTS</span></div>

          {/* Premium Styles */}
          <div className="sm-section">
            <label className="sm-label">✨ Premium Styles</label>
            <div className="sm-premium-grid">
              {premiumStyles.map(s => (
                <button
                  key={s.value}
                  className={`sm-premium-btn${premiumStyle === s.value ? ' selected' : ''}`}
                  onClick={() => setPremiumStyle(s.value)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Font styling grid */}
          <div className="sm-style-grid">
            <div className="sm-style-group">
              <label>Font</label>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="sm-select">
                {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
            <div className="sm-style-group">
              <label>Weight</label>
              <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="sm-select">
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="lighter">Light</option>
                <option value="bolder">Extra Bold</option>
              </select>
            </div>
            <div className="sm-style-group">
              <label>Style</label>
              <select value={fontStyle} onChange={e => setFontStyle(e.target.value)} className="sm-select">
                <option value="normal">Normal</option>
                <option value="italic">Italic</option>
                <option value="oblique">Oblique</option>
              </select>
            </div>
            <div className="sm-style-group">
              <label>Shadow</label>
              <select value={textShadow} onChange={e => setTextShadow(e.target.value)} className="sm-select">
                {textShadows.map(s => <option key={s.value} value={s.value}>{s.name}</option>)}
              </select>
            </div>
            <div className="sm-style-group">
              <label>Animation</label>
              <select value={animation} onChange={e => setAnimation(e.target.value)} className="sm-select">
                {animations.map(a => <option key={a.value} value={a.value}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm-style-group">
              <label>Decoration</label>
              <select value={textDecoration} onChange={e => setTextDecoration(e.target.value)} className="sm-select">
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="line-through">Strikethrough</option>
              </select>
            </div>
          </div>

          {/* Color section */}
          <div className="sm-color-row">
            <button className={`sm-color-mode${!gradientEnabled ? ' active' : ''}`} onClick={() => setGradientEnabled(false)}>🎨 Solid</button>
            <button className={`sm-color-mode${gradientEnabled ? ' active' : ''}`} onClick={() => setGradientEnabled(true)}>🌈 Gradient</button>
            {!gradientEnabled ? (
              <div className="sm-color-pick">
                <label>Color</label>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="sm-color-input" />
              </div>
            ) : (
              <>
                <div className="sm-color-pick">
                  <label>Start</label>
                  <input type="color" value={gradientStart} onChange={e => setGradientStart(e.target.value)} className="sm-color-input" />
                </div>
                <div className="sm-color-pick">
                  <label>End</label>
                  <input type="color" value={gradientEnd} onChange={e => setGradientEnd(e.target.value)} className="sm-color-input" />
                </div>
                <div className="sm-style-group" style={{minWidth:100}}>
                  <label>Direction</label>
                  <select value={gradientDirection} onChange={e => setGradientDirection(e.target.value)} className="sm-select">
                    <option value="to right">→ Left to Right</option>
                    <option value="to bottom">↓ Top to Bottom</option>
                    <option value="45deg">↗ Diagonal</option>
                    <option value="135deg">↘ Diagonal</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          {(selectedPreset || newStatus) && (
            <div className="sm-preview">
              <span className="sm-preview-label">Preview</span>
              <span className="sm-preview-text" style={getPreviewStyles()}>
                {selectedPreset || newStatus}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sm-actions">
          <button className="sm-btn sm-btn-clear" onClick={handleClearStatus}>Clear</button>
          <button className="sm-btn sm-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="sm-btn sm-btn-save"
            onClick={handleUpdate}
            disabled={!selectedPreset && !newStatus.trim()}
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusModal;
