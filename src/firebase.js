import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC-kOIjPin-vjD2tJh65MXhlr_h-8DpZRw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "focusly-exam-prep.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "focusly-exam-prep",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "focusly-exam-prep.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "652996583065",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:652996583065:web:1b7debe2fbd1a9e8136208"
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (error) {
  console.error("Firebase initialization error: ", error);
}

const isFirebaseConfigured = !!(auth && db);

export { app, auth, db, googleProvider, isFirebaseConfigured, signInWithPopup, signOut };
