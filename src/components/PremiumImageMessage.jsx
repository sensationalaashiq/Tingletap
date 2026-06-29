import React, { useState, useRef, useEffect, useCallback } from 'react';
import './PremiumImageMessage.css';

/* ── Premium SVG Icons ─────────────────────────────── */
const LockImageSVG = () => (
  <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
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
      <filter id="pimGlow2">
        <feGaussianBlur stdDeviation="1" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M6 34 L16 18 L22 26 L28 20 L38 34 Z" fill="url(#pimPurp1)" opacity="0.35"/>
    <circle cx="11" cy="14" r="3" fill="url(#pimPurp2)" opacity="0.45"/>
    <g filter="url(#pimGlow2)">
      <rect x="14" y="24" width="16" height="13" rx="3.5" fill="url(#pimPurp1)"/>
      <path d="M17 24 L17 20 C17 16.7 27 16.7 27 20 L27 24" stroke="url(#pimPurp1)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <circle cx="22" cy="30" r="2" fill="#f5f3ff"/>
      <rect x="21.2" y="30" width="1.6" height="2.8" rx="0.8" fill="#f5f3ff"/>
    </g>
  </svg>
);

const ShieldSVG = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="pimSh2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M12 2L4 5.5V11C4 15.55 7.42 19.74 12 21C16.58 19.74 20 15.55 20 11V5.5L12 2Z" fill="url(#pimSh2)"/>
    <path d="M9.5 12L11.5 14L15.5 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeSlashSVG = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const BackArrowSVG = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeHideSVG = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* Premium expand/zoom icon — colorful gradient */
const ExpandSVG = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
    <defs>
      <linearGradient id="expGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b"/>
        <stop offset="50%" stopColor="#ef4444"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
    <path d="M3 8V3h5" stroke="url(#expGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 8V3h-5" stroke="url(#expGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 12v5h5" stroke="url(#expGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 12v5h-5" stroke="url(#expGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 3l4.5 4.5M17 3l-4.5 4.5M3 17l4.5-4.5M17 17l-4.5-4.5" stroke="url(#expGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

/* Modal close (X) icon */
const CloseSVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Fullscreen Image Modal ───────────────────────────── */
const ImageModal = ({ imageUrl, imageFileName, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="pim-modal-overlay" onClick={onClose}>
      <div className="pim-modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Header bar */}
        <div className="pim-modal-header">
          <div className="pim-modal-header-left">
            <div className="pim-modal-icon-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="mhGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#7c3aed"/>
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="url(#mhGrad)" strokeWidth="1.8"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="#a78bfa"/>
                <path d="M5 17l4-4 3 3 3-4 4 5" stroke="url(#mhGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="pim-modal-title">{imageFileName || 'Image Preview'}</span>
          </div>
          <button className="pim-modal-close-btn" onClick={onClose} title="Close (Esc)">
            <CloseSVG />
          </button>
        </div>

        {/* Image area */}
        <div className="pim-modal-body">
          <img
            src={imageUrl}
            alt={imageFileName || 'Shared image'}
            className="pim-modal-img"
            draggable={false}
            onError={(e) => { e.target.alt = 'Image unavailable'; }}
          />
        </div>

        {/* Footer */}
        <div className="pim-modal-footer">
          <div className="pim-modal-footer-dot" />
          <span className="pim-modal-footer-text">Press Esc or click outside to close</span>
          <div className="pim-modal-footer-dot" />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
const PremiumImageMessage = ({ imageUrl, imageFileName, compact = false }) => {
  const [state, setState] = useState('hidden');
  const [showModal, setShowModal] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const rootRef = useRef(null);

  /* ── Reveal ── */
  const handleReveal = useCallback((e) => {
    e?.stopPropagation();
    setIsEntering(true);
    setState('visible');
    setTimeout(() => setIsEntering(false), 600);
    setTimeout(() => {
      if (rootRef.current) rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }, []);

  /* ── Hide ── */
  const handleHide = useCallback((e) => {
    e?.stopPropagation();
    setState('hidden');
  }, []);

  const rootCls = `pim${compact ? ' pim--compact' : ''}`;

  /* ── HIDDEN STATE ── */
  if (state === 'hidden') {
    return (
      <div ref={rootRef} className={`${rootCls} pim__card`}>
        <div className="pim__card-border" />

        <div className="pim__icon-area">
          <div className="pim__icon-square">
            <LockImageSVG />
          </div>
          <div className="pim__icon-pulse" />
          <div className="pim__icon-glow" />
        </div>

        <div className="pim__title-row">
          <span className="pim__title">Image Hidden</span>
          <ShieldSVG />
        </div>

        <button className="pim__reveal-btn" onClick={handleReveal}>
          <EyeSlashSVG />
          <span>View</span>
        </button>
      </div>
    );
  }

  /* ── VISIBLE STATE ── */
  return (
    <>
      <div ref={rootRef} className={`${rootCls} pim__viewer${isEntering ? ' pim__viewer--entering' : ''}`}>
        <div className="pim__img-wrap">
          <img
            src={imageUrl}
            alt={imageFileName || 'Shared image'}
            className="pim__img"
            draggable={false}
            onError={(e) => { e.target.alt = 'Image unavailable'; }}
          />

          {/* Expand / Modal button — bottom-right corner */}
          <button
            className="pim__expand-btn"
            onClick={() => setShowModal(true)}
            title="View full size"
          >
            <ExpandSVG />
            <span>Zoom</span>
          </button>
        </div>

        <button className="pim__hide-btn" onClick={handleHide}>
          <BackArrowSVG />
          <EyeHideSVG />
          <span>Hide</span>
        </button>
      </div>

      {/* Inline Fullscreen Modal — no external links */}
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
