"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Invoice } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { useEventBus } from "@/providers/EventBusProvider";
import { setDocument, deleteDocument, onCollectionChange } from "@/lib/firestore";

interface InvoiceContextValue {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  sendInvoice: (invoiceId: string) => void;
  markAsPaid: (invoiceId: string, transactionId: string) => void;
  markAsDeclined: (invoiceId: string) => void;
  deleteInvoice: (invoiceId: string) => void;
  getInvoicesForClient: (clientId: string) => Invoice[];
  createAndPayInvoice: (data: Omit<Invoice, "id" | "createdAt">, transactionId: string) => Invoice;
}

const InvoiceContext = createContext<InvoiceContextValue | null>(null);

/* ── Valid invoice status transitions ── */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "paid"],
  sent: ["paid", "overdue", "declined"],
  overdue: ["paid", "sent", "declined"],
  declined: ["sent"], // admin can resend a declined invoice
  // paid is terminal — no transitions out
};

function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true; // no-op
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const { emit, on } = useEventBus();

  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    getStoredData<Invoice[]>("mila-invoices", [])
  );

  const persist = useCallback((next: Invoice[]) => {
    setStoredData("mila-invoices", next);
  }, []);

  const addInvoice = useCallback((data: Omit<Invoice, "id" | "createdAt">): Invoice => {
    const newInvoice: Invoice = {
      ...data,
      id: `inv-${generateId()}`,
      createdAt: new Date().toISOString(),
    };
    setInvoices((prev) => {
      const next = [...prev, newInvoice];
      persist(next);
      return next;
    });
    const { id, ...invoiceData } = newInvoice;
    setDocument("invoices", id, invoiceData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    emit("invoice:created", newInvoice);
    return newInvoice;
  }, [emit, persist]);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) => {
      const current = prev.find((inv) => inv.id === id);
      if (current && updates.status && !isValidTransition(current.status, updates.status)) {
        console.warn(`[Mila] Invalid invoice transition: ${current.status} → ${updates.status}`);
        return prev;
      }
      const next = prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv));
      persist(next);
      return next;
    });
    setDocument("invoices", id, updates as Record<string, unknown>).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    emit("invoice:updated", { id, updates });
  }, [emit, persist]);

  const sendInvoice = useCallback((invoiceId: string) => {
    const sentAt = new Date().toISOString();
    setInvoices((prev) => {
      const current = prev.find((inv) => inv.id === invoiceId);
      if (current && !isValidTransition(current.status, "sent")) {
        console.warn(`[Mila] Cannot send invoice: invalid transition from ${current.status}`);
        return prev;
      }
      const next = prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "sent" as const, sentAt }
          : inv
      );
      persist(next);
      const sent = next.find((inv) => inv.id === invoiceId);
      if (sent) {
        emit("invoice:sent", sent);
      }
      return next;
    });
    setDocument("invoices", invoiceId, { status: "sent", sentAt }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
  }, [emit, persist]);

  const markAsPaid = useCallback((invoiceId: string, transactionId: string) => {
    const paidAt = new Date().toISOString();
    setInvoices((prev) => {
      const next = prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: "paid" as const,
              paidAt,
              paymentTransactionId: transactionId,
            }
          : inv
      );
      persist(next);
      const paid = next.find((inv) => inv.id === invoiceId);
      if (paid) {
        emit("invoice:paid", paid);
      }
      return next;
    });
    setDocument("invoices", invoiceId, { status: "paid", paidAt, paymentTransactionId: transactionId }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
  }, [emit, persist]);

  const markAsDeclined = useCallback((invoiceId: string) => {
    const declinedAt = new Date().toISOString();
    setInvoices((prev) => {
      const current = prev.find((inv) => inv.id === invoiceId);
      if (current && !isValidTransition(current.status, "declined")) {
        console.warn(`[Mila] Cannot decline invoice: invalid transition from ${current.status}`);
        return prev;
      }
      const next = prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "declined" as const, declinedAt }
          : inv
      );
      persist(next);
      const declined = next.find((inv) => inv.id === invoiceId);
      if (declined) {
        emit("invoice:declined", declined);
      }
      return next;
    });
    setDocument("invoices", invoiceId, { status: "declined", declinedAt }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
  }, [emit, persist]);

  const deleteInvoice = useCallback((invoiceId: string) => {
    setInvoices((prev) => {
      const next = prev.filter((inv) => inv.id !== invoiceId);
      persist(next);
      return next;
    });
    deleteDocument("invoices", invoiceId).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
  }, [persist]);

  const getInvoicesForClient = useCallback(
    (clientId: string) => invoices.filter((inv) => inv.clientId === clientId),
    [invoices]
  );

  const createAndPayInvoice = useCallback(
    (data: Omit<Invoice, "id" | "createdAt">, transactionId: string): Invoice => {
      const newInvoice: Invoice = {
        ...data,
        id: `inv-${generateId()}`,
        status: "paid",
        paidAt: new Date().toISOString(),
        paymentTransactionId: transactionId,
        createdAt: new Date().toISOString(),
      };
      setInvoices((prev) => {
        const next = [...prev, newInvoice];
        persist(next);
        return next;
      });
      const { id, ...invoiceData } = newInvoice;
      setDocument("invoices", id, invoiceData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      emit("invoice:created", newInvoice);
      emit("invoice:paid", newInvoice);
      return newInvoice;
    },
    [emit, persist]
  );

  // Firestore real-time sync
  useEffect(() => {
    const deletedIds = getStoredData<string[]>("mila-invoices-deleted", []);
    const deletedSet = new Set(deletedIds);

    const unsub = onCollectionChange<Invoice>("invoices", (firestoreInvoices) => {
      if (firestoreInvoices.length > 0) {
        setInvoices((prev) => {
          const merged = new Map<string, Invoice>();
          for (const inv of prev) if (!deletedSet.has(inv.id)) merged.set(inv.id, inv);
          for (const inv of firestoreInvoices) if (!deletedSet.has(inv.id)) merged.set(inv.id, inv);
          const next = Array.from(merged.values());
          persist(next);
          return next;
        });
      }
    });
    return () => unsub();
  }, [persist]);

  useEffect(() => {
    const unsubs = [
      on("invoice:created", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
      on("invoice:updated", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
      on("invoice:sent", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
      on("invoice:paid", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
      on("invoice:declined", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on]);

  return (
    <InvoiceContext.Provider
      value={{ invoices, addInvoice, updateInvoice, sendInvoice, markAsPaid, markAsDeclined, deleteInvoice, getInvoicesForClient, createAndPayInvoice }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices(): InvoiceContextValue {
  const context = useContext(InvoiceContext);
  if (!context) throw new Error("useInvoices must be used within an InvoiceProvider");
  return context;
}
