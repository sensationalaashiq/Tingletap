// src/utils/vpnDetection.js
// Client-side VPN/Proxy/Tor/Datacenter detection.
// API key NEVER touches the client — all Abstract API calls go through the
// Netlify Function proxy at /.netlify/functions/vpn-check.

import { SECURITY_CONFIG, isWhitelistedIP, isWhitelistedCountry } from '../config/security.js';

// ─── IP resolution ───────────────────────────────────────────────────────────
const IP_SERVICES = [
  { url: 'https://api.ipify.org?format=json', key: 'ip' },
  { url: 'https://api.myip.com',              key: 'ip' },
  { url: 'https://ipapi.co/json/',            key: 'ip' },
];

const IPv4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

async function getUserIP() {
  for (const { url, key } of IP_SERVICES) {
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 3000);
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!resp.ok) continue;
      const data = await resp.json();
      const ip   = data[key] || data.ip_address || data.query;
      if (ip && IPv4_RE.test(ip)) return ip;
    } catch { /* try next */ }
  }
  return null;
}

// ─── Browser / device fingerprint helpers ────────────────────────────────────
function getBrowserInfo() {
  const ua = navigator.userAgent || '';
  let browser = 'Unknown';
  if (ua.includes('Firefox'))        browser = 'Firefox';
  else if (ua.includes('Edg/'))      browser = 'Edge';
  else if (ua.includes('OPR/'))      browser = 'Opera';
  else if (ua.includes('Chrome'))    browser = 'Chrome';
  else if (ua.includes('Safari'))    browser = 'Safari';

  let deviceType = 'Desktop';
  if (/Mobi|Android/i.test(ua))      deviceType = 'Mobile';
  else if (/Tablet|iPad/i.test(ua))  deviceType = 'Tablet';

  return { browser, deviceType, userAgent: ua, platform: navigator.platform || 'Unknown' };
}

// ─── Server-side check (Netlify Function proxy) ──────────────────────────────
async function callVPNServer(ip, userContext = null) {
  const fnBase = '/.netlify/functions/vpn-check';

  try {
    let resp;

    if (userContext) {
      // POST — includes user context for server-side Firestore logging
      resp = await fetch(fnBase, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ip, ...userContext }),
        signal:  AbortSignal.timeout(10000),
      });
    } else {
      // GET — anonymous / pre-auth check
      resp = await fetch(`${fnBase}?ip=${encodeURIComponent(ip)}`, {
        signal: AbortSignal.timeout(10000),
      });
    }

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();

  } catch (err) {
    // Netlify Function unavailable in dev / network error — fail open
    console.warn('[VPNCheck] Server proxy unavailable:', err.message);
    return { allowed: true, blocked: false, _error: 'api_unavailable' };
  }
}

// ─── In-memory cache (45-minute TTL) ─────────────────────────────────────────
const cache      = new Map();
const CACHE_TTL  = 45 * 60 * 1000; // 45 minutes

function getCached(ip) {
  const entry = cache.get(ip);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.result;
  cache.delete(ip);
  return null;
}
function setCache(ip, result) {
  cache.set(ip, { result, ts: Date.now() });
}

// ─── Periodic check ──────────────────────────────────────────────────────────
let _periodicTimer = null;

export const startPeriodicVPNCheck = (onBlocked) => {
  if (_periodicTimer) clearInterval(_periodicTimer);
  _periodicTimer = setInterval(async () => {
    // Clear cache so the periodic check always hits the server
    const ip = await getUserIP();
    if (ip) cache.delete(ip);
    const result = await checkUserVPN();
    if (!result.allowed) onBlocked(result);
  }, 10 * 60 * 1000); // every 10 minutes
};

export const stopPeriodicVPNCheck = () => {
  if (_periodicTimer) { clearInterval(_periodicTimer); _periodicTimer = null; }
};

// ─── Main exported check ─────────────────────────────────────────────────────
/**
 * @param {object|null} userContext  Optional — { uid, email, username } for
 *   server-side logging. Pass null / omit for pre-auth / guest checks.
 */
export const checkUserVPN = async (userContext = null) => {
  try {
    // Admin bypass (dev only)
    if (SECURITY_CONFIG.ADMIN_BYPASS.enabled && localStorage.getItem('vpn_bypass') === 'true') {
      return { allowed: true, reason: 'Admin bypass' };
    }

    // Detection globally disabled
    if (!SECURITY_CONFIG.VPN_DETECTION.enabled) {
      return { allowed: true, reason: 'VPN detection disabled' };
    }

    const ip = await getUserIP();
    if (!ip) {
      console.warn('[VPNCheck] Could not determine public IP — failing open');
      return { allowed: true, reason: 'IP resolution failed' };
    }

    // Whitelisted IP
    if (isWhitelistedIP(ip)) {
      return { allowed: true, reason: 'Whitelisted IP', ip };
    }

    // Cache hit (only for anonymous checks — authenticated checks always go through
    // to ensure server-side logging happens at least once per session)
    if (!userContext) {
      const cached = getCached(ip);
      if (cached) {
        console.log('[VPNCheck] Cache hit for', ip);
        return cached;
      }
    }

    // Enrich user context with browser fingerprint
    const fullCtx = userContext
      ? { ...userContext, ...getBrowserInfo() }
      : null;

    console.log(`[VPNCheck] Checking ${ip} via Abstract API…`);
    const data = await callVPNServer(ip, fullCtx);

    // API unavailable → fail open
    if (data._error === 'api_unavailable' || data._skipped) {
      console.warn('[VPNCheck] API unavailable — allowing access (fail open)');
      return { allowed: true, reason: 'Verification temporarily unavailable', ip, _unavailable: true };
    }

    // Country whitelist
    if (data.country_code && isWhitelistedCountry(data.country_code)) {
      const result = { allowed: true, reason: 'Whitelisted country', ip, country: data.country_code };
      setCache(ip, result);
      return result;
    }

    // Blocking decision — strict: block VPN | Proxy | Tor | Relay | Hosting
    const isBlocked =
      data.is_vpn     ||
      data.is_proxy   ||
      data.is_tor     ||
      data.is_relay   ||
      data.is_hosting ||
      false;

    const result = {
      allowed:    !isBlocked,
      blocked:    isBlocked,
      ip,
      reason:     data.reason || (isBlocked ? 'VPN/Proxy/Tor/Datacenter detected' : 'Clean IP'),
      is_vpn:     data.is_vpn,
      is_proxy:   data.is_proxy,
      is_tor:     data.is_tor,
      is_relay:   data.is_relay,
      is_hosting: data.is_hosting,
      country:    data.country,
      city:       data.city,
      isp:        data.isp,
      organization: data.organization,
    };

    setCache(ip, result);
    console.log('[VPNCheck] Result:', result);
    return result;

  } catch (err) {
    console.error('[VPNCheck] Unexpected error:', err);
    return { allowed: true, reason: 'Check error — failing open', _error: err.message };
  }
};

// Legacy export kept for backward compatibility
export class VPNDetector {
  static async checkIP(ip) { return callVPNServer(ip, null); }
  static async getUserIP()  { return getUserIP(); }
  static isValidIP(ip)      { return IPv4_RE.test(ip); }
}
