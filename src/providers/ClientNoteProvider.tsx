"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ClientNote } from "@/types";
import { generateId, getStoredData, setStoredData } from "@/lib/utils";
import {
  setDocument,
  deleteDocument,
  onCollectionChange,
} from "@/lib/firestore";

interface ClientNoteContextValue {
  notes: ClientNote[];
  addNote: (data: Omit<ClientNote, "id" | "createdAt">) => ClientNote;
  deleteNote: (id: string) => void;
  /** All notes for a given client, sorted newest first. */
  notesForClient: (clientId: string) => ClientNote[];
}

const ClientNoteContext = createContext<ClientNoteContextValue | null>(null);

const STORAGE_KEY = "mila-client-notes";

export function ClientNoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<ClientNote[]>(() =>
    getStoredData<ClientNote[]>(STORAGE_KEY, [])
  );

  const persist = useCallback((next: ClientNote[]) => {
    setStoredData(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    const unsub = onCollectionChange<ClientNote>(
      "clientNotes",
      (firestoreNotes) => {
        setNotes((prev) => {
          const merged = new Map<string, ClientNote>();
          for (const n of prev) merged.set(n.id, n);
          for (const n of firestoreNotes) merged.set(n.id, n);
          const next = Array.from(merged.values()).sort(
            (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
          );
          persist(next);
          return next;
        });
      }
    );
    return unsub;
  }, [persist]);

  const addNote = useCallback(
    (data: Omit<ClientNote, "id" | "createdAt">): ClientNote => {
      const note: ClientNote = {
        ...data,
        id: `note-${generateId()}`,
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => {
        const next = [note, ...prev];
        persist(next);
        return next;
      });
      const { id, ...payload } = note;
      setDocument("clientNotes", id, payload).catch((err) =>
        console.warn("[ClientNotes] Firestore sync failed:", err)
      );
      return note;
    },
    [persist]
  );

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        persist(next);
        return next;
      });
      deleteDocument("clientNotes", id).catch((err) =>
        console.warn("[ClientNotes] Firestore delete failed:", err)
      );
    },
    [persist]
  );

  const notesForClient = useCallback(
    (clientId: string): ClientNote[] =>
      notes
        .filter((n) => n.clientId === clientId)
        .sort((a, b) =>
          (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
        ),
    [notes]
  );

  const value = useMemo(
    () => ({ notes, addNote, deleteNote, notesForClient }),
    [notes, addNote, deleteNote, notesForClient]
  );

  return (
    <ClientNoteContext.Provider value={value}>
      {children}
    </ClientNoteContext.Provider>
  );
}

export function useClientNotes(): ClientNoteContextValue {
  const ctx = useContext(ClientNoteContext);
  if (!ctx) {
    throw new Error(
      "useClientNotes must be used within a ClientNoteProvider"
    );
  }
  return ctx;
}
