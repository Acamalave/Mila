"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useService } from "@/providers/ServiceProvider";
import { useStaff } from "@/providers/StaffProvider";
import { getStoredData, setStoredData } from "@/lib/utils";
import { formatServicePrice } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { setDocument, onDocumentChange } from "@/lib/firestore";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  Clock,
  Edit2,
  DollarSign,
  CreditCard,
  Plus,
  Trash2,
  FolderPlus,
} from "lucide-react";
import type { Service, ServiceDepositConfig } from "@/types/service";

type DurationOverrides = Record<string, number>;
type DepositOverrides = Record<string, ServiceDepositConfig>;
type PriceOverrides = Record<string, { price: number; priceMax?: number }>;
type NameOverrides = Record<string, { en: string; es: string }>;

export default function AdminServicesPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const {
    allServices,
    allCategories,
    addService,
    updateService,
    deleteService,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useService();
  const { allStylists, updateStylist } = useStaff();

  // ── Legacy override system (kept for backward compat with booking flows) ──
  const [overrides, setOverrides] = useState<DurationOverrides>(() =>
    getStoredData<DurationOverrides>("mila-service-duration-overrides", {})
  );
  const [depositOverrides, setDepositOverrides] = useState<DepositOverrides>(
    () => getStoredData<DepositOverrides>("mila-service-deposit-overrides", {})
  );
  const [priceOverrides, setPriceOverrides] = useState<PriceOverrides>(() =>
    getStoredData<PriceOverrides>("mila-service-price-overrides", {})
  );
  const [nameOverrides, setNameOverrides] = useState<NameOverrides>(() =>
    getStoredData<NameOverrides>("mila-service-name-overrides", {})
  );

  // ── Quick-edit (duration/price/name/deposit) modal state ──
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editPriceMax, setEditPriceMax] = useState<string>("");
  const [editNameEn, setEditNameEn] = useState<string>("");
  const [editNameEs, setEditNameEs] = useState<string>("");
  const [editDeposit, setEditDeposit] = useState<ServiceDepositConfig>({
    requiresDeposit: false,
    depositType: "fixed",
    depositAmount: 0,
  });

  // ── Full CRUD modal state ──
  type FullForm = {
    nameEs: string;
    nameEn: string;
    descEs: string;
    descEn: string;
    categoryId: string;
    price: number;
    priceMax: string;
    durationMinutes: number;
    lucideIcon: string;
  };
  const emptyForm: FullForm = {
    nameEs: "",
    nameEn: "",
    descEs: "",
    descEn: "",
    categoryId: "",
    price: 0,
    priceMax: "",
    durationMinutes: 30,
    lucideIcon: "Sparkles",
  };
  const [fullEditId, setFullEditId] = useState<string | null>(null);
  const [fullCreateOpen, setFullCreateOpen] = useState(false);
  const [fullForm, setFullForm] = useState<FullForm>(emptyForm);
  // Stylists that will offer this service. A service is only visible on the
  // client booking page for stylists whose serviceIds include it.
  const [fullStylistIds, setFullStylistIds] = useState<string[]>([]);

  // ── Category modal state ──
  type CategoryForm = {
    nameEs: string;
    nameEn: string;
    descEs: string;
    descEn: string;
    icon: string;
    image: string;
  };
  const emptyCategoryForm: CategoryForm = {
    nameEs: "",
    nameEn: "",
    descEs: "",
    descEn: "",
    icon: "Sparkles",
    image: "",
  };
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(emptyCategoryForm);

  useEffect(() => {
    const unsubs = [
      onDocumentChange<Record<string, number>>(
        "service-config",
        "duration-overrides",
        (data) => {
          if (data) {
            const overridesData = { ...data };
            delete (overridesData as any).id;
            if (Object.keys(overridesData).length > 0) {
              setOverrides(overridesData);
              setStoredData("mila-service-duration-overrides", overridesData);
            }
          }
        }
      ),
      onDocumentChange<DepositOverrides>(
        "service-config",
        "deposit-overrides",
        (data) => {
          if (data) {
            const depositData = { ...data };
            delete (depositData as any).id;
            if (Object.keys(depositData).length > 0) {
              setDepositOverrides(depositData as unknown as DepositOverrides);
              setStoredData("mila-service-deposit-overrides", depositData);
            }
          }
        }
      ),
      onDocumentChange<PriceOverrides>(
        "service-config",
        "price-overrides",
        (data) => {
          if (data) {
            const priceData = { ...data };
            delete (priceData as any).id;
            if (Object.keys(priceData).length > 0) {
              setPriceOverrides(priceData as unknown as PriceOverrides);
              setStoredData("mila-service-price-overrides", priceData);
            }
          }
        }
      ),
      onDocumentChange<NameOverrides>(
        "service-config",
        "name-overrides",
        (data) => {
          if (data) {
            const nameData = { ...data };
            delete (nameData as any).id;
            if (Object.keys(nameData).length > 0) {
              setNameOverrides(nameData as unknown as NameOverrides);
              setStoredData("mila-service-name-overrides", nameData);
            }
          }
        }
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  const getEffectiveDuration = (serviceId: string, defaultDuration: number) => {
    return overrides[serviceId] ?? defaultDuration;
  };

  const getEffectivePrice = (
    serviceId: string,
    defaultPrice: number,
    defaultPriceMax?: number
  ) => {
    const p = priceOverrides[serviceId];
    return p
      ? { price: p.price, priceMax: p.priceMax }
      : { price: defaultPrice, priceMax: defaultPriceMax };
  };

  const getEffectiveName = (
    serviceId: string,
    defaultName: { en: string; es: string }
  ) => {
    return nameOverrides[serviceId] ?? defaultName;
  };

  const openEditor = (
    serviceId: string,
    currentDuration: number,
    currentPrice: number,
    currentPriceMax?: number,
    currentName?: { en: string; es: string }
  ) => {
    setEditingService(serviceId);
    setEditDuration(getEffectiveDuration(serviceId, currentDuration));
    const ep = getEffectivePrice(serviceId, currentPrice, currentPriceMax);
    setEditPrice(ep.price);
    setEditPriceMax(ep.priceMax !== undefined ? String(ep.priceMax) : "");
    const en = currentName
      ? getEffectiveName(serviceId, currentName)
      : { en: "", es: "" };
    setEditNameEn(en.en);
    setEditNameEs(en.es);
    setEditDeposit(
      depositOverrides[serviceId] ?? {
        requiresDeposit: false,
        depositType: "fixed",
        depositAmount: 0,
      }
    );
  };

  const getDepositInfo = (serviceId: string): ServiceDepositConfig | null => {
    const config = depositOverrides[serviceId];
    return config?.requiresDeposit ? config : null;
  };

  const saveServiceConfig = useCallback(() => {
    if (!editingService) return;

    // Save duration
    const newDurationOverrides = {
      ...overrides,
      [editingService]: editDuration,
    };
    setOverrides(newDurationOverrides);
    setStoredData("mila-service-duration-overrides", newDurationOverrides);
    setDocument(
      "service-config",
      "duration-overrides",
      newDurationOverrides
    ).catch((err) =>
      console.warn("[Mila] Failed to sync duration overrides:", err)
    );

    // Save price
    const priceEntry: { price: number; priceMax?: number } = {
      price: editPrice,
    };
    const parsedMax = parseFloat(editPriceMax);
    if (!isNaN(parsedMax) && parsedMax > 0) priceEntry.priceMax = parsedMax;
    const newPriceOverrides = {
      ...priceOverrides,
      [editingService]: priceEntry,
    };
    setPriceOverrides(newPriceOverrides);
    setStoredData("mila-service-price-overrides", newPriceOverrides);
    setDocument(
      "service-config",
      "price-overrides",
      newPriceOverrides as unknown as Record<string, unknown>
    ).catch((err) =>
      console.warn("[Mila] Failed to sync price overrides:", err)
    );

    // Save name
    if (editNameEn.trim() || editNameEs.trim()) {
      const newNameOverrides = {
        ...nameOverrides,
        [editingService]: { en: editNameEn.trim(), es: editNameEs.trim() },
      };
      setNameOverrides(newNameOverrides);
      setStoredData("mila-service-name-overrides", newNameOverrides);
      setDocument(
        "service-config",
        "name-overrides",
        newNameOverrides as unknown as Record<string, unknown>
      ).catch((err) =>
        console.warn("[Mila] Failed to sync name overrides:", err)
      );
    }

    // Save deposit config
    const newDepositOverrides = {
      ...depositOverrides,
      [editingService]: editDeposit,
    };
    setDepositOverrides(newDepositOverrides);
    setStoredData("mila-service-deposit-overrides", newDepositOverrides);
    setDocument(
      "service-config",
      "deposit-overrides",
      newDepositOverrides as unknown as Record<string, unknown>
    ).catch((err) =>
      console.warn("[Mila] Failed to sync deposit overrides:", err)
    );

    setEditingService(null);
    addToast(
      language === "es" ? "Servicio actualizado" : "Service updated",
      "success"
    );
  }, [
    editingService,
    editDuration,
    editPrice,
    editPriceMax,
    editNameEn,
    editNameEs,
    editDeposit,
    overrides,
    priceOverrides,
    nameOverrides,
    depositOverrides,
    addToast,
    language,
  ]);

  const editingServiceData = editingService
    ? allServices.find((s) => s.id === editingService)
    : null;

  /* ── Full CRUD handlers ────────────────────────────────────────── */

  const openCreateService = () => {
    setFullEditId(null);
    setFullForm({
      ...emptyForm,
      categoryId: allCategories[0]?.id ?? "",
    });
    // New services default to being offered by every stylist, so they are
    // immediately visible to clients on the booking page.
    setFullStylistIds(allStylists.map((s) => s.id));
    setFullCreateOpen(true);
  };

  const openEditServiceFull = (service: Service) => {
    setFullEditId(service.id);
    setFullForm({
      nameEs: service.name.es,
      nameEn: service.name.en,
      descEs: service.description.es,
      descEn: service.description.en,
      categoryId: service.categoryId,
      price: service.price,
      priceMax:
        service.priceMax !== undefined ? String(service.priceMax) : "",
      durationMinutes: service.durationMinutes,
      lucideIcon: service.lucideIcon,
    });
    setFullStylistIds(
      allStylists.filter((s) => s.serviceIds.includes(service.id)).map((s) => s.id)
    );
    setFullCreateOpen(true);
  };

  const closeFullModal = () => {
    setFullCreateOpen(false);
    setFullEditId(null);
    setFullForm(emptyForm);
    setFullStylistIds([]);
  };

  // Add or remove a service id from each stylist's serviceIds so the booking
  // page shows the service only for the chosen stylists.
  const syncServiceToStylists = (serviceId: string, stylistIds: string[]) => {
    for (const stylist of allStylists) {
      const has = stylist.serviceIds.includes(serviceId);
      const shouldHave = stylistIds.includes(stylist.id);
      if (has === shouldHave) continue;
      const nextServiceIds = shouldHave
        ? [...stylist.serviceIds, serviceId]
        : stylist.serviceIds.filter((id) => id !== serviceId);
      updateStylist(stylist.id, { serviceIds: nextServiceIds });
    }
  };

  const saveFullService = () => {
    const trimmedEs = fullForm.nameEs.trim();
    const trimmedEn = fullForm.nameEn.trim();
    if (!trimmedEs || !trimmedEn) {
      addToast(
        language === "es"
          ? "Nombre requerido en ambos idiomas"
          : "Name required in both languages",
        "error"
      );
      return;
    }
    if (!fullForm.categoryId) {
      addToast(
        language === "es" ? "Selecciona una categoría" : "Select a category",
        "error"
      );
      return;
    }

    const parsedMax = parseFloat(fullForm.priceMax);
    const payload: Omit<Service, "id"> = {
      categoryId: fullForm.categoryId,
      name: { es: trimmedEs, en: trimmedEn },
      description: {
        es: fullForm.descEs.trim(),
        en: fullForm.descEn.trim(),
      },
      durationMinutes: fullForm.durationMinutes,
      price: fullForm.price,
      lucideIcon: fullForm.lucideIcon.trim() || "Sparkles",
    };
    if (!isNaN(parsedMax) && parsedMax > 0) payload.priceMax = parsedMax;

    if (fullEditId) {
      updateService(fullEditId, payload);
      syncServiceToStylists(fullEditId, fullStylistIds);
      addToast(
        language === "es" ? "Servicio actualizado" : "Service updated",
        "success"
      );
    } else {
      const created = addService(payload);
      syncServiceToStylists(created.id, fullStylistIds);
      addToast(
        language === "es" ? "Servicio creado" : "Service created",
        "success"
      );
    }
    closeFullModal();
  };

  const handleDeleteService = (service: Service) => {
    const confirmMsg =
      language === "es"
        ? `¿Eliminar el servicio "${service.name.es}"?`
        : `Delete service "${service.name.en}"?`;
    if (!window.confirm(confirmMsg)) return;
    deleteService(service.id);
    addToast(
      language === "es" ? "Servicio eliminado" : "Service deleted",
      "success"
    );
  };

  /* ── Category CRUD handlers ────────────────────────────────────── */

  const openCreateCategory = () => {
    setCategoryEditId(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryCreateOpen(true);
  };

  const openEditCategory = (catId: string) => {
    const cat = allCategories.find((c) => c.id === catId);
    if (!cat) return;
    setCategoryEditId(cat.id);
    setCategoryForm({
      nameEs: cat.name.es,
      nameEn: cat.name.en,
      descEs: cat.description.es,
      descEn: cat.description.en,
      icon: cat.icon,
      image: cat.image,
    });
    setCategoryCreateOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryCreateOpen(false);
    setCategoryEditId(null);
    setCategoryForm(emptyCategoryForm);
  };

  const saveCategory = () => {
    const trimmedEs = categoryForm.nameEs.trim();
    const trimmedEn = categoryForm.nameEn.trim();
    if (!trimmedEs || !trimmedEn) {
      addToast(
        language === "es"
          ? "Nombre requerido en ambos idiomas"
          : "Name required in both languages",
        "error"
      );
      return;
    }
    const payload = {
      name: { es: trimmedEs, en: trimmedEn },
      description: {
        es: categoryForm.descEs.trim(),
        en: categoryForm.descEn.trim(),
      },
      icon: categoryForm.icon.trim() || "Sparkles",
      image: categoryForm.image.trim(),
    };
    if (categoryEditId) {
      updateCategory(categoryEditId, payload);
      addToast(
        language === "es" ? "Categoría actualizada" : "Category updated",
        "success"
      );
    } else {
      addCategory(payload);
      addToast(
        language === "es" ? "Categoría creada" : "Category created",
        "success"
      );
    }
    closeCategoryModal();
  };

  const handleDeleteCategory = (catId: string) => {
    const cat = allCategories.find((c) => c.id === catId);
    if (!cat) return;
    const servicesInCat = allServices.filter((s) => s.categoryId === catId);
    const confirmMsg =
      language === "es"
        ? `¿Eliminar la categoría "${cat.name.es}"? ${
            servicesInCat.length > 0
              ? `Contiene ${servicesInCat.length} servicio(s) que quedarán sin categoría.`
              : ""
          }`
        : `Delete category "${cat.name.en}"? ${
            servicesInCat.length > 0
              ? `It contains ${servicesInCat.length} service(s) that will lose their category.`
              : ""
          }`;
    if (!window.confirm(confirmMsg)) return;
    deleteCategory(catId);
    addToast(
      language === "es" ? "Categoría eliminada" : "Category deleted",
      "success"
    );
  };

  // Group services by category
  const grouped = useMemo(
    () =>
      allCategories.map((cat) => ({
        category: cat,
        services: allServices.filter((s) => s.categoryId === cat.id),
      })),
    [allCategories, allServices]
  );

  const uncategorized = useMemo(
    () =>
      allServices.filter(
        (s) => !allCategories.some((c) => c.id === s.categoryId)
      ),
    [allCategories, allServices]
  );

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div
        variants={fadeInUp}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
            {t("admin", "services")}
          </h1>
          <p className="text-text-secondary mt-1">
            {language === "es"
              ? "Administra categorías y servicios del salón"
              : "Manage salon categories and services"}
          </p>
        </div>
        <Button size="sm" onClick={openCreateService}>
          <Plus size={16} className="mr-1" />
          {language === "es" ? "Nuevo Servicio" : "New Service"}
        </Button>
      </motion.div>

      {/* Categories management */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary font-[family-name:var(--font-display)]">
            {language === "es" ? "Categorías" : "Categories"}
          </h2>
          <Button size="sm" variant="secondary" onClick={openCreateCategory}>
            <FolderPlus size={14} className="mr-1" />
            {language === "es" ? "Nueva Categoría" : "New Category"}
          </Button>
        </div>
        <Card padding="none">
          <div className="lg:overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Nombre" : "Name"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                    {language === "es" ? "Descripción" : "Description"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    {language === "es" ? "Servicios" : "Services"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    {language === "es" ? "Acciones" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {allCategories.map((cat) => {
                  const count = allServices.filter(
                    (s) => s.categoryId === cat.id
                  ).length;
                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-text-primary">
                        {cat.name[language]}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs text-text-secondary hidden md:table-cell">
                        {cat.description[language]}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                        <span className="text-xs text-text-muted">{count}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditCategory(cat.id)}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                            title={language === "es" ? "Editar" : "Edit"}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-red-400 cursor-pointer"
                            title={language === "es" ? "Eliminar" : "Delete"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Services grouped by category */}
      {grouped.map(({ category, services }) => (
        <motion.div key={category.id} variants={fadeInUp}>
          <h2 className="text-lg font-semibold text-text-primary mb-3 font-[family-name:var(--font-display)]">
            {category.name[language]}
          </h2>
          <Card padding="none">
            <div className="lg:overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default text-left">
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                      {language === "es" ? "Servicio" : "Service"}
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                      {language === "es" ? "Precio" : "Price"}
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock size={12} />
                        {language === "es" ? "Duración (min)" : "Duration (min)"}
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <CreditCard size={12} />
                        {language === "es" ? "Anticipo" : "Deposit"}
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                      {language === "es" ? "Acciones" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {services.map((service) => {
                    const effectiveDuration = getEffectiveDuration(
                      service.id,
                      service.durationMinutes
                    );
                    const effectivePrice = getEffectivePrice(
                      service.id,
                      service.price,
                      service.priceMax
                    );
                    const effectiveName = getEffectiveName(
                      service.id,
                      service.name
                    );
                    const isOverridden =
                      overrides[service.id] !== undefined ||
                      priceOverrides[service.id] !== undefined ||
                      nameOverrides[service.id] !== undefined;
                    return (
                      <tr
                        key={service.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-3 sm:px-6 py-2 sm:py-4">
                          <span
                            className="text-xs sm:text-sm font-medium"
                            style={{
                              color: nameOverrides[service.id]
                                ? "var(--color-accent)"
                                : "var(--color-text-primary)",
                            }}
                          >
                            {effectiveName[language]}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-right">
                          <span
                            style={{
                              color: priceOverrides[service.id]
                                ? "var(--color-accent)"
                                : "var(--color-text-primary)",
                            }}
                          >
                            {formatServicePrice(
                              effectivePrice.price,
                              effectivePrice.priceMax
                            )}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              background: isOverridden
                                ? "var(--color-accent-subtle)"
                                : "var(--color-bg-glass)",
                              color: isOverridden
                                ? "var(--color-accent)"
                                : "var(--color-text-primary)",
                              border: isOverridden
                                ? "1px solid var(--color-border-accent)"
                                : "1px solid var(--color-border-default)",
                            }}
                          >
                            {effectiveDuration} min
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-center hidden md:table-cell">
                          {(() => {
                            const deposit = getDepositInfo(service.id);
                            if (!deposit)
                              return (
                                <span className="text-xs text-text-muted">
                                  —
                                </span>
                              );
                            const amt =
                              deposit.depositType === "percentage"
                                ? `${deposit.depositAmount}%`
                                : `$${deposit.depositAmount}`;
                            return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                  background: "rgba(196,169,106,0.15)",
                                  color: "var(--color-accent)",
                                  border: "1px solid rgba(196,169,106,0.3)",
                                }}
                              >
                                <DollarSign size={10} />
                                {amt}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                openEditor(
                                  service.id,
                                  service.durationMinutes,
                                  service.price,
                                  service.priceMax,
                                  service.name
                                )
                              }
                              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                              title={
                                language === "es"
                                  ? "Configurar duración/anticipo"
                                  : "Configure duration/deposit"
                              }
                            >
                              <Clock size={14} />
                            </button>
                            <button
                              onClick={() => openEditServiceFull(service)}
                              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                              title={
                                language === "es"
                                  ? "Editar detalles"
                                  : "Edit full details"
                              }
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service)}
                              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-red-400 cursor-pointer"
                              title={language === "es" ? "Eliminar" : "Delete"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {services.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 sm:px-6 py-6 text-center text-xs text-text-muted"
                      >
                        {language === "es"
                          ? "Sin servicios en esta categoría"
                          : "No services in this category"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      ))}

      {/* Uncategorized services (edge case) */}
      {uncategorized.length > 0 && (
        <motion.div variants={fadeInUp}>
          <h2 className="text-lg font-semibold text-text-primary mb-3 font-[family-name:var(--font-display)]">
            {language === "es" ? "Sin categoría" : "Uncategorized"}
          </h2>
          <Card padding="none">
            <div className="lg:overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-border-subtle">
                  {uncategorized.map((service) => (
                    <tr
                      key={service.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-text-primary">
                        {service.name[language]}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-right">
                        {formatServicePrice(service.price, service.priceMax)}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditServiceFull(service)}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service)}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Quick-edit modal (duration, price, deposit, name) */}
      <Modal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title={language === "es" ? "Configurar Servicio" : "Configure Service"}
        size="sm"
      >
        {editingServiceData && (
          <div className="space-y-5">
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: "var(--color-bg-glass)" }}
            >
              <Clock size={20} className="text-text-muted flex-shrink-0" />
              <div>
                <p className="font-medium text-text-primary">
                  {editingServiceData.name[language]}
                </p>
                <p className="text-sm text-text-secondary">
                  {formatServicePrice(
                    editingServiceData.price,
                    editingServiceData.priceMax
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={language === "es" ? "Nombre (ES)" : "Name (ES)"}
                value={editNameEs}
                onChange={(e) => setEditNameEs(e.target.value)}
                placeholder={editingServiceData?.name.es}
              />
              <Input
                label={language === "es" ? "Nombre (EN)" : "Name (EN)"}
                value={editNameEn}
                onChange={(e) => setEditNameEn(e.target.value)}
                placeholder={editingServiceData?.name.en}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={language === "es" ? "Precio ($)" : "Price ($)"}
                type="number"
                min="0"
                step="1"
                value={editPrice.toString()}
                onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
              />
              <Input
                label={
                  language === "es"
                    ? "Precio máx. (opcional)"
                    : "Max price (optional)"
                }
                type="number"
                min="0"
                step="1"
                value={editPriceMax}
                onChange={(e) => setEditPriceMax(e.target.value)}
                placeholder={language === "es" ? "ej. 150" : "e.g. 150"}
              />
            </div>

            <Input
              label={
                language === "es"
                  ? "Duración estimada (minutos)"
                  : "Estimated Duration (minutes)"
              }
              type="number"
              min="5"
              step="5"
              value={editDuration.toString()}
              onChange={(e) =>
                setEditDuration(parseInt(e.target.value, 10) || 0)
              }
            />

            <div
              className="space-y-3 p-4 rounded-lg border"
              style={{
                borderColor: editDeposit.requiresDeposit
                  ? "var(--color-border-accent)"
                  : "var(--color-border-default)",
                background: editDeposit.requiresDeposit
                  ? "rgba(196,169,106,0.05)"
                  : "transparent",
              }}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editDeposit.requiresDeposit}
                  onChange={(e) =>
                    setEditDeposit({
                      ...editDeposit,
                      requiresDeposit: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded accent-[#C4A96A]"
                />
                <div>
                  <span className="text-sm font-medium text-text-primary">
                    {language === "es"
                      ? "Requiere anticipo para reservar"
                      : "Requires deposit to book"}
                  </span>
                  <p className="text-xs text-text-muted">
                    {language === "es"
                      ? "El cliente debe pagar un anticipo al momento de reservar"
                      : "Client must pay a deposit when booking"}
                  </p>
                </div>
              </label>

              {editDeposit.requiresDeposit && (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setEditDeposit({ ...editDeposit, depositType: "fixed" })
                      }
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background:
                          editDeposit.depositType === "fixed"
                            ? "var(--color-accent)"
                            : "var(--color-bg-glass)",
                        color:
                          editDeposit.depositType === "fixed"
                            ? "#0a0a0a"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {language === "es" ? "Monto fijo ($)" : "Fixed amount ($)"}
                    </button>
                    <button
                      onClick={() =>
                        setEditDeposit({
                          ...editDeposit,
                          depositType: "percentage",
                        })
                      }
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background:
                          editDeposit.depositType === "percentage"
                            ? "var(--color-accent)"
                            : "var(--color-bg-glass)",
                        color:
                          editDeposit.depositType === "percentage"
                            ? "#0a0a0a"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {language === "es"
                        ? "Porcentaje (%)"
                        : "Percentage (%)"}
                    </button>
                  </div>
                  <Input
                    label={
                      editDeposit.depositType === "fixed"
                        ? language === "es"
                          ? "Monto del anticipo ($)"
                          : "Deposit amount ($)"
                        : language === "es"
                          ? "Porcentaje del anticipo (%)"
                          : "Deposit percentage (%)"
                    }
                    type="number"
                    min="1"
                    max={
                      editDeposit.depositType === "percentage" ? "100" : undefined
                    }
                    step="1"
                    value={editDeposit.depositAmount.toString()}
                    onChange={(e) =>
                      setEditDeposit({
                        ...editDeposit,
                        depositAmount: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                  {editDeposit.depositType === "percentage" &&
                    editDeposit.depositAmount > 0 && (
                      <p className="text-xs text-text-muted">
                        = $
                        {Math.round(
                          (editingServiceData.price *
                            editDeposit.depositAmount) /
                            100
                        )}{" "}
                        {language === "es" ? "de anticipo sobre" : "deposit on"}{" "}
                        {formatServicePrice(
                          editingServiceData.price,
                          editingServiceData.priceMax
                        )}
                      </p>
                    )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingService(null)}
              >
                {t("common", "cancel")}
              </Button>
              <Button size="sm" onClick={saveServiceConfig}>
                {t("common", "save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Full service create/edit modal */}
      <Modal
        isOpen={fullCreateOpen}
        onClose={closeFullModal}
        title={
          fullEditId
            ? language === "es"
              ? "Editar Servicio"
              : "Edit Service"
            : language === "es"
              ? "Nuevo Servicio"
              : "New Service"
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={language === "es" ? "Nombre (ES)" : "Name (ES)"}
              value={fullForm.nameEs}
              onChange={(e) =>
                setFullForm({ ...fullForm, nameEs: e.target.value })
              }
            />
            <Input
              label={language === "es" ? "Nombre (EN)" : "Name (EN)"}
              value={fullForm.nameEn}
              onChange={(e) =>
                setFullForm({ ...fullForm, nameEn: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={language === "es" ? "Descripción (ES)" : "Description (ES)"}
              value={fullForm.descEs}
              onChange={(e) =>
                setFullForm({ ...fullForm, descEs: e.target.value })
              }
            />
            <Input
              label={language === "es" ? "Descripción (EN)" : "Description (EN)"}
              value={fullForm.descEn}
              onChange={(e) =>
                setFullForm({ ...fullForm, descEn: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              {language === "es" ? "Categoría" : "Category"}
            </label>
            <select
              value={fullForm.categoryId}
              onChange={(e) =>
                setFullForm({ ...fullForm, categoryId: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            >
              <option value="">
                {language === "es" ? "Seleccionar..." : "Select..."}
              </option>
              {allCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name[language]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label={language === "es" ? "Precio ($)" : "Price ($)"}
              type="number"
              min="0"
              step="1"
              value={fullForm.price.toString()}
              onChange={(e) =>
                setFullForm({
                  ...fullForm,
                  price: parseFloat(e.target.value) || 0,
                })
              }
            />
            <Input
              label={language === "es" ? "Precio máx." : "Max price"}
              type="number"
              min="0"
              step="1"
              value={fullForm.priceMax}
              onChange={(e) =>
                setFullForm({ ...fullForm, priceMax: e.target.value })
              }
              placeholder={language === "es" ? "Opcional" : "Optional"}
            />
            <Input
              label={language === "es" ? "Duración (min)" : "Duration (min)"}
              type="number"
              min="5"
              step="5"
              value={fullForm.durationMinutes.toString()}
              onChange={(e) =>
                setFullForm({
                  ...fullForm,
                  durationMinutes: parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </div>

          <Input
            label={
              language === "es"
                ? "Ícono Lucide (opcional)"
                : "Lucide Icon (optional)"
            }
            value={fullForm.lucideIcon}
            onChange={(e) =>
              setFullForm({ ...fullForm, lucideIcon: e.target.value })
            }
            placeholder="Sparkles"
          />

          {/* Stylist availability — controls visibility on the client booking page */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-text-secondary">
                {language === "es"
                  ? "Estilistas que ofrecen este servicio"
                  : "Stylists offering this service"}
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFullStylistIds(allStylists.map((s) => s.id))}
                  className="text-xs text-mila-gold hover:underline cursor-pointer"
                >
                  {language === "es" ? "Todos" : "All"}
                </button>
                <button
                  type="button"
                  onClick={() => setFullStylistIds([])}
                  className="text-xs text-text-muted hover:underline cursor-pointer"
                >
                  {language === "es" ? "Ninguno" : "None"}
                </button>
              </div>
            </div>
            <p className="text-xs text-text-muted mb-2">
              {language === "es"
                ? "El servicio solo aparece en la página del cliente al reservar con un estilista seleccionado."
                : "The service only appears on the client booking page when booking with a selected stylist."}
            </p>
            <div
              className="max-h-44 overflow-y-auto rounded-lg divide-y divide-border-subtle"
              style={{ border: "1px solid var(--color-border-default)" }}
            >
              {allStylists.length === 0 ? (
                <p className="p-3 text-xs text-center text-text-muted">
                  {language === "es" ? "No hay estilistas" : "No stylists"}
                </p>
              ) : (
                allStylists.map((s) => {
                  const checked = fullStylistIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm text-text-primary hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setFullStylistIds((prev) =>
                            prev.includes(s.id)
                              ? prev.filter((id) => id !== s.id)
                              : [...prev, s.id]
                          )
                        }
                        className="w-4 h-4 rounded accent-[#C4A96A]"
                      />
                      <span className="flex-1">{s.name}</span>
                    </label>
                  );
                })
              )}
            </div>
            {fullStylistIds.length === 0 && allStylists.length > 0 && (
              <p className="text-xs mt-1.5" style={{ color: "var(--color-warning, #d9a441)" }}>
                {language === "es"
                  ? "Sin estilistas seleccionados, el servicio no será visible para los clientes."
                  : "With no stylists selected, the service will not be visible to clients."}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={closeFullModal}>
              {t("common", "cancel")}
            </Button>
            <Button size="sm" onClick={saveFullService}>
              {t("common", "save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category create/edit modal */}
      <Modal
        isOpen={categoryCreateOpen}
        onClose={closeCategoryModal}
        title={
          categoryEditId
            ? language === "es"
              ? "Editar Categoría"
              : "Edit Category"
            : language === "es"
              ? "Nueva Categoría"
              : "New Category"
        }
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={language === "es" ? "Nombre (ES)" : "Name (ES)"}
              value={categoryForm.nameEs}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, nameEs: e.target.value })
              }
            />
            <Input
              label={language === "es" ? "Nombre (EN)" : "Name (EN)"}
              value={categoryForm.nameEn}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, nameEn: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={language === "es" ? "Descripción (ES)" : "Description (ES)"}
              value={categoryForm.descEs}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, descEs: e.target.value })
              }
            />
            <Input
              label={language === "es" ? "Descripción (EN)" : "Description (EN)"}
              value={categoryForm.descEn}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, descEn: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={language === "es" ? "Ícono Lucide" : "Lucide Icon"}
              value={categoryForm.icon}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, icon: e.target.value })
              }
              placeholder="Sparkles"
            />
            <Input
              label={language === "es" ? "Imagen (URL)" : "Image (URL)"}
              value={categoryForm.image}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, image: e.target.value })
              }
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={closeCategoryModal}>
              {t("common", "cancel")}
            </Button>
            <Button size="sm" onClick={saveCategory}>
              {t("common", "save")}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
