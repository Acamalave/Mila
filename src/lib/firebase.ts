import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// Sanitize env vars — Vercel can inject trailing newlines/whitespace
const clean = (v?: string) => (v ?? "").trim();

const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

let app: FirebaseApp;
let db: Firestore;

function getApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(getApp());
  }
  return db;
}

export { getApp };
