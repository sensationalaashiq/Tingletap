// Netlify Function: vpn-check
// Proxy for Abstract API VPN/Proxy detection — keeps ABSTRACT_API_KEY server-side only.
// GET ?ip=<ipv4>  →  { is_vpn, is_proxy, is_tor, is_relay, ... }

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const IPv4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET')    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = (event.queryStringParameters?.ip || '').trim();
  if (!ip || !IPv4_RE.test(ip)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid IPv4 required as ?ip= param' }) };
  }

  const apiKey = process.env.ABSTRACT_API_KEY;
  if (!apiKey) {
    // Key not configured — fail open (don't block users)
    console.warn('[vpn-check] ABSTRACT_API_KEY not set — skipping VPN check');
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ is_vpn: false, is_proxy: false, is_tor: false, is_relay: false, _skipped: true }),
    };
  }

  try {
    // Primary: Abstract API — IP Geolocation + Security (VPN/Proxy/TOR detection)
    const url = `https://ipgeolocation.abstractapi.com/v1/?api_key=${encodeURIComponent(apiKey)}&ip_address=${encodeURIComponent(ip)}&fields=ip_address,country,country_code,city,connection,security`;
    let resp = await fetch(url, { signal: AbortSignal.timeout(6000) });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[vpn-check] Abstract API error ${resp.status}: ${errText}`);

      // Fallback: ip-api.com (no key required, free tier)
      const fallback = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=proxy,hosting,status`, {
        signal: AbortSignal.timeout(4000),
      });
      if (fallback.ok) {
        const fb = await fallback.json();
        const isProxy = fb.status === 'success' && (fb.proxy || fb.hosting);
        return {
          statusCode: 200,
          headers: CORS,
          body: JSON.stringify({ is_vpn: isProxy, is_proxy: isProxy, is_tor: false, is_relay: false, _source: 'fallback' }),
        };
      }

      // Both sources failed — fail open
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ is_vpn: false, is_proxy: false, is_tor: false, is_relay: false, _error: 'upstream_failed' }),
      };
    }

    const data = await resp.json();
    // Normalise Abstract API shape → { is_vpn, is_proxy, is_tor, is_relay, country, city, ... }
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        is_vpn:   data.security?.is_vpn    ?? data.is_vpn    ?? false,
        is_proxy: data.security?.is_proxy  ?? data.is_proxy  ?? false,
        is_tor:   data.security?.is_tor    ?? data.is_tor    ?? false,
        is_relay: data.security?.is_relay  ?? data.is_relay  ?? false,
        security: data.security,
        country:  data.country,
        city:     data.city,
        connection: data.connection,
        isp:      data.connection?.isp,
        organization: data.connection?.organization,
      }),
    };
  } catch (err) {
    console.error('[vpn-check] Network error:', err.message);
    // Fail open — never block users due to detection errors
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ is_vpn: false, is_proxy: false, is_tor: false, is_relay: false, _error: err.message }),
    };
  }
};
