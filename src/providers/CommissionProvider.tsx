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
import { setDocument, deleteDocument, onCollectionChange, getCollection } from "@/lib/firestore";
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
  /** Delete every commission record tied to a given invoice id. */
  deleteCommissionsForInvoice: (invoiceId: string) => void;
  /**
   * Sweep every commission whose invoiceId no longer corresponds to a live
   * invoice in FIRESTORE and remove it. Async because it fetches the
   * authoritative invoice list instead of trusting this device's cache.
   * Returns the number of orphans cleaned.
   */
  cleanupOrphanedCommissions: () => Promise<number>;
  /**
   * One-shot recovery action: cleans orphan commissions, then regenerates
   * commissions for every paid invoice in Firestore using the latest
   * stylist data. Use after schema changes or to backfill missing rows
   * (e.g. stamping workDate on records created before that field existed).
   * Returns a summary {regenerated, orphansRemoved}.
   */
  rebuildAllCommissions: () => Promise<{ regenerated: number; orphansRemoved: number }>;
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
          workDate: booking.date,
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

  // ── Lifecycle reactions to invoice changes ─────────────────────────────
  // When an invoice is updated, declined, or deleted, the commissions that
  // were derived from it become stale: the amount may have changed, the
  // stylist may have been re-assigned, or the whole invoice may no longer
  // exist. Operators expect the commissions list to reflect this within
  // seconds — not stay frozen with phantom entries.

  /** Drop every commission row whose `invoiceId` matches the given id. */
  const deleteCommissionsForInvoice = useCallback(
    (invoiceId: string) => {
      const idsToDelete: string[] = [];
      setCommissions((prev) => {
        const next: CommissionRecord[] = [];
        for (const c of prev) {
          if (c.invoiceId === invoiceId) idsToDelete.push(c.id);
          else next.push(c);
        }
        if (idsToDelete.length === 0) return prev;
        persist(next);
        return next;
      });
      for (const id of idsToDelete) {
        markDeleted("commissions", id);
        deleteDocument("commissions", id).catch((err) =>
          console.warn("[Commissions] delete failed:", id, err)
        );
      }
      if (idsToDelete.length > 0) {
        console.log(
          `[Commissions] Removed ${idsToDelete.length} record(s) for invoice ${invoiceId}`
        );
      }
    },
    [persist]
  );

  /**
   * Regenerate commissions for an invoice — used when the invoice's items,
   * amount, discount, or per-item stylist assignment changes after it was
   * already paid. Behaviour:
   *  • Compute the FRESH set of records from the latest invoice data.
   *  • Delete any old records for this invoice whose ids are NOT in the
   *    fresh set (items removed, stylist re-assigned, etc.).
   *  • Upsert the fresh set. If a record already exists with status "paid",
   *    that status is preserved — we never re-open a settled payout.
   */
  const regenerateCommissionsForInvoice = useCallback(
    (invoice: Invoice) => {
      const stylistsById = new Map<string, Stylist>(
        allStylists.map((s) => [s.id, s])
      );
      const { records, warnings } = buildCommissionsForInvoice(
        invoice,
        stylistsById
      );

      for (const warning of warnings) {
        if (warning.reason === "non_billable_item_type") continue;
        persistCommissionWarning(warning);
      }

      const newIds = new Set(records.map((r) => r.id));
      const toDelete: string[] = [];

      setCommissions((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        // Find stale records for this invoice — ids no longer in the fresh set
        for (const c of prev) {
          if (c.invoiceId === invoice.id && !newIds.has(c.id)) {
            toDelete.push(c.id);
            byId.delete(c.id);
          }
        }
        // Upsert fresh records (preserve status if already settled)
        for (const rec of records) {
          const existing = byId.get(rec.id);
          byId.set(
            rec.id,
            existing
              ? { ...rec, status: existing.status, paidAt: existing.paidAt }
              : rec
          );
        }
        const next = Array.from(byId.values());
        persist(next);
        return next;
      });

      for (const id of toDelete) {
        markDeleted("commissions", id);
        deleteDocument("commissions", id).catch((err) =>
          console.warn("[Commissions] delete failed:", id, err)
        );
      }
      for (const rec of records) {
        const { id, ...data } = rec;
        setDocument("commissions", id, data).catch((err) =>
          console.warn("[Mila] Firestore sync failed:", err)
        );
      }
    },
    [allStylists, persist]
  );

  /**
   * Find commissions whose source invoice no longer exists and delete them.
   *
   * IMPORTANT: verifies against the invoices that actually live in
   * FIRESTORE, never against this browser's local cache. A device with a
   * partial/stale invoice cache used to tombstone perfectly valid
   * commissions for every device — that's how live commissions ended up
   * hidden in production. An invoice counts as gone only when its document
   * is missing from Firestore or its id is in the cross-device deleted set.
   *
   * Returns the number of orphan records removed so admin UI can surface a
   * toast.
   */
  const cleanupOrphanedCommissions = useCallback(async (): Promise<number> => {
    let firestoreInvoices: Invoice[];
    try {
      firestoreInvoices = await getCollection<Invoice>("invoices");
    } catch (err) {
      console.warn("[Commissions] Orphan cleanup skipped — could not read invoices from Firestore:", err);
      return 0;
    }
    if (firestoreInvoices.length === 0 && commissions.length > 0) {
      // Safety guard — an empty read on a database that clearly has activity
      // is more likely an outage than a truly empty collection.
      console.warn("[Commissions] Skipping orphan cleanup — Firestore returned no invoices");
      return 0;
    }
    const deletedInvoices = getDeletedSet("invoices");
    const liveIds = new Set(
      firestoreInvoices.filter((i) => !deletedInvoices.has(i.id)).map((i) => i.id)
    );
    const orphans: string[] = [];
    for (const c of commissions) {
      if (c.invoiceId && !liveIds.has(c.invoiceId)) orphans.push(c.id);
    }
    if (orphans.length === 0) return 0;
    const orphanSet = new Set(orphans);
    setCommissions((prev) => {
      const next = prev.filter((c) => !orphanSet.has(c.id));
      persist(next);
      return next;
    });
    for (const id of orphans) {
      markDeleted("commissions", id);
      deleteDocument("commissions", id).catch((err) =>
        console.warn("[Commissions] orphan delete failed:", id, err)
      );
    }
    console.log(`[Commissions] Cleaned ${orphans.length} orphan record(s)`);
    return orphans.length;
  }, [commissions, persist]);

  /**
   * Run a full rebuild: clean orphans + regenerate commissions for every
   * paid invoice using the latest staff/stylist data. Use this when:
   *   • the operator changed a stylist's commission rate
   *   • the commission rules in lib/commissions changed
   *   • there's drift between commissions and what the invoices say
   */
  const rebuildAllCommissions = useCallback(async (): Promise<{
    regenerated: number;
    orphansRemoved: number;
  }> => {
    const orphansRemoved = await cleanupOrphanedCommissions();
    // Regenerate from Firestore — the shared source of truth — so a device
    // with a stale local cache can't rebuild from outdated invoice data.
    let liveInvoices: Invoice[];
    try {
      liveInvoices = await getCollection<Invoice>("invoices");
    } catch (err) {
      console.warn("[Commissions] Rebuild aborted — could not read invoices from Firestore:", err);
      return { regenerated: 0, orphansRemoved };
    }
    const deletedInvoices = getDeletedSet("invoices");
    const paidInvoices = liveInvoices.filter(
      (i) => i.status === "paid" && !deletedInvoices.has(i.id)
    );
    for (const inv of paidInvoices) {
      regenerateCommissionsForInvoice(inv);
    }
    console.log(
      `[Commissions] Rebuild done — regenerated ${paidInvoices.length} invoice(s), removed ${orphansRemoved} orphan(s)`
    );
    return { regenerated: paidInvoices.length, orphansRemoved };
  }, [cleanupOrphanedCommissions, regenerateCommissionsForInvoice]);

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
        // Filter by the date the work happened (workDate), not by when the
        // record was typed into the system.
        filtered = filtered.filter(
          (c) => new Date(c.workDate ?? c.createdAt) >= start
        );
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

  /**
   * Keep commissions in sync with invoice edits. Three signals:
   *   • invoice:updated — re-read the latest invoice from local storage.
   *     If still paid → regenerate (covers edited items / amount / stylist).
   *     If now non-paid → wipe the commissions (status was downgraded).
   *   • invoice:declined — drop commissions outright.
   *   • invoice:deleted — drop commissions outright.
   *
   * Using localStorage as the source of truth here is intentional —
   * CommissionProvider is mounted ABOVE InvoiceProvider in the tree, so
   * we can't useInvoices() from inside. The InvoiceProvider already
   * persists every mutation through `persist()` before emitting the
   * corresponding event, so this read is always fresh.
   */
  useEffect(() => {
    const unsubs = [
      on("invoice:updated", (payload) => {
        const id =
          (payload as { id?: string } | undefined)?.id ??
          (payload as Invoice | undefined)?.id;
        if (!id) return;
        const liveInvoices = getStoredData<Invoice[]>("mila-invoices", []);
        const current = liveInvoices.find((i) => i.id === id);
        if (!current) {
          // Invoice no longer exists (race: delete via another tab) — wipe.
          deleteCommissionsForInvoice(id);
          return;
        }
        if (current.status === "paid") {
          regenerateCommissionsForInvoice(current);
        } else {
          deleteCommissionsForInvoice(id);
        }
      }),
      on("invoice:declined", (payload) => {
        const invoice = payload as Invoice | undefined;
        if (invoice?.id) deleteCommissionsForInvoice(invoice.id);
      }),
      on("invoice:deleted", (payload) => {
        const id = (payload as { id?: string } | undefined)?.id;
        if (id) deleteCommissionsForInvoice(id);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [
    on,
    regenerateCommissionsForInvoice,
    deleteCommissionsForInvoice,
  ]);

  // NOTE: there used to be an automatic, debounced orphan cleanup here that
  // ran on every device whenever the commissions set settled. It compared
  // against the local invoice cache and repeatedly tombstoned valid
  // commissions from devices with partial caches. Cleanup is now explicit —
  // admin triggers it from the billing page (Rebuild) — and verifies against
  // Firestore.

  const value = useMemo(
    () => ({
      commissions,
      generateCommission,
      generatePOSCommissions,
      markCommissionPaid,
      markAllPaidForStylist,
      deleteCommission,
      deleteCommissionsForInvoice,
      cleanupOrphanedCommissions,
      rebuildAllCommissions,
      getCommissionsForStylist,
      getStylistEarnings,
    }),
    [
      commissions,
      generateCommission,
      generatePOSCommissions,
      markCommissionPaid,
      markAllPaidForStylist,
      deleteCommission,
      deleteCommissionsForInvoice,
      cleanupOrphanedCommissions,
      rebuildAllCommissions,
      getCommissionsForStylist,
      getStylistEarnings,
    ]
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
