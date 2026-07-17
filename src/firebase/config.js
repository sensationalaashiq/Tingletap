
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';


const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Add connection management for Firestore
let isFirestoreConnected = true;

// Handle Firestore connection issues
const handleFirestoreConnectionError = async (error) => {
    console.warn('Firestore connection error, attempting recovery:', error);
    
    if (isFirestoreConnected) {
        try {
            isFirestoreConnected = false;
            await disableNetwork(db);
            
            // Wait briefly then re-enable
            setTimeout(async () => {
                try {
                    await enableNetwork(db);
                    isFirestoreConnected = true;
                    console.log('Firestore connection restored');
                } catch (enableError) {
                    console.error('Failed to restore Firestore connection:', enableError);
                    // Force page reload as last resort
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                }
            }, 2000);
        } catch (disableError) {
            console.error('Failed to disable Firestore network:', disableError);
        }
    }
};

// Export the error handler
export { handleFirestoreConnectionError };


// Enhanced error handling for signup process
export const handleFirestoreError = (error) => {
    if (error.code === 'permission-denied') {
        console.warn('Firestore permission denied. Please check your security rules or authentication status.');

        if (auth.currentUser) {
            // Check if email is verified for signup
            if (!auth.currentUser.emailVerified) {
                console.log('Email not verified. Please verify your email to continue.');
                return { error: 'email-not-verified', message: 'Please verify your email first' };
            }
            console.log('User is authenticated, permission issue may be with security rules');
        } else {
            console.log('User not authenticated, redirecting to login');
            return { error: 'not-authenticated', message: 'Please sign in first' };
        }
        return { error: 'permission-denied', message: 'Access denied' };
    }

    if (error.code === 'already-exists') {
        return { error: 'already-exists', message: 'Username already taken' };
    }

    console.error('Firestore error:', error);
    return { error: 'unknown', message: 'Something went wrong' };
};

// Signup-specific helper functions
export const checkUsernameAvailability = async (username) => {
    try {
        const usernameRef = doc(db, 'usernames', username.toLowerCase());
        const usernameSnap = await getDoc(usernameRef);
        return !usernameSnap.exists(); // true = available, false = taken
    } catch (error) {
        // FIX L-01: Fail-closed — return false (unavailable) on error so two users
        // cannot simultaneously claim the same username if Firestore is unreachable.
        console.warn('Username check error (assuming unavailable for safety):', error);
        return false;
    }
};

export const reserveUsername = async (username, uid, email) => {
    try {
        const usernameRef = doc(db, 'usernames', username.toLowerCase());
        await setDoc(usernameRef, { 
            uid, 
            email: email || '',
            reserved: true, 
            createdAt: new Date().toISOString() 
        });
        return true;
    } catch (error) {
        console.error('Username reservation error:', error);
        return false;
    }
};

// Add connection status checking
export const checkFirebaseConnection = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            if (user) {
                resolve(user);
            } else {
                reject(new Error('Not authenticated'));
            }
        });
    });
};

// Enhanced user creation for signup
export const createUserProfile = async (userData) => {
    try {
        // Verify user is authenticated
        if (!auth.currentUser || auth.currentUser.uid !== userData.uid) {
            throw new Error('User not properly authenticated');
        }

        console.log('Creating profile for user:', userData.uid);

        const userRef = doc(db, 'users', userData.uid);

        // Ensure required fields are present
        const profileData = {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName || '',
            photoURL: userData.photoURL || '',

            // Profile fields from signup
            username: userData.username || '',
            gender: userData.gender || 'Not specified',
            country: userData.country || 'Unknown',
            status: userData.status || "I'm new here!",
            bio: userData.bio || '',
            dateOfBirth: userData.dateOfBirth || '',

            // System fields
            // NOTE: isBanned/bannedBy/bannedAt/mutedInfo are intentionally NOT set here.
            // Firestore security rules block self-assignment of these fields on account
            // creation (users/{userId} allow create rule), so including them here causes
            // every signup's profile write to fail with permission-denied. Staff-only
            // actions (ban/mute) set these fields later via update, not create.
            role: 'user',

            // Timestamps
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            isOnline: true,

            // Default settings
            settings: {
                notifications: true,
                publicProfile: true,
                showOnlineStatus: true
            },

            // Add friends array for social features
            friends: [],

            // Royal Trust System
            trustScore: 10,
            trustRank: 'squire',
            trustData: {
                messagesCount: 0,
                violationsCount: 0,
                warningsCount: 0,
                muteCount: 0,
                spamCount: 0,
                abuseCount: 0,
                lastViolation: null,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                lastCleanCheck: new Date().toISOString()
            }
        };

        console.log('Attempting to create user profile document...');
        await setDoc(userRef, profileData);
        console.log('User profile created successfully');

        return { success: true, data: profileData };
    } catch (error) {
        console.error('Profile creation error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack,
            currentUser: auth.currentUser?.uid,
            requestedUid: userData.uid
        });

        const errorResult = handleFirestoreError(error);
        return { success: false, error: errorResult };
    }
};

export default app;

// Helper function to generate avatar URL with proper gender
export const generateAvatarUrl = (uid, gender = 'male', photoURL = null) => {
  if (photoURL) return photoURL;
  // Deterministic index from uid
  let h = 5381;
  const s = uid || 'default';
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) ^ s.charCodeAt(i); h = h >>> 0; }
  const n = h % 100;
  const g = (gender || '').toLowerCase();
  if (g === 'female') return `https://randomuser.me/api/portraits/women/${n}.jpg`;
  if (g === 'transgender' || g === 'other') return `https://randomuser.me/api/portraits/women/${(n + 37) % 100}.jpg`;
  return `https://randomuser.me/api/portraits/men/${n}.jpg`;
};