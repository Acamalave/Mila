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

interface InvoiceContextValue {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  sendInvoice: (invoiceId: string) => void;
  markAsPaid: (invoiceId: string, transactionId: string) => void;
  deleteInvoice: (invoiceId: string) => void;
  getInvoicesForClient: (clientId: string) => Invoice[];
  createAndPayInvoice: (data: Omit<Invoice, "id" | "createdAt">, transactionId: string) => Invoice;
}

const InvoiceContext = createContext<InvoiceContextValue | null>(null);

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const { emit, on } = useEventBus();

  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    getStoredData<Invoice[]>("mila-invoices", [])
  );

  const persist = useCallback((next: Invoice[]) => {
    setStoredData("mila-invoices", next);
  }, []);

  const addInvoice = useCallback((data: Omit<Invoice, "id" | "createdAt">) => {
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
    emit("invoice:created", newInvoice);
  }, [emit, persist]);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) => {
      const next = prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv));
      persist(next);
      return next;
    });
    emit("invoice:updated", { id, updates });
  }, [emit, persist]);

  const sendInvoice = useCallback((invoiceId: string) => {
    setInvoices((prev) => {
      const next = prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "sent" as const, sentAt: new Date().toISOString() }
          : inv
      );
      persist(next);
      const sent = next.find((inv) => inv.id === invoiceId);
      if (sent) {
        emit("invoice:sent", sent);
      }
      return next;
    });
  }, [emit, persist]);

  const markAsPaid = useCallback((invoiceId: string, transactionId: string) => {
    setInvoices((prev) => {
      const next = prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: "paid" as const,
              paidAt: new Date().toISOString(),
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
  }, [emit, persist]);

  const deleteInvoice = useCallback((invoiceId: string) => {
    setInvoices((prev) => {
      const next = prev.filter((inv) => inv.id !== invoiceId);
      persist(next);
      return next;
    });
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
      emit("invoice:created", newInvoice);
      emit("invoice:paid", newInvoice);
      return newInvoice;
    },
    [emit, persist]
  );

  useEffect(() => {
    const unsubs = [
      on("invoice:created", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
      on("invoice:updated", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
      on("invoice:sent", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
      on("invoice:paid", () => setInvoices(getStoredData<Invoice[]>("mila-invoices", []))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on]);

  return (
    <InvoiceContext.Provider
      value={{ invoices, addInvoice, updateInvoice, sendInvoice, markAsPaid, deleteInvoice, getInvoicesForClient, createAndPayInvoice }}
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
