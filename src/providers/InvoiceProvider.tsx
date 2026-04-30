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
import {
  getDeletedSet,
  markDeleted,
  pushLocalDeletes,
  subscribeDeletedSet,
} from "@/lib/deleted-set";

interface InvoiceContextValue {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => UpdateResult;
  sendInvoice: (invoiceId: string) => UpdateResult;
  markAsPaid: (invoiceId: string, transactionId: string) => UpdateResult;
  markAsDeclined: (invoiceId: string) => UpdateResult;
  deleteInvoice: (invoiceId: string) => void;
  getInvoicesForClient: (clientId: string) => Invoice[];
  createAndPayInvoice: (data: Omit<Invoice, "id" | "createdAt">, transactionId: string) => Invoice;
}

interface UpdateResult {
  ok: boolean;
  error?: string;
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

// Strip `undefined` so Firestore doesn't reject the merge write
function dropUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
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
    setDocument("invoices", id, dropUndefined(invoiceData)).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    emit("invoice:created", newInvoice);
    return newInvoice;
  }, [emit, persist]);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>): UpdateResult => {
    let result: UpdateResult = { ok: true };
    setInvoices((prev) => {
      const current = prev.find((inv) => inv.id === id);
      if (current && updates.status && !isValidTransition(current.status, updates.status)) {
        result = { ok: false, error: `Invalid transition: ${current.status} → ${updates.status}` };
        console.warn(`[Mila] ${result.error}`);
        return prev;
      }
      const next = prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv));
      persist(next);
      return next;
    });
    if (result.ok) {
      setDocument("invoices", id, dropUndefined(updates as Record<string, unknown>)).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      emit("invoice:updated", { id, updates });
    }
    return result;
  }, [emit, persist]);

  const sendInvoice = useCallback((invoiceId: string): UpdateResult => {
    const sentAt = new Date().toISOString();
    let result: UpdateResult = { ok: true };
    setInvoices((prev) => {
      const current = prev.find((inv) => inv.id === invoiceId);
      if (current && !isValidTransition(current.status, "sent")) {
        result = { ok: false, error: `Cannot send invoice from status ${current.status}` };
        console.warn(`[Mila] ${result.error}`);
        return prev;
      }
      const next = prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "sent" as const, sentAt }
          : inv
      );
      persist(next);
      const sent = next.find((inv) => inv.id === invoiceId);
      if (sent) emit("invoice:sent", sent);
      return next;
    });
    if (result.ok) {
      setDocument("invoices", invoiceId, { status: "sent", sentAt }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    }
    return result;
  }, [emit, persist]);

  const markAsPaid = useCallback((invoiceId: string, transactionId: string): UpdateResult => {
    const paidAt = new Date().toISOString();
    let result: UpdateResult = { ok: true };
    setInvoices((prev) => {
      const current = prev.find((inv) => inv.id === invoiceId);
      // Reject the transition rather than silently accepting; "paid" is terminal
      if (current && !isValidTransition(current.status, "paid")) {
        result = { ok: false, error: `Cannot mark paid from status ${current.status}` };
        console.warn(`[Mila] ${result.error}`);
        return prev;
      }
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
      if (paid) emit("invoice:paid", paid);
      return next;
    });
    if (result.ok) {
      setDocument("invoices", invoiceId, { status: "paid", paidAt, paymentTransactionId: transactionId }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    }
    return result;
  }, [emit, persist]);

  const markAsDeclined = useCallback((invoiceId: string): UpdateResult => {
    const declinedAt = new Date().toISOString();
    let result: UpdateResult = { ok: true };
    setInvoices((prev) => {
      const current = prev.find((inv) => inv.id === invoiceId);
      if (current && !isValidTransition(current.status, "declined")) {
        result = { ok: false, error: `Cannot decline invoice from status ${current.status}` };
        console.warn(`[Mila] ${result.error}`);
        return prev;
      }
      const next = prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "declined" as const, declinedAt }
          : inv
      );
      persist(next);
      const declined = next.find((inv) => inv.id === invoiceId);
      if (declined) emit("invoice:declined", declined);
      return next;
    });
    if (result.ok) {
      setDocument("invoices", invoiceId, { status: "declined", declinedAt }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    }
    return result;
  }, [emit, persist]);

  const deleteInvoice = useCallback((invoiceId: string) => {
    setInvoices((prev) => {
      const next = prev.filter((inv) => inv.id !== invoiceId);
      persist(next);
      return next;
    });
    // Cross-device soft-delete: persist to invoices-config/deleted so other
    // devices' Firestore listeners stop re-adding the row.
    markDeleted("invoices", invoiceId);
    deleteDocument("invoices", invoiceId).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    emit("invoice:updated", { id: invoiceId, updates: { status: "cancelled" } });
  }, [emit, persist]);

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
      setDocument("invoices", id, dropUndefined(invoiceData)).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      emit("invoice:created", newInvoice);
      emit("invoice:paid", newInvoice);
      return newInvoice;
    },
    [emit, persist]
  );

  // Firestore real-time sync
  useEffect(() => {
    pushLocalDeletes("invoices");
    const unsubDeleted = subscribeDeletedSet("invoices");

    const unsub = onCollectionChange<Invoice>("invoices", (firestoreInvoices) => {
      // Re-read fresh on every sync so cross-device deletes propagate
      const currentDeleted = getDeletedSet("invoices");
      setInvoices((prev) => {
        const merged = new Map<string, Invoice>();
        for (const inv of prev) if (!currentDeleted.has(inv.id)) merged.set(inv.id, inv);
        for (const inv of firestoreInvoices) if (!currentDeleted.has(inv.id)) merged.set(inv.id, inv);
        const next = Array.from(merged.values());
        persist(next);
        return next;
      });
    });
    return () => { unsub(); unsubDeleted(); };
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
