/**
 * linkifyText — Premium URL → styled link chip renderer
 * Parses text, finds URLs, wraps them in a luxury lavender chip <a> tag.
 * Import: import renderTextWithLinks from '../utils/linkifyText';
 */
import React from 'react';
import './linkifyText.css';

/* Matches http/https URLs and www. domains */
const URL_REGEX = /(?:https?:\/\/(?:[^\s<>"'()\[\]{}\\^`]+[^\s<>"'()\[\]{}\\^`.,;:!?])|www\.(?:[^\s<>"'()\[\]{}\\^`]+[^\s<>"'()\[\]{}\\^`.,;:!?]))/gi;

const LinkExternalIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="15 3 21 3 21 9"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="10" y1="14" x2="21" y2="3"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

const LinkChainIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PremiumLink = ({ href, display }) => {
  const safeHref = /^https?:\/\//i.test(href) ? href : 'https://' + href;
  /* Trim display if very long */
  const label = display.replace(/^https?:\/\//, '').replace(/^www\./, '');
  const shortLabel = label.length > 38 ? label.slice(0, 35) + '…' : label;

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="lfy-chip"
      title={safeHref}
      onClick={e => e.stopPropagation()}
    >
      <span className="lfy-chain"><LinkChainIcon /></span>
      <span className="lfy-label">{shortLabel}</span>
      <span className="lfy-ext"><LinkExternalIcon /></span>
    </a>
  );
};

/**
 * Splits `text` into plain strings + <PremiumLink> elements.
 * Returns an array (or plain string if no URLs found).
 */
const renderTextWithLinks = (text, opts = {}) => {
  if (!text || typeof text !== 'string') return text ?? null;

  const parts = [];
  let lastIndex = 0;
  let match;
  const re = new RegExp(URL_REGEX.source, 'gi');

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const raw = match[0];
    parts.push(
      <PremiumLink
        key={`lfy-${match.index}`}
        href={raw}
        display={raw}
      />
    );
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

export default renderTextWithLinks;
