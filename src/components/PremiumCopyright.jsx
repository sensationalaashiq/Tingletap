import React from 'react';
import './PremiumCopyright.css';

const DiamondSvg = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="pco-icon">
    <defs>
      <linearGradient id="pco-dg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="50%" stopColor="#a855f7"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M10 1.5L2 7.5 10 18.5 18 7.5 10 1.5z" fill="url(#pco-dg)"/>
    <path d="M2 7.5h16" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9"/>
    <path d="M6 2L2 7.5 10 18.5 6 2z" fill="white" opacity="0.18"/>
  </svg>
);

const GlowHeartSvg = ({ size = 13 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="pco-heart-svg pco-icon">
    <defs>
      <linearGradient id="pco-hg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb7185"/>
        <stop offset="50%" stopColor="#ef4444"/>
        <stop offset="100%" stopColor="#dc2626"/>
      </linearGradient>
    </defs>
    <path
      d="M12 21S2 14.5 2 8a5 5 0 0 1 10 0 5 5 0 0 1 10 0c0 6.5-10 13-10 13z"
      fill="url(#pco-hg2)"
    />
  </svg>
);

const IndiaSvg = () => (
  <svg viewBox="0 0 20 14" width="16" height="11" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="pco-flag pco-icon">
    <rect width="20" height="4.67" fill="#FF9933"/>
    <rect y="4.67" width="20" height="4.67" fill="#FFFFFF"/>
    <rect y="9.33" width="20" height="4.67" fill="#138808"/>
    <circle cx="10" cy="7" r="1.7" fill="none" stroke="#000080" strokeWidth="0.7"/>
    <circle cx="10" cy="7" r="0.5" fill="#000080"/>
  </svg>
);

const PremiumCopyright = () => (
  <footer className="pco-root" aria-label="Copyright and attribution">
    <span className="pco-shimmer-line" aria-hidden="true" />
    <div className="pco-inner">
      <div className="pco-seg pco-seg-brand">
        <DiamondSvg />
        <span className="pco-year">© 2026</span>
        <span className="pco-brand">TingleTap™</span>
        <span className="pco-sep" aria-hidden="true">·</span>
        <span className="pco-rights">All Rights Reserved</span>
      </div>

      <span className="pco-divider" aria-hidden="true" />

      <div className="pco-seg pco-seg-craft">
        <span className="pco-craft-text">Crafted with</span>
        <GlowHeartSvg size={12} />
        <span className="pco-craft-text">by</span>
        <span className="pco-adrashtra">Adrashtra Inc.</span>
        <span className="pco-sep" aria-hidden="true">·</span>
        <IndiaSvg />
        <span className="pco-india-text">Made &amp; Loved in India</span>
      </div>
    </div>
  </footer>
);

export default PremiumCopyright;
