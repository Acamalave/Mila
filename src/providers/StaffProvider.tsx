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
import type { Stylist, StylistSchedule, User } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { stylists as seedStylists } from "@/data/stylists";
import { useEventBus } from "@/providers/EventBusProvider";
import { setDocument, deleteDocument, onCollectionChange, syncArrayToDoc, onDocumentChange, onArrayDocChange } from "@/lib/firestore";

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
  const safeDeleted = Array.isArray(deletedIds) ? deletedIds : [];
  const base = seedStylists
    .filter((s) => !safeDeleted.includes(s.id))
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
    .filter((s) => !safeDeleted.includes(s.id))
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
    const userId = data.linkedPhone ? `user-${data.linkedPhone}` : undefined;
    const newStylist: Stylist = {
      ...data,
      id: `stylist-custom-${generateId()}`,
      ...(userId && { linkedUserId: userId }),
    };
    setCustomStylists((prev) => {
      const next = [...prev, newStylist];
      setStoredData("mila-staff-custom", next);
      return next;
    });
    const { id, ...stylistData } = newStylist;
    setDocument("staff", id, stylistData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));

    // Auto-create user account for the stylist if linkedPhone is provided
    if (data.linkedPhone) {
      const userRecord: Omit<User, "id"> = {
        name: data.name,
        phone: data.linkedPhone,
        countryCode: "+507",
        role: "stylist",
        createdAt: new Date().toISOString(),
      };
      // Add to local user registry
      const registry = getStoredData<User[]>("mila-users", []);
      const exists = registry.some((u) => u.phone === data.linkedPhone);
      if (!exists) {
        registry.push({ id: userId!, ...userRecord });
        setStoredData("mila-users", registry);
      } else {
        // Update existing user's role to stylist
        const updated = registry.map((u) => u.phone === data.linkedPhone ? { ...u, role: "stylist" as const, name: data.name } : u);
        setStoredData("mila-users", updated);
      }
      // Sync to Firestore
      setDocument("users", userId!, userRecord).catch((err) => console.warn("[Mila] User sync failed:", err));
    }

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
      setDocument("staff", id, updates as Record<string, unknown>).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    } else {
      setDetailOverrides((prev) => {
        const next = { ...prev, [id]: { ...(prev[id] || {}), ...updates } };
        setStoredData("mila-staff-detail-overrides", next);
        syncArrayToDoc("staff-config", "detail-overrides", Object.entries(next).map(([k, v]) => ({ id: k, ...v }))).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
        return next;
      });
    }
    emit("staff:updated", { id, updates });
  }, [customStylists, emit]);

  const deleteStylist = useCallback(async (id: string) => {
    const isCustom = customStylists.some((s) => s.id === id);

    // Always track in deletedIds so the listener never re-adds it
    setDeletedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      setStoredData("mila-staff-deleted", next);
      setDocument("staff-config", "deleted", { ids: next }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      return next;
    });

    if (isCustom) {
      setCustomStylists((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setStoredData("mila-staff-custom", next);
        return next;
      });
      try {
        await deleteDocument("staff", id);
      } catch (err) {
        console.warn("[Mila] Firestore sync failed:", err);
      }
    }
    emit("staff:deleted", id);
  }, [customStylists, emit]);

  const updateSchedule = useCallback((stylistId: string, schedule: StylistSchedule[]) => {
    setScheduleOverrides((prev) => {
      const next = { ...prev, [stylistId]: schedule };
      setStoredData("mila-staff-schedules", next);
      setDocument("staff-config", "schedules", next).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
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

  // Firestore real-time sync
  useEffect(() => {
    const unsubs = [
      onCollectionChange<Stylist>("staff", (firestoreStaff) => {
        if (firestoreStaff.length > 0) {
          // Read current deletedIds to filter out deleted staff before merging
          const currentDeleted = getStoredData<string[]>("mila-staff-deleted", []);
          setCustomStylists((prev) => {
            const merged = new Map<string, Stylist>();
            for (const s of prev) merged.set(s.id, s);
            for (const s of firestoreStaff) {
              if (!currentDeleted.includes(s.id)) {
                merged.set(s.id, s);
              }
            }
            const next = Array.from(merged.values()).filter((s) => !currentDeleted.includes(s.id));
            setStoredData("mila-staff-custom", next);
            return next;
          });
        }
      }),
      onDocumentChange<{ schedules?: Record<string, StylistSchedule[]> }>("staff-config", "schedules", (data) => {
        if (data) {
          const schedules = (data as unknown as Record<string, StylistSchedule[]>);
          delete (schedules as Record<string, unknown>)["id"];
          if (Object.keys(schedules).length > 0) {
            setScheduleOverrides(schedules);
            setStoredData("mila-staff-schedules", schedules);
          }
        }
      }),
      onArrayDocChange<{ id: string } & Partial<Stylist>>("staff-config", "detail-overrides", (items) => {
        if (items.length > 0) {
          const overrides: Record<string, Partial<Stylist>> = {};
          for (const item of items) {
            const { id, ...rest } = item;
            if (id) overrides[id] = rest;
          }
          setDetailOverrides(overrides);
          setStoredData("mila-staff-detail-overrides", overrides);
        }
      }),
      onDocumentChange<{ ids?: string[] }>("staff-config", "deleted", (data) => {
        if (data && data.ids) {
          setDeletedIds(data.ids);
          setStoredData("mila-staff-deleted", data.ids);
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Listen for cross-tab events (EventBus + BroadcastChannel)
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

  // Fallback: listen to localStorage changes from other tabs (window storage event)
  useEffect(() => {
    const STAFF_KEYS = ["mila-staff-custom", "mila-staff-schedules", "mila-staff-detail-overrides", "mila-staff-deleted"];
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || !STAFF_KEYS.includes(e.key)) return;
      setCustomStylists(getStoredData<Stylist[]>("mila-staff-custom", []));
      setScheduleOverrides(getStoredData<Record<string, StylistSchedule[]>>("mila-staff-schedules", {}));
      setDetailOverrides(getStoredData<Record<string, Partial<Stylist>>>("mila-staff-detail-overrides", {}));
      setDeletedIds(getStoredData<string[]>("mila-staff-deleted", []));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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
