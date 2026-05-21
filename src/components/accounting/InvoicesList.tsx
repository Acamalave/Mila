"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { cn, formatPrice } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { services } from "@/data/services";
import { invoicesInRange as invoicesInRangeHelper } from "@/lib/revenue";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import AdminInvoiceDetailModal from "@/components/admin/AdminInvoiceDetailModal";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Calendar,
  Receipt,
} from "lucide-react";
import type { Invoice, InvoiceStatus } from "@/types";

type FilterTab = "all" | "draft" | "sent" | "paid" | "declined";
type Preset = "thisWeek" | "thisMonth" | "lastMonth" | "thisYear" | "allTime";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

/**
 * Read-only invoice browser shared by the accountant role. Mirrors the
 * admin billing table but strips every mutating affordance (create, send,
 * mark-paid, mark-declined, edit, delete) — the accountant only audits.
 * Clicking a row opens the same AdminInvoiceDetailModal the admin uses,
 * which is already read-only.
 */
export default function InvoicesList() {
  const { language, t } = useLanguage();
  const { invoices } = useInvoices();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [startDate, setStartDate] = useState<string>(firstOfMonthIso());
  const [endDate, setEndDate] = useState<string>(todayIso());
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const applyPreset = useCallback((preset: Preset) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (preset === "thisWeek") {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.getFullYear(), today.getMonth(), diff);
      setStartDate(monday.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "thisMonth") {
      setStartDate(
        new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
      );
      setEndDate(todayStr);
    } else if (preset === "lastMonth") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    } else if (preset === "thisYear") {
      setStartDate(`${today.getFullYear()}-01-01`);
      setEndDate(todayStr);
    } else {
      setStartDate("1970-01-01");
      setEndDate(todayStr);
    }
  }, []);

  const invoicesInRange = useMemo(
    () => invoicesInRangeHelper(invoices, startDate, endDate),
    [invoices, startDate, endDate]
  );

  const filtered = useMemo(
    () =>
      activeTab === "all"
        ? invoicesInRange
        : invoicesInRange.filter((inv) => inv.status === activeTab),
    [invoicesInRange, activeTab]
  );

  const summary = useMemo(() => {
    const total = invoicesInRange.reduce((s, i) => s + i.amount, 0);
    const paid = invoicesInRange
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.amount, 0);
    const pending = invoicesInRange
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + i.amount, 0);
    return { total, paid, pending };
  }, [invoicesInRange]);

  const getService = (id: string) => services.find((s) => s.id === id);

  const statusBadgeVariant = (
    status: InvoiceStatus
  ): "gold" | "success" | "default" | "warning" | "error" => {
    switch (status) {
      case "draft":
        return "default";
      case "sent":
        return "gold";
      case "paid":
        return "success";
      case "overdue":
        return "warning";
      case "declined":
        return "error";
      default:
        return "default";
    }
  };

  const statusLabel = (status: InvoiceStatus): string => {
    if (language === "es") {
      switch (status) {
        case "draft":
          return "Borrador";
        case "sent":
          return "Enviada";
        case "paid":
          return "Pagada";
        case "overdue":
          return "Vencida";
        case "declined":
          return "Rechazada";
        default:
          return status;
      }
    }
    return status;
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: language === "es" ? "Todos" : "All" },
    { key: "draft", label: t("admin", "draft") },
    { key: "sent", label: t("admin", "sent") },
    { key: "paid", label: t("admin", "paid") },
    { key: "declined", label: language === "es" ? "Rechazadas" : "Declined" },
  ];

  const summaryCards = [
    {
      icon: DollarSign,
      value: formatPrice(summary.total),
      label: language === "es" ? "Total Facturado" : "Total Billed",
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: CheckCircle2,
      value: formatPrice(summary.paid),
      label: t("admin", "paid"),
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      icon: Clock,
      value: formatPrice(summary.pending),
      label: t("admin", "pending"),
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center gap-2 mb-1">
          <Receipt size={20} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-text-primary">
            {language === "es" ? "Facturas" : "Invoices"}
          </h1>
        </div>
        <p className="text-text-secondary text-sm">
          {language === "es"
            ? "Vista de solo lectura — auditá facturación, cobros y estado."
            : "Read-only — audit billing, payments, and status."}
        </p>
      </motion.div>

      {/* Period filter */}
      <motion.div variants={fadeInUp}>
        <Card padding="md">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs uppercase tracking-wider font-medium mr-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                <Calendar size={12} className="inline mr-1" />
                {language === "es" ? "Período" : "Period"}
              </span>
              {([
                { key: "thisWeek" as const, label: language === "es" ? "Semana" : "Week" },
                { key: "thisMonth" as const, label: language === "es" ? "Este mes" : "This month" },
                { key: "lastMonth" as const, label: language === "es" ? "Mes pasado" : "Last month" },
                { key: "thisYear" as const, label: language === "es" ? "Este año" : "This year" },
                { key: "allTime" as const, label: language === "es" ? "Todo" : "All time" },
              ]).map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset.key)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium border border-border-default text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {language === "es" ? "Desde" : "From"}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                  className="px-3 py-1.5 rounded-md text-sm bg-bg-input text-text-primary border border-border-default focus:border-mila-gold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {language === "es" ? "Hasta" : "To"}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={todayIso()}
                  className="px-3 py-1.5 rounded-md text-sm bg-bg-input text-text-primary border border-border-default focus:border-mila-gold focus:outline-none"
                />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4"
      >
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.label}
              className="flex flex-col items-center text-center gap-1.5 p-2.5 sm:flex-row sm:text-left sm:items-center sm:gap-4 sm:p-5"
            >
              <div className={cn("p-1.5 sm:p-3 rounded-lg sm:rounded-xl", c.bg)}>
                <Icon size={14} className={cn(c.color, "sm:w-[22px] sm:h-[22px]")} />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-2xl font-bold text-text-primary truncate">
                  {c.value}
                </p>
                <p className="text-[10px] sm:text-sm text-text-secondary truncate leading-tight">
                  {c.label}
                </p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Invoices table */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="flex items-center gap-1 p-4 border-b border-border-default overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap",
                  activeTab === tab.key
                    ? "bg-mila-gold/10 text-mila-gold"
                    : "text-text-muted hover:text-text-primary hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="lg:overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {t("admin", "invoiceId")}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Cliente" : "Client"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                    {language === "es" ? "Servicio" : "Service"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {language === "es" ? "Fecha" : "Date"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {t("admin", "amount")}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    {t("admin", "status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-text-muted"
                    >
                      {language === "es" ? "Sin facturas en este período" : "No invoices in this period"}
                    </td>
                  </tr>
                ) : (
                  filtered
                    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                    .map((invoice) => {
                      const service = invoice.serviceId
                        ? getService(invoice.serviceId)
                        : null;
                      return (
                        <tr
                          key={invoice.id}
                          onClick={() => setViewingInvoice(invoice)}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-mono text-text-primary font-medium">
                            {invoice.id}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary">
                            {invoice.clientName}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary hidden md:table-cell">
                            {service ? service.name[language] : invoice.serviceId || "-"}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary hidden lg:table-cell whitespace-nowrap">
                            {formatShortDate(invoice.date, language)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-text-primary text-right whitespace-nowrap">
                            {formatPrice(invoice.amount)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                            <Badge variant={statusBadgeVariant(invoice.status)}>
                              {statusLabel(invoice.status)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Read-only detail modal — same component the admin uses, no edit
          actions ever rendered on it. */}
      <AdminInvoiceDetailModal
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        invoice={viewingInvoice}
      />
    </motion.div>
  );
}
