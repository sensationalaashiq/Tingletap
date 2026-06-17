
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';


const firebaseConfig = {
    apiKey: "AIzaSyAp6KtSg_7kbGwyffC7sFJxuuxB-wwPj-w",
    authDomain: "tingletapofraj.firebaseapp.com",
    databaseURL: "https://tingletapofraj-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tingletapofraj",
    storageBucket: "tingletapofraj.firebasestorage.app",
    messagingSenderId: "1016016940836",
    appId: "1:1016016940836:web:3873f33ed4c9656334cdb1",
    measurementId: "G-VTZYE3JJNG"
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
        return !usernameSnap.exists();
    } catch (error) {
        console.error('Username check error:', error);
        return false;
    }
};

export const reserveUsername = async (username, uid) => {
    try {
        const usernameRef = doc(db, 'usernames', username.toLowerCase());
        await setDoc(usernameRef, { 
            uid, 
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
            role: 'user',
            isBanned: false,
            mutedInfo: {
                isMuted: false,
                mutedBy: null,
                mutedByRole: null,
                muteReason: null,
                muteTime: null
            },

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
  if (photoURL) {
    return photoURL;
  }

  // Use 'sex' attribute for DiceBear API instead of 'gender'
  const sexAttribute = gender?.toLowerCase() === 'female' ? 'female' : 'male';
  return `https://api.dicebear.com/8.x/adventurer/svg?seed=${uid}&sex=${sexAttribute}&backgroundColor=c0aede`;
};