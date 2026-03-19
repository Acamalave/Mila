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
import type { CommissionRecord, Booking } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { useEventBus } from "@/providers/EventBusProvider";
import { setDocument, onCollectionChange } from "@/lib/firestore";
import { useStaff } from "@/providers/StaffProvider";
import { services } from "@/data/services";

interface CommissionContextValue {
  commissions: CommissionRecord[];
  generateCommission: (booking: Booking) => void;
  markCommissionPaid: (commissionId: string) => void;
  markAllPaidForStylist: (stylistId: string) => void;
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
        const service = services.find((s) => s.id === serviceId);
        if (!service) continue;

        // Find commission rate: specific service override > default
        const serviceOverride = stylist.serviceCommissions?.find(
          (sc) => sc.serviceId === serviceId
        );
        const rate = serviceOverride?.percentage ?? stylist.defaultCommission ?? 40;

        const commissionAmount = (service.price * rate) / 100;

        newRecords.push({
          id: `comm-${generateId()}`,
          stylistId: stylist.id,
          bookingId: booking.id,
          serviceId,
          serviceAmount: service.price,
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
    const unsub = onCollectionChange<CommissionRecord>("commissions", (firestoreCommissions) => {
      if (firestoreCommissions.length > 0) {
        setCommissions((prev) => {
          const merged = new Map<string, CommissionRecord>();
          for (const c of prev) merged.set(c.id, c);
          for (const c of firestoreCommissions) merged.set(c.id, c);
          const next = Array.from(merged.values());
          persist(next);
          return next;
        });
      }
    });
    return () => unsub();
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

  const value = useMemo(
    () => ({
      commissions,
      generateCommission,
      markCommissionPaid,
      markAllPaidForStylist,
      getCommissionsForStylist,
      getStylistEarnings,
    }),
    [commissions, generateCommission, markCommissionPaid, markAllPaidForStylist, getCommissionsForStylist, getStylistEarnings]
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
