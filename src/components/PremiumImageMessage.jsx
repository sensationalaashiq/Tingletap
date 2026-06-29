import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './PremiumImageMessage.css';

/* ── Fullscreen Image Modal — no download, always viewport-centered ── */
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

  const modal = (
    <div className="pim-modal-overlay" onClick={onClose}>
      <div className="pim-modal-card" onClick={(e) => e.stopPropagation()}>

        <div className="pim-modal-header">
          <div className="pim-modal-header-left">
            <div className="pim-modal-icon-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="mhGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b"/>
                    <stop offset="100%" stopColor="#d97706"/>
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="url(#mhGrad)" strokeWidth="1.8"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="#f59e0b"/>
                <path d="M5 17l4-4 3 3 3-4 4 5" stroke="url(#mhGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="pim-modal-title">{imageFileName || 'Image Preview'}</span>
          </div>

          <button className="pim-modal-close-btn" onClick={onClose} title="Close (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
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
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" style={{opacity:0.5}}>
            <path d="M12 2L4 5.5V11C4 15.55 7.42 19.74 12 21C16.58 19.74 20 15.55 20 11V5.5L12 2Z" fill="#f59e0b"/>
          </svg>
          <span className="pim-modal-footer-text">Tap outside or press Esc to close</span>
          <div className="pim-modal-footer-dot" />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
const PremiumImageMessage = ({ imageUrl, imageFileName, compact = false }) => {
  const [state, setState] = useState('hidden');
  const [showModal, setShowModal] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [imgSize, setImgSize] = useState({ w: null, h: null });

  const rootRef = useRef(null);

  /* Preload to get natural dimensions */
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      const maxW = compact ? 160 : 220;
      const ratio = img.naturalHeight / img.naturalWidth;
      const w = Math.min(img.naturalWidth, maxW);
      const h = Math.round(w * ratio);
      setImgSize({ w, h: Math.min(h, compact ? 140 : 220) });
    };
    img.src = imageUrl;
  }, [imageUrl, compact]);

  /* Reveal */
  const handleReveal = useCallback((e) => {
    e?.stopPropagation();
    setIsEntering(true);
    setState('visible');
    setTimeout(() => setIsEntering(false), 600);
    setTimeout(() => {
      if (typeof window.scrollToBottom === 'function') {
        window.scrollToBottom(true);
      } else if (rootRef.current) {
        rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 120);
  }, []);

  /* Hide */
  const handleHide = useCallback((e) => {
    e?.stopPropagation();
    setState('hidden');
  }, []);

  const cardStyle = imgSize.w
    ? { width: imgSize.w + 'px', minHeight: Math.max(imgSize.h, compact ? 130 : 160) + 'px' }
    : {};

  /* ── HIDDEN STATE ── */
  if (state === 'hidden') {
    return (
      <div
        ref={rootRef}
        className={`pim-card${compact ? ' pim-card--compact' : ''}`}
        style={cardStyle}
      >
        {/* Shield badge top-right */}
        <div className="pim-card__badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 5.5V11C4 15.55 7.42 19.74 12 21C16.58 19.74 20 15.55 20 11V5.5L12 2Z" fill="#f59e0b"/>
            <rect x="10.5" y="9" width="3" height="4" rx="1" fill="#111"/>
            <path d="M10.5 9V7.5C10.5 6.7 13.5 6.7 13.5 7.5V9" stroke="#111" strokeWidth="1.3" fill="none"/>
          </svg>
        </div>

        {/* Icon: image + lock */}
        <div className="pim-card__icon-wrap">
          <div className="pim-card__img-box">
            <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
              <rect width="46" height="46" rx="12" fill="#2a1d00"/>
              <rect width="46" height="46" rx="12" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.5"/>
              <path d="M8 36 L18 22 L24 30 L30 24 L38 36 Z" fill="#f59e0b" opacity="0.2"/>
              <circle cx="13" cy="15" r="3.5" fill="#f59e0b" opacity="0.25"/>
            </svg>
            <div className="pim-card__lock">
              <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
                <defs>
                  <linearGradient id="gL1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24"/>
                    <stop offset="100%" stopColor="#d97706"/>
                  </linearGradient>
                  <filter id="gF1">
                    <feGaussianBlur stdDeviation="1.2" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <g filter="url(#gF1)">
                  <rect x="12" y="22" width="20" height="15" rx="3.5" fill="url(#gL1)"/>
                  <path d="M15 22V17C15 12 29 12 29 17V22" stroke="url(#gL1)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
                  <circle cx="22" cy="28.5" r="2.2" fill="#1a0f00"/>
                  <rect x="21.1" y="28.5" width="1.8" height="3" rx="0.9" fill="#1a0f00"/>
                </g>
              </svg>
            </div>
          </div>
          <div className="pim-card__pulse" />
        </div>

        {/* Title */}
        <div className="pim-card__title-row">
          <span className="pim-card__star">✦</span>
          <span className="pim-card__title">Image Hidden</span>
          <span className="pim-card__star">✦</span>
        </div>

        {/* Subtitle */}
        <p className="pim-card__sub">Hidden for your privacy.</p>

        {/* Tap to View */}
        <button className="pim-card__btn" onClick={handleReveal}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Tap to View</span>
        </button>

        {/* Bottom tags */}
        <div className="pim-card__tags">
          <span className="pim-card__tag">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 5.5V11C4 15.55 7.42 19.74 12 21C16.58 19.74 20 15.55 20 11V5.5L12 2Z" fill="#f59e0b"/>
            </svg>
            Private
          </span>
          <span className="pim-card__sep" />
          <span className="pim-card__tag">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="11" rx="2" stroke="#f59e0b" strokeWidth="2.2"/>
              <path d="M8 11V7C8 4.79 9.79 3 12 3s4 1.79 4 4v4" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            Secure
          </span>
          <span className="pim-card__sep" />
          <span className="pim-card__tag">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
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
            src={imageUrl}
            alt={imageFileName || 'Shared image'}
            className="pim-viewer__img"
            draggable={false}
            onError={(e) => { e.target.alt = 'Image unavailable'; }}
          />
          <button className="pim-viewer__zoom" onClick={() => setShowModal(true)} title="View full size">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
              <path d="M3 8V3h5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 8V3h-5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 12v5h5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 12v5h-5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Zoom</span>
          </button>
        </div>

        <button className="pim-viewer__hide" onClick={handleHide}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Hide</span>
        </button>
      </div>

      {showModal && (
        <ImageModal
          imageUrl={imageUrl}
          imageFileName={imageFileName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default PremiumImageMessage;
