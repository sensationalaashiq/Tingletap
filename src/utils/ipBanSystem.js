import { db, auth } from '../firebase/config';
import { collection, addDoc, query, where, limit, getDocs, deleteDoc, doc, updateDoc, onSnapshot, getDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { VPNDetector } from './vpnDetection';

/**
 * IP Ban System Utility
 * Handles IP-based banning and access control
 */
export class IPBanSystem {
  static bannedIPs = new Set();
  static initialized = false;
  static _unsubscribe = null;

  /**
   * Initialize the IP ban system with real-time updates
   */
  static async initialize() {
    if (this.initialized) return;
    this.initialized = true; // mark immediately to prevent duplicate auth-gate setups

    try {
      // FIX: bannedIPs Firestore rule requires auth != null — only attach the
      // listener once a user is authenticated, and tear it down on logout.
      // This preserves identical behavior (the read was denied pre-auth anyway)
      // while removing noisy permission-denied console errors on app load.
      this._authUnsubscribe = onAuthStateChanged(auth, (user) => {
        if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }
        if (!user) { this.bannedIPs.clear(); return; }

        const bannedIPsQuery = query(collection(db, 'bannedIPs'), limit(500));
        this._unsubscribe = onSnapshot(bannedIPsQuery, (snapshot) => {
          this.bannedIPs.clear();
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.ip && data.isActive !== false) {
              this.bannedIPs.add(data.ip);
            }
          });
          console.log('IP Ban System: Updated banned IPs list', this.bannedIPs.size, 'IPs banned');
        }, (err) => {
          if (err?.code !== 'permission-denied') {
            console.error('IP Ban System: listener error', err);
          }
        });
      });

      console.log('IP Ban System: Initialized successfully');
    } catch (error) {
      console.error('IP Ban System: Failed to initialize', error);
    }
  }

  static cleanup() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._authUnsubscribe) {
      this._authUnsubscribe();
      this._authUnsubscribe = null;
    }
    this.initialized = false;
  }

  /**
   * Get user's real IP address
   */
  static async getUserIP() {
    try {
      const ipData = await VPNDetector.getUserIP();
      return ipData?.ip || null;
    } catch (error) {
      console.error('IP Ban System: Failed to get user IP', error);
      return null;
    }
  }

  /**
   * Check if an IP address is banned
   */
  static async isIPBanned(ip) {
    if (!ip) return false;

    // Ensure system is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Check local cache first
    if (this.bannedIPs.has(ip)) {
      console.log('IP Ban System: IP is banned (cached)', ip);
      return true;
    }

    // Double-check with database for accuracy
    try {
      const bannedIPsQuery = query(
        collection(db, 'bannedIPs'),
        where('ip', '==', ip),
        where('isActive', '!=', false)
      );
      const snapshot = await getDocs(bannedIPsQuery);
      const isBanned = !snapshot.empty;
      
      if (isBanned) {
        this.bannedIPs.add(ip); // Update cache
        console.log('IP Ban System: IP is banned (database)', ip);
      }
      
      return isBanned;
    } catch (error) {
      console.error('IP Ban System: Error checking IP ban status', error);
      return false;
    }
  }

  /**
   * Ban an IP address with metadata
   */
  static async banIP(ipAddress, banInfo = {}) {
    if (!ipAddress) {
      throw new Error('IP address is required');
    }

    try {
      // Check if IP is already banned
      const existingBan = await this.getIPBanInfo(ipAddress);
      if (existingBan) {
        console.log('IP Ban System: IP already banned', ipAddress);
        return existingBan;
      }

      const banData = {
        ip: ipAddress,
        bannedAt: new Date().toISOString(),
        bannedBy: banInfo.bannedBy || 'System',
        reason: banInfo.reason || 'User account banned',
        userInfo: banInfo.userInfo || null,
        isActive: true,
        banType: 'ip_ban',
        userAgent: banInfo.userAgent || null,
        location: banInfo.location || null,
        country: banInfo.country || null,
        associatedUIDs: banInfo.associatedUIDs || []
      };

      const docRef = await addDoc(collection(db, 'bannedIPs'), banData);
      
      // Update local cache
      this.bannedIPs.add(ipAddress);
      
      console.log('IP Ban System: IP banned successfully', ipAddress, docRef.id);
      return { id: docRef.id, ...banData };
    } catch (error) {
      console.error('IP Ban System: Failed to ban IP', error);
      throw error;
    }
  }

  /**
   * Unban an IP address
   */
  static async unbanIP(ipAddress) {
    if (!ipAddress) {
      throw new Error('IP address is required');
    }

    try {
      const bannedIPsQuery = query(
        collection(db, 'bannedIPs'),
        where('ip', '==', ipAddress),
        where('isActive', '!=', false)
      );
      
      const snapshot = await getDocs(bannedIPsQuery);
      
      if (snapshot.empty) {
        console.log('IP Ban System: IP not found in ban list', ipAddress);
        return false;
      }

      // Update all ban records for this IP to inactive
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { 
          isActive: false, 
          unbannedAt: new Date().toISOString() 
        })
      );
      
      await Promise.all(updatePromises);
      
      // Remove from local cache
      this.bannedIPs.delete(ipAddress);
      
      console.log('IP Ban System: IP unbanned successfully', ipAddress);
      return true;
    } catch (error) {
      console.error('IP Ban System: Failed to unban IP', error);
      throw error;
    }
  }

  /**
   * Get IP ban information
   */
  static async getIPBanInfo(ipAddress) {
    try {
      const bannedIPsQuery = query(
        collection(db, 'bannedIPs'),
        where('ip', '==', ipAddress),
        where('isActive', '!=', false)
      );
      
      const snapshot = await getDocs(bannedIPsQuery);
      
      if (snapshot.empty) {
        return null;
      }
      
      const banDoc = snapshot.docs[0];
      return { id: banDoc.id, ...banDoc.data() };
    } catch (error) {
      console.error('IP Ban System: Failed to get IP ban info', error);
      return null;
    }
  }

  /**
   * Get all banned IPs with pagination
   */
  static async getAllBannedIPs(limit = 100) {
    try {
      const bannedIPsQuery = query(
        collection(db, 'bannedIPs'),
        where('isActive', '!=', false)
      );
      
      const snapshot = await getDocs(bannedIPsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('IP Ban System: Failed to get banned IPs', error);
      return [];
    }
  }

  /**
   * Check user access and return block info if banned
   */
  static async checkUserAccess(userAgent = null) {
    try {
      const userIP = await this.getUserIP();
      
      if (!userIP) {
        console.warn('IP Ban System: Could not determine user IP');
        return { allowed: true, reason: 'ip_unavailable' };
      }

      const isBanned = await this.isIPBanned(userIP);
      
      if (isBanned) {
        const banInfo = await this.getIPBanInfo(userIP);
        return {
          allowed: false,
          reason: 'ip_banned',
          ip: userIP,
          banInfo: banInfo,
          message: 'Your IP address has been banned from accessing this platform.'
        };
      }

      return { 
        allowed: true, 
        ip: userIP,
        reason: 'ip_allowed' 
      };
    } catch (error) {
      console.error('IP Ban System: Error checking user access', error);
      // Allow access on error to prevent false blocks
      return { allowed: true, reason: 'error_allow' };
    }
  }

  /**
   * Store user IP history for later IP banning
   */
  static async storeUserIP(userUID, userData = {}) {
    try {
      const userIP = await this.getUserIP();
      if (!userIP) return null;

      // Store IP in user document for future IP banning
      const userRef = doc(db, 'users', userUID);
      await updateDoc(userRef, {
        lastIP: userIP,
        lastIPUpdate: new Date().toISOString(),
        ipHistory: arrayUnion(userIP)
      });

      console.log('IP Ban System: Stored IP for user', userUID, userIP);
      return userIP;
    } catch (error) {
      console.error('IP Ban System: Failed to store user IP', error);
      return null;
    }
  }

  /**
   * Get user's known IP addresses from their history
   */
  static async getUserIPs(userUID) {
    try {
      const userRef = doc(db, 'users', userUID);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return [];
      }
      
      const userData = userDoc.data();
      const knownIPs = [];
      
      if (userData.lastIP) {
        knownIPs.push(userData.lastIP);
      }
      
      if (userData.ipHistory && Array.isArray(userData.ipHistory)) {
        userData.ipHistory.forEach(ip => {
          if (ip && !knownIPs.includes(ip)) {
            knownIPs.push(ip);
          }
        });
      }
      
      console.log('IP Ban System: Found IPs for user', userUID, knownIPs);
      return knownIPs;
    } catch (error) {
      console.error('IP Ban System: Failed to get user IPs', error);
      return [];
    }
  }

  /**
   * Enhanced user ban that includes IP banning
   */
  static async banUserWithIP(userUID, userData, banInfo = {}) {
    try {
      const results = {
        userBanned: false,
        ipBanned: false,
        bannedIPs: [],
        errors: []
      };

      // Get user's known IP addresses
      const userIPs = await this.getUserIPs(userUID);
      
      if (userIPs.length === 0) {
        console.warn('IP Ban System: No IPs found for user', userUID);
        results.errors.push('No IP addresses found for user');
        return results;
      }

      // Ban all known IPs for this user
      for (const userIP of userIPs) {
        try {
          const enhancedBanInfo = {
            ...banInfo,
            userInfo: {
              uid: userUID,
              displayName: userData.displayName,
              email: userData.email
            },
            associatedUIDs: [userUID]
          };

          await this.banIP(userIP, enhancedBanInfo);
          results.bannedIPs.push(userIP);
          results.ipBanned = true;
          results.bannedIP = userIP; // For backwards compatibility
        } catch (error) {
          console.error('IP Ban System: Failed to ban IP', userIP, error);
          results.errors.push(`Failed to ban IP ${userIP}: ${error.message}`);
        }
      }

      console.log('IP Ban System: Banned IPs for user', userUID, results.bannedIPs);
      return results;
    } catch (error) {
      console.error('IP Ban System: Error in banUserWithIP', error);
      throw error;
    }
  }

  /**
   * Remove IP ban when user is unbanned
   */
  static async unbanUserIP(userUID) {
    try {
      // Get user's known IP addresses
      const userIPs = await this.getUserIPs(userUID);
      
      if (userIPs.length === 0) {
        console.warn('IP Ban System: No IPs found for user to unban', userUID);
        return [];
      }

      const unbannedIPs = [];

      // Unban all known IPs for this user
      for (const userIP of userIPs) {
        try {
          const wasUnbanned = await this.unbanIP(userIP);
          if (wasUnbanned) {
            unbannedIPs.push(userIP);
          }
        } catch (error) {
          console.error('IP Ban System: Failed to unban IP', userIP, error);
        }
      }

      console.log('IP Ban System: Unbanned IPs for user', userUID, unbannedIPs);
      return unbannedIPs;
    } catch (error) {
      console.error('IP Ban System: Error in unbanUserIP', error);
      throw error;
    }
  }
}

// Initialize the system when module loads
IPBanSystem.initialize().catch(console.error);

export default IPBanSystem;