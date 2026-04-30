import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";

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
let appCheck: AppCheck | undefined;

function getApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

/**
 * Initialize Firebase App Check with reCAPTCHA v3.
 *
 * App Check verifies that calls to Firebase services come from the legitimate
 * Mila Concept browser app — not curl, scripts, or scrapers using the public
 * apiKey. Combined with firestore.rules this is the closest we can get to
 * server-side enforcement without adopting Firebase Auth.
 *
 * Setup checklist (in order):
 *   1) Firebase Console → App Check → register the web app with reCAPTCHA v3
 *      and copy the reCAPTCHA site key.
 *   2) Set NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY in Vercel.
 *   3) Deploy. The SDK starts attaching App Check tokens to every Firestore
 *      request — but enforcement is still off in the Console, so the app
 *      keeps working even if a token isn't produced.
 *   4) In Firebase Console → App Check → Firestore → switch from "Unenforced"
 *      to "Enforced" only AFTER you see App Check requests succeeding in
 *      the metrics tab. Enforcement BEFORE that point will lock out the app.
 *
 * If the env var isn't set, App Check is silently skipped — the app keeps
 * working in unenforced mode, exactly like before this code existed.
 */
function initAppCheckOnce(): void {
  if (appCheck) return;
  if (typeof window === "undefined") return; // browser-only
  const siteKey = clean(process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY);
  if (!siteKey) return;
  try {
    appCheck = initializeAppCheck(getApp(), {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // Don't crash the app if App Check fails to initialize — better to log
    // and keep Firestore working than break every page.
    console.warn("[Mila] App Check init failed:", err);
  }
}

export function getDb(): Firestore {
  if (!db) {
    initAppCheckOnce();
    db = getFirestore(getApp());
  }
  return db;
}

export { getApp };
