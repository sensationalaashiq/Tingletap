import React from 'react';
import './PremiumCopyright.css';

const DiamondSvg = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display:'block', flexShrink:0 }}>
    <defs>
      <linearGradient id="pco-dg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M9 1.5L1.5 7 9 16.5 16.5 7 9 1.5z" fill="url(#pco-dg)"/>
    <path d="M1.5 7h15" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
  </svg>
);

const HeartSvg = () => (
  <svg viewBox="0 0 14 14" width="13" height="13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display:'block', flexShrink:0 }}>
    <defs>
      <linearGradient id="pco-hg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f9a8d4"/>
        <stop offset="100%" stopColor="#a78bfa"/>
      </linearGradient>
    </defs>
    <path d="M7 12S1.5 8.5 1.5 5a3.2 3.2 0 0 1 5.5-2.2A3.2 3.2 0 0 1 12.5 5C12.5 8.5 7 12 7 12z" fill="url(#pco-hg)"/>
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
        <HeartSvg />
        <span className="pco-craft-text">by</span>
        <span className="pco-adrashtra">Adrashtra Inc.</span>
      </div>
    </div>
  </div>
);

export default PremiumCopyright;
