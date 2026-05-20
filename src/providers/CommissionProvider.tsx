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
  buildCommissionsForInvoice,
  commissionRateFor as commissionRateForItem,
  type CommissionWarning,
} from "@/lib/commissions";
import {
  getDeletedSet,
  markDeleted,
  pushLocalDeletes,
  subscribeDeletedSet,
} from "@/lib/deleted-set";

interface CommissionContextValue {
  commissions: CommissionRecord[];
  generateCommission: (booking: Booking) => void;
  generatePOSCommissions: (invoice: Invoice) => void;
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

// Bookings only generate service commissions (products are sold via invoices),
// so we hardcode "service" when calling the shared helper from the booking path.
function commissionRateForBooking(stylist: Stylist, serviceId: string): number {
  return commissionRateForItem(stylist, serviceId, "service");
}

/** Best-effort warning persistence — never blocks the main flow. */
function persistCommissionWarning(warning: CommissionWarning): void {
  console.warn("[Commissions] Unattributable commission:", warning);
  const id = `warn-${warning.invoiceId}-${warning.itemIndex}-${warning.reason}`;
  void setDocument("commissionWarnings", id, {
    ...warning,
    createdAt: new Date().toISOString(),
    resolved: false,
  }).catch((err) =>
    console.warn("[Commissions] commissionWarning persistence failed:", err)
  );
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

        const rate = commissionRateForBooking(stylist, serviceId);
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
  //
  // Idempotent: deterministic IDs from buildCommissionId mean that if the
  // server-side webhook generates the same records first, this call is a
  // no-op merge in Firestore.
  const generateCommissionFromInvoice = useCallback(
    (invoice: Invoice) => {
      const stylistsById = new Map<string, Stylist>(
        allStylists.map((s) => [s.id, s])
      );
      const { records, warnings } = buildCommissionsForInvoice(
        invoice,
        stylistsById
      );

      // Surface anything we couldn't attribute so admin sees it in the
      // commissionWarnings collection instead of losing the payout silently.
      for (const warning of warnings) {
        // `non_billable_item_type` fires for every non-service/product line
        // (tips, fees, etc) — too noisy to persist. Only surface the genuine
        // attribution failures.
        if (warning.reason === "non_billable_item_type") continue;
        persistCommissionWarning(warning);
      }

      if (records.length === 0) return;

      setCommissions((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        for (const rec of records) {
          // Preserve any existing record's status/paidAt — never overwrite a
          // paid commission back to pending if the webhook re-fires.
          const existing = byId.get(rec.id);
          byId.set(rec.id, existing ? { ...rec, status: existing.status, paidAt: existing.paidAt } : rec);
        }
        const next = Array.from(byId.values());
        persist(next);
        return next;
      });

      for (const rec of records) {
        const { id, ...data } = rec;
        setDocument("commissions", id, data).catch((err) =>
          console.warn("[Mila] Firestore sync failed:", err)
        );
      }
    },
    [allStylists, persist]
  );

  // Public POS helper — called from the POS counter-payment flow to guarantee
  // that commissions are generated even if the `invoice:paid` event listener
  // missed the emission (e.g. due to event-bus ordering during hot reload).
  const generatePOSCommissions = useCallback(
    (invoice: Invoice) => {
      generateCommissionFromInvoice(invoice);
    },
    [generateCommissionFromInvoice]
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
      generatePOSCommissions,
      markCommissionPaid,
      markAllPaidForStylist,
      deleteCommission,
      getCommissionsForStylist,
      getStylistEarnings,
    }),
    [commissions, generateCommission, generatePOSCommissions, markCommissionPaid, markAllPaidForStylist, deleteCommission, getCommissionsForStylist, getStylistEarnings]
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
