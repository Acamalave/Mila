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
import { useToast } from "@/providers/ToastProvider";
import { setDocument, deleteDocument, onCollectionChange } from "@/lib/firestore";

/** Fire-and-forget payment-confirmed notification via the dispatch route. */
function dispatchPaymentConfirmed(invoiceId: string, transactionId: string): void {
  void fetch("/api/notifications/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "payment-confirmed", invoiceId, transactionId }),
  }).catch((err) => console.warn("[Mila] Payment confirmation dispatch failed:", err));
}

interface InvoiceContextValue {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  sendInvoice: (invoiceId: string) => Promise<void>;
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

export function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true; // no-op
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const { emit, on } = useEventBus();
  const { addToast } = useToast();

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

  const sendInvoice = useCallback(async (invoiceId: string): Promise<void> => {
    const currentInvoice = invoices.find((inv) => inv.id === invoiceId);
    if (!currentInvoice) {
      console.warn(`[Mila] sendInvoice: invoice ${invoiceId} not found`);
      return;
    }
    if (!isValidTransition(currentInvoice.status, "sent")) {
      console.warn(
        `[Mila] Cannot send invoice: invalid transition from ${currentInvoice.status}`
      );
      addToast("No se puede enviar esta factura en su estado actual", "error");
      return;
    }

    // Dispatch email + WhatsApp via the server-side route, which resolves the
    // client and builds the templates. We only commit the "sent" status if a
    // channel delivered, or the client simply has no contact info.
    let emailResult: "sent" | "failed" | "skipped" = "skipped";
    let whatsappResult: "sent" | "failed" | "skipped" = "skipped";
    try {
      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "invoice-sent", invoiceId: currentInvoice.id }),
      });
      if (res.ok) {
        const json = await res.json();
        emailResult = json.email ?? "skipped";
        whatsappResult = json.whatsapp ?? "skipped";
      } else {
        emailResult = "failed";
        whatsappResult = "failed";
      }
    } catch (err) {
      console.warn(`[Mila] sendInvoice dispatch failed for ${invoiceId}:`, err);
      emailResult = "failed";
      whatsappResult = "failed";
    }

    const emailSuccess = emailResult === "sent";
    const whatsappSuccess = whatsappResult === "sent";
    const anyFailed = emailResult === "failed" || whatsappResult === "failed";

    // Block the "sent" transition only when a channel was actually attempted
    // and everything failed. Both "skipped" = client has no contact info, which
    // is allowed (admin can deliver the invoice manually).
    if (!emailSuccess && !whatsappSuccess && anyFailed) {
      console.warn(
        `[Mila] sendInvoice(${invoiceId}): all channels failed — invoice status unchanged`
      );
      addToast("No se pudo enviar la factura — verifique la configuración", "error");
      return;
    }

    const sentAt = new Date().toISOString();
    setInvoices((prev) => {
      const next = prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "sent" as const, sentAt }
          : inv
      );
      persist(next);
      const sentInvoice = next.find((inv) => inv.id === invoiceId);
      if (sentInvoice) emit("invoice:sent", sentInvoice);
      return next;
    });
    setDocument("invoices", invoiceId, { status: "sent", sentAt }).catch((err) =>
      console.warn("[Mila] Firestore sync failed:", err)
    );

    if (emailSuccess && whatsappSuccess) {
      addToast("Factura enviada por email y WhatsApp", "success");
    } else if (emailSuccess) {
      addToast("Factura enviada por email", "success");
    } else if (whatsappSuccess) {
      addToast("Factura enviada por WhatsApp", "success");
    } else {
      addToast("Factura marcada como enviada (cliente sin email ni teléfono)", "info");
    }
  }, [invoices, emit, persist, addToast]);

  const markAsPaid = useCallback((invoiceId: string, transactionId: string) => {
    const paidAt = new Date().toISOString();
    let paidInvoice: Invoice | undefined;
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
      paidInvoice = next.find((inv) => inv.id === invoiceId);
      if (paidInvoice) {
        emit("invoice:paid", paidInvoice);
      }
      return next;
    });
    setDocument("invoices", invoiceId, { status: "paid", paidAt, paymentTransactionId: transactionId }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));

    // Fire-and-forget payment confirmation (email + WhatsApp) via dispatch route
    if (!paidInvoice) return;
    dispatchPaymentConfirmed(invoiceId, transactionId);
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
    // Soft-delete so Firestore listener won't re-add it
    const deletedIds = getStoredData<string[]>("mila-invoices-deleted", []);
    if (!deletedIds.includes(invoiceId)) {
      setStoredData("mila-invoices-deleted", [...deletedIds, invoiceId]);
    }
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

      // Fire-and-forget payment confirmation (email + WhatsApp) via dispatch route
      dispatchPaymentConfirmed(newInvoice.id, transactionId);

      return newInvoice;
    },
    [emit, persist]
  );

  // Client-side overdue fallback: on mount, flag any "sent" invoices older
  // than 14 days as "overdue" (in case the daily cron hasn't run yet).
  // Only touches Firestore for invoices that actually changed.
  useEffect(() => {
    const OVERDUE_MS = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    setInvoices((prev) => {
      let changed = false;
      const next = prev.map((inv) => {
        if (inv.status !== "sent") return inv;
        const reference = inv.sentAt ?? inv.createdAt;
        if (!reference) return inv;
        const ts = new Date(reference).getTime();
        if (Number.isNaN(ts)) return inv;
        if (now - ts < OVERDUE_MS) return inv;

        changed = true;
        const overdueAt = new Date().toISOString();
        // Fire-and-forget Firestore sync; only happens when state changes
        setDocument("invoices", inv.id, { status: "overdue", overdueAt }).catch((err) =>
          console.warn("[Mila] Firestore overdue flag failed:", err)
        );
        return { ...inv, status: "overdue" as const, overdueAt };
      });
      if (!changed) return prev;
      persist(next);
      return next;
    });
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Firestore real-time sync
  useEffect(() => {
    const unsub = onCollectionChange<Invoice>("invoices", (firestoreInvoices) => {
      if (firestoreInvoices.length > 0) {
        // Re-read deleted IDs fresh on every sync
        const currentDeleted = new Set(getStoredData<string[]>("mila-invoices-deleted", []));
        setInvoices((prev) => {
          const merged = new Map<string, Invoice>();
          for (const inv of prev) if (!currentDeleted.has(inv.id)) merged.set(inv.id, inv);
          for (const inv of firestoreInvoices) if (!currentDeleted.has(inv.id)) merged.set(inv.id, inv);
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
