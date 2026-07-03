import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import { pt } from '../utils/premiumToast';
import './StatusModal.css';

const StatusModal = React.memo(({ onClose }) => {
  const [newStatus, setNewStatus]           = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [fontFamily, setFontFamily]         = useState('inherit');
  const [fontSize, setFontSize]             = useState('14');
  const [fontWeight, setFontWeight]         = useState('normal');
  const [fontStyle, setFontStyle]           = useState('normal');
  const [textDecoration, setTextDecoration] = useState('none');
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientStart, setGradientStart]   = useState('#667eea');
  const [gradientEnd, setGradientEnd]       = useState('#764ba2');
  const [gradientDirection, setGradientDirection] = useState('to right');
  const [textColor, setTextColor]           = useState('#4c1d95');
  const [textShadow, setTextShadow]         = useState('none');
  const [animation, setAnimation]           = useState('none');
  const [premiumStyle, setPremiumStyle]     = useState('none');

  const statusPresets = [
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#059669" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>, text: 'Happy and content', color: '#059669' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#2563eb" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm1 10h-2V11h2z"/></svg>, text: 'Working hard', color: '#2563eb' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#7c3aed" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>, text: 'Listening to music', color: '#7c3aed' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#d97706" d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/></svg>, text: 'Gaming time', color: '#d97706' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#0891b2" d="M9 4H5L3 8h2l1-3h2L7 8h2l1-4zm6 0h-4l-1 4h2l1-3h2l-1 3h2l1-4zm3 5H6l-2 4h2l1-3h10l1 3h2l-2-4zm-1 5H7l-2 3h2l1-2h8l1 2h2l-2-3z"/></svg>, text: 'Studying', color: '#0891b2' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#6d28d9" d="M20 3H4c-1.1 0-2 .9-2 2v2h20V5c0-1.1-.9-2-2-2zM2 19c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-9H2v9z"/></svg>, text: 'Coffee break', color: '#6d28d9' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#4b5563" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4C13 3.04 12.46 3 12 3z"/></svg>, text: 'Feeling sleepy', color: '#4b5563' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#dc2626" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>, text: 'On fire today', color: '#dc2626' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#db2777" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>, text: 'Creative flow', color: '#db2777' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#ea580c" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3l1.25 2.75L16 10l-2.75 1.25L12 14l-1.25-2.75L8 10l2.75-1.25L12 6z"/></svg>, text: 'Productive mood', color: '#ea580c' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#475569" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.68L5.68 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.68L18.32 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>, text: 'Do not disturb', color: '#475569' },
    { icon: <svg viewBox="0 0 24 24" width="14" height="14"><path fill="#65a30d" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>, text: 'Celebrating', color: '#65a30d' },
  ];

  const fontFamilies = [
    { name: 'Default', value: 'inherit' },
    { name: 'Playfair', value: 'Playfair Display, serif' },
    { name: 'Cormorant', value: 'Cormorant Garamond, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Dancing', value: 'Dancing Script, cursive' },
    { name: 'Pacifico', value: 'Pacifico, cursive' },
    { name: 'JetBrains', value: 'JetBrains Mono, monospace' },
  ];

  const textShadows = [
    { name: 'None', value: 'none' },
    { name: 'Soft Glow', value: '0 0 10px currentColor' },
    { name: 'Strong Glow', value: '0 0 20px currentColor, 0 0 30px currentColor' },
    { name: 'Drop', value: '2px 2px 4px rgba(0,0,0,0.5)' },
    { name: 'Neon', value: '0 0 5px #ff0080, 0 0 10px #ff0080, 0 0 15px #ff0080' },
  ];

  /* ── Animations — each with its own vibrant colour ── */
  const animations = [
    {
      name: 'None', value: 'none',
      icon: <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#9ca3af" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    },
    {
      name: 'Pulse', value: 'smPulse 2s ease-in-out infinite',
      icon: <svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" d="M2 12h3l2.5-7 3 14 3-10 2 5 1.5-2H22"/></svg>
    },
    {
      name: 'Bounce', value: 'smBounce 1s ease-in-out infinite',
      icon: <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#22c55e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/><circle cx="12" cy="19" r="2" fill="#22c55e" opacity=".5"/></svg>
    },
    {
      name: 'Glow', value: 'smGlow 2s ease-in-out infinite alternate',
      icon: <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#f59e0b" d="M12 1l2.39 7.26L22 9l-6.5 6.34L17.18 23 12 19.77 6.82 23l1.68-7.66L2 9l7.61-.74z"/></svg>
    },
    {
      name: 'Rainbow', value: 'smRainbow 3s linear infinite',
      icon: <svg viewBox="0 0 24 24" width="15" height="15"><defs><linearGradient id="rbG" x1="0%" x2="100%"><stop offset="0%" stopColor="#ef4444"/><stop offset="33%" stopColor="#22c55e"/><stop offset="67%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs><path fill="url(#rbG)" d="M12 4C7.31 4 3.5 7.02 2.29 11.15A6 6 0 0 1 8 14c0-2.21 1.79-4 4-4s4 1.79 4 4a6 6 0 0 1 5.71-2.85C20.5 7.02 16.69 4 12 4zm0-2c5.52 0 10 4.48 10 10h-2c0-4.42-3.58-8-8-8S4 7.58 4 12H2C2 6.48 6.48 2 12 2z"/></svg>
    },
    {
      name: 'Wave', value: 'smWave 2.5s ease-in-out infinite',
      icon: <svg viewBox="0 0 24 24" width="15" height="15"><path fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path fill="none" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" d="M2 16c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" opacity=".45"/></svg>
    },
    {
      name: 'Float', value: 'smFloat 3s ease-in-out infinite',
      icon: <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#06b6d4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 11h-3v3h-2v-3H8v-2h3V8h2v3h3v2z"/></svg>
    },
    {
      name: 'Shake', value: 'smShake 0.6s ease-in-out infinite',
      icon: <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#f97316" d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/></svg>
    },
  ];

  /* ── Premium styles ── */
  const premiumStyles = [
    {
      name: 'None', value: 'none', style: {},
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#9ca3af" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    },
    {
      name: 'Gold Foil', value: 'gold-foil',
      style: { background: 'linear-gradient(135deg,#FFD700,#C7A86B,#FFD700)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#f59e0b" d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 17l-6.18 3.02L7 13.14 2 8.27l6.91-1.01z"/></svg>
    },
    {
      name: 'Cosmic', value: 'cosmic',
      style: { background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#a855f7" d="M12 1l2.39 7.26L22 9l-6.5 6.34L17.18 23 12 19.77 6.82 23l1.68-7.66L2 9l7.61-.74z"/></svg>
    },
    {
      name: 'Ember', value: 'ember',
      style: { background: 'linear-gradient(135deg,#f97316,#ef4444)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#f97316" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>
    },
    {
      name: 'Arctic', value: 'arctic',
      style: { background: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#38bdf8" d="M12 2L9 7H4l4 3-2 5 6-4 6 4-2-5 4-3h-5L12 2z"/></svg>
    },
    {
      name: 'Rose Gold', value: 'rose-gold',
      style: { background: 'linear-gradient(135deg,#f9a8d4,#d97706)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#f472b6" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
    },
    {
      name: 'Velvet', value: 'velvet-shadow',
      style: { color: '#4a4a4a', fontWeight: '600', textShadow: '3px 3px 6px rgba(0,0,0,0.4)' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#6366f1" d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z"/></svg>
    },
    {
      name: 'Royal', value: 'royal-script',
      style: { fontFamily: 'Playfair Display, serif', color: '#1a1a1a', fontWeight: '700', fontStyle: 'italic' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#7c3aed" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.7-2h8.6l1-5.4-3.1 3.3L12 7.9l-2.2 4-3.1-3.3 1 5.4z"/></svg>
    },
    {
      name: 'Mono', value: 'minimal-mono',
      style: { fontFamily: 'JetBrains Mono, monospace', color: '#333333', fontWeight: '500', letterSpacing: '1px' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#0ea5e9" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
    },
    {
      name: 'Neon', value: 'neon-glow',
      style: { color: '#39ff14', fontWeight: '700', textShadow: '0 0 7px #39ff14,0 0 14px #39ff14,0 0 21px #39ff14' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#22c55e" d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
    },
    {
      name: 'Ocean', value: 'ocean-wave',
      style: { background: 'linear-gradient(90deg,#0ea5e9,#38bdf8,#06b6d4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: '700' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#0284c7" d="M17 16.99c-1.35 0-2.2-.42-2.95-.8-.65-.33-1.18-.6-2.05-.6-.9 0-1.4.25-2.05.6-.75.38-1.57.8-2.95.8s-2.2-.42-2.95-.8c-.65-.33-1.18-.6-2.05-.6v-1.5c1.35 0 2.2.42 2.95.8.65.33 1.18.6 2.05.6s1.4-.25 2.05-.6c.75-.38 1.57-.8 2.95-.8s2.2.42 2.95.8c.65.33 1.18.6 2.05.6s1.4-.25 2.05-.6c.75-.38 1.57-.8 2.95-.8v1.5c-.9 0-1.4.25-2.05.6-.75.38-1.58.8-2.95.8z"/></svg>
    },
    {
      name: 'Matte', value: 'matte-luxe',
      style: { color: '#2d2d2d', fontWeight: '600', letterSpacing: '0.5px' },
      icon: <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#374151" d="M12 3C7.59 3 4 6.59 4 11c0 2.03.76 3.87 2 5.28V21l6-2 6 2v-4.72c1.24-1.41 2-3.25 2-5.28 0-4.41-3.59-8-8-8z"/></svg>
    },
  ];

  /* ── Build preview styles ──
     KEY INSIGHT: when premiumStyle has a gradient, it MUST override user's color/gradient.
     We put premBase LAST so it always wins. */
  const getPreviewStyles = () => {
    const sel = premiumStyles.find(s => s.value === premiumStyle);
    const premBase = premiumStyle !== 'none' && sel ? sel.style : {};
    const hasPremGradient = premBase.backgroundClip === 'text';

    const colorStyles = hasPremGradient
      ? {}  // premium gradient handles color — don't apply user color on top
      : gradientEnabled
        ? { background: `linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
        : { color: textColor };

    return {
      ...colorStyles,
      ...premBase,
      fontSize: fontSize + 'px',
      fontFamily: premBase.fontFamily || fontFamily,
      fontWeight: premBase.fontWeight || fontWeight,
      fontStyle: premBase.fontStyle || fontStyle,
      textDecoration,
      textShadow: textShadow !== 'none' ? textShadow : (premBase.textShadow || 'none'),
      animation: animation !== 'none' ? animation : 'none',
      letterSpacing: premBase.letterSpacing || 'normal',
      display: 'inline-block',
      transition: 'all 0.25s ease',
      wordBreak: 'break-word',
    };
  };

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const statusToSet = selectedPreset || newStatus;
    if (!statusToSet.trim()) { pt.error('Please enter a status or select a preset!'); return; }
    const statusData = {
      status: statusToSet,
      statusStyles: {
        fontFamily, fontSize: fontSize + 'px', fontWeight, fontStyle, textDecoration,
        gradientEnabled, gradientStart, gradientEnd, gradientDirection,
        textColor, textShadow, animation, premiumStyle
      }
    };
    try {
      await setDoc(doc(db, 'users', user.uid), statusData, { merge: true });
      onClose();
      pt.success('Status updated!', { position: 'bottom-center', autoClose: 2000 });
    } catch { pt.error('Failed to update status.'); }
  };

  const handlePresetSelect = (preset) => { setSelectedPreset(preset.text); setNewStatus(''); };

  const handleClearStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { status: '' }, { merge: true });
      onClose();
      pt.success('Status cleared!', { position: 'bottom-center', autoClose: 2000 });
    } catch { pt.error('Failed to clear status.'); }
  };

  const displayText = selectedPreset || newStatus || 'Your status preview…';

  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-card" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="sm-header">
          <button className="sm-close" onClick={onClose} aria-label="Close">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="sm-header-inner">
            <div className="sm-icon-ring">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                <path d="M12 1l2.39 7.26L22 9l-6.5 6.34L17.18 23 12 19.77 6.82 23l1.68-7.66L2 9l7.61-.74z"/>
              </svg>
            </div>
            <div>
              <h2 className="sm-title">Status Studio</h2>
              <p className="sm-sub">Craft your perfect presence</p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="sm-body">

          {/* Input */}
          <div className="sm-input-wrap">
            <svg viewBox="0 0 24 24" width="13" height="13" style={{flexShrink:0}}>
              <path fill="#a78bfa" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <input
              type="text"
              placeholder="What's on your mind?"
              value={newStatus}
              onChange={e => { setNewStatus(e.target.value); setSelectedPreset(''); }}
              className="sm-input"
              maxLength={100}
            />
            <span className="sm-char-count">{(selectedPreset || newStatus).length}/100</span>
          </div>

          {/* ── Presets ── */}
          <div className="sm-section-label">
            <svg viewBox="0 0 24 24" width="10" height="10"><path fill="#a78bfa" d="M13 3H4a1 1 0 0 0-1 1v7h2V5h7V3zm8 14h-2v2h-7v2h7a2 2 0 0 0 2-2v-2zm-2-8h-7V7l-4 4 4 4v-2h7v-2z"/></svg>
            Quick Presets
          </div>
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

          {/* ── Premium Styles ── */}
          <div className="sm-section-label">
            <svg viewBox="0 0 24 24" width="10" height="10"><path fill="#f59e0b" d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 17l-6.18 3.02L7 13.14 2 8.27l6.91-1.01z"/></svg>
            Premium Styles
          </div>
          <div className="sm-premium-grid">
            {premiumStyles.map(s => (
              <button
                key={s.value}
                className={`sm-premium-btn${premiumStyle === s.value ? ' selected' : ''}`}
                onClick={() => setPremiumStyle(s.value)}
                title={s.name}
              >
                <span className="sm-premium-icon">{s.icon}</span>
                {s.name}
              </button>
            ))}
          </div>

          {/* ── Animation ── */}
          <div className="sm-section-label">
            <svg viewBox="0 0 24 24" width="10" height="10"><path fill="#a78bfa" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
            Animation
          </div>
          <div className="sm-anim-grid">
            {animations.map(a => (
              <button
                key={a.value}
                className={`sm-anim-btn${animation === a.value ? ' selected' : ''}`}
                onClick={() => setAnimation(a.value)}
                title={a.name}
              >
                {a.icon}
                <span>{a.name}</span>
              </button>
            ))}
          </div>

          {/* ── Typography ── */}
          <div className="sm-section-label">
            <svg viewBox="0 0 24 24" width="10" height="10"><path fill="#a78bfa" d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/></svg>
            Typography
          </div>
          <div className="sm-style-grid">
            <div className="sm-style-group">
              <label>Font Family</label>
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
              <label>Decoration</label>
              <select value={textDecoration} onChange={e => setTextDecoration(e.target.value)} className="sm-select">
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="line-through">Strike</option>
                <option value="overline">Overline</option>
              </select>
            </div>
            <div className="sm-style-group">
              <label>Shadow</label>
              <select value={textShadow} onChange={e => setTextShadow(e.target.value)} className="sm-select">
                {textShadows.map(s => <option key={s.value} value={s.value}>{s.name}</option>)}
              </select>
            </div>
            <div className="sm-style-group">
              <label>Size — {fontSize}px</label>
              <input type="range" min="10" max="26" step="1" value={fontSize}
                onChange={e => setFontSize(e.target.value)} className="sm-range" />
            </div>
          </div>

          {/* ── Colour ── */}
          <div className="sm-section-label">
            <svg viewBox="0 0 24 24" width="10" height="10"><path fill="#a78bfa" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
            Colour
          </div>
          <div className="sm-color-row">
            <button className={`sm-color-mode${!gradientEnabled ? ' active' : ''}`} onClick={() => setGradientEnabled(false)}>
              <svg viewBox="0 0 24 24" width="11" height="11"><circle cx="12" cy="12" r="10" fill={!gradientEnabled ? '#7c3aed' : '#c4b5fd'}/></svg>
              Solid
            </button>
            <button className={`sm-color-mode${gradientEnabled ? ' active' : ''}`} onClick={() => setGradientEnabled(true)}>
              <svg viewBox="0 0 24 24" width="11" height="11"><defs><linearGradient id="cgr2" x1="0%" x2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#cgr2)"/></svg>
              Gradient
            </button>
            {!gradientEnabled ? (
              <div className="sm-color-pick">
                <label>Pick</label>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="sm-color-input"/>
              </div>
            ) : (
              <>
                <div className="sm-color-pick">
                  <label>From</label>
                  <input type="color" value={gradientStart} onChange={e => setGradientStart(e.target.value)} className="sm-color-input"/>
                </div>
                <div className="sm-color-pick">
                  <label>To</label>
                  <input type="color" value={gradientEnd} onChange={e => setGradientEnd(e.target.value)} className="sm-color-input"/>
                </div>
                <select value={gradientDirection} onChange={e => setGradientDirection(e.target.value)} className="sm-select sm-select-dir">
                  <option value="to right">Horizontal</option>
                  <option value="to bottom">Vertical</option>
                  <option value="45deg">Diagonal</option>
                  <option value="135deg">Diagonal 2</option>
                </select>
              </>
            )}
          </div>

          {/* ── Live Preview ── */}
          <div className="sm-preview">
            <span className="sm-preview-label">
              <svg viewBox="0 0 24 24" width="9" height="9"><path fill="#c4b5fd" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              Preview
            </span>
            {/* key forces remount when style changes — fixes gradient switching glitch */}
            <span
              key={`${premiumStyle}-${gradientEnabled}-${gradientStart}-${gradientEnd}`}
              className="sm-preview-text"
              style={getPreviewStyles()}
            >
              {displayText}
            </span>
          </div>

        </div>

        {/* ── Actions ── */}
        <div className="sm-actions">
          <button className="sm-btn sm-btn-clear" onClick={handleClearStatus}>
            <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#dc2626" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"/></svg>
            Clear
          </button>
          <button className="sm-btn sm-btn-cancel" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="12" height="12"><path fill="#7c3aed" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            Cancel
          </button>
          <button className="sm-btn sm-btn-save" onClick={handleUpdate} disabled={!selectedPreset && !newStatus.trim()}>
            <svg viewBox="0 0 24 24" width="12" height="12" style={{flexShrink:0}}>
              <path fill="#ffffff" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Save Status
          </button>
        </div>

      </div>
    </div>
  );
});

export default StatusModal;
