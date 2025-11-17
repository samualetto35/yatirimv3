import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';
import { createUserDocument, ensureUserDocument, updateEmailVerificationStatus } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register new user
  const register = async (email, password, username) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with username
      await updateProfile(userCredential.user, {
        displayName: username
      });

      // Try to create user document in Firestore (non-blocking)
      try {
        await createUserDocument(userCredential.user.uid, {
          username: username,
          email: email,
          emailVerified: false,
        });
      } catch (firestoreError) {
        console.warn('Firestore user creation warning:', firestoreError.message);
        // Continue with registration even if Firestore fails
      }

      // Send verification email
      await sendEmailVerification(userCredential.user);
      
      toast.success('Registration successful! Please check your email to verify your account.');
      return userCredential;
    } catch (error) {
      let errorMessage = 'Registration failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        toast.warning('Please verify your email before logging in. A new verification email has been sent.');
        throw new Error('Email not verified');
      }

      // Try to ensure user exists in Firestore (non-blocking)
      try {
        await ensureUserDocument(userCredential.user);
      } catch (firestoreError) {
        console.warn('Firestore sync warning:', firestoreError.message);
        // Continue with login even if Firestore fails
      }
      
      toast.success('Login successful!');
      return userCredential;
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message === 'Email not verified') {
        // Already handled above
        throw error;
      }
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please wait a few minutes before trying again or reset your password.';
          break;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully!');
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error) {
      let errorMessage = 'Failed to send reset email.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // Resend verification email
  const resendVerification = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        toast.success('Verification email sent! Please check your inbox.');
      } else {
        toast.error('No user found. Please login again.');
      }
    } catch (error) {
      let errorMessage = 'Failed to send verification email.';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Only set user as current if email is verified
      if (user && user.emailVerified) {
        setCurrentUser(user);
        
        // Try to sync with Firestore (non-blocking)
        try {
          const firestoreUser = await ensureUserDocument(user);
          setUserDoc(firestoreUser);
          // Sync UI preference for top tabs from Firestore into localStorage so UI picks it up
          if (typeof window !== 'undefined' && firestoreUser?.topTabsStyle) {
            localStorage.setItem('topTabsStyle', firestoreUser.topTabsStyle);
            window.dispatchEvent(new Event('topTabsStyleChanged'));
          }
        } catch (error) {
          console.warn('Firestore sync warning:', error.message);
          // Continue without Firestore data
          setUserDoc(null);
        }
      } else if (user && !user.emailVerified) {
        // User exists but not verified - don't set as current user
        setCurrentUser(null);
        setUserDoc(null);
      } else {
        setCurrentUser(null);
        setUserDoc(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userDoc,
    register,
    login,
    logout,
    resetPassword,
    resendVerification
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

