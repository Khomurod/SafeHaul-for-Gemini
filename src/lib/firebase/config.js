import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  getFirestore,
  terminate
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// ... Configuration remains the same ...
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase with HMR safety
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase App Check (guards against unauthorized API usage).
// Set VITE_RECAPTCHA_SITE_KEY in your .env files and the Firebase Console.
// After App Check is live, remove the time-based bypass in firestore.rules.
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}

export const auth = getAuth(app);

// Use memory-only cache and forced long polling to prevent "Unexpected state (ID: ca9)" 
// assertion failures caused by transport synchronization errors or IndexedDB corruption.
// HMR Safety: Check if db is already initialized.
// HMR Safety: Check if db is already initialized.
let firestore;
try {
  // Initialize with memory-only cache and long polling to prevent
  // "Unexpected state" assertion failures from IndexedDB transport errors.
  firestore = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true
  });
} catch (e) {
  // If already initialized (e.g. HMR), use existing instance
  firestore = getFirestore(app);
}

export const db = firestore;
export const storage = getStorage(app);
export const functions = getFunctions(app);

console.log("Firebase has been connected safely (HMR-Optimized)!");