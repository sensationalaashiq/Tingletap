/**
 * TingleTap — Google Analytics 4 (GA4)
 *
 * Set VITE_GA_MEASUREMENT_ID in Netlify Environment Variables.
 * Format: G-XXXXXXXXXX
 *
 * If the env var is not set, all functions are silent no-ops — no errors.
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
let _gaReady = false;

// ── Load gtag.js and initialise GA4 ──────────────────────────────────────────
export const initGA = () => {
  if (!GA_ID || _gaReady || typeof window === 'undefined') return;
  _gaReady = true;

  // Inject the Google Tag Manager script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    send_page_view: false, // We fire page_view manually on route changes
    anonymize_ip:   true,  // GDPR / privacy-friendly
  });
};

// ── Fire a page_view event (call on every route change) ───────────────────────
export const trackPageView = (path) => {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path:     path,
    page_title:    document.title,
    page_location: window.location.origin + path,
  });
};

// ── Fire a custom event ───────────────────────────────────────────────────────
export const trackEvent = (eventName, params = {}) => {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', eventName, params);
};

// ── Check if GA is active ─────────────────────────────────────────────────────
export const isGAActive = () => Boolean(GA_ID);
