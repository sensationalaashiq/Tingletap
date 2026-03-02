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

    // Audio context fingerprint
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const analyser = context.createAnalyser();
        const gainNode = context.createGain();
        const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

        gainNode.gain.value = 0;
        oscillator.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(0);
        const audioFingerprint = analyser.frequencyBinCount.toString();
        components.push(audioFingerprint);
        
        oscillator.stop();
        context.close();
      }
    } catch (e) {
      components.push('audio-error');
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
      
      // Device
      deviceType: this.getDeviceType(),
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
