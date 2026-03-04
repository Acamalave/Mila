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
import type { Stylist, StylistSchedule } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { stylists as seedStylists } from "@/data/stylists";
import { useEventBus } from "@/providers/EventBusProvider";

interface StaffContextValue {
  allStylists: Stylist[];
  addStylist: (stylist: Omit<Stylist, "id">) => void;
  updateStylist: (id: string, updates: Partial<Stylist>) => void;
  deleteStylist: (id: string) => void;
  updateSchedule: (stylistId: string, schedule: StylistSchedule[]) => void;
  getStylistByPhone: (phone: string) => Stylist | undefined;
  getStylistByUserId: (userId: string) => Stylist | undefined;
}

const StaffContext = createContext<StaffContextValue | null>(null);

function mergeStylists(
  customStylists: Stylist[],
  scheduleOverrides: Record<string, StylistSchedule[]>,
  detailOverrides: Record<string, Partial<Stylist>>,
  deletedIds: string[]
): Stylist[] {
  const base = seedStylists
    .filter((s) => !deletedIds.includes(s.id))
    .map((s) => {
      const details = detailOverrides[s.id];
      const schedule = scheduleOverrides[s.id];
      return {
        ...s,
        ...(details || {}),
        ...(schedule ? { schedule } : {}),
      } as Stylist;
    });

  const custom = customStylists
    .filter((s) => !deletedIds.includes(s.id))
    .map((s) => {
      const schedule = scheduleOverrides[s.id];
      return schedule ? { ...s, schedule } : s;
    });

  return [...base, ...custom];
}

export function StaffProvider({ children }: { children: ReactNode }) {
  const { emit, on } = useEventBus();

  const [customStylists, setCustomStylists] = useState<Stylist[]>(() =>
    getStoredData<Stylist[]>("mila-staff-custom", [])
  );
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, StylistSchedule[]>>(() =>
    getStoredData<Record<string, StylistSchedule[]>>("mila-staff-schedules", {})
  );
  const [detailOverrides, setDetailOverrides] = useState<Record<string, Partial<Stylist>>>(() =>
    getStoredData<Record<string, Partial<Stylist>>>("mila-staff-detail-overrides", {})
  );
  const [deletedIds, setDeletedIds] = useState<string[]>(() =>
    getStoredData<string[]>("mila-staff-deleted", [])
  );

  const allStylists = useMemo(
    () => mergeStylists(customStylists, scheduleOverrides, detailOverrides, deletedIds),
    [customStylists, scheduleOverrides, detailOverrides, deletedIds]
  );

  const addStylist = useCallback((data: Omit<Stylist, "id">) => {
    const newStylist: Stylist = { ...data, id: `stylist-custom-${generateId()}` };
    setCustomStylists((prev) => {
      const next = [...prev, newStylist];
      setStoredData("mila-staff-custom", next);
      return next;
    });
    emit("staff:created", newStylist);
  }, [emit]);

  const updateStylist = useCallback((id: string, updates: Partial<Stylist>) => {
    const isCustom = customStylists.some((s) => s.id === id);
    if (isCustom) {
      setCustomStylists((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        setStoredData("mila-staff-custom", next);
        return next;
      });
    } else {
      setDetailOverrides((prev) => {
        const next = { ...prev, [id]: { ...(prev[id] || {}), ...updates } };
        setStoredData("mila-staff-detail-overrides", next);
        return next;
      });
    }
    emit("staff:updated", { id, updates });
  }, [customStylists, emit]);

  const deleteStylist = useCallback((id: string) => {
    const isCustom = customStylists.some((s) => s.id === id);
    if (isCustom) {
      setCustomStylists((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setStoredData("mila-staff-custom", next);
        return next;
      });
    } else {
      setDeletedIds((prev) => {
        const next = [...prev, id];
        setStoredData("mila-staff-deleted", next);
        return next;
      });
    }
    emit("staff:deleted", id);
  }, [customStylists, emit]);

  const updateSchedule = useCallback((stylistId: string, schedule: StylistSchedule[]) => {
    setScheduleOverrides((prev) => {
      const next = { ...prev, [stylistId]: schedule };
      setStoredData("mila-staff-schedules", next);
      return next;
    });
    emit("staff:updated", { id: stylistId, schedule });
  }, [emit]);

  const getStylistByPhone = useCallback(
    (phone: string) => allStylists.find((s) => s.linkedPhone === phone),
    [allStylists]
  );

  const getStylistByUserId = useCallback(
    (userId: string) => allStylists.find((s) => s.linkedUserId === userId),
    [allStylists]
  );

  // Listen for cross-tab events
  useEffect(() => {
    const unsubs = [
      on("staff:created", () => {
        setCustomStylists(getStoredData<Stylist[]>("mila-staff-custom", []));
      }),
      on("staff:updated", () => {
        setScheduleOverrides(getStoredData<Record<string, StylistSchedule[]>>("mila-staff-schedules", {}));
        setDetailOverrides(getStoredData<Record<string, Partial<Stylist>>>("mila-staff-detail-overrides", {}));
        setCustomStylists(getStoredData<Stylist[]>("mila-staff-custom", []));
      }),
      on("staff:deleted", () => {
        setCustomStylists(getStoredData<Stylist[]>("mila-staff-custom", []));
        setDeletedIds(getStoredData<string[]>("mila-staff-deleted", []));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on]);

  return (
    <StaffContext.Provider value={{ allStylists, addStylist, updateStylist, deleteStylist, updateSchedule, getStylistByPhone, getStylistByUserId }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff(): StaffContextValue {
  const context = useContext(StaffContext);
  if (!context) throw new Error("useStaff must be used within a StaffProvider");
  return context;
}
