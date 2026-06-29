import React, { useState, useRef, useEffect, useCallback } from 'react';
import './PremiumImageMessage.css';

/* ── Premium SVG Icons ── */
const LockImageSVG = ({ compact }) => {
  const s = compact ? 26 : 34;
  return (
    <svg width={s} height={s} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pimPurp1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="50%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#5b21b6"/>
        </linearGradient>
        <linearGradient id="pimPurp2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ddd6fe"/>
          <stop offset="100%" stopColor="#a78bfa"/>
        </linearGradient>
        <filter id="pimGlow">
          <feGaussianBlur stdDeviation="1.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M6 34 L16 18 L22 26 L28 20 L38 34 Z" fill="url(#pimPurp1)" opacity="0.4"/>
      <circle cx="11" cy="14" r="3.5" fill="url(#pimPurp2)" opacity="0.5"/>
      <g filter="url(#pimGlow)">
        <rect x="14" y="24" width="16" height="13" rx="3.5" fill="url(#pimPurp1)"/>
        <path d="M17 24 L17 20 C17 16.7 27 16.7 27 20 L27 24" stroke="url(#pimPurp1)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="30" r="2.2" fill="#f5f3ff"/>
        <rect x="21.1" y="30" width="1.8" height="3" rx="0.9" fill="#f5f3ff"/>
      </g>
    </svg>
  );
};

const ShieldSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="pimShield" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M12 2L4 5.5V11C4 15.55 7.42 19.74 12 21C16.58 19.74 20 15.55 20 11V5.5L12 2Z" fill="url(#pimShield)"/>
    <path d="M9.5 12L11.5 14L15.5 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeSlashSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const BackArrowSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeHideSVG = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
const PremiumImageMessage = ({ imageUrl, imageFileName, compact = false }) => {
  const [state, setState] = useState('hidden');
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const rootRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartRef = useRef(null);
  const lastScaleRef = useRef(1);
  const lastDistRef = useRef(null);
  const lastTranslateRef = useRef({ x: 0, y: 0 });
  const lastTouchRef = useRef(null);

  /* ── Reveal ── */
  const handleReveal = useCallback((e) => {
    e?.stopPropagation();
    setIsEntering(true);
    setState('visible');
    setTimeout(() => setIsEntering(false), 600);
    /* Auto-scroll chat feed so full expanded card is visible */
    setTimeout(() => {
      if (rootRef.current) {
        rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
  }, []);

  /* ── Hide ── */
  const handleHide = useCallback((e) => {
    e?.stopPropagation();
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    lastScaleRef.current = 1;
    lastTranslateRef.current = { x: 0, y: 0 };
    setState('hidden');
  }, []);

  /* ── Wheel zoom (desktop) ── */
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    setScale(prev => {
      const next = Math.min(Math.max(prev * factor, 1), 5);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  /* ── Double-click reset ── */
  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  /* ── Mouse drag ── */
  const handleMouseDown = useCallback((e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  }, [scale, translate]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragStartRef.current) return;
    setTranslate({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  /* ── Pinch-to-zoom (mobile) ── */
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistRef.current = Math.hypot(dx, dy);
      lastScaleRef.current = scale;
      lastTouchRef.current = null;
    } else if (e.touches.length === 1 && scale > 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastTranslateRef.current = { ...translate };
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && lastDistRef.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const next = Math.min(Math.max(lastScaleRef.current * (dist / lastDistRef.current), 1), 5);
      setScale(next);
      if (next === 1) setTranslate({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && lastTouchRef.current && scale > 1) {
      e.preventDefault();
      setTranslate({
        x: lastTranslateRef.current.x + (e.touches[0].clientX - lastTouchRef.current.x),
        y: lastTranslateRef.current.y + (e.touches[0].clientY - lastTouchRef.current.y)
      });
    }
  }, [scale]);

  const handleTouchEnd = useCallback(() => {
    lastDistRef.current = null;
    lastTouchRef.current = null;
    lastTranslateRef.current = { ...translate };
  }, [translate]);

  /* ── Attach non-passive wheel + global mouse ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  const rootCls = `pim${compact ? ' pim--compact' : ''}`;

  /* ── HIDDEN STATE ── */
  if (state === 'hidden') {
    return (
      <div ref={rootRef} className={`${rootCls} pim__card`}>
        <div className="pim__card-border" />

        <div className="pim__icon-area">
          <div className="pim__icon-square">
            <LockImageSVG compact={compact} />
          </div>
          <div className="pim__icon-pulse" />
          <div className="pim__icon-glow" />
        </div>

        <div className="pim__title-row">
          <span className="pim__title">Image Hidden</span>
          <ShieldSVG />
        </div>

        <p className="pim__subtitle">
          This image has been hidden to keep the chat safe and friendly.
        </p>

        <button className="pim__reveal-btn" onClick={handleReveal}>
          <EyeSlashSVG />
          <span>Tap to Reveal</span>
        </button>
      </div>
    );
  }

  /* ── VISIBLE STATE ── */
  return (
    <div ref={rootRef} className={`${rootCls} pim__viewer${isEntering ? ' pim__viewer--entering' : ''}`}>
      <div
        ref={containerRef}
        className="pim__zoom-wrap"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <img
          src={imageUrl}
          alt={imageFileName || 'Shared image'}
          className="pim__img"
          draggable={false}
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)'
          }}
        />

        {scale > 1 && (
          <div className="pim__zoom-badge">{Math.round(scale * 100)}%</div>
        )}
        {scale > 1 && (
          <div className="pim__reset-hint">Double-tap to reset</div>
        )}
      </div>

      <button className="pim__hide-btn" onClick={handleHide}>
        <BackArrowSVG />
        <EyeHideSVG />
        <span>Back to Hidden</span>
      </button>
    </div>
  );
};

export default PremiumImageMessage;
