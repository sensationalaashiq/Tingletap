
// Security Configuration
export const SECURITY_CONFIG = {
  // VPN Detection Settings (Abstract API)
  VPN_DETECTION: {
    enabled: true, // Set to false to disable VPN detection
    strictMode: true, // If true, blocks even low-confidence VPN detections
    cacheTimeout: 5 * 60 * 1000, // 5 minutes cache
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
  },
  
  // Whitelisted IPs (never blocked)
  WHITELIST_IPS: [
    // Add specific IPs that should never be blocked
    // '192.168.1.1',
    // '10.0.0.1'
  ],

  // Known VPN IP ranges to block (minimal - Abstract API handles most detection)
  BLOCKED_VPN_RANGES: [
    // Add specific known problematic ranges if needed
  ],
  
  // Whitelisted countries (ISO country codes)
  WHITELIST_COUNTRIES: [
    // Add country codes that should have relaxed VPN detection
    // 'US', 'CA', 'GB', 'DE', 'FR'
  ],
  
  // Admin override (for testing)
  ADMIN_BYPASS: {
    enabled: false, // Set to true for testing
    password: 'admin123' // Change this for security
  }
};

// Helper function to check if IP is whitelisted
export const isWhitelistedIP = (ip) => {
  return SECURITY_CONFIG.WHITELIST_IPS.includes(ip);
};

// Helper function to check if country is whitelisted
export const isWhitelistedCountry = (countryCode) => {
  return SECURITY_CONFIG.WHITELIST_COUNTRIES.includes(countryCode);
};

// Helper function to check if IP is in blocked VPN ranges (simplified)
export const isBlockedVPNRange = (ip) => {
  return SECURITY_CONFIG.BLOCKED_VPN_RANGES.some(range => ip.startsWith(range));
};
