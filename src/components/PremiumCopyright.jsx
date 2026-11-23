import React from 'react';
import './PremiumCopyright.css';

const DiamondSvg = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="pco-icon">
    <defs>
      <linearGradient id="pco-dg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
    <path d="M10 1.5L2 7.5 10 18.5 18 7.5 10 1.5z" fill="url(#pco-dg)" />
    <path d="M2 7.5h16" stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" />
    <path d="M6 2L2 7.5 10 18.5 6 2z" fill="white" opacity="0.22" />
  </svg>
);

const GlowHeartSvg = ({ size = 13 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="pco-heart-svg pco-icon">
    <defs>
      <linearGradient id="pco-hg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fda4af" />
        <stop offset="50%" stopColor="#f43f5e" />
        <stop offset="100%" stopColor="#e11d48" />
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
    <rect width="20" height="4.67" fill="#FF9933" />
    <rect y="4.67" width="20" height="4.67" fill="#FFFFFF" />
    <rect y="9.33" width="20" height="4.67" fill="#138808" />
    <circle cx="10" cy="7" r="1.7" fill="none" stroke="#000080" strokeWidth="0.7" />
    <circle cx="10" cy="7" r="0.5" fill="#000080" />
  </svg>
);

const SparkleStarSvg = ({ className }) => (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
    <path d="M8 0.5L9.6 6.4L15.5 8L9.6 9.6L8 15.5L6.4 9.6L0.5 8L6.4 6.4L8 0.5Z" fill="#fde68a" />
  </svg>
);

const PremiumCopyright = () => (
  <footer className="pco-root" aria-label="Copyright and attribution">
    <div className="pco-chip">
      <span className="pco-aurora" aria-hidden="true" />
      <span className="pco-shimmer-line" aria-hidden="true" />
      <span className="pco-shimmer-line pco-shimmer-line--bottom" aria-hidden="true" />
      <span className="pco-sheen" aria-hidden="true" />
      <SparkleStarSvg className="pco-sparkle pco-sparkle--1" />
      <SparkleStarSvg className="pco-sparkle pco-sparkle--2" />
      <div className="pco-inner">
        <div className="pco-seg pco-seg-brand">
          <span className="pco-gem-wrap"><DiamondSvg /></span>
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
          <span className="pco-origin-pill">
            <IndiaSvg />
            <span className="pco-india-text">Made &amp; Loved in India</span>
          </span>
        </div>
      </div>
    </div>
  </footer>
);

export default PremiumCopyright;
