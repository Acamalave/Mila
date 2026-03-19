"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { services as seedServices, serviceCategories } from "@/data/services";
import { getStoredData, setStoredData } from "@/lib/utils";
import { formatServicePrice } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { setDocument, onDocumentChange } from "@/lib/firestore";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Clock, Edit2 } from "lucide-react";

type DurationOverrides = Record<string, number>;

export default function AdminServicesPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const [overrides, setOverrides] = useState<DurationOverrides>(() =>
    getStoredData<DurationOverrides>("mila-service-duration-overrides", {})
  );
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState<number>(0);

  useEffect(() => {
    const unsub = onDocumentChange<Record<string, number>>("service-config", "duration-overrides", (data) => {
      if (data) {
        const overridesData = { ...data };
        delete (overridesData as any).id;
        if (Object.keys(overridesData).length > 0) {
          setOverrides(overridesData);
          setStoredData("mila-service-duration-overrides", overridesData);
        }
      }
    });

    return () => unsub();
  }, []);

  const getEffectiveDuration = (serviceId: string, defaultDuration: number) => {
    return overrides[serviceId] ?? defaultDuration;
  };

  const openEditor = (serviceId: string, currentDuration: number) => {
    setEditingService(serviceId);
    setEditDuration(getEffectiveDuration(serviceId, currentDuration));
  };

  const saveDuration = useCallback(() => {
    if (!editingService) return;
    const newOverrides = { ...overrides, [editingService]: editDuration };
    setOverrides(newOverrides);
    setStoredData("mila-service-duration-overrides", newOverrides);
    setDocument("service-config", "duration-overrides", newOverrides).catch((err) => console.warn("[Mila] Failed to sync duration overrides:", err));
    setEditingService(null);
    addToast(
      language === "es" ? "Duración actualizada" : "Duration updated",
      "success"
    );
  }, [editingService, editDuration, overrides, addToast, language]);

  const editingServiceData = editingService
    ? seedServices.find((s) => s.id === editingService)
    : null;

  // Group services by category
  const grouped = serviceCategories.map((cat) => ({
    category: cat,
    services: seedServices.filter((s) => s.categoryId === cat.id),
  }));

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("admin", "services")}
        </h1>
        <p className="text-text-secondary mt-1">
          {language === "es"
            ? "Configura la duración estimada de cada servicio"
            : "Configure estimated duration for each service"}
        </p>
      </motion.div>

      {/* Services grouped by category */}
      {grouped.map(({ category, services }) => (
        <motion.div key={category.id} variants={fadeInUp}>
          <h2 className="text-lg font-semibold text-text-primary mb-3 font-[family-name:var(--font-display)]">
            {category.name[language]}
          </h2>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default text-left">
                    <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                      {language === "es" ? "Servicio" : "Service"}
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                      {language === "es" ? "Precio" : "Price"}
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock size={12} />
                        {language === "es" ? "Duración (min)" : "Duration (min)"}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                      {language === "es" ? "Acción" : "Action"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {services.map((service) => {
                    const effectiveDuration = getEffectiveDuration(
                      service.id,
                      service.durationMinutes
                    );
                    const isOverridden = overrides[service.id] !== undefined;
                    return (
                      <tr
                        key={service.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-text-primary">
                            {service.name[language]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                          {formatServicePrice(service.price, service.priceMax)}
                        </td>
                        <td className="px-6 py-4 text-center">
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
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() =>
                              openEditor(service.id, service.durationMinutes)
                            }
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      ))}

      {/* Edit duration modal */}
      <Modal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title={
          language === "es" ? "Editar Duración" : "Edit Duration"
        }
        size="sm"
      >
        {editingServiceData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-bg-glass)" }}>
              <Clock size={20} className="text-text-muted flex-shrink-0" />
              <div>
                <p className="font-medium text-text-primary">
                  {editingServiceData.name[language]}
                </p>
                <p className="text-sm text-text-secondary">
                  {language === "es" ? "Duración por defecto" : "Default duration"}:{" "}
                  {editingServiceData.durationMinutes} min
                </p>
              </div>
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

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingService(null)}
              >
                {t("common", "cancel")}
              </Button>
              <Button size="sm" onClick={saveDuration}>
                {t("common", "save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
