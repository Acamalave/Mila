"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { useStaff } from "@/providers/StaffProvider";
import { cn, formatPrice } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { services } from "@/data/services";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import InvoiceFormModal from "@/components/admin/InvoiceFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { DollarSign, CheckCircle2, Clock, Plus, Send, Edit2, Trash2, FileText, Percent, XCircle } from "lucide-react";
import type { Invoice, InvoiceStatus } from "@/types";

type FilterTab = "all" | "draft" | "sent" | "paid" | "declined";

export default function AdminBillingPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const { invoices, addInvoice, updateInvoice, sendInvoice, deleteInvoice, markAsPaid, markAsDeclined } = useInvoices();
  const { commissions, markCommissionPaid, markAllPaidForStylist } = useCommissions();
  const { allStylists } = useStaff();

  const [view, setView] = useState<"invoices" | "commissions">("invoices");
  const [commissionFilter, setCommissionFilter] = useState<"all" | "pending" | "paid">("all");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(
    () =>
      activeTab === "all"
        ? invoices
        : invoices.filter((inv) => inv.status === activeTab),
    [invoices, activeTab]
  );

  const summary = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.amount, 0);
    const pending = invoices
      .filter((inv) => inv.status !== "paid")
      .reduce((sum, inv) => sum + inv.amount, 0);
    return { total, paid, pending };
  }, [invoices]);

  const filteredCommissions = useMemo(() => {
    const sorted = [...commissions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return commissionFilter === "all" ? sorted : sorted.filter((c) => c.status === commissionFilter);
  }, [commissions, commissionFilter]);

  const commissionSummary = useMemo(() => {
    const pending = commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.commissionAmount, 0);
    const paid = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.commissionAmount, 0);
    return { total: pending + paid, pending, paid };
  }, [commissions]);

  const getService = (id: string) => services.find((s) => s.id === id);

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
      sendInvoice(invoiceId);
      addToast(
        t("admin", "invoiceSent"),
        "success"
      );
    },
    [sendInvoice, addToast, t]
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
      label: language === "es" ? "Total Ingresos" : "Total Revenue",
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
          <div className="overflow-x-auto">
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
                      invoice.status === "sent" ||
                      invoice.status === "declined";
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
                        className="hover:bg-white/5 transition-colors"
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
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
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

          {/* Commission table */}
          <motion.div variants={fadeInUp}>
            <Card padding="none">
              <div className="flex items-center gap-1 p-4 border-b border-border-default">
                {(["all", "pending", "paid"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCommissionFilter(f)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                      commissionFilter === f
                        ? "bg-mila-gold/10 text-mila-gold"
                        : "text-text-muted hover:text-text-primary hover:bg-white/5"
                    )}
                  >
                    {f === "all" ? (language === "es" ? "Todas" : "All") : f === "pending" ? (language === "es" ? "Pendientes" : "Pending") : (language === "es" ? "Pagadas" : "Paid")}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-default text-left">
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">{language === "es" ? "Estilista" : "Stylist"}</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">{language === "es" ? "Servicio" : "Service"}</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden lg:table-cell">{language === "es" ? "Precio" : "Price"}</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">{language === "es" ? "Tasa" : "Rate"}</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">{t("admin", "commission")}</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">{t("admin", "status")}</th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">{language === "es" ? "Acciones" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filteredCommissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                          {language === "es" ? "Sin comisiones" : "No commissions"}
                        </td>
                      </tr>
                    ) : (
                      filteredCommissions.map((c) => {
                        const stylist = allStylists.find((s) => s.id === c.stylistId);
                        const service = services.find((s) => s.id === c.serviceId);
                        return (
                          <tr key={c.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-text-primary">{stylist?.name ?? c.stylistId}</td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary hidden md:table-cell">{service?.name[language] ?? c.serviceId}</td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary text-right hidden lg:table-cell">{formatPrice(c.serviceAmount)}</td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary text-center">{c.commissionRate}%</td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-text-primary text-right">{formatPrice(c.commissionAmount)}</td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                              <Badge variant={c.status === "paid" ? "success" : "warning"}>
                                {c.status === "paid" ? (language === "es" ? "Pagada" : "Paid") : (language === "es" ? "Pendiente" : "Pending")}
                              </Badge>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-center">
                              {c.status === "pending" && (
                                <button
                                  onClick={() => {
                                    markCommissionPaid(c.id);
                                    addToast(language === "es" ? "Comision marcada como pagada" : "Commission marked as paid", "success");
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors cursor-pointer"
                                >
                                  {t("admin", "markPaid")}
                                </button>
                              )}
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
        </>
      )}
    </motion.div>
  );
}
