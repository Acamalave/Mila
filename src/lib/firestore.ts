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

const noop: Unsubscribe = () => {};

/* ── Read ── */

export async function getCollection<T>(name: string): Promise<T[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const db = getDb();
  if (!db) return null;
  const snap = await firestoreGetDoc(doc(db, collectionName, docId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}

/* ── Write ── */

export async function setDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await firestoreSetDoc(doc(db, collectionName, docId), data, {
    merge: true,
  });
}

export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  const db = getDb();
  if (!db) return "";
  const ref = await firestoreAddDoc(collection(db, collectionName), data);
  return ref.id;
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await firestoreUpdateDoc(doc(db, collectionName, docId), updates);
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await firestoreDeleteDoc(doc(db, collectionName, docId));
}

/* ── Real-time ── */

export function onCollectionChange<T>(
  name: string,
  callback: (items: T[]) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return noop;
  return onSnapshot(collection(db, name), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    callback(items);
  });
}

export function onDocumentChange<T>(
  collectionName: string,
  docId: string,
  callback: (item: T | null) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return noop;
  return onSnapshot(doc(db, collectionName, docId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null);
  });
}

/* ── Bulk: sync entire array as a single document ── */

export async function syncArrayToDoc<T extends DocumentData>(
  collectionName: string,
  docId: string,
  items: T[]
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await firestoreSetDoc(doc(db, collectionName, docId), { items });
}

export async function getArrayFromDoc<T>(
  collectionName: string,
  docId: string
): Promise<T[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await firestoreGetDoc(doc(db, collectionName, docId));
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.items as T[]) ?? [];
}

export function onArrayDocChange<T>(
  collectionName: string,
  docId: string,
  callback: (items: T[]) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return noop;
  return onSnapshot(doc(db, collectionName, docId), (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const data = snap.data();
    callback((data.items as T[]) ?? []);
  });
}
