import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { createUserDocument, ensureUserDocument, updateEmailVerificationStatus, getUserDocument } from '../services/userService';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userDocLoading, setUserDocLoading] = useState(false);

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
      
      toast.success('Kayıt başarılı! E-postanızı doğrulamanız gerekiyor. Doğruladıktan sonra giriş yapabilirsiniz.');
      return userCredential;
    } catch (error) {
      let errorMessage = 'Kayıt başarısız. Lütfen tekrar deneyin.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya farklı bir e-posta adresi kullanın.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Şifre en az 6 karakter olmalıdır. Lütfen daha güçlü bir şifre seçin.';
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
      
      // Reload user to get the most up-to-date verification status
      // This is important in case verification happened just before login
      await userCredential.user.reload();
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        // Send verification email before signout to avoid rate limiting
        try {
          await sendEmailVerification(userCredential.user);
        } catch (verifyError) {
          // If sending email fails, still show the message
          console.warn('Failed to send verification email:', verifyError);
        }
        await signOut(auth);
        toast.warning('Lütfen giriş yapmadan önce e-postanızı doğrulayın. Yeni bir doğrulama e-postası gönderildi.');
        throw new Error('Email not verified');
      }

      // Try to ensure user exists in Firestore (non-blocking)
      try {
        await ensureUserDocument(userCredential.user);
      } catch (firestoreError) {
        console.warn('Firestore sync warning:', firestoreError.message);
        // Continue with login even if Firestore fails
      }
      
      toast.success('Giriş başarılı!');
      return userCredential;
    } catch (error) {
      // If it's our custom email verification error, don't show other errors
      if (error.message === 'Email not verified') {
        throw error;
      }
      
      // Check if this might be an unverified email issue
      // Sometimes Firebase returns 'too-many-requests' when user tries to login with unverified email multiple times
      if (error.code === 'auth/too-many-requests') {
        // Try to check if user exists and is unverified
        try {
          const user = auth.currentUser;
          if (user && !user.emailVerified) {
            await sendEmailVerification(user);
            await signOut(auth);
            toast.warning('Lütfen giriş yapmadan önce e-postanızı doğrulayın. Yeni bir doğrulama e-postası gönderildi.');
            throw new Error('Email not verified');
          }
        } catch (checkError) {
          if (checkError.message === 'Email not verified') {
            throw checkError;
          }
        }
      }
      
      let errorMessage = 'Giriş başarısız. Lütfen tekrar deneyin.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı. Lütfen kayıt olun.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Şifre yanlış. Lütfen şifrenizi kontrol edip tekrar deneyin.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Bu hesap devre dışı bırakılmış. Lütfen destek ekibi ile iletişime geçin.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Çok fazla başarısız deneme yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin veya şifrenizi sıfırlayın.';
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
      toast.success('Başarıyla çıkış yapıldı!');
    } catch (error) {
      toast.error('Çıkış yapılamadı. Lütfen tekrar deneyin.');
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Şifre sıfırlama e-postası gönderildi! Lütfen gelen kutunuzu kontrol edin.');
    } catch (error) {
      let errorMessage = 'Şifre sıfırlama e-postası gönderilemedi.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.';
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
        // Reload user first to get latest status
        await user.reload();
        await sendEmailVerification(user);
        toast.success('Doğrulama e-postası gönderildi! Lütfen gelen kutunuzu kontrol edin.');
      } else {
        toast.error('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
      }
    } catch (error) {
      let errorMessage = 'Doğrulama e-postası gönderilemedi.';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla istek yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.';
      } else if (error.code === 'auth/expired-action-code') {
        errorMessage = 'Önceki doğrulama bağlantısının süresi doldu. Yeni bir e-posta gönderildi.';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // Function to ensure user document exists and is loaded
  const ensureUserDocLoaded = useCallback(async (user) => {
    if (!user || !user.emailVerified) {
      setUserDoc(null);
      setUserDocLoading(false);
      return null;
    }

    setUserDocLoading(true);
    try {
      // First check if user exists in DB
      const existingUserDoc = await getUserDocument(user.uid);
      
      if (!existingUserDoc) {
        // User doesn't exist in DB - this is first login
        // Create the document
        const firestoreUser = await ensureUserDocument(user);
        const { _isNewUser, ...userDocData } = firestoreUser;
        setUserDoc(userDocData);
        
        // Mark as new user for modal display
        if (typeof window !== 'undefined') {
          localStorage.setItem(`firstLogin_${user.uid}`, 'true');
        }
        
        // Sync UI preference
        if (typeof window !== 'undefined' && firestoreUser?.topTabsStyle) {
          localStorage.setItem('topTabsStyle', firestoreUser.topTabsStyle);
          window.dispatchEvent(new Event('topTabsStyleChanged'));
        }
        return { ...userDocData, _isNewUser: true };
      } else {
        // User exists in DB - update if needed
        const firestoreUser = await ensureUserDocument(user);
        const { _isNewUser, ...userDocData } = firestoreUser;
        setUserDoc(userDocData);
        
        // Sync UI preference
        if (typeof window !== 'undefined' && firestoreUser?.topTabsStyle) {
          localStorage.setItem('topTabsStyle', firestoreUser.topTabsStyle);
          window.dispatchEvent(new Event('topTabsStyleChanged'));
        }
        return { ...userDocData, _isNewUser: false };
      }
    } catch (error) {
      console.warn('Firestore sync warning:', error.message);
      // Continue without Firestore data
      setUserDoc(null);
      return null;
    } finally {
      setUserDocLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Only set user as current if email is verified
      if (user && user.emailVerified) {
        setCurrentUser(user);
        // Check adminUsers for Analizler tab visibility
        try {
          const snap = await getDoc(doc(db, 'adminUsers', user.uid));
          setIsAdmin(snap.exists());
        } catch {
          setIsAdmin(false);
        }
        // Ensure user document exists in Firestore
        await ensureUserDocLoaded(user);
      } else if (user && !user.emailVerified) {
        setCurrentUser(null);
        setUserDoc(null);
        setUserDocLoading(false);
        setIsAdmin(false);
      } else {
        setCurrentUser(null);
        setUserDoc(null);
        setUserDocLoading(false);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [ensureUserDocLoaded]);

  const value = {
    currentUser,
    userDoc,
    userDocLoading,
    isAdmin,
    ensureUserDocLoaded,
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

