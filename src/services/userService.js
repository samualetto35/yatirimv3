import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Create a new user document in Firestore
 */
export const createUserDocument = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    const userDocument = {
      uid: userId,
      username: userData.username || userData.displayName || 'User',
      email: userData.email,
      emailVerified: userData.emailVerified || false,
      topTabsStyle: 'modern',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, userDocument);
    return userDocument;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

/**
 * Get user document from Firestore
 */
export const getUserDocument = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    // If rules block reads for unverified users, return null so we can create the doc instead
    if (error?.code === 'permission-denied') {
      return null;
    }
    console.error('Error getting user document:', error);
    throw error;
  }
};

/**
 * Update user's email verification status
 */
export const updateEmailVerificationStatus = async (userId, isVerified) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      emailVerified: isVerified,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    throw error;
  }
};

/**
 * Update user document
 */
export const updateUserDocument = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user document:', error);
    throw error;
  }
};

/**
 * Ensure user exists in Firestore (create if missing)
 * This is used on login to sync auth users with Firestore
 */
export const ensureUserDocument = async (firebaseUser) => {
  try {
    const userDoc = await getUserDocument(firebaseUser.uid);
    
    if (!userDoc) {
      // User exists in Auth but not in Firestore - create it
      // This indicates first-time login
      console.log('User not found in Firestore, creating document...');
      const newUserDoc = await createUserDocument(firebaseUser.uid, {
        username: firebaseUser.displayName || 'User',
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
      });
      // Return object with isNewUser flag
      return { ...newUserDoc, _isNewUser: true };
    } else {
      // User exists - update verification status if it changed
      if (userDoc.emailVerified !== firebaseUser.emailVerified) {
        await updateEmailVerificationStatus(firebaseUser.uid, firebaseUser.emailVerified);
        return { ...userDoc, emailVerified: firebaseUser.emailVerified, _isNewUser: false };
      }
      return { ...userDoc, _isNewUser: false };
    }
  } catch (error) {
    console.error('Error ensuring user document:', error);
    throw error;
  }
};

