import {
  collection,
  doc,
  getDocs,
  getDoc as firestoreGetDoc,
  setDoc as firestoreSetDoc,
  addDoc as firestoreAddDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";

/* ── Connection status tracking ── */

type FirestoreStatus = "connected" | "error" | "offline";

let firestoreStatus: FirestoreStatus = "connected";

export function getFirestoreStatus(): FirestoreStatus {
  return firestoreStatus;
}

function setFirestoreStatus(status: FirestoreStatus) {
  firestoreStatus = status;
}

/* ── Retry helper with exponential backoff ── */

async function withRetry<T>(
  operation: () => Promise<T>,
  label: string,
  maxRetries = 3
): Promise<T> {
  const delays = [1000, 2000, 4000];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      setFirestoreStatus("connected");
      return result;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (isLastAttempt) {
        console.error(
          `[Mila] Firestore ${label} failed after ${maxRetries + 1} attempts: ${errorMessage}`
        );
        setFirestoreStatus("error");
        throw error;
      }

      const delay = delays[attempt] ?? 4000;
      console.warn(
        `[Mila] Firestore ${label} attempt ${attempt + 1}/${maxRetries + 1} failed: ${errorMessage}. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Unreachable, but satisfies TypeScript
  throw new Error(`[Mila] Firestore ${label} failed unexpectedly`);
}

/* ── Read ── */

export async function getCollection<T>(name: string): Promise<T[]> {
  return withRetry(async () => {
    const snap = await getDocs(collection(getDb(), name));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  }, `getCollection("${name}")`);
}

export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const snap = await firestoreGetDoc(doc(getDb(), collectionName, docId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}

/* ── Write ── */

export async function setDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  return withRetry(async () => {
    await firestoreSetDoc(doc(getDb(), collectionName, docId), data, {
      merge: true,
    });
  }, `setDocument("${collectionName}/${docId}")`);
}

export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  const ref = await firestoreAddDoc(collection(getDb(), collectionName), data);
  return ref.id;
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await firestoreUpdateDoc(doc(getDb(), collectionName, docId), updates);
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  await firestoreDeleteDoc(doc(getDb(), collectionName, docId));
}

/* ── Real-time ── */

export function onCollectionChange<T>(
  name: string,
  callback: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(getDb(), name),
    (snap) => {
      setFirestoreStatus("connected");
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
      callback(items);
    },
    (error) => {
      setFirestoreStatus("error");
      console.warn(
        `[Mila] Firestore real-time listener error on collection "${name}": ${error.message} (code: ${error.code})`
      );
    }
  );
}

export function onDocumentChange<T>(
  collectionName: string,
  docId: string,
  callback: (item: T | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), collectionName, docId),
    (snap) => {
      setFirestoreStatus("connected");
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null);
    },
    (error) => {
      setFirestoreStatus("error");
      console.warn(
        `[Mila] Firestore real-time listener error on document "${collectionName}/${docId}": ${error.message} (code: ${error.code})`
      );
    }
  );
}

/* ── Bulk: sync entire array as a single document ── */

export async function syncArrayToDoc<T extends DocumentData>(
  collectionName: string,
  docId: string,
  items: T[]
): Promise<void> {
  await firestoreSetDoc(doc(getDb(), collectionName, docId), { items });
}

export async function getArrayFromDoc<T>(
  collectionName: string,
  docId: string
): Promise<T[]> {
  const snap = await firestoreGetDoc(doc(getDb(), collectionName, docId));
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.items as T[]) ?? [];
}

export function onArrayDocChange<T>(
  collectionName: string,
  docId: string,
  callback: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(doc(getDb(), collectionName, docId), (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const data = snap.data();
    callback((data.items as T[]) ?? []);
  });
}
