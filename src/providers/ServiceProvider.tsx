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
import type { Service, ServiceCategory } from "@/types/service";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import {
  seedServices,
  seedServiceCategories,
  setLiveServices,
  setLiveServiceCategories,
} from "@/data/services";
import { useEventBus } from "@/providers/EventBusProvider";
import {
  setDocument,
  deleteDocument,
  onCollectionChange,
  onDocumentChange,
} from "@/lib/firestore";

interface ServiceContextValue {
  allServices: Service[];
  allCategories: ServiceCategory[];
  addService: (service: Omit<Service, "id">) => Service;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;
  addCategory: (cat: Omit<ServiceCategory, "id">) => void;
  updateCategory: (id: string, updates: Partial<ServiceCategory>) => void;
  deleteCategory: (id: string) => void;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

function mergeServices(
  customServices: Service[],
  seedOverrides: Record<string, Partial<Service>>,
  deletedIds: string[]
): Service[] {
  const safeDeleted = Array.isArray(deletedIds) ? deletedIds : [];
  const base = seedServices
    .filter((s) => !safeDeleted.includes(s.id))
    .map((s) => {
      const overrides = seedOverrides[s.id];
      return overrides ? { ...s, ...overrides } : s;
    });
  const custom = customServices.filter((s) => !safeDeleted.includes(s.id));
  return [...base, ...custom];
}

function mergeCategories(
  customCategories: ServiceCategory[],
  deletedIds: string[]
): ServiceCategory[] {
  const safeDeleted = Array.isArray(deletedIds) ? deletedIds : [];
  const base = seedServiceCategories.filter((c) => !safeDeleted.includes(c.id));
  const custom = customCategories.filter((c) => !safeDeleted.includes(c.id));
  return [...base, ...custom];
}

export function ServiceProvider({ children }: { children: ReactNode }) {
  const { emit, on } = useEventBus();

  const [customServices, setCustomServices] = useState<Service[]>(() =>
    getStoredData<Service[]>("mila-services-custom", [])
  );
  const [seedOverrides, setSeedOverrides] = useState<Record<string, Partial<Service>>>(() =>
    getStoredData<Record<string, Partial<Service>>>("mila-service-overrides", {})
  );
  const [deletedServiceIds, setDeletedServiceIds] = useState<string[]>(() =>
    getStoredData<string[]>("mila-services-deleted", [])
  );

  const [customCategories, setCustomCategories] = useState<ServiceCategory[]>(() =>
    getStoredData<ServiceCategory[]>("mila-categories-custom", [])
  );
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>(() =>
    getStoredData<string[]>("mila-categories-deleted", [])
  );

  const allServices = useMemo(
    () => mergeServices(customServices, seedOverrides, deletedServiceIds),
    [customServices, seedOverrides, deletedServiceIds]
  );

  const allCategories = useMemo(
    () => mergeCategories(customCategories, deletedCategoryIds),
    [customCategories, deletedCategoryIds]
  );

  // Keep the live mutable arrays in sync so non-hook consumers
  // (e.g. `import { services } from "@/data/services"`) read the latest merged state.
  useEffect(() => {
    setLiveServices(allServices);
  }, [allServices]);

  useEffect(() => {
    setLiveServiceCategories(allCategories);
  }, [allCategories]);

  /* ── Service CRUD ──────────────────────────────────────────────── */
  const addService = useCallback(
    (data: Omit<Service, "id">): Service => {
      const newService: Service = { ...data, id: `svc-custom-${generateId()}` } as Service;
      setCustomServices((prev) => {
        const next = [...prev, newService];
        setStoredData("mila-services-custom", next);
        return next;
      });
      const { id, ...serviceData } = newService;
      setDocument("custom-services", id, serviceData as Record<string, unknown>).catch((err) =>
        console.warn("[Mila] Firestore sync failed:", err)
      );
      emit("service:created", newService);
      return newService;
    },
    [emit]
  );

  const updateService = useCallback(
    (id: string, updates: Partial<Service>) => {
      const isCustom = customServices.some((s) => s.id === id);
      if (isCustom) {
        setCustomServices((prev) => {
          const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
          setStoredData("mila-services-custom", next);
          return next;
        });
        setDocument("custom-services", id, updates as Record<string, unknown>).catch((err) =>
          console.warn("[Mila] Firestore sync failed:", err)
        );
      } else {
        setSeedOverrides((prev) => {
          const existing = prev[id] ?? {};
          const next = { ...prev, [id]: { ...existing, ...updates } };
          setStoredData("mila-service-overrides", next);
          setDocument("service-config", "seed-overrides", next).catch((err) =>
            console.warn("[Mila] Firestore sync failed:", err)
          );
          return next;
        });
      }
      emit("service:updated", { id, updates });
    },
    [customServices, emit]
  );

  const deleteService = useCallback(
    async (id: string) => {
      const isCustom = customServices.some((s) => s.id === id);

      setDeletedServiceIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        setStoredData("mila-services-deleted", next);
        setDocument("service-config", "deleted-services", { ids: next }).catch((err) =>
          console.warn("[Mila] Firestore sync failed:", err)
        );
        return next;
      });

      if (isCustom) {
        setCustomServices((prev) => {
          const next = prev.filter((s) => s.id !== id);
          setStoredData("mila-services-custom", next);
          return next;
        });
        try {
          await deleteDocument("custom-services", id);
        } catch (err) {
          console.warn("[Mila] Firestore sync failed:", err);
        }
      }

      emit("service:deleted", id);
    },
    [customServices, emit]
  );

  /* ── Category CRUD ─────────────────────────────────────────────── */
  const addCategory = useCallback(
    (cat: Omit<ServiceCategory, "id">) => {
      const newCat: ServiceCategory = { ...cat, id: `cat-custom-${generateId()}` };
      setCustomCategories((prev) => {
        const next = [...prev, newCat];
        setStoredData("mila-categories-custom", next);
        setDocument("service-config", "custom-categories", { items: next }).catch((err) =>
          console.warn("[Mila] Firestore category sync failed:", err)
        );
        return next;
      });
      emit("service-category:created", newCat);
    },
    [emit]
  );

  const updateCategory = useCallback(
    (id: string, updates: Partial<ServiceCategory>) => {
      const isCustom = customCategories.some((c) => c.id === id);
      if (isCustom) {
        setCustomCategories((prev) => {
          const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
          setStoredData("mila-categories-custom", next);
          setDocument("service-config", "custom-categories", { items: next }).catch((err) =>
            console.warn("[Mila] Firestore category sync failed:", err)
          );
          return next;
        });
      }
      emit("service-category:updated", { id, updates });
    },
    [customCategories, emit]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      setDeletedCategoryIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        setStoredData("mila-categories-deleted", next);
        setDocument("service-config", "deleted-categories", { ids: next }).catch((err) =>
          console.warn("[Mila] Firestore sync failed:", err)
        );
        return next;
      });

      const isCustom = customCategories.some((c) => c.id === id);
      if (isCustom) {
        setCustomCategories((prev) => {
          const next = prev.filter((c) => c.id !== id);
          setStoredData("mila-categories-custom", next);
          setDocument("service-config", "custom-categories", { items: next }).catch((err) =>
            console.warn("[Mila] Firestore category sync failed:", err)
          );
          return next;
        });
      }

      emit("service-category:deleted", id);
    },
    [customCategories, emit]
  );

  /* ── Firestore real-time sync ──────────────────────────────────── */
  useEffect(() => {
    const unsubs = [
      onCollectionChange<Service>("custom-services", (firestoreServices) => {
        if (firestoreServices.length > 0) {
          const currentDeleted = getStoredData<string[]>("mila-services-deleted", []);
          setCustomServices((prev) => {
            const merged = new Map<string, Service>();
            for (const s of prev) merged.set(s.id, s);
            for (const s of firestoreServices) {
              if (!currentDeleted.includes(s.id)) merged.set(s.id, s);
            }
            const next = Array.from(merged.values()).filter((s) => !currentDeleted.includes(s.id));
            setStoredData("mila-services-custom", next);
            return next;
          });
        }
      }),
      onDocumentChange<Record<string, Partial<Service>>>(
        "service-config",
        "seed-overrides",
        (data) => {
          if (data) {
            const overrides = { ...data } as Record<string, Partial<Service>>;
            delete (overrides as Record<string, unknown>)["id"];
            setSeedOverrides(overrides);
            setStoredData("mila-service-overrides", overrides);
          }
        }
      ),
      onDocumentChange<{ ids?: string[] }>("service-config", "deleted-services", (data) => {
        if (data && Array.isArray(data.ids)) {
          setDeletedServiceIds(data.ids);
          setStoredData("mila-services-deleted", data.ids);
        }
      }),
      onDocumentChange<{ items?: ServiceCategory[] }>(
        "service-config",
        "custom-categories",
        (data) => {
          if (data && Array.isArray(data.items)) {
            setCustomCategories(data.items);
            setStoredData("mila-categories-custom", data.items);
          }
        }
      ),
      onDocumentChange<{ ids?: string[] }>("service-config", "deleted-categories", (data) => {
        if (data && Array.isArray(data.ids)) {
          setDeletedCategoryIds(data.ids);
          setStoredData("mila-categories-deleted", data.ids);
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  /* ── Event bus listeners (cross-tab reload) ────────────────────── */
  useEffect(() => {
    const unsubs = [
      on("service:created", () => {
        setCustomServices(getStoredData<Service[]>("mila-services-custom", []));
      }),
      on("service:updated", () => {
        setSeedOverrides(getStoredData<Record<string, Partial<Service>>>("mila-service-overrides", {}));
        setCustomServices(getStoredData<Service[]>("mila-services-custom", []));
      }),
      on("service:deleted", () => {
        setCustomServices(getStoredData<Service[]>("mila-services-custom", []));
        setDeletedServiceIds(getStoredData<string[]>("mila-services-deleted", []));
      }),
      on("service-category:created", () => {
        setCustomCategories(getStoredData<ServiceCategory[]>("mila-categories-custom", []));
      }),
      on("service-category:updated", () => {
        setCustomCategories(getStoredData<ServiceCategory[]>("mila-categories-custom", []));
      }),
      on("service-category:deleted", () => {
        setCustomCategories(getStoredData<ServiceCategory[]>("mila-categories-custom", []));
        setDeletedCategoryIds(getStoredData<string[]>("mila-categories-deleted", []));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on]);

  return (
    <ServiceContext.Provider
      value={{
        allServices,
        allCategories,
        addService,
        updateService,
        deleteService,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
}

export function useService(): ServiceContextValue {
  const context = useContext(ServiceContext);
  if (!context) throw new Error("useService must be used within a ServiceProvider");
  return context;
}
