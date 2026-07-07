// netlify/functions/vpn-check.js
// Server-side VPN / Proxy / Tor / Datacenter detection via Abstract API.
// API key never leaves the server.
//
// GET  ?ip=<ipv4>                          → quick check, no logging
// POST { ip, uid?, email?, username?,      → full check + Firestore security log
//        userAgent?, platform?, browser?,    when a block is detected
//        deviceType? }

import { initFirebaseAdmin } from './shared/firebaseAdmin.js';
import admin from 'firebase-admin';

const IPv4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ─── helpers ───────────────────────────────────────────────────────────────
function failOpen(extra = {}) {
  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ allowed: true, blocked: false, ...extra }),
  };
}

function jsonResp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

// ─── handler ───────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  // Parse request — GET (simple) or POST (full, with user context)
  let ip = '';
  let ctx = {};

  if (event.httpMethod === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {
      return jsonResp({ error: 'Invalid JSON body' }, 400);
    }
    ip  = (body.ip || '').trim();
    ctx = {
      uid:        body.uid        || null,
      email:      body.email      || null,
      username:   body.username   || null,
      userAgent:  body.userAgent  || null,
      platform:   body.platform   || null,
      browser:    body.browser    || null,
      deviceType: body.deviceType || null,
    };
  } else if (event.httpMethod === 'GET') {
    ip = (event.queryStringParameters?.ip || '').trim();
  } else {
    return jsonResp({ error: 'Method not allowed' }, 405);
  }

  if (!ip || !IPv4_RE.test(ip)) {
    return jsonResp({ error: 'Valid IPv4 required' }, 400);
  }

  const apiKey = process.env.ABSTRACT_API_KEY;
  if (!apiKey) {
    console.warn('[vpn-check] ABSTRACT_API_KEY not configured — skipping (fail open)');
    return failOpen({ _skipped: 'no_api_key' });
  }

  // ── Primary: Abstract API IP Geolocation + Security ──────────────────────
  let detection = { is_vpn: false, is_proxy: false, is_tor: false, is_relay: false, is_hosting: false };
  let geoData   = {};

  try {
    const url =
      `https://ipgeolocation.abstractapi.com/v1/` +
      `?api_key=${encodeURIComponent(apiKey)}` +
      `&ip_address=${encodeURIComponent(ip)}` +
      `&fields=ip_address,country,country_code,region,city,timezone,connection,security`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });

    if (resp.ok) {
      const data = await resp.json();
      const sec  = data.security   || {};
      const conn = data.connection || {};

      // Derive is_hosting from Abstract API response using multiple signals:
      //  1. Explicit security fields (is_datacenter, is_hosting, is_data_center — abstract may surface these)
      //  2. connection_type keyword matching ('hosting', 'datacenter', 'data center')
      //  3. ASN / org name keyword heuristics for known datacenter providers
      const connType = (conn.connection_type || '').toLowerCase();
      const orgName  = ((conn.autonomous_system_organization || conn.organization || '') + ' ' +
                        (conn.isp || '')).toLowerCase();

      const DATACENTER_ORG_KEYWORDS = [
        'amazon', 'aws', 'azure', 'google cloud', 'digitalocean', 'linode', 'vultr',
        'ovh', 'hetzner', 'cloudflare', 'fastly', 'akamai', 'cloudfront',
        'hosting', 'datacenter', 'data center', 'server', 'vps', 'colocation',
        'leaseweb', 'choopa', 'psychz', 'quadranet', 'multacom', 'tzulo',
        'servermania', 'serverius', 'nlayer', 'hostwinds', 'racknerd',
        'microsoft azure', 'ibm cloud', 'oracle cloud', 'alibaba',
      ];

      const isHostingFromConnType = connType.includes('hosting') || connType.includes('datacenter') || connType.includes('data center');
      const isHostingFromOrg      = DATACENTER_ORG_KEYWORDS.some(kw => orgName.includes(kw));
      const isHostingFromSecurity = !!(sec.is_datacenter || sec.is_hosting || sec.is_data_center);

      detection = {
        is_vpn:     !!sec.is_vpn,
        is_proxy:   !!sec.is_proxy,
        is_tor:     !!sec.is_tor,
        is_relay:   !!sec.is_relay,
        is_hosting: isHostingFromSecurity || isHostingFromConnType || isHostingFromOrg,
        _source: 'abstract',
      };

      geoData = {
        ip,
        country:         data.country      || null,
        country_code:    data.country_code || null,
        region:          data.region       || null,
        city:            data.city         || null,
        timezone:        data.timezone?.name || null,
        isp:             conn.isp          || null,
        asn:             conn.autonomous_system_number || null,
        organization:    conn.autonomous_system_organization || conn.organization || null,
        connection_type: conn.connection_type || null,
        risk_score:      sec.score ?? null,
      };
    } else {
      // ── Fallback: ip-api.com (free, no key needed) ────────────────────────
      console.warn(`[vpn-check] Abstract API returned ${resp.status} — trying fallback`);
      const fb = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}` +
        `?fields=status,message,country,countryCode,regionName,city,timezone,isp,org,as,proxy,hosting`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (fb.ok) {
        const fd = await fb.json();
        if (fd.status === 'success') {
          detection = {
            is_vpn:     !!fd.proxy,
            is_proxy:   !!fd.proxy,
            is_tor:     false,
            is_relay:   false,
            is_hosting: !!fd.hosting,
            _source: 'fallback',
          };
          geoData = {
            ip,
            country: fd.country || null, country_code: fd.countryCode || null,
            region: fd.regionName || null, city: fd.city || null,
            timezone: fd.timezone || null, isp: fd.isp || null,
            asn: fd.as || null, organization: fd.org || null,
            connection_type: null, risk_score: null,
          };
        }
      }

      if (!detection._source) {
        console.error('[vpn-check] Both upstream APIs failed — failing open');
        return failOpen({ _error: 'upstream_failed' });
      }
    }
  } catch (err) {
    console.error('[vpn-check] Network error:', err.message);
    return failOpen({ _error: err.message });
  }

  // ── Blocking decision ─────────────────────────────────────────────────────
  const isBlocked =
    detection.is_vpn ||
    detection.is_proxy ||
    detection.is_tor ||
    detection.is_relay ||
    detection.is_hosting;

  const reason = [
    detection.is_vpn     && 'VPN',
    detection.is_proxy   && 'Proxy',
    detection.is_tor     && 'Tor',
    detection.is_relay   && 'Relay',
    detection.is_hosting && 'Datacenter/Hosting',
  ].filter(Boolean).join(', ') || 'Clean IP';

  // ── Firestore security log (blocked attempts only, server-side, POST only) ─
  if (isBlocked && event.httpMethod === 'POST') {
    try {
      initFirebaseAdmin();
      await admin.firestore().collection('securityLogs').add({
        type:      'vpn_block',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        reason,
        // User context (null-safe)
        uid:        ctx.uid,
        email:      ctx.email,
        username:   ctx.username,
        userAgent:  ctx.userAgent,
        platform:   ctx.platform,
        browser:    ctx.browser,
        deviceType: ctx.deviceType,
        // Network intel
        ...geoData,
        is_vpn:     detection.is_vpn,
        is_proxy:   detection.is_proxy,
        is_tor:     detection.is_tor,
        is_relay:   detection.is_relay,
        is_hosting: detection.is_hosting,
        source:     detection._source,
      });
    } catch (logErr) {
      // Log failure must never affect the detection response
      console.error('[vpn-check] Firestore log failed:', logErr.message);
    }
  }

  return jsonResp({
    allowed: !isBlocked,
    blocked: isBlocked,
    reason,
    ...detection,
    ...geoData,
  });
};
