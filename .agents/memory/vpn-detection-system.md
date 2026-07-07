---
name: VPN Detection System
description: Architecture and constraints for TingleTap's VPN/Proxy/Tor/Datacenter blocking system
---

# VPN Detection System

## Architecture
- **Server-side proxy** (`netlify/functions/vpn-check.js`): Only place ABSTRACT_API_KEY is used. Never in client.
- **Client utility** (`src/utils/vpnDetection.js`): Calls proxy, caches 45 min, blocks on is_vpn|is_proxy|is_tor|is_relay|is_hosting.
- **GET** (anonymous/pre-auth): simple check, no Firestore logging.
- **POST** (after login): includes uid/email/username/userAgent/platform/browser/deviceType; blocked attempts logged to Firestore `securityLogs` collection.

## Blocking signals
- `is_vpn`, `is_proxy`, `is_tor`, `is_relay`: from Abstract API `security` object
- `is_hosting`: derived from (1) sec.is_datacenter/is_hosting explicit fields, (2) connection_type keyword match, (3) org/ASN name heuristics (AWS, Azure, GCP, DigitalOcean, Hetzner, OVH etc.)

## Integration points in App.jsx
- **Pre-auth check** (line ~101): useEffect on mount, GET, affects all visitors including guests
- **Post-login check** (inside onAuthStateChanged after IP capture): POST with user context
- **Render order**: vpnChecking → vpnBlocked → loading → app

## Key behaviors
- Fail-open on API errors (never block due to detection failure)
- `_unavailable` state shown as "Verification Temporarily Unavailable" (separate UX from actual block)
- 45-minute client cache (keyed by IP); authenticated checks bypass cache on first login
- Periodic re-check every 10 minutes

**Why POST for authenticated users:** Server needs uid/email to write meaningful Firestore security logs.
**Why fail-open:** Better to allow a VPN user than to block a legitimate user due to API downtime.
**Why dev shows proxy unavailable:** Netlify Functions only run on Netlify, not in Replit's Vite dev server. This is correct behavior.
