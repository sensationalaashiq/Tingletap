import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, onSnapshot, getDoc, arrayUnion } from 'firebase/firestore';
import { DeviceFingerprint } from './deviceFingerprint';

/**
 * Device Ban System
 * Handles device-based banning and access control
 */
export class DeviceBanSystem {
  static bannedDevices = new Set();
  static initialized = false;

  /**
   * Initialize the device ban system with real-time updates
   */
  static async initialize() {
    if (this.initialized) return;

    try {
      // Listen for real-time updates to banned devices
      const bannedDevicesQuery = query(collection(db, 'bannedDevices'));
      onSnapshot(bannedDevicesQuery, (snapshot) => {
        this.bannedDevices.clear();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.deviceId && data.isActive !== false) {
            this.bannedDevices.add(data.deviceId);
          }
        });
        console.log('Device Ban System: Updated banned devices list', this.bannedDevices.size, 'devices banned');
      });

      this.initialized = true;
      console.log('Device Ban System: Initialized successfully');
    } catch (error) {
      console.error('Device Ban System: Failed to initialize', error);
    }
  }

  /**
   * Get current device fingerprint
   */
  static async getDeviceId() {
    try {
      const fingerprint = await DeviceFingerprint.generateFingerprint();
      return fingerprint;
    } catch (error) {
      console.error('Device Ban System: Failed to get device ID', error);
      return null;
    }
  }

  /**
   * Check if a device is banned
   */
  static async isDeviceBanned(deviceId) {
    if (!deviceId) return false;

    // Ensure system is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Check local cache first
    if (this.bannedDevices.has(deviceId)) {
      console.log('Device Ban System: Device is banned (cached)', deviceId);
      return true;
    }

    // Double-check with database
    try {
      const bannedDevicesQuery = query(
        collection(db, 'bannedDevices'),
        where('deviceId', '==', deviceId),
        where('isActive', '!=', false)
      );
      const snapshot = await getDocs(bannedDevicesQuery);
      const isBanned = !snapshot.empty;
      
      if (isBanned) {
        this.bannedDevices.add(deviceId);
        console.log('Device Ban System: Device is banned (database)', deviceId);
      }
      
      return isBanned;
    } catch (error) {
      console.error('Device Ban System: Error checking device ban status', error);
      return false;
    }
  }

  /**
   * Ban a device with metadata
   */
  static async banDevice(deviceId, banInfo = {}) {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }

    try {
      // Check if device is already banned
      const existingBan = await this.getDeviceBanInfo(deviceId);
      if (existingBan) {
        console.log('Device Ban System: Device already banned', deviceId);
        return existingBan;
      }

      const deviceInfo = await DeviceFingerprint.getDeviceInfo();

      const banData = {
        deviceId: deviceId,
        bannedAt: new Date().toISOString(),
        bannedBy: banInfo.bannedBy || 'System',
        reason: banInfo.reason || 'User account banned',
        userInfo: banInfo.userInfo || null,
        deviceInfo: deviceInfo,
        isActive: true,
        banType: 'device_ban',
        associatedUIDs: banInfo.associatedUIDs || []
      };

      const docRef = await addDoc(collection(db, 'bannedDevices'), banData);
      
      // Update local cache
      this.bannedDevices.add(deviceId);
      
      console.log('Device Ban System: Device banned successfully', deviceId, docRef.id);
      return { id: docRef.id, ...banData };
    } catch (error) {
      console.error('Device Ban System: Failed to ban device', error);
      throw error;
    }
  }

  /**
   * Unban a device
   */
  static async unbanDevice(deviceId) {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }

    try {
      const bannedDevicesQuery = query(
        collection(db, 'bannedDevices'),
        where('deviceId', '==', deviceId),
        where('isActive', '!=', false)
      );
      
      const snapshot = await getDocs(bannedDevicesQuery);
      
      if (snapshot.empty) {
        console.log('Device Ban System: Device not found in ban list', deviceId);
        return false;
      }

      // Update all ban records for this device to inactive
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, { 
          isActive: false, 
          unbannedAt: new Date().toISOString() 
        })
      );
      
      await Promise.all(updatePromises);
      
      // Remove from local cache
      this.bannedDevices.delete(deviceId);
      
      console.log('Device Ban System: Device unbanned successfully', deviceId);
      return true;
    } catch (error) {
      console.error('Device Ban System: Failed to unban device', error);
      throw error;
    }
  }

  /**
   * Get device ban information
   */
  static async getDeviceBanInfo(deviceId) {
    try {
      const bannedDevicesQuery = query(
        collection(db, 'bannedDevices'),
        where('deviceId', '==', deviceId),
        where('isActive', '!=', false)
      );
      
      const snapshot = await getDocs(bannedDevicesQuery);
      
      if (snapshot.empty) {
        return null;
      }
      
      const banDoc = snapshot.docs[0];
      return { id: banDoc.id, ...banDoc.data() };
    } catch (error) {
      console.error('Device Ban System: Failed to get device ban info', error);
      return null;
    }
  }

  /**
   * Get all banned devices
   */
  static async getAllBannedDevices(limit = 100) {
    try {
      const bannedDevicesQuery = query(
        collection(db, 'bannedDevices'),
        where('isActive', '!=', false)
      );
      
      const snapshot = await getDocs(bannedDevicesQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Device Ban System: Failed to get banned devices', error);
      return [];
    }
  }

  /**
   * Check device access
   */
  static async checkDeviceAccess() {
    try {
      const deviceId = await this.getDeviceId();
      
      if (!deviceId) {
        console.warn('Device Ban System: Could not determine device ID');
        return { allowed: true, reason: 'device_unavailable' };
      }

      const isBanned = await this.isDeviceBanned(deviceId);
      
      if (isBanned) {
        const banInfo = await this.getDeviceBanInfo(deviceId);
        return {
          allowed: false,
          reason: 'device_banned',
          deviceId: deviceId,
          banInfo: banInfo,
          message: 'This device has been banned from accessing this platform.'
        };
      }

      return { 
        allowed: true, 
        deviceId: deviceId,
        reason: 'device_allowed' 
      };
    } catch (error) {
      console.error('Device Ban System: Error checking device access', error);
      return { allowed: true, reason: 'error_allow' };
    }
  }

  /**
   * Store user device history
   */
  static async storeUserDevice(userUID, userData = {}) {
    try {
      const deviceProfile = await DeviceFingerprint.getDeviceProfile();
      if (!deviceProfile || !deviceProfile.deviceId) return null;

      // Store device in user document
      const userRef = doc(db, 'users', userUID);
      await updateDoc(userRef, {
        lastDeviceId: deviceProfile.deviceId,
        lastDeviceInfo: deviceProfile,
        lastDeviceUpdate: new Date().toISOString(),
        deviceHistory: arrayUnion(deviceProfile.deviceId)
      });

      console.log('Device Ban System: Stored device for user', userUID, deviceProfile.deviceId);
      return deviceProfile.deviceId;
    } catch (error) {
      console.error('Device Ban System: Failed to store user device', error);
      return null;
    }
  }

  /**
   * Get user's known devices
   */
  static async getUserDevices(userUID) {
    try {
      const userRef = doc(db, 'users', userUID);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return [];
      }
      
      const userData = userDoc.data();
      const knownDevices = [];
      
      if (userData.lastDeviceId) {
        knownDevices.push({
          deviceId: userData.lastDeviceId,
          deviceInfo: userData.lastDeviceInfo,
          lastUsed: userData.lastDeviceUpdate
        });
      }
      
      if (userData.deviceHistory && Array.isArray(userData.deviceHistory)) {
        userData.deviceHistory.forEach(deviceId => {
          if (deviceId && !knownDevices.find(d => d.deviceId === deviceId)) {
            knownDevices.push({
              deviceId: deviceId,
              deviceInfo: null,
              lastUsed: null
            });
          }
        });
      }
      
      console.log('Device Ban System: Found devices for user', userUID, knownDevices);
      return knownDevices;
    } catch (error) {
      console.error('Device Ban System: Failed to get user devices', error);
      return [];
    }
  }

  /**
   * Ban user's devices
   */
  static async banUserDevices(userUID, userData, banInfo = {}) {
    try {
      const results = {
        devicesBanned: false,
        bannedDevices: [],
        errors: []
      };

      // Get user's known devices
      const userDevices = await this.getUserDevices(userUID);
      
      if (userDevices.length === 0) {
        console.warn('Device Ban System: No devices found for user', userUID);
        results.errors.push('No devices found for user');
        return results;
      }

      // Ban all known devices for this user
      for (const device of userDevices) {
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

          await this.banDevice(device.deviceId, enhancedBanInfo);
          results.bannedDevices.push(device.deviceId);
          results.devicesBanned = true;
        } catch (error) {
          console.error('Device Ban System: Failed to ban device', device.deviceId, error);
          results.errors.push(`Failed to ban device ${device.deviceId}: ${error.message}`);
        }
      }

      console.log('Device Ban System: Banned devices for user', userUID, results.bannedDevices);
      return results;
    } catch (error) {
      console.error('Device Ban System: Error in banUserDevices', error);
      throw error;
    }
  }

  /**
   * Unban user's devices
   */
  static async unbanUserDevices(userUID) {
    try {
      const userDevices = await this.getUserDevices(userUID);
      
      if (userDevices.length === 0) {
        console.warn('Device Ban System: No devices found for user to unban', userUID);
        return [];
      }

      const unbannedDevices = [];

      for (const device of userDevices) {
        try {
          const wasUnbanned = await this.unbanDevice(device.deviceId);
          if (wasUnbanned) {
            unbannedDevices.push(device.deviceId);
          }
        } catch (error) {
          console.error('Device Ban System: Failed to unban device', device.deviceId, error);
        }
      }

      console.log('Device Ban System: Unbanned devices for user', userUID, unbannedDevices);
      return unbannedDevices;
    } catch (error) {
      console.error('Device Ban System: Error in unbanUserDevices', error);
      throw error;
    }
  }
}

// Initialize the system when module loads
DeviceBanSystem.initialize().catch(console.error);

export default DeviceBanSystem;
