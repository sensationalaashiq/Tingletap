import React from 'react';
import './PremiumCopyright.css';

const DiamondSvg = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display:'block', flexShrink:0 }}>
    <defs>
      <linearGradient id="pco-dg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="50%" stopColor="#a855f7"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M10 1.5L2 7.5 10 18.5 18 7.5 10 1.5z" fill="url(#pco-dg)"/>
    <path d="M2 7.5h16" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9"/>
    <path d="M6 2L2 7.5 10 18.5 6 2z" fill="white" opacity="0.18"/>
  </svg>
);

const GlowHeartSvg = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="pco-heart-svg" style={{ display:'block', flexShrink:0 }}>
    <defs>
      <linearGradient id="pco-hg2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff6b6b"/>
        <stop offset="50%" stopColor="#ff4757"/>
        <stop offset="100%" stopColor="#c0392b"/>
      </linearGradient>
      <filter id="pco-hglow">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path
      d="M12 21S2 14.5 2 8a5 5 0 0 1 10 0 5 5 0 0 1 10 0c0 6.5-10 13-10 13z"
      fill="url(#pco-hg2)"
      filter="url(#pco-hglow)"
    />
    <path
      d="M12 21S2 14.5 2 8a5 5 0 0 1 10 0 5 5 0 0 1 10 0c0 6.5-10 13-10 13z"
      fill="#ff4757"
      opacity="0.35"
    />
    <path d="M7 9.5l2.5 2.5L14 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
  </svg>
);

const IndiaSvg = () => (
  <svg viewBox="0 0 20 14" width="22" height="15" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display:'block', flexShrink:0, borderRadius:2 }}>
    <rect width="20" height="4.67" fill="#FF9933"/>
    <rect y="4.67" width="20" height="4.67" fill="#FFFFFF"/>
    <rect y="9.33" width="20" height="4.67" fill="#138808"/>
    <circle cx="10" cy="7" r="1.8" fill="none" stroke="#000080" strokeWidth="0.7"/>
    <circle cx="10" cy="7" r="0.5" fill="#000080"/>
  </svg>
);

const PremiumCopyright = () => (
  <div className="pco-root">
    <div className="pco-inner">
      <div className="pco-top-row">
        <DiamondSvg />
        <span className="pco-year">© 2026</span>
        <span className="pco-brand">TingleTap™</span>
        <span className="pco-sep">·</span>
        <span className="pco-rights">All Rights Reserved</span>
      </div>
      <div className="pco-bottom-row">
        <span className="pco-craft-text">Crafted with</span>
        <GlowHeartSvg />
        <span className="pco-craft-text">by</span>
        <span className="pco-adrashtra">Adrashtra Inc.</span>
      </div>
      <div className="pco-india-row">
        <IndiaSvg />
        <span className="pco-india-text">Developed in India</span>
        <span className="pco-india-sep">·</span>
        <GlowHeartSvg />
        <span className="pco-india-text">Loved by India</span>
      </div>
    </div>
  </div>
);

export default PremiumCopyright;
