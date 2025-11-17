// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6phzdn2txoMd_Jur5eLKgu486VjA2qMY",
  authDomain: "yatirimv3.firebaseapp.com",
  projectId: "yatirimv3",
  storageBucket: "yatirimv3.firebasestorage.app",
  messagingSenderId: "413994394319",
  appId: "1:413994394319:web:03e89e896a243558ef0dba",
  measurementId: "G-ZSDSB33KGB"
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
    
    if (siteKey && siteKey.length > 10) {
      // Production: use real reCAPTCHA
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (location.hostname === 'localhost' || import.meta?.env?.DEV) {
      // Development: Enable debug token mode
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }
} catch (err) {
  // App Check init is best-effort; ignore errors
}

export { app, analytics, auth, db };

