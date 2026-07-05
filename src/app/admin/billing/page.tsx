"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useProducts } from "@/providers/ProductProvider";
import { useService } from "@/providers/ServiceProvider";
import { commissionWorkDate } from "@/lib/commissions";
import { cn, formatPrice } from "@/lib/utils";
import { formatShortDate, localIsoDate } from "@/lib/date-utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import InvoiceFormModal from "@/components/admin/InvoiceFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import AdminInvoiceDetailModal from "@/components/admin/AdminInvoiceDetailModal";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Edit2,
  Trash2,
  FileText,
  Percent,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { invoicesInRange as invoicesInRangeHelper } from "@/lib/revenue";
import type { Invoice, InvoiceStatus } from "@/types";

type FilterTab = "all" | "draft" | "sent" | "paid" | "declined";

export default function AdminBillingPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const { invoices, addInvoice, updateInvoice, sendInvoice, deleteInvoice, markAsPaid, markAsDeclined } = useInvoices();
  const { commissions, markAllPaidForStylist, rebuildAllCommissions } = useCommissions();
  const { allProducts } = useProducts();
  const { allServices } = useService();
  const { allStylists } = useStaff();

  const [view, setView] = useState<"invoices" | "commissions">("invoices");
  const [commissionFilter, setCommissionFilter] = useState<"all" | "pending" | "paid">("all");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  /** Read-only detail popup shown when clicking an invoice row. */
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // ── Commission period filter ──
  // Default to "this month" — most operators settle commissions monthly.
  const todayIso = useMemo(() => localIsoDate(), []);
  const firstOfMonthIso = useMemo(() => {
    const d = new Date();
    return localIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);
  const [commissionStartDate, setCommissionStartDate] = useState<string>(firstOfMonthIso);
  const [commissionEndDate, setCommissionEndDate] = useState<string>(todayIso);
  // Invoices view gets its own date range so each view remembers its own
  // selection across toggles.
  const [invoiceStartDate, setInvoiceStartDate] = useState<string>(firstOfMonthIso);
  const [invoiceEndDate, setInvoiceEndDate] = useState<string>(todayIso);
  /** Which stylist cards are expanded — keyed by stylistId. */
  const [expandedStylists, setExpandedStylists] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((stylistId: string) => {
    setExpandedStylists((prev) => {
      const next = new Set(prev);
      if (next.has(stylistId)) next.delete(stylistId);
      else next.add(stylistId);
      return next;
    });
  }, []);

  /**
   * Quick-range presets — generic so both the invoices view and the
   * commissions view can reuse the same logic by passing their own setters.
   */
  type Preset = "thisWeek" | "thisMonth" | "last30" | "allTime";
  const applyPresetTo = useCallback(
    (
      preset: Preset,
      setStart: (v: string) => void,
      setEnd: (v: string) => void
    ) => {
      const today = new Date();
      const todayStr = localIsoDate(today);
      if (preset === "thisWeek") {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.getFullYear(), today.getMonth(), diff);
        setStart(localIsoDate(monday));
        setEnd(todayStr);
      } else if (preset === "thisMonth") {
        setStart(localIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)));
        setEnd(todayStr);
      } else if (preset === "last30") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        setStart(localIsoDate(d));
        setEnd(todayStr);
      } else {
        setStart("1970-01-01");
        setEnd(todayStr);
      }
    },
    []
  );
  const applyCommissionPreset = useCallback(
    (preset: Preset) =>
      applyPresetTo(preset, setCommissionStartDate, setCommissionEndDate),
    [applyPresetTo]
  );
  const applyInvoicePreset = useCallback(
    (preset: Preset) =>
      applyPresetTo(preset, setInvoiceStartDate, setInvoiceEndDate),
    [applyPresetTo]
  );

  const presetButtons: { key: Preset; label: string }[] = useMemo(
    () => [
      { key: "thisWeek", label: language === "es" ? "Semana" : "Week" },
      { key: "thisMonth", label: language === "es" ? "Mes" : "Month" },
      { key: "last30", label: language === "es" ? "Últimos 30 días" : "Last 30 days" },
      { key: "allTime", label: language === "es" ? "Todo" : "All time" },
    ],
    [language]
  );

  /**
   * Invoices in the selected date window — uses the shared helper so this
   * matches what /admin/accounting and /accountant see for the same range.
   * Status filter (draft/sent/paid/declined tabs) is applied on top.
   */
  const invoicesInRange = useMemo(
    () => invoicesInRangeHelper(invoices, invoiceStartDate, invoiceEndDate),
    [invoices, invoiceStartDate, invoiceEndDate]
  );

  const filteredInvoices = useMemo(
    () =>
      activeTab === "all"
        ? invoicesInRange
        : invoicesInRange.filter((inv) => inv.status === activeTab),
    [invoicesInRange, activeTab]
  );

  const summary = useMemo(() => {
    // Summary always reflects the selected date range so the cards match
    // the table below them.
    const total = invoicesInRange.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = invoicesInRange
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.amount, 0);
    const pending = invoicesInRange
      .filter((inv) => inv.status === "sent" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.amount, 0);
    return { total, paid, pending };
  }, [invoicesInRange]);

  // Source-invoice issue dates — fallback for commissions created before
  // `workDate` existed, so they still filter/group by the day of the work.
  const invoiceDateById = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoices) if (inv.date) map.set(inv.id, inv.date);
    return map;
  }, [invoices]);

  /** Effective YYYY-MM-DD the work happened (workDate → invoice date → createdAt). */
  const commissionDate = useCallback(
    (c: (typeof commissions)[number]) => commissionWorkDate(c, invoiceDateById),
    [invoiceDateById]
  );

  /**
   * Commissions filtered by both date range AND status. The range compares
   * against the date the work happened — NOT the record's createdAt — so
   * billing typed in retroactively still settles in the right period.
   * Inclusive on both ends.
   */
  const filteredCommissions = useMemo(() => {
    const inRange = commissions.filter((c) => {
      const d = commissionDate(c);
      return d >= commissionStartDate && d <= commissionEndDate;
    });
    const sorted = [...inRange].sort((a, b) =>
      commissionDate(b).localeCompare(commissionDate(a))
    );
    return commissionFilter === "all"
      ? sorted
      : sorted.filter((c) => c.status === commissionFilter);
  }, [commissions, commissionDate, commissionFilter, commissionStartDate, commissionEndDate]);

  /** Totals — always computed off the filtered (period-scoped) list. */
  const commissionSummary = useMemo(() => {
    const pending = filteredCommissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const paid = filteredCommissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    return { total: pending + paid, pending, paid };
  }, [filteredCommissions]);

  /**
   * One bucket per stylist in the filtered window. Stylists without
   * commissions in the period don't appear. Sorted by total earned desc
   * so the highest earners surface first.
   */
  const commissionsByStylist = useMemo(() => {
    const groups = new Map<
      string,
      { stylistId: string; rows: typeof filteredCommissions; total: number; pending: number; paid: number }
    >();
    for (const c of filteredCommissions) {
      const bucket = groups.get(c.stylistId) ?? {
        stylistId: c.stylistId,
        rows: [],
        total: 0,
        pending: 0,
        paid: 0,
      };
      bucket.rows.push(c);
      bucket.total += c.commissionAmount;
      if (c.status === "paid") bucket.paid += c.commissionAmount;
      else bucket.pending += c.commissionAmount;
      groups.set(c.stylistId, bucket);
    }
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [filteredCommissions]);

  const getService = (id: string) => allServices.find((s) => s.id === id);

  const handleSaveInvoice = useCallback(
    (data: Omit<Invoice, "id" | "createdAt">) => {
      if (editingInvoice) {
        updateInvoice(editingInvoice.id, data);
        addToast(
          language === "es"
            ? "Factura actualizada"
            : "Invoice updated",
          "success"
        );
      } else {
        addInvoice(data);
        addToast(
          language === "es"
            ? "Factura creada"
            : "Invoice created",
          "success"
        );
      }
      setEditingInvoice(null);
      setShowFormModal(false);
    },
    [editingInvoice, addInvoice, updateInvoice, addToast, language]
  );

  const handleSendInvoice = useCallback(
    (invoiceId: string) => {
      const result = sendInvoice(invoiceId);
      addToast(
        result.ok
          ? language === "es" ? "Factura enviada" : "Invoice sent"
          : result.error || (language === "es" ? "No se pudo enviar la factura" : "Could not send invoice"),
        result.ok ? "success" : "error"
      );
    },
    [sendInvoice, addToast, language]
  );

  const handleResendInvoice = useCallback(
    (invoiceId: string) => {
      const result = sendInvoice(invoiceId);
      addToast(
        result.ok
          ? language === "es" ? "Solicitud de pago reenviada" : "Payment request resent"
          : result.error || (language === "es" ? "No se pudo reenviar" : "Could not resend"),
        result.ok ? "success" : "error"
      );
    },
    [sendInvoice, addToast, language]
  );

  const handleDeleteInvoice = useCallback(() => {
    if (!deletingInvoice) return;
    deleteInvoice(deletingInvoice.id);
    setDeletingInvoice(null);
    addToast(
      language === "es"
        ? "Factura eliminada"
        : "Invoice deleted",
      "success"
    );
  }, [deletingInvoice, deleteInvoice, addToast, language]);

  const openEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowFormModal(true);
  };

  const openCreateModal = () => {
    setEditingInvoice(null);
    setShowFormModal(true);
  };

  const statusBadgeVariant = (status: InvoiceStatus) => {
    switch (status) {
      case "draft":
        return "default" as const;
      case "sent":
        return "gold" as const;
      case "paid":
        return "success" as const;
      case "overdue":
        return "warning" as const;
      case "declined":
        return "error" as const;
      default:
        return "default" as const;
    }
  };

  const statusLabel = (status: InvoiceStatus) => {
    switch (status) {
      case "draft":
        return t("admin", "draft");
      case "sent":
        return t("admin", "sent");
      case "paid":
        return t("admin", "paid");
      case "overdue":
        return language === "es" ? "Vencida" : "Overdue";
      case "declined":
        return language === "es" ? "Rechazada" : "Declined";
      default:
        return status;
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    {
      key: "all",
      label: language === "es" ? "Todos" : "All",
    },
    {
      key: "draft",
      label: t("admin", "draft"),
    },
    {
      key: "sent",
      label: t("admin", "sent"),
    },
    {
      key: "paid",
      label: t("admin", "paid"),
    },
    {
      key: "declined",
      label: language === "es" ? "Rechazadas" : "Declined",
    },
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
      className="space-y-8"
    >
      {/* Header */}
      <motion.div
        variants={fadeInUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
            {t("admin", "billing")}
          </h1>
          <p className="text-text-secondary mt-1">
            {language === "es"
              ? "Facturas y estado de pagos"
              : "Invoices and payment status"}
          </p>
        </div>
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} />
          {t("admin", "createInvoice")}
        </Button>
      </motion.div>

      {/* View Toggle */}
      <motion.div variants={fadeInUp} className="flex items-center gap-2">
        <button
          onClick={() => setView("invoices")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
            view === "invoices"
              ? "bg-mila-gold/15 text-mila-gold"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          )}
        >
          <span className="flex items-center gap-2">
            <FileText size={16} />
            {t("admin", "billing")}
          </span>
        </button>
        <button
          onClick={() => setView("commissions")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
            view === "commissions"
              ? "bg-mila-gold/15 text-mila-gold"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          )}
        >
          <span className="flex items-center gap-2">
            <Percent size={16} />
            {t("admin", "commissions")}
          </span>
        </button>
      </motion.div>

      {view === "invoices" && (
      <>
      {/* Date range filter — same UX as the commissions view */}
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
              {presetButtons.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => applyInvoicePreset(preset.key)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium border border-border-default text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {language === "es" ? "Desde" : "From"}
                </label>
                <input
                  type="date"
                  value={invoiceStartDate}
                  onChange={(e) => setInvoiceStartDate(e.target.value)}
                  max={invoiceEndDate}
                  className="px-3 py-1.5 rounded-md text-sm bg-bg-input text-text-primary border border-border-default focus:border-mila-gold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {language === "es" ? "Hasta" : "To"}
                </label>
                <input
                  type="date"
                  value={invoiceEndDate}
                  onChange={(e) => setInvoiceEndDate(e.target.value)}
                  min={invoiceStartDate}
                  max={todayIso}
                  className="px-3 py-1.5 rounded-md text-sm bg-bg-input text-text-primary border border-border-default focus:border-mila-gold focus:outline-none"
                />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="flex flex-col items-center text-center gap-1.5 p-2.5 sm:flex-row sm:text-left sm:items-center sm:gap-4 sm:p-5">
              <div className={cn("p-1.5 sm:p-3 rounded-lg sm:rounded-xl", card.bg)}>
                <Icon size={14} className={cn(card.color, "sm:w-[22px] sm:h-[22px]")} />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-2xl font-bold text-text-primary truncate">
                  {card.value}
                </p>
                <p className="text-[10px] sm:text-sm text-text-secondary truncate leading-tight">{card.label}</p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Tabs + table */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-4 border-b border-border-default">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  activeTab === tab.key
                    ? "bg-mila-gold/10 text-mila-gold"
                    : "text-text-muted hover:text-text-primary hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
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
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    {language === "es" ? "Acciones" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-text-muted"
                    >
                      {language === "es"
                        ? "No hay facturas"
                        : "No invoices found"}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const service = invoice.serviceId
                      ? getService(invoice.serviceId)
                      : null;
                    const canSend =
                      invoice.status === "draft" ||
                      invoice.status === "declined";
                    const canResend =
                      invoice.status === "sent" ||
                      invoice.status === "overdue";
                    const canMarkPaid =
                      invoice.status === "sent" ||
                      invoice.status === "overdue" ||
                      invoice.status === "declined";
                    const canDecline =
                      invoice.status === "sent" ||
                      invoice.status === "overdue";
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
                          {service
                            ? service.name[language]
                            : invoice.serviceId || "-"}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary hidden lg:table-cell">
                          {formatShortDate(invoice.date, language)}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-text-primary text-right">
                          {formatPrice(invoice.amount)}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                          <Badge variant={statusBadgeVariant(invoice.status)}>
                            {statusLabel(invoice.status)}
                          </Badge>
                        </td>
                        <td
                          className="px-3 sm:px-6 py-2 sm:py-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {canMarkPaid && (
                              <button
                                onClick={() => {
                                  const result = markAsPaid(invoice.id, `manual-${Date.now()}`);
                                  if (result.ok) {
                                    addToast(
                                      language === "es"
                                        ? "Factura marcada como pagada"
                                        : "Invoice marked as paid",
                                      "success"
                                    );
                                  } else {
                                    addToast(
                                      language === "es"
                                        ? `No se puede pagar esta factura (${result.error ?? ""})`
                                        : `Cannot mark this invoice paid (${result.error ?? ""})`,
                                      "error"
                                    );
                                  }
                                }}
                                title={language === "es" ? "Marcar Pagado" : "Mark as Paid"}
                                className="p-2 rounded-lg hover:bg-success/10 transition-colors text-text-muted hover:text-success cursor-pointer"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {canDecline && (
                              <button
                                onClick={() => {
                                  const result = markAsDeclined(invoice.id);
                                  if (result.ok) {
                                    addToast(
                                      language === "es"
                                        ? "Factura marcada como rechazada"
                                        : "Invoice marked as declined",
                                      "error"
                                    );
                                  } else {
                                    addToast(
                                      language === "es"
                                        ? `Transición inválida (${result.error ?? ""})`
                                        : `Invalid transition (${result.error ?? ""})`,
                                      "error"
                                    );
                                  }
                                }}
                                title={language === "es" ? "Marcar Rechazada" : "Mark as Declined"}
                                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-text-muted hover:text-red-500 cursor-pointer"
                              >
                                <XCircle size={16} />
                              </button>
                            )}
                            {canSend && (
                              <button
                                onClick={() => handleSendInvoice(invoice.id)}
                                title={t("admin", "sendInvoice")}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-mila-gold cursor-pointer"
                              >
                                <Send size={16} />
                              </button>
                            )}
                            {canResend && (
                              <button
                                onClick={() => handleResendInvoice(invoice.id)}
                                title={language === "es" ? "Reenviar solicitud de pago" : "Resend payment request"}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-mila-gold cursor-pointer"
                              >
                                <RefreshCw size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(invoice)}
                              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingInvoice(invoice)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors text-text-muted hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

      {/* Invoice form modal (create / edit) */}
      <InvoiceFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingInvoice(null);
        }}
        invoice={editingInvoice ?? undefined}
        onSave={handleSaveInvoice}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={!!deletingInvoice}
        onClose={() => setDeletingInvoice(null)}
        onConfirm={handleDeleteInvoice}
        title={t("admin", "deleteInvoice")}
        message={t("admin", "confirmDeleteInvoice")}
        itemName={deletingInvoice?.id ?? ""}
      />

      </>
      )}

      {view === "commissions" && (
        <>
          {/* Commission Summary */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
            <Card className="flex flex-col items-center text-center gap-1.5 p-2.5 sm:flex-row sm:text-left sm:items-center sm:gap-4 sm:p-5">
              <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-mila-gold/10">
                <DollarSign size={14} className="text-mila-gold sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-2xl font-bold text-text-primary truncate">{formatPrice(commissionSummary.total)}</p>
                <p className="text-[10px] sm:text-sm text-text-secondary truncate leading-tight">{t("admin", "totalCommissions")}</p>
              </div>
            </Card>
            <Card className="flex flex-col items-center text-center gap-1.5 p-2.5 sm:flex-row sm:text-left sm:items-center sm:gap-4 sm:p-5">
              <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-warning/10">
                <Clock size={14} className="text-warning sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-2xl font-bold text-text-primary truncate">{formatPrice(commissionSummary.pending)}</p>
                <p className="text-[10px] sm:text-sm text-text-secondary truncate leading-tight">{t("admin", "pendingCommissions")}</p>
              </div>
            </Card>
            <Card className="flex flex-col items-center text-center gap-1.5 p-2.5 sm:flex-row sm:text-left sm:items-center sm:gap-4 sm:p-5">
              <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-success/10">
                <CheckCircle2 size={14} className="text-success sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-2xl font-bold text-text-primary truncate">{formatPrice(commissionSummary.paid)}</p>
                <p className="text-[10px] sm:text-sm text-text-secondary truncate leading-tight">{t("admin", "paidCommissions")}</p>
              </div>
            </Card>
          </motion.div>

          {/* Date range + status filter */}
          <motion.div variants={fadeInUp}>
            <Card padding="md">
              <div className="flex flex-col gap-3">
                {/* Quick presets */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs uppercase tracking-wider font-medium mr-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Calendar size={12} className="inline mr-1" />
                    {language === "es" ? "Período" : "Period"}
                  </span>
                  {presetButtons.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => applyCommissionPreset(preset.key)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border-default text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      const { regenerated, orphansRemoved } = await rebuildAllCommissions();
                      const parts: string[] = [];
                      if (regenerated > 0) {
                        parts.push(
                          language === "es"
                            ? `${regenerated} factura(s) reprocesada(s)`
                            : `${regenerated} invoice(s) reprocessed`
                        );
                      }
                      if (orphansRemoved > 0) {
                        parts.push(
                          language === "es"
                            ? `${orphansRemoved} huérfana(s) eliminada(s)`
                            : `${orphansRemoved} orphan(s) removed`
                        );
                      }
                      addToast(
                        parts.length
                          ? parts.join(" · ")
                          : language === "es"
                            ? "Comisiones ya están al día"
                            : "Commissions already up to date",
                        parts.length ? "success" : "info"
                      );
                    }}
                    title={
                      language === "es"
                        ? "Recalcula comisiones para todas las facturas pagadas + elimina huérfanas"
                        : "Recompute commissions for all paid invoices + remove orphans"
                    }
                    className="ml-auto px-3 py-1.5 rounded-md text-xs font-medium border border-border-default text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    {language === "es" ? "Reconstruir comisiones" : "Rebuild commissions"}
                  </button>
                </div>

                {/* Explicit date inputs + status pills */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label
                      className="text-xs font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {language === "es" ? "Desde" : "From"}
                    </label>
                    <input
                      type="date"
                      value={commissionStartDate}
                      onChange={(e) => setCommissionStartDate(e.target.value)}
                      max={commissionEndDate}
                      className="px-3 py-1.5 rounded-md text-sm bg-bg-input text-text-primary border border-border-default focus:border-mila-gold focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      className="text-xs font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {language === "es" ? "Hasta" : "To"}
                    </label>
                    <input
                      type="date"
                      value={commissionEndDate}
                      onChange={(e) => setCommissionEndDate(e.target.value)}
                      min={commissionStartDate}
                      max={todayIso}
                      className="px-3 py-1.5 rounded-md text-sm bg-bg-input text-text-primary border border-border-default focus:border-mila-gold focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    {(["all", "pending", "paid"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setCommissionFilter(f)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer",
                          commissionFilter === f
                            ? "bg-mila-gold/10 text-mila-gold"
                            : "text-text-muted hover:text-text-primary hover:bg-white/5"
                        )}
                      >
                        {f === "all"
                          ? language === "es" ? "Todas" : "All"
                          : f === "pending"
                          ? language === "es" ? "Pendientes" : "Pending"
                          : language === "es" ? "Pagadas" : "Paid"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Stylist cards */}
          <motion.div variants={fadeInUp} className="space-y-3">
            {commissionsByStylist.length === 0 ? (
              <Card padding="lg">
                <p className="text-center text-text-muted py-8">
                  {language === "es"
                    ? "Sin comisiones en este período"
                    : "No commissions in this period"}
                </p>
              </Card>
            ) : (
              commissionsByStylist.map((group) => {
                const stylist = allStylists.find((s) => s.id === group.stylistId);
                const isExpanded = expandedStylists.has(group.stylistId);
                const hasPending = group.pending > 0;
                return (
                  <Card key={group.stylistId} padding="none">
                    {/* Summary row */}
                    <button
                      onClick={() => toggleExpanded(group.stylistId)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer text-left"
                    >
                      <Avatar
                        src={stylist?.avatar ?? ""}
                        alt={stylist?.name ?? group.stylistId}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {stylist?.name ?? group.stylistId}
                        </p>
                        <div className="text-[11px] text-text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span>
                            {group.rows.length}{" "}
                            {language === "es"
                              ? group.rows.length === 1
                                ? "comisión"
                                : "comisiones"
                              : group.rows.length === 1
                              ? "commission"
                              : "commissions"}
                          </span>
                          {group.pending > 0 && (
                            <span className="text-warning">
                              · {language === "es" ? "Pendiente" : "Pending"}:{" "}
                              {formatPrice(group.pending)}
                            </span>
                          )}
                          {group.paid > 0 && (
                            <span className="text-success">
                              · {language === "es" ? "Pagado" : "Paid"}:{" "}
                              {formatPrice(group.paid)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">
                          {language === "es" ? "Total" : "Total"}
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-mila-gold">
                          {formatPrice(group.total)}
                        </p>
                      </div>
                      {hasPending && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllPaidForStylist(group.stylistId);
                            addToast(
                              language === "es"
                                ? "Comisiones marcadas como pagadas"
                                : "Commissions marked as paid",
                              "success"
                            );
                          }}
                          className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors cursor-pointer"
                        >
                          {language === "es" ? "Pagar todo" : "Pay all"}
                        </button>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-text-muted" />
                      ) : (
                        <ChevronDown size={18} className="text-text-muted" />
                      )}
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border-default lg:overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border-subtle text-left bg-white/[0.02]">
                              <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                                {language === "es" ? "Fecha" : "Date"}
                              </th>
                              <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                                {language === "es" ? "Servicio" : "Service"}
                              </th>
                              <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                                {language === "es" ? "Cliente" : "Client"}
                              </th>
                              <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden sm:table-cell">
                                {language === "es" ? "Precio" : "Price"}
                              </th>
                              <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center hidden sm:table-cell">
                                {language === "es" ? "Tasa" : "Rate"}
                              </th>
                              <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                                {t("admin", "commission")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-subtle">
                            {group.rows.map((c) => {
                              // Resolve the display name: the name captured
                              // at sale time wins; then the live catalogs
                              // (services incl. custom ones, products); the
                              // "invoice-amount" sentinel marks an items-less
                              // invoice (the whole amount → one commission).
                              const matchedService = allServices.find(
                                (s) => s.id === c.serviceId
                              );
                              const matchedProduct = !matchedService
                                ? allProducts.find((p) => p.id === c.serviceId)
                                : null;
                              const sourceInvoice = c.invoiceId
                                ? invoices.find((i) => i.id === c.invoiceId)
                                : null;
                              const invoiceItemName = sourceInvoice?.items?.find(
                                (it) => it.id === c.serviceId
                              )?.name;
                              const displayName = c.serviceName
                                ? c.serviceName
                                : matchedService
                                ? matchedService.name[language]
                                : matchedProduct
                                ? matchedProduct.name
                                : invoiceItemName
                                ? invoiceItemName
                                : c.serviceId === "invoice-amount"
                                ? language === "es"
                                  ? "Factura completa"
                                  : "Whole invoice"
                                : c.serviceId;
                              const clientName = sourceInvoice?.clientName ?? "—";
                              // Format the rate column: flat per-unit
                              // commissions display as e.g. "$3 / und"
                              // instead of a meaningless 0% reading.
                              const rateDisplay = c.commissionFlatPerUnit
                                ? `${formatPrice(c.commissionFlatPerUnit)} ${language === "es" ? "/ und" : "/ unit"}`
                                : `${c.commissionRate}%`;
                              return (
                                <tr
                                  key={c.id}
                                  className="hover:bg-white/[0.03] transition-colors"
                                >
                                  <td className="px-3 sm:px-6 py-2 text-xs text-text-secondary whitespace-nowrap">
                                    {formatShortDate(commissionDate(c), language)}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2 text-xs text-text-primary">
                                    {displayName}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2 text-xs text-text-secondary">
                                    {sourceInvoice ? (
                                      <button
                                        onClick={() => setViewingInvoice(sourceInvoice)}
                                        className="hover:text-mila-gold transition-colors cursor-pointer text-left"
                                        title={
                                          language === "es"
                                            ? "Ver factura"
                                            : "View invoice"
                                        }
                                      >
                                        {clientName}
                                      </button>
                                    ) : (
                                      <span>{clientName}</span>
                                    )}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2 text-xs text-text-secondary text-right hidden sm:table-cell">
                                    {formatPrice(c.serviceAmount)}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2 text-xs text-text-secondary text-center hidden sm:table-cell whitespace-nowrap">
                                    {rateDisplay}
                                  </td>
                                  <td className="px-3 sm:px-6 py-2 text-xs font-medium text-text-primary text-right">
                                    {formatPrice(c.commissionAmount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </motion.div>
        </>
      )}

      {/* Detail modal — shared by invoices and commissions views */}
      <AdminInvoiceDetailModal
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        invoice={viewingInvoice}
      />
    </motion.div>
  );
}
