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
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#10b981" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>,
      text: 'Happy and content', color: '#10b981'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#3b82f6" d="M20 6h-2.18c.07-.44.18-.88.18-1.35C18 2.53 15.47 0 12.35 0c-1.7 0-3.22.7-4.35 1.82L6 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h4v-1.18l5-4.99V20h7c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>,
      text: 'Working hard', color: '#3b82f6'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#8b5cf6" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>,
      text: 'Listening to music', color: '#8b5cf6'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#f59e0b" d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/></svg>,
      text: 'Gaming time', color: '#f59e0b'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#06b6d4" d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>,
      text: 'Studying', color: '#06b6d4'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#a78bfa" d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>,
      text: 'Coffee break', color: '#a78bfa'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#6b7280" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>,
      text: 'Feeling sleepy', color: '#6b7280'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#ef4444" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>,
      text: 'Productive mood', color: '#ef4444'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#ec4899" d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a1.003 1.003 0 0 0-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41l-2.33-2.35z"/></svg>,
      text: 'Creative flow', color: '#ec4899'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#f97316" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>,
      text: 'On fire today', color: '#f97316'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#64748b" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.68L5.68 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.68L18.32 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>,
      text: 'Do not disturb', color: '#64748b'
    },
    {
      icon: <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#84cc16" d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg>,
      text: 'Celebrating', color: '#84cc16'
    }
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
    { name: 'None', value: 'none', style: {},
      icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#9ca3af" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    },
    {
      name: 'Gold Foil', value: 'gold-foil',
      style: { background: 'linear-gradient(135deg, #FFD700, #C7A86B, #FFD700)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700' },
      icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#f59e0b" d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 17l-6.18 3.02L7 13.14 2 8.27l6.91-1.01z"/></svg>
    },
    {
      name: 'Matte Luxe', value: 'matte-luxe',
      style: { color: '#2d2d2d', fontWeight: '600', letterSpacing: '0.5px' },
      icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#374151" d="M12 3C7.59 3 4 6.59 4 11c0 2.03.76 3.87 2 5.28V21l6-2 6 2v-4.72c1.24-1.41 2-3.25 2-5.28 0-4.41-3.59-8-8-8z"/></svg>
    },
    {
      name: 'Royal Script', value: 'royal-script',
      style: { fontFamily: 'Playfair Display, serif', color: '#1a1a1a', fontWeight: '700', fontStyle: 'italic' },
      icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#7c3aed" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.7-2h8.6l1-5.4-3.1 3.3L12 7.9l-2.2 4-3.1-3.3 1 5.4z"/></svg>
    },
    {
      name: 'Velvet Shadow', value: 'velvet-shadow',
      style: { color: '#4a4a4a', fontWeight: '600', textShadow: '3px 3px 6px rgba(0,0,0,0.4)' },
      icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#6366f1" d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z"/></svg>
    },
    {
      name: 'Minimal Mono', value: 'minimal-mono',
      style: { fontFamily: 'JetBrains Mono, monospace', color: '#333333', fontWeight: '500', letterSpacing: '1px' },
      icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#0ea5e9" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
    }
  ];

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const statusToSet = selectedPreset || newStatus;
    if (!statusToSet.trim()) { toast.error('Please enter a status or select a preset!'); return; }
    const statusData = {
      status: statusToSet,
      statusStyles: { fontFamily, fontSize: fontSize + 'px', fontWeight, fontStyle, textDecoration, gradientEnabled, gradientStart, gradientEnd, gradientDirection, textColor, textShadow, animation, premiumStyle }
    };
    try {
      await setDoc(doc(db, 'users', user.uid), statusData, { merge: true });
      onClose();
      toast.success('Status updated!', { position: 'bottom-center', autoClose: 2000, theme: 'dark' });
    } catch { toast.error('Failed to update status.'); }
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.text);
    setNewStatus('');
  };

  const handleClearStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { status: '' }, { merge: true });
      onClose();
      toast.success('Status cleared!', { position: 'bottom-center', autoClose: 2000, theme: 'dark' });
    } catch { toast.error('Failed to clear status.'); }
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
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
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
            <label className="sm-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Custom Message
            </label>
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
                className={`sm-preset-btn${selectedPreset === preset.text ? ' selected' : ''}`}
                onClick={() => handlePresetSelect(preset)}
                style={{ '--pc': preset.color }}
              >
                <span className="sm-preset-icon">{preset.icon}</span>
                <span className="sm-preset-text">{preset.text}</span>
              </button>
            ))}
          </div>

          <div className="sm-divider"><span>STYLING &amp; EFFECTS</span></div>

          {/* Premium Styles */}
          <div className="sm-section">
            <label className="sm-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Premium Styles
            </label>
            <div className="sm-premium-grid">
              {premiumStyles.map(s => (
                <button
                  key={s.value}
                  className={`sm-premium-btn${premiumStyle === s.value ? ' selected' : ''}`}
                  onClick={() => setPremiumStyle(s.value)}
                >
                  <span className="sm-premium-icon">{s.icon}</span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Font styling grid */}
          <div className="sm-style-grid">
            <div className="sm-style-group">
              <label>
                <svg viewBox="0 0 24 24" width="11" height="11"><path fill="#8b5cf6" d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/></svg>
                Font
              </label>
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="sm-select">
                {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
            <div className="sm-style-group">
              <label>
                <svg viewBox="0 0 24 24" width="11" height="11"><path fill="#3b82f6" d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5S13.83 9.5 13 9.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
                Weight
              </label>
              <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="sm-select">
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="lighter">Light</option>
                <option value="bolder">Extra Bold</option>
              </select>
            </div>
            <div className="sm-style-group">
              <label>
                <svg viewBox="0 0 24 24" width="11" height="11"><path fill="#ec4899" d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
                Style
              </label>
              <select value={fontStyle} onChange={e => setFontStyle(e.target.value)} className="sm-select">
                <option value="normal">Normal</option>
                <option value="italic">Italic</option>
                <option value="oblique">Oblique</option>
              </select>
            </div>
            <div className="sm-style-group">
              <label>
                <svg viewBox="0 0 24 24" width="11" height="11"><path fill="#06b6d4" d="M6 17v3h2l6.25-6.25-2-2zm10.92-9.08c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29s-.51.1-.7.29l-1.83 1.83 2 2zM4 4L3 5l4 4-2 11h2l2-10.99L11.25 11l1.33-1.33L5.75 4.25 4 4z"/></svg>
                Shadow
              </label>
              <select value={textShadow} onChange={e => setTextShadow(e.target.value)} className="sm-select">
                {textShadows.map(s => <option key={s.value} value={s.value}>{s.name}</option>)}
              </select>
            </div>
            <div className="sm-style-group">
              <label>
                <svg viewBox="0 0 24 24" width="11" height="11"><path fill="#f97316" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15l-4-4h3V8h2v5h3z"/></svg>
                Animation
              </label>
              <select value={animation} onChange={e => setAnimation(e.target.value)} className="sm-select">
                {animations.map(a => <option key={a.value} value={a.value}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm-style-group">
              <label>
                <svg viewBox="0 0 24 24" width="11" height="11"><path fill="#10b981" d="M5 3h14c1.11 0 2 .89 2 2v14c0 1.11-.89 2-2 2H5c-1.11 0-2-.89-2-2V5c0-1.11.89-2 2-2zm5 8l3 3 3-3-1.41-1.41L14 11.17V7h-2v4.17l-1.59-1.58z"/></svg>
                Decoration
              </label>
              <select value={textDecoration} onChange={e => setTextDecoration(e.target.value)} className="sm-select">
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="line-through">Strikethrough</option>
              </select>
            </div>
          </div>

          {/* Color section */}
          <div className="sm-color-row">
            <button className={`sm-color-mode${!gradientEnabled ? ' active' : ''}`} onClick={() => setGradientEnabled(false)}>
              <svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="10" fill={!gradientEnabled ? '#6366f1' : '#9ca3af'}/></svg>
              Solid
            </button>
            <button className={`sm-color-mode${gradientEnabled ? ' active' : ''}`} onClick={() => setGradientEnabled(true)}>
              <svg viewBox="0 0 24 24" width="12" height="12">
                <defs><linearGradient id="gmG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
                <circle cx="12" cy="12" r="10" fill="url(#gmG)" opacity={gradientEnabled ? 1 : 0.4}/>
              </svg>
              Gradient
            </button>
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
                    <option value="to right">Left to Right</option>
                    <option value="to bottom">Top to Bottom</option>
                    <option value="45deg">Diagonal</option>
                    <option value="135deg">Diagonal 2</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          {(selectedPreset || newStatus) && (
            <div className="sm-preview">
              <span className="sm-preview-label">Live Preview</span>
              <span className="sm-preview-text" style={getPreviewStyles()}>
                {selectedPreset || newStatus}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sm-actions">
          <button className="sm-btn sm-btn-clear" onClick={handleClearStatus}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Clear
          </button>
          <button className="sm-btn sm-btn-cancel" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Cancel
          </button>
          <button
            className="sm-btn sm-btn-save"
            onClick={handleUpdate}
            disabled={!selectedPreset && !newStatus.trim()}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusModal;
