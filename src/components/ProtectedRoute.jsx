import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import { auth } from '../firebase/config';

const ProtectedRoute = ({ children }) => {
  let currentUserFromContext = null;
  try {
    // In case this component renders before AuthProvider is ready,
    // avoid throwing and fallback to Firebase auth check below.
    currentUserFromContext = useAuth()?.currentUser || null;
  } catch (_) {
    currentUserFromContext = null;
  }
  const [hasShownToast, setHasShownToast] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      
      // If there's a Firebase user but not verified, redirect and show warning
      if (user && !user.emailVerified && !hasShownToast) {
        toast.warning('Please verify your email before accessing this page.');
        setHasShownToast(true);
        setIsChecking(false);
      } else if (!user && !currentUserFromContext && !hasShownToast) {
        toast.warning('Please login to access this page.');
        setHasShownToast(true);
        setIsChecking(false);
      } else {
        // Give a small delay for onAuthStateChanged to complete
        // This helps with race conditions after login
        setTimeout(() => {
          setIsChecking(false);
        }, 300);
      }
    };

    checkAuth();
  }, [currentUserFromContext, hasShownToast]);

  // Check Firebase auth directly for extra security
  const firebaseUser = auth.currentUser;
  
  // Show loading state briefly to allow auth state to sync
  if (isChecking && firebaseUser && firebaseUser.emailVerified && !currentUserFromContext) {
    return null; // Brief loading state
  }
  
  // Double check: no user at all
  if (!firebaseUser && !currentUserFromContext) {
    return <Navigate to="/login" replace />;
  }

  // Double check: user exists but email not verified
  if (firebaseUser && !firebaseUser.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // Triple check: currentUser must be verified
  // But allow firebaseUser if currentUser is still loading (race condition fix)
  if (!currentUserFromContext || !currentUserFromContext.emailVerified) {
    // If firebaseUser exists and is verified, allow access (currentUser will sync soon)
    if (firebaseUser && firebaseUser.emailVerified) {
      return children;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

