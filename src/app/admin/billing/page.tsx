"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  cn,
  formatPrice,
  getStoredData,
  setStoredData,
} from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { services } from "@/data/services";
import { getInitialDemoAppointments } from "@/data/appointments";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { DollarSign, CheckCircle2, Clock } from "lucide-react";
import type { Booking } from "@/types";

interface Invoice {
  id: string;
  bookingId: string;
  clientName: string;
  serviceId: string;
  date: string;
  amount: number;
  status: "paid" | "pending";
}

function generateInvoicesFromBookings(bookings: Booking[]): Invoice[] {
  return bookings
    .filter(
      (b) => b.status === "confirmed" || b.status === "completed"
    )
    .map((b) => ({
      id: `INV-${b.id.slice(-6).toUpperCase()}`,
      bookingId: b.id,
      clientName: b.guestName || b.clientId || "Client",
      serviceId: b.serviceIds?.[0] ?? "",
      date: b.date,
      amount: b.totalPrice,
      status: (b.status === "completed" ? "paid" : "pending") as
        | "paid"
        | "pending",
    }));
}

type FilterTab = "all" | "paid" | "pending";

export default function AdminBillingPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
    }
    const storedInvoices = getStoredData<Invoice[] | null>(
      "mila-invoices",
      null
    );
    if (storedInvoices) {
      setInvoices(storedInvoices);
    } else {
      const generated = generateInvoicesFromBookings(stored);
      setInvoices(generated);
      setStoredData("mila-invoices", generated);
    }
  }, []);

  const toggleStatus = (invoiceId: string) => {
    const updated = invoices.map((inv) =>
      inv.id === invoiceId
        ? { ...inv, status: (inv.status === "paid" ? "pending" : "paid") as "paid" | "pending" }
        : inv
    );
    setInvoices(updated);
    setStoredData("mila-invoices", updated);

    const toggled = updated.find((inv) => inv.id === invoiceId);
    if (toggled) {
      addToast(
        toggled.status === "paid"
          ? language === "es"
            ? "Marcado como pagado"
            : "Marked as paid"
          : language === "es"
          ? "Marcado como pendiente"
          : "Marked as pending",
        toggled.status === "paid" ? "success" : "info"
      );
    }
  };

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
      .filter((inv) => inv.status === "pending")
      .reduce((sum, inv) => sum + inv.amount, 0);
    return { total, paid, pending };
  }, [invoices]);

  const getService = (id: string) => services.find((s) => s.id === id);

  const tabs: { key: FilterTab; label: string }[] = [
    {
      key: "all",
      label: language === "es" ? "Todos" : "All",
    },
    {
      key: "paid",
      label: t("admin", "paid"),
    },
    {
      key: "pending",
      label: t("admin", "pending"),
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
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("admin", "billing")}
        </h1>
        <p className="text-text-secondary mt-1">
          {language === "es"
            ? "Facturas y estado de pagos"
            : "Invoices and payment status"}
        </p>
      </motion.div>

      {/* Summary */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", card.bg)}>
                <Icon size={22} className={card.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {card.value}
                </p>
                <p className="text-sm text-text-secondary">{card.label}</p>
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
                    : "text-text-muted hover:text-text-primary hover:bg-mila-cream/60"
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
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {t("admin", "invoiceId")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Cliente" : "Client"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                    {language === "es" ? "Servicio" : "Service"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {language === "es" ? "Fecha" : "Date"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {t("admin", "amount")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    {t("admin", "status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-text-muted"
                    >
                      {language === "es"
                        ? "No hay facturas"
                        : "No invoices found"}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const service = getService(invoice.serviceId);
                    return (
                      <tr
                        key={invoice.id}
                        className="hover:bg-mila-cream/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-mono text-text-primary font-medium">
                          {invoice.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {invoice.clientName}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary hidden md:table-cell">
                          {service?.name[language] || invoice.serviceId}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary hidden lg:table-cell">
                          {formatShortDate(invoice.date, language)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                          {formatPrice(invoice.amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleStatus(invoice.id)}
                            className="inline-block cursor-pointer"
                          >
                            <Badge
                              variant={
                                invoice.status === "paid"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {invoice.status === "paid"
                                ? t("admin", "paid")
                                : t("admin", "pending")}
                            </Badge>
                          </button>
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
    </motion.div>
  );
}
