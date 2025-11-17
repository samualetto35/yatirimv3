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

  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      
      // If there's a Firebase user but not verified, redirect and show warning
      if (user && !user.emailVerified && !hasShownToast) {
        toast.warning('Please verify your email before accessing this page.');
        setHasShownToast(true);
      } else if (!user && !currentUserFromContext && !hasShownToast) {
        toast.warning('Please login to access this page.');
        setHasShownToast(true);
      }
    };

    checkAuth();
  }, [currentUserFromContext, hasShownToast]);

  // Check Firebase auth directly for extra security
  const firebaseUser = auth.currentUser;
  
  // Double check: no user at all
  if (!firebaseUser && !currentUserFromContext) {
    return <Navigate to="/login" replace />;
  }

  // Double check: user exists but email not verified
  if (firebaseUser && !firebaseUser.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // Triple check: currentUser must be verified
  if (!currentUserFromContext || !currentUserFromContext.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

