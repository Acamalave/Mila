"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { CommissionRecord, Booking, Invoice, Stylist } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { useEventBus } from "@/providers/EventBusProvider";
import { setDocument, deleteDocument, onCollectionChange } from "@/lib/firestore";
import { useStaff } from "@/providers/StaffProvider";
import { getEffectivePrice } from "@/lib/service-overrides";
import {
  getDeletedSet,
  markDeleted,
  pushLocalDeletes,
  subscribeDeletedSet,
} from "@/lib/deleted-set";

interface CommissionContextValue {
  commissions: CommissionRecord[];
  generateCommission: (booking: Booking) => void;
  markCommissionPaid: (commissionId: string) => void;
  markAllPaidForStylist: (stylistId: string) => void;
  deleteCommission: (commissionId: string) => void;
  getCommissionsForStylist: (stylistId: string) => CommissionRecord[];
  getStylistEarnings: (stylistId: string, period?: "week" | "month" | "all") => {
    total: number;
    pending: number;
    paid: number;
  };
}

const CommissionContext = createContext<CommissionContextValue | null>(null);

function getStartOfPeriod(period: "week" | "month"): Date {
  const now = new Date();
  if (period === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
}

function commissionRateFor(stylist: Stylist, serviceId: string): number {
  const override = stylist.serviceCommissions?.find((sc) => sc.serviceId === serviceId);
  return override?.percentage ?? stylist.defaultCommission ?? 40;
}

export function CommissionProvider({ children }: { children: ReactNode }) {
  const { on } = useEventBus();
  const { allStylists } = useStaff();

  const [commissions, setCommissions] = useState<CommissionRecord[]>(() =>
    getStoredData<CommissionRecord[]>("mila-commissions", [])
  );

  const persist = useCallback((next: CommissionRecord[]) => {
    setStoredData("mila-commissions", next);
  }, []);

  const generateCommission = useCallback(
    (booking: Booking) => {
      if (booking.status !== "completed") return;

      // Check if commissions already exist for this booking
      const existing = commissions.some((c) => c.bookingId === booking.id);
      if (existing) return;

      const stylist = allStylists.find((s) => s.id === booking.stylistId);
      if (!stylist) return;

      const newRecords: CommissionRecord[] = [];

      for (const serviceId of booking.serviceIds) {
        // Use admin-overridden price (priceOverrides) — falls back to seed price
        const servicePrice = getEffectivePrice(serviceId);
        if (servicePrice <= 0) continue;

        const rate = commissionRateFor(stylist, serviceId);
        const commissionAmount = (servicePrice * rate) / 100;

        newRecords.push({
          id: `comm-${generateId()}`,
          stylistId: stylist.id,
          bookingId: booking.id,
          serviceId,
          serviceAmount: servicePrice,
          commissionRate: rate,
          commissionAmount,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }

      if (newRecords.length > 0) {
        setCommissions((prev) => {
          const next = [...prev, ...newRecords];
          persist(next);
          return next;
        });
        for (const rec of newRecords) {
          const { id, ...data } = rec;
          setDocument("commissions", id, data).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
        }
      }
    },
    [allStylists, commissions, persist]
  );

  // Generate commissions for a paid invoice — per-item stylist attribution.
  // Each invoice item may carry its own stylistId (set in POS / billing modal);
  // when missing, falls back to the invoice-level stylistId. This is what the
  // "per-service stylist assignment" feature needs to correctly split earnings
  // when a single invoice contains services from multiple stylists.
  const generateCommissionFromInvoice = useCallback(
    (invoice: Invoice) => {
      if (invoice.status !== "paid") return;
      if (!invoice.items || invoice.items.length === 0) return;

      // Idempotency: don't double-generate for the same invoice
      const existing = commissions.some((c) => c.invoiceId === invoice.id);
      if (existing) return;

      const newRecords: CommissionRecord[] = [];

      for (const item of invoice.items) {
        if (item.type !== "service") continue;

        // Per-item attribution wins; fall back to invoice-level stylistId
        const itemStylistId = item.stylistId ?? invoice.stylistId;
        if (!itemStylistId) continue;

        const stylist = allStylists.find((s) => s.id === itemStylistId);
        if (!stylist) continue;

        const rate = commissionRateFor(stylist, item.id);
        const lineTotal = item.price * item.quantity;
        const commissionAmount = (lineTotal * rate) / 100;

        newRecords.push({
          id: `comm-${generateId()}`,
          stylistId: stylist.id,
          invoiceId: invoice.id,
          serviceId: item.id,
          serviceAmount: lineTotal,
          commissionRate: rate,
          commissionAmount,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }

      if (newRecords.length > 0) {
        setCommissions((prev) => {
          // Double-check no duplicates (race against concurrent invoice:paid)
          if (prev.some((c) => c.invoiceId === invoice.id)) return prev;
          const next = [...prev, ...newRecords];
          persist(next);
          return next;
        });
        for (const rec of newRecords) {
          const { id, ...data } = rec;
          setDocument("commissions", id, data).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
        }
      }
    },
    [allStylists, commissions, persist]
  );

  const markCommissionPaid = useCallback(
    (commissionId: string) => {
      const paidAt = new Date().toISOString();
      setCommissions((prev) => {
        const next = prev.map((c) =>
          c.id === commissionId
            ? { ...c, status: "paid" as const, paidAt }
            : c
        );
        persist(next);
        return next;
      });
      setDocument("commissions", commissionId, { status: "paid", paidAt }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    },
    [persist]
  );

  const markAllPaidForStylist = useCallback(
    (stylistId: string) => {
      const paidAt = new Date().toISOString();
      setCommissions((prev) => {
        const next = prev.map((c) => {
          if (c.stylistId === stylistId && c.status === "pending") {
            const updated = { ...c, status: "paid" as const, paidAt };
            setDocument("commissions", c.id, { status: "paid", paidAt }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
            return updated;
          }
          return c;
        });
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const deleteCommission = useCallback((commissionId: string) => {
    setCommissions((prev) => {
      const next = prev.filter((c) => c.id !== commissionId);
      persist(next);
      return next;
    });
    markDeleted("commissions", commissionId);
    deleteDocument("commissions", commissionId).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
  }, [persist]);

  const getCommissionsForStylist = useCallback(
    (stylistId: string) =>
      commissions
        .filter((c) => c.stylistId === stylistId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [commissions]
  );

  const getStylistEarnings = useCallback(
    (stylistId: string, period: "week" | "month" | "all" = "all") => {
      let filtered = commissions.filter((c) => c.stylistId === stylistId);

      if (period !== "all") {
        const start = getStartOfPeriod(period);
        filtered = filtered.filter((c) => new Date(c.createdAt) >= start);
      }

      return {
        total: filtered.reduce((sum, c) => sum + c.commissionAmount, 0),
        pending: filtered
          .filter((c) => c.status === "pending")
          .reduce((sum, c) => sum + c.commissionAmount, 0),
        paid: filtered
          .filter((c) => c.status === "paid")
          .reduce((sum, c) => sum + c.commissionAmount, 0),
      };
    },
    [commissions]
  );

  // Firestore real-time sync
  useEffect(() => {
    pushLocalDeletes("commissions");
    const unsubDeleted = subscribeDeletedSet("commissions");

    const unsub = onCollectionChange<CommissionRecord>("commissions", (firestoreCommissions) => {
      // Re-read deleted set fresh — closures over a snapshot would miss runtime deletes
      const currentDeleted = getDeletedSet("commissions");
      setCommissions((prev) => {
        const merged = new Map<string, CommissionRecord>();
        for (const c of prev) if (!currentDeleted.has(c.id)) merged.set(c.id, c);
        for (const c of firestoreCommissions) if (!currentDeleted.has(c.id)) merged.set(c.id, c);
        const next = Array.from(merged.values());
        persist(next);
        return next;
      });
    });
    return () => { unsub(); unsubDeleted(); };
  }, [persist]);

  // Listen for booking updates to auto-generate commissions
  useEffect(() => {
    const unsub = on("booking:updated", (payload) => {
      const booking = payload as Booking;
      if (booking?.status === "completed") {
        generateCommission(booking);
      }
    });
    return unsub;
  }, [on, generateCommission]);

  // Listen for invoice payments to auto-generate commissions (POS sales)
  useEffect(() => {
    const unsub = on("invoice:paid", (payload) => {
      const invoice = payload as Invoice;
      if (invoice?.status === "paid") {
        generateCommissionFromInvoice(invoice);
      }
    });
    return unsub;
  }, [on, generateCommissionFromInvoice]);

  const value = useMemo(
    () => ({
      commissions,
      generateCommission,
      markCommissionPaid,
      markAllPaidForStylist,
      deleteCommission,
      getCommissionsForStylist,
      getStylistEarnings,
    }),
    [commissions, generateCommission, markCommissionPaid, markAllPaidForStylist, deleteCommission, getCommissionsForStylist, getStylistEarnings]
  );

  return (
    <CommissionContext.Provider value={value}>
      {children}
    </CommissionContext.Provider>
  );
}

export function useCommissions(): CommissionContextValue {
  const context = useContext(CommissionContext);
  if (!context) throw new Error("useCommissions must be used within a CommissionProvider");
  return context;
}
