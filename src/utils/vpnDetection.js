import { SECURITY_CONFIG, isWhitelistedIP, isWhitelistedCountry } from '../config/security.js';

// Abstract API VPN Detection Utility
export class VPNDetector {
  static async checkIP(ip) {
    try {
      const apiKey = '2441a8428c694a809adfa381591efe51';
      const url = `https://ipgeolocation.abstractapi.com/v1/?api_key=${apiKey}&ip_address=${ip}`;

      console.log(`Checking VPN status for IP: ${ip} using Abstract API`);

      const response = await this.httpGetAsync(url);
      const data = JSON.parse(response);

      console.log('Abstract API VPN check:', { ip, data });

      // Check if it's a VPN/Proxy based on Abstract API response
      const isVPN = data.security?.is_vpn || 
                   data.security?.is_proxy || 
                   data.security?.is_tor || 
                   data.security?.is_relay ||
                   data.is_vpn ||
                   data.is_proxy ||
                   false;

      const confidence = isVPN ? 'high' : 'low';

      return {
        isVPN,
        confidence,
        data,
        service: 'AbstractAPI',
        country: data.country,
        city: data.city,
        isp: data.connection?.isp || data.isp,
        organization: data.connection?.organization || data.organization
      };
    } catch (error) {
      console.error('Abstract API VPN detection error:', error);
      return { isVPN: false, confidence: 'error', error: error.message };
    }
  }

  static httpGetAsync(url) {
    return new Promise((resolve, reject) => {
      const xmlHttp = new XMLHttpRequest();
      xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState === 4) {
          if (xmlHttp.status === 200) {
            resolve(xmlHttp.responseText);
          } else {
            reject(new Error(`HTTP ${xmlHttp.status}`));
          }
        }
      }
      xmlHttp.open("GET", url, true); // true for asynchronous
      xmlHttp.send(null);
    });
  }

  static async getUserIP() {
    try {
      // Get user's real IP address with proper error handling and faster timeout
      const services = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://api.myip.com'
      ];

      for (const service of services) {
        try {
          // Use AbortController for faster timeout control
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500); // Reduced to 1.5 seconds
          
          const response = await fetch(service, { 
            signal: controller.signal,
            headers: {
              'Accept': 'application/json'
            }
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          const ip = data.ip || data.query || data.ip_address;

          if (ip && this.isValidIP(ip)) {
            return ip;
          }
        } catch (error) {
          console.warn(`IP service ${service} failed:`, error);
        }
      }

      throw new Error('Could not determine IP address');
    } catch (error) {
      console.error('Failed to get user IP:', error);
      return null;
    }
  }

  static isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}

// Cache results to avoid repeated checks
const vpnCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Periodic VPN check functions
let vpnCheckInterval = null;

export const startPeriodicVPNCheck = (callback) => {
  if (vpnCheckInterval) clearInterval(vpnCheckInterval);

  vpnCheckInterval = setInterval(async () => {
    console.log('🔍 Performing periodic VPN check...');
    const result = await checkUserVPN();
    if (!result.allowed) {
      console.log('❌ VPN detected during periodic check - blocking access');
      callback(result);
    }
  }, 10 * 60 * 1000); // Check every 10 minutes
};

export const stopPeriodicVPNCheck = () => {
  if (vpnCheckInterval) {
    clearInterval(vpnCheckInterval);
    vpnCheckInterval = null;
  }
};

export const checkUserVPN = async () => {
  try {
    // Check for admin bypass
    const adminBypass = localStorage.getItem('vpn_bypass');
    if (adminBypass === 'true' && SECURITY_CONFIG.ADMIN_BYPASS.enabled) {
      console.log('Admin bypass active - allowing access');
      return { allowed: true, reason: 'Admin bypass active' };
    }

    // Check if VPN detection is enabled
    if (!SECURITY_CONFIG.VPN_DETECTION.enabled) {
      console.log('VPN detection disabled by configuration');
      return { allowed: true, reason: 'VPN detection disabled' };
    }

    const userIP = await VPNDetector.getUserIP();
    if (!userIP) {
      console.warn('Could not determine user IP for VPN check');
      return { allowed: true, reason: 'IP detection failed' };
    }

    // Check if IP is whitelisted
    if (isWhitelistedIP(userIP)) {
      console.log(`IP ${userIP} is whitelisted - allowing access`);
      return { allowed: true, reason: 'Whitelisted IP', ip: userIP };
    }

    // Check cache first
    const cacheKey = userIP;
    const cached = vpnCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached VPN result for IP:', userIP);
      return cached.result;
    }

    console.log(`Checking VPN status for IP: ${userIP} with Abstract API`);

    // Perform VPN detection using Abstract API
    const vpnResult = await VPNDetector.checkIP(userIP);

    // Check if country is whitelisted
    const countryCode = vpnResult.country;
    if (countryCode && isWhitelistedCountry(countryCode)) {
      console.log(`Country ${countryCode} is whitelisted - allowing access`);
      return { 
        allowed: true, 
        reason: 'Whitelisted country', 
        ip: userIP,
        location: `${vpnResult.city}, ${vpnResult.country}`
      };
    }

    // Determine if should be blocked based on configuration
    let isBlocked = false;

    if (SECURITY_CONFIG.VPN_DETECTION.strictMode) {
      // Strict mode: block any VPN detection
      isBlocked = vpnResult.isVPN;
    } else {
      // Normal mode: block only high-confidence VPN detections
      isBlocked = vpnResult.isVPN && vpnResult.confidence !== 'low';
    }

    const result = {
      allowed: !isBlocked,
      ip: userIP,
      vpnDetected: vpnResult.isVPN,
      confidence: vpnResult.confidence,
      detectedBy: isBlocked ? ['AbstractAPI'] : [],
      provider: vpnResult.isp || vpnResult.organization,
      location: `${vpnResult.city}, ${vpnResult.country}`,
      countryCode: countryCode,
      reason: isBlocked ? 'VPN/Proxy detected by Abstract API' : 'Clean IP',
      strictMode: SECURITY_CONFIG.VPN_DETECTION.strictMode
    };

    // Cache the result
    vpnCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    console.log('Abstract API VPN check completed:', result);
    return result;
  } catch (error) {
    console.error('VPN check failed:', error);
    return { allowed: true, reason: 'Check failed', error: error.message };
  }
};