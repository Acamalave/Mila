import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function getApp(): FirebaseApp | null {
  if (!isConfigured) return null;
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

export function getDb(): Firestore | null {
  if (!isConfigured) return null;
  if (!db) {
    const firebaseApp = getApp();
    if (!firebaseApp) return null;
    db = getFirestore(firebaseApp);
  }
  return db;
}

export { getApp, isConfigured };
