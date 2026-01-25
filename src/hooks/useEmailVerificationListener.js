import { useEffect } from 'react';
import { auth } from '../firebase/config';
import { updateEmailVerificationStatus } from '../services/userService';
import { toast } from 'react-toastify';

/**
 * Hook to listen for email verification changes
 * Auto-updates Firestore when email is verified
 */
export const useEmailVerificationListener = (user) => {
  useEffect(() => {
    if (!user) return;

    let intervalId;
    
    // Check verification status every 3 seconds when user is on verification page
    const checkVerification = async () => {
      try {
        await user.reload(); // Refresh user data from Firebase
        
        if (user.emailVerified) {
          // Email was just verified - update Firestore
          await updateEmailVerificationStatus(user.uid, true);
          toast.success('Email verified successfully! You can now login.');
          
          // Clear interval
          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        
        // Handle expired verification link or other errors
        if (error.code === 'auth/expired-action-code' || error.message?.includes('expired')) {
          // Don't spam the user with errors, just log it
          console.warn('Verification link may have expired. User should request a new one.');
        }
      }
    };

    // Only run if user exists and is not verified yet
    if (!user.emailVerified) {
      intervalId = setInterval(checkVerification, 3000);
    }

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user]);
};

