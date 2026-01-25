// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Your web app's Firebase configuration
// Load from environment variables for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize App Check (handles Firestore permission denials when enforcement is ON)
try {
  if (typeof window !== 'undefined') {
    const siteKey = import.meta?.env?.VITE_RECAPTCHA_V3_SITE_KEY;
    const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || import.meta?.env?.DEV;
    
    // Only enable App Check in production
    if (!isDevelopment && siteKey && siteKey.length > 10) {
      // Production: use real reCAPTCHA
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (isDevelopment) {
      // Development: Skip App Check to avoid debug token issues
      console.log('App Check disabled in development mode');
    }
  }
} catch (err) {
  // App Check init is best-effort; ignore errors
  console.warn('App Check initialization failed:', err);
}

export { app, analytics, auth, db };

