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
import { Clock, Edit2, DollarSign, CreditCard } from "lucide-react";
import type { ServiceDepositConfig } from "@/types/service";

type DurationOverrides = Record<string, number>;
type DepositOverrides = Record<string, ServiceDepositConfig>;

export default function AdminServicesPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const [overrides, setOverrides] = useState<DurationOverrides>(() =>
    getStoredData<DurationOverrides>("mila-service-duration-overrides", {})
  );
  const [depositOverrides, setDepositOverrides] = useState<DepositOverrides>(() =>
    getStoredData<DepositOverrides>("mila-service-deposit-overrides", {})
  );
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editDeposit, setEditDeposit] = useState<ServiceDepositConfig>({
    requiresDeposit: false,
    depositType: "fixed",
    depositAmount: 0,
  });

  useEffect(() => {
    const unsubs = [
      onDocumentChange<Record<string, number>>("service-config", "duration-overrides", (data) => {
        if (data) {
          const overridesData = { ...data };
          delete (overridesData as any).id;
          if (Object.keys(overridesData).length > 0) {
            setOverrides(overridesData);
            setStoredData("mila-service-duration-overrides", overridesData);
          }
        }
      }),
      onDocumentChange<DepositOverrides>("service-config", "deposit-overrides", (data) => {
        if (data) {
          const depositData = { ...data };
          delete (depositData as any).id;
          if (Object.keys(depositData).length > 0) {
            setDepositOverrides(depositData as unknown as DepositOverrides);
            setStoredData("mila-service-deposit-overrides", depositData);
          }
        }
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  const getEffectiveDuration = (serviceId: string, defaultDuration: number) => {
    return overrides[serviceId] ?? defaultDuration;
  };

  const openEditor = (serviceId: string, currentDuration: number) => {
    setEditingService(serviceId);
    setEditDuration(getEffectiveDuration(serviceId, currentDuration));
    setEditDeposit(depositOverrides[serviceId] ?? { requiresDeposit: false, depositType: "fixed", depositAmount: 0 });
  };

  const getDepositInfo = (serviceId: string): ServiceDepositConfig | null => {
    const config = depositOverrides[serviceId];
    return config?.requiresDeposit ? config : null;
  };

  const calculateDeposit = (serviceId: string, price: number): number => {
    const config = depositOverrides[serviceId];
    if (!config?.requiresDeposit) return 0;
    if (config.depositType === "percentage") return Math.round(price * config.depositAmount / 100);
    return config.depositAmount;
  };

  const saveServiceConfig = useCallback(() => {
    if (!editingService) return;

    // Save duration
    const newDurationOverrides = { ...overrides, [editingService]: editDuration };
    setOverrides(newDurationOverrides);
    setStoredData("mila-service-duration-overrides", newDurationOverrides);
    setDocument("service-config", "duration-overrides", newDurationOverrides).catch((err) => console.warn("[Mila] Failed to sync duration overrides:", err));

    // Save deposit config
    const newDepositOverrides = { ...depositOverrides, [editingService]: editDeposit };
    setDepositOverrides(newDepositOverrides);
    setStoredData("mila-service-deposit-overrides", newDepositOverrides);
    setDocument("service-config", "deposit-overrides", newDepositOverrides as unknown as Record<string, unknown>).catch((err) => console.warn("[Mila] Failed to sync deposit overrides:", err));

    setEditingService(null);
    addToast(
      language === "es" ? "Servicio actualizado" : "Service updated",
      "success"
    );
  }, [editingService, editDuration, editDeposit, overrides, depositOverrides, addToast, language]);

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
                        <td className="px-3 sm:px-6 py-2 sm:py-4">
                          <span className="text-xs sm:text-sm font-medium text-text-primary">
                            {service.name[language]}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-text-primary text-right">
                          {formatServicePrice(service.price, service.priceMax)}
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
                            if (!deposit) return <span className="text-xs text-text-muted">—</span>;
                            const amt = deposit.depositType === "percentage"
                              ? `${deposit.depositAmount}%`
                              : `$${deposit.depositAmount}`;
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(196,169,106,0.15)", color: "var(--color-accent)", border: "1px solid rgba(196,169,106,0.3)" }}>
                                <DollarSign size={10} />
                                {amt}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
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
          language === "es" ? "Configurar Servicio" : "Configure Service"
        }
        size="sm"
      >
        {editingServiceData && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-bg-glass)" }}>
              <Clock size={20} className="text-text-muted flex-shrink-0" />
              <div>
                <p className="font-medium text-text-primary">
                  {editingServiceData.name[language]}
                </p>
                <p className="text-sm text-text-secondary">
                  {formatServicePrice(editingServiceData.price, editingServiceData.priceMax)}
                </p>
              </div>
            </div>

            {/* Duration */}
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

            {/* Deposit Configuration */}
            <div className="space-y-3 p-4 rounded-lg border" style={{ borderColor: editDeposit.requiresDeposit ? "var(--color-border-accent)" : "var(--color-border-default)", background: editDeposit.requiresDeposit ? "rgba(196,169,106,0.05)" : "transparent" }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editDeposit.requiresDeposit}
                  onChange={(e) => setEditDeposit({ ...editDeposit, requiresDeposit: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#C4A96A]"
                />
                <div>
                  <span className="text-sm font-medium text-text-primary">
                    {language === "es" ? "Requiere anticipo para reservar" : "Requires deposit to book"}
                  </span>
                  <p className="text-xs text-text-muted">
                    {language === "es" ? "El cliente debe pagar un anticipo al momento de reservar" : "Client must pay a deposit when booking"}
                  </p>
                </div>
              </label>

              {editDeposit.requiresDeposit && (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditDeposit({ ...editDeposit, depositType: "fixed" })}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: editDeposit.depositType === "fixed" ? "var(--color-accent)" : "var(--color-bg-glass)",
                        color: editDeposit.depositType === "fixed" ? "#0a0a0a" : "var(--color-text-secondary)",
                      }}
                    >
                      {language === "es" ? "Monto fijo ($)" : "Fixed amount ($)"}
                    </button>
                    <button
                      onClick={() => setEditDeposit({ ...editDeposit, depositType: "percentage" })}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: editDeposit.depositType === "percentage" ? "var(--color-accent)" : "var(--color-bg-glass)",
                        color: editDeposit.depositType === "percentage" ? "#0a0a0a" : "var(--color-text-secondary)",
                      }}
                    >
                      {language === "es" ? "Porcentaje (%)" : "Percentage (%)"}
                    </button>
                  </div>
                  <Input
                    label={editDeposit.depositType === "fixed"
                      ? (language === "es" ? "Monto del anticipo ($)" : "Deposit amount ($)")
                      : (language === "es" ? "Porcentaje del anticipo (%)" : "Deposit percentage (%)")
                    }
                    type="number"
                    min="1"
                    max={editDeposit.depositType === "percentage" ? "100" : undefined}
                    step="1"
                    value={editDeposit.depositAmount.toString()}
                    onChange={(e) => setEditDeposit({ ...editDeposit, depositAmount: parseInt(e.target.value, 10) || 0 })}
                  />
                  {editDeposit.depositType === "percentage" && editDeposit.depositAmount > 0 && (
                    <p className="text-xs text-text-muted">
                      = ${Math.round(editingServiceData.price * editDeposit.depositAmount / 100)} {language === "es" ? "de anticipo sobre" : "deposit on"} {formatServicePrice(editingServiceData.price, editingServiceData.priceMax)}
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
    </motion.div>
  );
}
