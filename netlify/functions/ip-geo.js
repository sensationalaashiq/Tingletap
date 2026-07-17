// netlify/functions/ip-geo.js
// Server-side IP Geolocation using Abstract API.
// Never exposes ABSTRACT_API_KEY to the client.
//
// GET ?ip=<ipv4>  →  { country, city, region, lat, lon, timezone, isp, asn, org, connection_type }
// Used by: Admin Panel (live IP geo lookup), App.jsx (store geo on login)

const IPv4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IPv6_RE = /^[0-9a-fA-F:]+$/;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function jsonResp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

async function fallbackGeo(ip) {
  // ip-api.com only supports IPv4 on free tier
  const ipv4 = IPv4_RE.test(ip);
  if (!ipv4) return jsonResp({ ip, _error: 'geo_unavailable_ipv6' });
  try {
    const fb = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon,timezone,isp,org,as`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (fb.ok) {
      const fd = await fb.json();
      if (fd.status === 'success') {
        return jsonResp({
          ip,
          country:         fd.country     || null,
          country_code:    fd.countryCode || null,
          region:          fd.regionName  || null,
          city:            fd.city        || null,
          lat:             fd.lat         ?? null,
          lon:             fd.lon         ?? null,
          timezone:        fd.timezone    || null,
          isp:             fd.isp         || null,
          asn:             fd.as          || null,
          organization:    fd.org         || null,
          connection_type: null,
          _source: 'fallback',
        });
      }
    }
  } catch (err) {
    console.error('[ip-geo] Fallback error:', err.message);
  }
  return jsonResp({ ip, _error: 'geo_unavailable' });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return jsonResp({ error: 'Method not allowed' }, 405);

  // ── FIX C-03: Require a valid Firebase ID token (any authenticated user).
  // This prevents unauthenticated enumeration of IP geolocation data and
  // exhaustion of the ABSTRACT_API_KEY quota.
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return jsonResp({ error: 'Unauthorized — Bearer token required' }, 401);
  }
  try {
    const { verifyToken } = await import('./shared/firestoreAdmin.js');
    const auth = await verifyToken(token, null); // any authenticated user
    if (!auth.ok) {
      return jsonResp({ error: 'Forbidden', detail: auth.err }, 403);
    }
  } catch (e) {
    return jsonResp({ error: 'Auth check failed', detail: e.message }, 500);
  }

  const ip = (event.queryStringParameters?.ip || '').trim();
  const isIPv4 = IPv4_RE.test(ip);
  const isIPv6 = !isIPv4 && IPv6_RE.test(ip) && ip.includes(':');
  if (!ip || (!isIPv4 && !isIPv6)) return jsonResp({ error: 'Valid IP address required as ?ip= param' }, 400);

  const apiKey = process.env.ABSTRACT_API_KEY;
  if (!apiKey) {
    console.warn('[ip-geo] ABSTRACT_API_KEY not set — using fallback');
    return await fallbackGeo(ip);
  }

  try {
    const url =
      `https://ipgeolocation.abstractapi.com/v1/` +
      `?api_key=${encodeURIComponent(apiKey)}` +
      `&ip_address=${encodeURIComponent(ip)}` +
      `&fields=ip_address,city,region,country,country_code,latitude,longitude,timezone,connection`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });

    if (resp.ok) {
      const data = await resp.json();
      const conn = data.connection || {};

      return jsonResp({
        ip,
        country:         data.country      || null,
        country_code:    data.country_code || null,
        region:          data.region       || null,
        city:            data.city         || null,
        lat:             data.latitude     ?? null,
        lon:             data.longitude    ?? null,
        timezone:        data.timezone?.name || null,
        isp:             conn.isp_name || conn.isp || null,
        asn:             conn.autonomous_system_number || null,
        organization:    conn.autonomous_system_organization || conn.organization || null,
        connection_type: conn.connection_type || null,
        _source: 'abstract',
      });
    }

    console.warn(`[ip-geo] Abstract API ${resp.status} — using fallback`);
  } catch (err) {
    console.error('[ip-geo] Abstract API error:', err.message);
  }

  return await fallbackGeo(ip);
};
