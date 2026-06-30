import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
// Auto-detect long-polling so real-time onSnapshot updates keep working behind
// proxies/networks that block Firestore's streaming WebChannel (otherwise the
// first fetch succeeds but live updates silently stop until a full reload).
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true });
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
