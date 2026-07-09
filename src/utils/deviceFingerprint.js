/**
 * Device Fingerprinting System
 * Generates unique device identifiers and collects device information
 */

export class DeviceFingerprint {
  /**
   * Generate a unique device fingerprint
   */
  static async generateFingerprint() {
    const components = [];

    // Browser information
    components.push(navigator.userAgent || '');
    components.push(navigator.language || '');
    components.push(navigator.languages?.join(',') || '');
    components.push(navigator.platform || '');
    components.push(navigator.hardwareConcurrency || 0);
    components.push(navigator.deviceMemory || 0);
    components.push(navigator.maxTouchPoints || 0);

    // Screen information
    components.push(screen.width || 0);
    components.push(screen.height || 0);
    components.push(screen.colorDepth || 0);
    components.push(screen.pixelDepth || 0);
    components.push(window.devicePixelRatio || 0);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');

    // Canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 100, 50);
      ctx.fillStyle = '#069';
      ctx.fillText('TingleTap 🔒', 2, 15);
      components.push(canvas.toDataURL());
    }

    // WebGL fingerprint
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      }
    }

    // Audio fingerprint (passive only — no AudioContext to avoid browser notifications)
    try {
      components.push(navigator.cookieEnabled ? 'cookies-on' : 'cookies-off');
      components.push(window.indexedDB ? 'idb-on' : 'idb-off');
      components.push(window.localStorage ? 'ls-on' : 'ls-off');
    } catch (e) {
      components.push('storage-error');
    }

    // Generate hash
    const fingerprint = await this.hashString(components.join('|'));
    return fingerprint;
  }

  /**
   * Hash a string using SubtleCrypto API
   */
  static async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Get detailed device information
   */
  static getDeviceInfo() {
    return {
      // Browser
      userAgent: navigator.userAgent || 'Unknown',
      browser: this.getBrowserInfo(),
      language: navigator.language || 'Unknown',
      languages: navigator.languages || [],
      
      // Operating System
      platform: navigator.platform || 'Unknown',
      os: this.getOSInfo(),
      
      // Device — deviceModel is stored so Admin Panel always has the real name
      deviceType: this.getDeviceType(),
      deviceModel: this.getDeviceModel(),
      isMobile: /Mobi|Android/i.test(navigator.userAgent),
      isTablet: /Tablet|iPad/i.test(navigator.userAgent),
      
      // Hardware
      cores: navigator.hardwareConcurrency || 0,
      memory: navigator.deviceMemory || 0,
      touchPoints: navigator.maxTouchPoints || 0,
      
      // Screen
      screenWidth: screen.width || 0,
      screenHeight: screen.height || 0,
      colorDepth: screen.colorDepth || 0,
      pixelRatio: window.devicePixelRatio || 1,
      
      // Other
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Detect the real device brand + model from the User-Agent string.
   * Covers all major Indian Android brands: Oppo, Vivo, Realme, Xiaomi,
   * Redmi, POCO, Samsung, OnePlus, Motorola, Nokia, Nothing, Infinix, Tecno.
   */
  static getDeviceModel() {
    const ua = navigator.userAgent;
    return DeviceFingerprint._parseDeviceModel(ua);
  }

  /**
   * Async version — uses User-Agent Client Hints (navigator.userAgentData) when
   * available to get the real device model even when Chrome sends the reduced UA
   * string (model = "K") for Android privacy. Falls back to _parseDeviceModel.
   */
  static async getDeviceModelAsync() {
    const ua = navigator.userAgent;
    // Check if UA would return a reduced/useless model
    const syncModel = DeviceFingerprint._parseDeviceModel(ua);

    // Try Client Hints API (Chrome 90+ on Android)
    if (navigator.userAgentData?.getHighEntropyValues) {
      try {
        const hints = await navigator.userAgentData.getHighEntropyValues([
          'model', 'platform', 'platformVersion'
        ]);
        if (hints.model && hints.model.trim() && hints.model !== 'K') {
          // Got real model from Client Hints
          const model = hints.model.trim();
          const platform = hints.platform || '';
          // Prefix brand if recognisable and not already in model string
          const knownBrands = ['Samsung','Xiaomi','Redmi','POCO','Realme','OPPO','Vivo','OnePlus','Motorola','Nokia','Nothing','Infinix','Tecno','itel','Huawei','Honor'];
          const hasBrand = knownBrands.some(b => model.toLowerCase().startsWith(b.toLowerCase()));
          if (!hasBrand && platform === 'Android') {
            // Try to read brand from UA brands list
            const brandObj = navigator.userAgentData?.brands?.find(b =>
              !b.brand.includes('Not') && b.brand !== 'Chromium' && b.brand !== 'Google Chrome'
            );
            const brand = brandObj?.brand || '';
            return brand ? `${brand} ${model}` : model;
          }
          return model;
        }
      } catch {}
    }

    // If sync model came back as just "K" or a single letter (Chrome reduced UA),
    // return a friendlier label using the brand from userAgentData if available.
    if (syncModel === 'K' || (syncModel.length <= 2 && /^[A-Z]$/.test(syncModel))) {
      const brandObj = navigator.userAgentData?.brands?.find(b =>
        !b.brand.includes('Not') && b.brand !== 'Chromium' && b.brand !== 'Google Chrome'
      );
      if (brandObj?.brand) return `Android (${brandObj.brand})`;
      return 'Android Device';
    }

    return syncModel;
  }

  /**
   * Shared UA parser used by getDeviceModel() and by the Admin Panel
   * fallback path (exported via DeviceFingerprint.parseDeviceModel).
   */
  static _parseDeviceModel(ua) {
    if (!ua || ua === 'Unknown') return 'Unknown Device';

    // ── Apple ──────────────────────────────────────────────────────────
    if (/iPhone/i.test(ua)) {
      const v = ua.match(/CPU iPhone OS ([\d_]+)/);
      return v ? `iPhone (iOS ${v[1].replace(/_/g, '.')})` : 'Apple iPhone';
    }
    if (/iPad/i.test(ua)) {
      const v = ua.match(/CPU OS ([\d_]+)/);
      return v ? `iPad (iPadOS ${v[1].replace(/_/g, '.')})` : 'Apple iPad';
    }

    // ── Android — extract raw model string first ────────────────────────
    // Standard format: (Linux; Android X.Y; MODEL_STRING) AppleWebKit/...
    const am = ua.match(/Android\s[\d.]+;\s([^)]+)\)/i);
    if (am) {
      // Strip trailing Build/xxx, wv, etc.
      let raw = am[1].split(/\s+Build\//i)[0].split(';')[0].trim();

      // ── Samsung ──────────────────────────────────────────────────────
      // UA: SM-A546B, SM-G991B, SM-S911B, etc.
      if (/^SM-/i.test(raw) || /SM-[A-Z0-9]+/i.test(ua)) {
        const code = ua.match(/SM-([A-Z0-9]+)/i);
        return code ? `Samsung SM-${code[1]}` : 'Samsung Galaxy';
      }
      // Older Samsung Galaxy Note/S series written out
      if (/Samsung/i.test(raw)) return raw;

      // ── Xiaomi / Redmi / POCO ─────────────────────────────────────────
      // UA: "Redmi Note 12", "POCO M4 Pro", "Xiaomi 13 Pro", "2201116TG"
      if (/Redmi/i.test(ua)) {
        // Return brand + human model if present, or just brand
        if (/Redmi/i.test(raw) && !/^[A-Z0-9]{6,}$/i.test(raw)) return raw; // "Redmi Note 12"
        return 'Redmi';
      }
      if (/POCO/i.test(ua)) {
        if (/POCO/i.test(raw) && !/^[A-Z0-9]{6,}$/i.test(raw)) return raw; // "POCO M4 Pro"
        return 'POCO';
      }
      if (/Xiaomi/i.test(ua)) {
        if (/Xiaomi/i.test(raw) && !/^[A-Z0-9]{6,}$/i.test(raw)) return raw; // "Xiaomi 13 Pro"
        return 'Xiaomi';
      }

      // ── Oppo ─────────────────────────────────────────────────────────
      // Branded: "OPPO A54", "OPPO Reno8"
      // Unbranded codes: CPH2269, CPH2395, etc. (ColorOS Phone Handset)
      if (/^OPPO /i.test(raw)) return raw;
      if (/OPPO/i.test(ua)) return raw ? `OPPO ${raw}` : 'OPPO Device';
      if (/^CPH\d+/i.test(raw)) return `OPPO ${raw}`;  // CPH = Oppo model codes

      // ── Vivo ──────────────────────────────────────────────────────────
      // "vivo V23", "vivo Y20G", raw code "V2109", "V2307", "Y16"
      if (/^vivo /i.test(raw)) return raw;
      if (/vivo/i.test(ua)) return raw ? `vivo ${raw}` : 'Vivo Device';
      // Vivo model codes: V####, Y###, X### — need to distinguish from others
      if (/^(V|Y|X)\d{2,4}[A-Z]?$/i.test(raw) && !/OnePlus/i.test(ua)) {
        return `Vivo ${raw}`;
      }

      // ── Realme ────────────────────────────────────────────────────────
      // "realme C35", "realme 9 Pro", RMX3511, RMX2202
      if (/^realme /i.test(raw)) return raw;
      if (/realme/i.test(ua)) return raw ? `Realme ${raw}` : 'Realme Device';
      if (/^RMX\d+/i.test(raw)) return `Realme ${raw}`;

      // ── OnePlus ───────────────────────────────────────────────────────
      // "OnePlus 9 Pro", "OnePlus Nord CE 2"
      if (/OnePlus/i.test(raw) || /OnePlus/i.test(ua)) {
        return raw && /OnePlus/i.test(raw) ? raw : `OnePlus ${raw || ''}`.trim();
      }

      // ── Nothing Phone ─────────────────────────────────────────────────
      // Model code "A063", "A065"
      if (/Nothing|^A06[0-9]/i.test(raw) || /Nothing/i.test(ua)) {
        return raw ? `Nothing Phone (${raw})` : 'Nothing Phone';
      }

      // ── Huawei / Honor ────────────────────────────────────────────────
      if (/HUAWEI|Honor/i.test(raw) || /HUAWEI|ELE-|CLT-|JSN-|HWI-/i.test(ua)) {
        return raw || 'Huawei Device';
      }

      // ── Motorola ──────────────────────────────────────────────────────
      // "moto g82 5G", "motorola edge 30"
      if (/^moto|^motorola/i.test(raw) || /motorola/i.test(ua)) {
        return raw || 'Motorola Device';
      }

      // ── Nokia ─────────────────────────────────────────────────────────
      if (/Nokia/i.test(raw) || /Nokia/i.test(ua)) return raw || 'Nokia Device';

      // ── Infinix ───────────────────────────────────────────────────────
      if (/Infinix/i.test(raw) || /Infinix/i.test(ua)) return raw || 'Infinix Device';

      // ── Tecno ─────────────────────────────────────────────────────────
      if (/Tecno/i.test(raw) || /Tecno/i.test(ua)) return raw || 'Tecno Device';

      // ── Itel ──────────────────────────────────────────────────────────
      if (/itel/i.test(raw) || /itel/i.test(ua)) return raw || 'Itel Device';

      // ── Generic Android — raw model string is good enough ─────────────
      if (raw) return raw;
      return 'Android Device';
    }

    // ── Non-Android ───────────────────────────────────────────────────────
    if (/Windows NT 10\.0/i.test(ua)) return 'Windows 10 / 11 PC';
    if (/Windows NT 6\.3/i.test(ua))  return 'Windows 8.1 PC';
    if (/Windows/i.test(ua))           return 'Windows PC';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'Apple Mac / MacBook';
    if (/CrOS/i.test(ua))              return 'Chromebook';
    if (/Linux/i.test(ua))             return 'Linux PC';

    return 'Unknown Device';
  }

  /**
   * Get browser information
   */
  static getBrowserInfo() {
    const ua = navigator.userAgent;
    
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
    
    return 'Unknown';
  }

  /**
   * Get operating system information
   */
  static getOSInfo() {
    const ua = navigator.userAgent;
    
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    
    return 'Unknown';
  }

  /**
   * Get device type
   */
  static getDeviceType() {
    const ua = navigator.userAgent;
    
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    
    return 'Desktop';
  }

  /**
   * Get device session info
   */
  static getSessionInfo() {
    return {
      sessionStart: new Date().toISOString(),
      referrer: document.referrer || 'Direct',
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'Not specified',
      online: navigator.onLine
    };
  }

  /**
   * Get complete device profile
   */
  static async getDeviceProfile() {
    const fingerprint = await this.generateFingerprint();
    const deviceInfo = this.getDeviceInfo();
    const sessionInfo = this.getSessionInfo();

    return {
      deviceId: fingerprint,
      ...deviceInfo,
      ...sessionInfo
    };
  }
}

export default DeviceFingerprint;
