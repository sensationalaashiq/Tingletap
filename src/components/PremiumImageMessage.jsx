import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { extractR2Key } from '../services/r2StorageService';
import './PremiumImageMessage.css';

/* ── Fullscreen Image Modal ── */
const ImageModal = ({ imageUrl, imageFileName, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="pim-modal-overlay" onClick={onClose}>
      <div className="pim-modal-card" onClick={(e) => e.stopPropagation()}>

        <div className="pim-modal-header">
          <div className="pim-modal-header-left">
            <div className="pim-modal-icon-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#f59e0b" strokeWidth="1.8"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="#f59e0b"/>
                <path d="M5 17l4-4 3 3 3-4 4 5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="pim-modal-title" style={{color:'#fff',fontWeight:800}}>
              {imageFileName || 'Image Preview'}
            </span>
          </div>
          <button className="pim-modal-close-btn" onClick={onClose} title="Close (Esc)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="pim-modal-body">
          <img
            src={imageUrl}
            alt={imageFileName || 'Shared image'}
            className="pim-modal-img"
            draggable={false}
            onError={(e) => { e.target.alt = 'Image unavailable'; }}
          />
        </div>

        <div className="pim-modal-footer">
          <div className="pim-modal-footer-dot" />
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 5.5V11C4 15.55 7.42 19.74 12 21C16.58 19.74 20 15.55 20 11V5.5L12 2Z" fill="#f59e0b" opacity="0.6"/>
          </svg>
          <span className="pim-modal-footer-text" style={{color:'rgba(255,255,255,0.32)'}}>
            Tap outside or Esc to close
          </span>
          <div className="pim-modal-footer-dot" />
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
const PremiumImageMessage = React.memo(({ imageUrl, imageFileName, compact = false, mediaKey }) => {
  const [state, setState] = useState('hidden');
  const [showModal, setShowModal] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState(imageUrl);
  const imgRetried = useRef(false);
  const rootRef = useRef(null);

  // Keep resolvedUrl in sync if the parent passes a fresh imageUrl (e.g. after refresh)
  useEffect(() => {
    setResolvedUrl(imageUrl);
    imgRetried.current = false;
  }, [imageUrl]);

  /**
   * Signed-URL expiry recovery.
   * When an R2 signed URL expires (7-day max), the <img> 403s and onError fires.
   * We extract the key from the URL path (still present after expiry) and call
   * the getMediaUrl Netlify function to get a fresh 1-hour signed URL.
   */
  const handleImgError = useCallback((e) => {
    if (imgRetried.current) {
      e.target.alt = 'Image unavailable';
      return;
    }
    imgRetried.current = true;
    const key = mediaKey || extractR2Key(e.target.src || resolvedUrl);
    if (!key) { e.target.alt = 'Image unavailable'; return; }
    import('../services/r2StorageService')
      .then(({ getMediaUrl }) => getMediaUrl(key))
      .then(freshUrl => { imgRetried.current = false; setResolvedUrl(freshUrl); })
      .catch(() => { if (e.target) e.target.alt = 'Image unavailable'; });
  }, [mediaKey, resolvedUrl]);

  const handleReveal = useCallback((e) => {
    e?.stopPropagation();
    setIsEntering(true);
    setState('visible');
    setTimeout(() => setIsEntering(false), 600);
    setTimeout(() => {
      if (typeof window.scrollToBottom === 'function') window.scrollToBottom(true);
      else if (rootRef.current) rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 120);
  }, []);

  const handleHide = useCallback((e) => {
    e?.stopPropagation();
    setState('hidden');
  }, []);

  const iconSz = compact ? 34 : 40;
  const lockSz = compact ? 15 : 18;

  /* ── HIDDEN STATE ── */
  if (state === 'hidden') {
    return (
      <div
        ref={rootRef}
        className={`pim-card${compact ? ' pim-card--compact' : ''}`}
      >
        {/* Shield badge */}
        <div className="pim-card__badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 5.5V11C4 15.55 7.42 19.74 12 21C16.58 19.74 20 15.55 20 11V5.5L12 2Z" fill="#f59e0b"/>
            <rect x="10.5" y="9" width="3" height="4" rx="1" fill="#111"/>
            <path d="M10.5 9V7.5C10.5 6.7 13.5 6.7 13.5 7.5V9" stroke="#111" strokeWidth="1.2" fill="none"/>
          </svg>
        </div>

        {/* Image + Lock icon */}
        <div className="pim-card__icon-wrap">
          <div className="pim-card__img-box">
            <svg width={iconSz} height={iconSz} viewBox="0 0 46 46" fill="none">
              <rect width="46" height="46" rx="12" fill="#2c1e00"/>
              <rect width="46" height="46" rx="12" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.55"/>
              <path d="M8 36 L18 22 L24 30 L30 24 L38 36 Z" fill="#f59e0b" opacity="0.18"/>
              <circle cx="13" cy="15" r="3.5" fill="#f59e0b" opacity="0.22"/>
            </svg>
            <div className="pim-card__lock">
              <svg width={lockSz} height={lockSz} viewBox="0 0 44 44" fill="none">
                <defs>
                  <linearGradient id="gL1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24"/>
                    <stop offset="100%" stopColor="#d97706"/>
                  </linearGradient>
                  <filter id="gF1">
                    <feGaussianBlur stdDeviation="1" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <g filter="url(#gF1)">
                  <rect x="12" y="22" width="20" height="15" rx="3.5" fill="url(#gL1)"/>
                  <path d="M15 22V17C15 12 29 12 29 17V22" stroke="url(#gL1)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
                  <circle cx="22" cy="28.5" r="2" fill="#1a0f00"/>
                  <rect x="21.2" y="28.5" width="1.6" height="2.6" rx="0.8" fill="#1a0f00"/>
                </g>
              </svg>
            </div>
          </div>
          <div className="pim-card__pulse" />
        </div>

        {/* Title */}
        <div className="pim-card__title-row">
          <span className="pim-card__star" style={{color:'#fbbf24'}}>✦</span>
          <span className="pim-card__title" style={{color:'#ffffff', textShadow:'0 0 8px rgba(245,158,11,0.5)'}}>
            Image Hidden
          </span>
          <span className="pim-card__star" style={{color:'#fbbf24', animationDelay:'1.1s'}}>✦</span>
        </div>

        {/* Subtitle */}
        <p className="pim-card__sub" style={{color:'rgba(255,255,255,0.6)'}}>
          Hidden for your privacy.
        </p>

        {/* Button */}
        <button className="pim-card__btn" onClick={handleReveal}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
              stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{color:'#ffffff', fontWeight:700}}>Tap to View</span>
        </button>

        {/* Tags */}
        <div className="pim-card__tags">
          <span className="pim-card__tag" style={{color:'rgba(251,191,36,0.92)'}}>
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 5.5V11C4 15.55 7.42 19.74 12 21C16.58 19.74 20 15.55 20 11V5.5L12 2Z" fill="#f59e0b"/>
            </svg>
            Private
          </span>
          <span className="pim-card__sep" />
          <span className="pim-card__tag" style={{color:'rgba(251,191,36,0.92)'}}>
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="11" rx="2" stroke="#f59e0b" strokeWidth="2.2"/>
              <path d="M8 11V7C8 4.79 9.79 3 12 3s4 1.79 4 4v4" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            Secure
          </span>
          <span className="pim-card__sep" />
          <span className="pim-card__tag" style={{color:'rgba(251,191,36,0.92)'}}>
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
              <line x1="1" y1="1" x2="23" y2="23" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Hidden
          </span>
        </div>
      </div>
    );
  }

  /* ── VISIBLE STATE ── */
  return (
    <>
      <div
        ref={rootRef}
        className={`pim-viewer${compact ? ' pim-viewer--compact' : ''}${isEntering ? ' pim-viewer--in' : ''}`}
      >
        <div className="pim-viewer__wrap">
          <img
            src={resolvedUrl}
            alt={imageFileName || 'Shared image'}
            className="pim-viewer__img"
            draggable={false}
            onError={handleImgError}
          />
          <button className="pim-viewer__zoom" onClick={() => setShowModal(true)} title="Full size">
            <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
              <path d="M3 8V3h5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 8V3h-5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 12v5h5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 12v5h-5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{color:'#fff', fontWeight:700}}>Zoom</span>
          </button>
        </div>

        <button className="pim-viewer__hide" onClick={handleHide}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{color:'#ffffff', fontWeight:700}}>Hide</span>
        </button>
      </div>

      {showModal && (
        <ImageModal
          imageUrl={resolvedUrl}
          imageFileName={imageFileName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
});

export default PremiumImageMessage;
