"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { useExpenses } from "@/providers/ExpenseProvider";
import { cn, formatPrice } from "@/lib/utils";
import { totalGatewayFees, gatewayFeeForAmount, wasChargedByGateway, PF_FEE_PERCENT, PF_FEE_FIXED_USD } from "@/lib/gateway-fees";
import {
  invoicesInRange as invoicesInRangeHelper,
  paidInvoicesInRange,
} from "@/lib/revenue";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  DollarSign,
  Receipt,
  CreditCard,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
} from "lucide-react";

type Preset = "thisWeek" | "thisMonth" | "lastMonth" | "thisYear" | "allTime";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

/**
 * Financial overview shared by the accountant role (/accountant) and the
 * admin's Contabilidad tab (/admin/accounting). Centralises the period
 * filter, KPI calculations, breakdown table, and the per-charge detail
 * so both surfaces stay in lockstep — single source of truth.
 */
export default function AccountingOverview() {
  const { language } = useLanguage();
  const { invoices } = useInvoices();
  const { commissions } = useCommissions();
  const { expensesInRange } = useExpenses();

  const [startDate, setStartDate] = useState<string>(firstOfMonthIso());
  const [endDate, setEndDate] = useState<string>(todayIso());

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

  // ── Slice data into the selected period ─────────────────────────────────
  // Uses the shared lib/revenue helpers so admin / accountant / billing all
  // compute the same numbers from the same definitions.
  const invoicesInRange = useMemo(
    () => invoicesInRangeHelper(invoices, startDate, endDate),
    [invoices, startDate, endDate]
  );

  const paidInvoices = useMemo(
    () => paidInvoicesInRange(invoices, startDate, endDate),
    [invoices, startDate, endDate]
  );

  const cardPaid = useMemo(
    () => paidInvoices.filter((inv) => wasChargedByGateway(inv)),
    [paidInvoices]
  );

  const cashPaid = useMemo(
    () => paidInvoices.filter((inv) => !wasChargedByGateway(inv)),
    [paidInvoices]
  );

  const commissionsInRange = useMemo(() => {
    return commissions.filter((c) => {
      const d = c.createdAt.slice(0, 10);
      return d >= startDate && d <= endDate;
    });
  }, [commissions, startDate, endDate]);

  const expensesPeriod = useMemo(
    () => expensesInRange(startDate, endDate),
    [expensesInRange, startDate, endDate]
  );

  // ── Aggregates ──────────────────────────────────────────────────────────
  const totalBilled = invoicesInRange.reduce((s, i) => s + i.amount, 0);
  const totalCollected = paidInvoices.reduce((s, i) => s + i.amount, 0);
  const cardCollected = cardPaid.reduce((s, i) => s + i.amount, 0);
  const cashCollected = cashPaid.reduce((s, i) => s + i.amount, 0);
  const gatewayFees = totalGatewayFees(paidInvoices);
  const stylistCommissions = commissionsInRange.reduce(
    (s, c) => s + c.commissionAmount,
    0
  );
  const operatingExpenses = expensesPeriod.reduce((s, e) => s + e.amount, 0);
  const netForSalon =
    totalCollected - gatewayFees - stylistCommissions - operatingExpenses;
  const grossMarginPct =
    totalCollected > 0
      ? Math.round((netForSalon / totalCollected) * 100)
      : 0;

  const pendingInvoicesPeriod = invoicesInRange.filter(
    (inv) => inv.status === "sent" || inv.status === "overdue"
  );
  const pendingTotal = pendingInvoicesPeriod.reduce((s, i) => s + i.amount, 0);

  // Format date range for header
  const rangeLabel =
    startDate === endDate
      ? new Date(`${startDate}T00:00:00`).toLocaleDateString(
          language === "es" ? "es-ES" : "en-US",
          { day: "numeric", month: "long", year: "numeric" }
        )
      : `${new Date(`${startDate}T00:00:00`).toLocaleDateString(
          language === "es" ? "es-ES" : "en-US",
          { day: "numeric", month: "short" }
        )} – ${new Date(`${endDate}T00:00:00`).toLocaleDateString(
          language === "es" ? "es-ES" : "en-US",
          { day: "numeric", month: "short", year: "numeric" }
        )}`;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8"
    >
      {/* Title */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {language === "es" ? "Contabilidad" : "Accounting"}
        </h1>
        <p className="text-text-secondary mt-1">
          {language === "es"
            ? "Detalle financiero del salón en el período seleccionado"
            : "Salon financial detail for the selected period"}
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
              <span
                className="ml-auto text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                {rangeLabel}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Headline: net for salon (big card) */}
      <motion.div variants={fadeInUp}>
        <Card padding="lg" className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wallet size={18} style={{ color: "var(--color-accent)" }} />
            <p
              className="text-xs uppercase tracking-[0.18em] font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              {language === "es" ? "Neto del Salón" : "Salon Net"}
            </p>
          </div>
          <p
            className="text-4xl sm:text-5xl font-bold"
            style={{
              color: netForSalon >= 0 ? "var(--color-accent)" : "#ef4444",
              fontFamily: "var(--font-display)",
            }}
          >
            {formatPrice(netForSalon)}
          </p>
          <p
            className="text-xs mt-2 inline-flex items-center gap-1 font-medium"
            style={{
              color: grossMarginPct >= 0 ? "var(--color-success)" : "#ef4444",
            }}
          >
            {grossMarginPct >= 0 ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {grossMarginPct}%{" "}
            {language === "es" ? "margen sobre cobrado" : "margin on collected"}
          </p>
        </Card>
      </motion.div>

      {/* Top-line totals (4 cards) */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
      >
        <KpiCard
          icon={Receipt}
          color="info"
          label={language === "es" ? "Total Facturado" : "Total Billed"}
          value={formatPrice(totalBilled)}
          sub={`${invoicesInRange.length} ${
            language === "es"
              ? invoicesInRange.length === 1
                ? "factura"
                : "facturas"
              : invoicesInRange.length === 1
                ? "invoice"
                : "invoices"
          }`}
        />
        <KpiCard
          icon={DollarSign}
          color="success"
          label={language === "es" ? "Total Cobrado" : "Total Collected"}
          value={formatPrice(totalCollected)}
          sub={`${paidInvoices.length} ${language === "es" ? "pagadas" : "paid"}`}
        />
        <KpiCard
          icon={CreditCard}
          color="warning"
          label={language === "es" ? "Comisión Procesador" : "Gateway Fees"}
          value={formatPrice(gatewayFees)}
          sub={`${PF_FEE_PERCENT}% + $${PF_FEE_FIXED_USD.toFixed(2)} ${
            language === "es" ? "por cargo" : "per charge"
          }`}
        />
        <KpiCard
          icon={Users}
          color="gold"
          label={language === "es" ? "Comisión Estilistas" : "Stylist Commissions"}
          value={formatPrice(stylistCommissions)}
          sub={`${commissionsInRange.length} ${
            language === "es"
              ? commissionsInRange.length === 1
                ? "comisión"
                : "comisiones"
              : commissionsInRange.length === 1
                ? "commission"
                : "commissions"
          }`}
        />
      </motion.div>

      {/* Breakdown table: cómo se llega al neto */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="p-4 border-b border-border-default">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
              {language === "es" ? "Cálculo del Neto" : "Net Calculation"}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {language === "es"
                ? "Desglose paso a paso del cobrado al neto del salón"
                : "Step-by-step breakdown from collected to salon net"}
            </p>
          </div>
          <div className="divide-y divide-border-subtle">
            <BreakdownRow
              label={language === "es" ? "Cobrado por tarjeta" : "Card collected"}
              detail={`${cardPaid.length} ${language === "es" ? "transacciones" : "transactions"}`}
              amount={cardCollected}
            />
            <BreakdownRow
              label={language === "es" ? "Cobrado en mostrador" : "Counter collected"}
              detail={`${cashPaid.length} ${language === "es" ? "transacciones" : "transactions"}`}
              amount={cashCollected}
            />
            <BreakdownRow
              label={language === "es" ? "Total cobrado" : "Total collected"}
              amount={totalCollected}
              bold
            />
            <BreakdownRow
              label={language === "es" ? "− Comisión procesador" : "− Gateway fees"}
              detail={`${PF_FEE_PERCENT}% + $${PF_FEE_FIXED_USD.toFixed(2)} ${
                language === "es" ? "por cargo de tarjeta" : "per card charge"
              }`}
              amount={-gatewayFees}
              negative
            />
            <BreakdownRow
              label={language === "es" ? "− Comisión a estilistas" : "− Stylist commissions"}
              detail={`${commissionsInRange.length} ${
                language === "es" ? "comisiones generadas" : "commissions generated"
              }`}
              amount={-stylistCommissions}
              negative
            />
            <BreakdownRow
              label={language === "es" ? "− Gastos operativos" : "− Operating expenses"}
              detail={`${expensesPeriod.length} ${
                language === "es"
                  ? expensesPeriod.length === 1
                    ? "gasto registrado"
                    : "gastos registrados"
                  : expensesPeriod.length === 1
                    ? "expense recorded"
                    : "expenses recorded"
              }`}
              amount={-operatingExpenses}
              negative
            />
            <BreakdownRow
              label={language === "es" ? "= Neto del salón" : "= Salon net"}
              amount={netForSalon}
              bold
              highlight
            />
          </div>
        </Card>
      </motion.div>

      {/* Pending invoices banner (only when applicable) */}
      {pendingInvoicesPeriod.length > 0 && (
        <motion.div variants={fadeInUp}>
          <Link href="/admin/billing" className="block">
            <Card padding="md" className="cursor-pointer hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-warning/10 flex-shrink-0">
                  <Receipt size={18} className="text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {pendingInvoicesPeriod.length}{" "}
                    {language === "es"
                      ? pendingInvoicesPeriod.length === 1
                        ? "factura pendiente"
                        : "facturas pendientes"
                      : pendingInvoicesPeriod.length === 1
                        ? "pending invoice"
                        : "pending invoices"}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatPrice(pendingTotal)}{" "}
                    {language === "es" ? "por cobrar en este período" : "outstanding in this period"}
                  </p>
                </div>
                <ArrowRight size={16} className="text-text-muted flex-shrink-0" />
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Card-charge detail — what the gateway kept per transaction */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="p-4 border-b border-border-default flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
                {language === "es" ? "Detalle de Cargos por Tarjeta" : "Card Charge Detail"}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {language === "es"
                  ? "Qué se cobró y qué quedó después de la comisión del procesador"
                  : "What was charged vs. what cleared after gateway fees"}
              </p>
            </div>
            <Badge variant="default">{cardPaid.length}</Badge>
          </div>
          <div className="lg:overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Fecha" : "Date"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Cliente" : "Client"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {language === "es" ? "Cobrado" : "Charged"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden sm:table-cell">
                    {language === "es" ? "Comisión" : "Fee"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {language === "es" ? "Neto" : "Net"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {cardPaid.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-text-muted text-sm"
                    >
                      {language === "es"
                        ? "Sin cargos por tarjeta en este período"
                        : "No card charges in this period"}
                    </td>
                  </tr>
                ) : (
                  cardPaid
                    .sort((a, b) => (b.paidAt ?? b.date).localeCompare(a.paidAt ?? a.date))
                    .map((inv) => {
                      const fee = gatewayFeeForAmount(inv.amount);
                      const net = inv.amount - fee;
                      return (
                        <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-3 sm:px-6 py-2 text-xs text-text-secondary whitespace-nowrap">
                            {(inv.paidAt ?? inv.date).slice(0, 10)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 text-xs text-text-primary">
                            {inv.clientName}
                          </td>
                          <td className="px-3 sm:px-6 py-2 text-xs text-text-primary text-right tabular-nums">
                            {formatPrice(inv.amount)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 text-xs text-warning text-right tabular-nums hidden sm:table-cell">
                            −{formatPrice(fee)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 text-xs font-semibold text-mila-gold text-right tabular-nums">
                            {formatPrice(net)}
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

// ─── Reusable bits ─────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: typeof DollarSign;
  color: "info" | "success" | "warning" | "gold";
  label: string;
  value: string;
  sub: string;
}

const KPI_COLORS: Record<KpiCardProps["color"], { bg: string; fg: string }> = {
  info: { bg: "bg-info/10", fg: "text-info" },
  success: { bg: "bg-success/10", fg: "text-success" },
  warning: { bg: "bg-warning/10", fg: "text-warning" },
  gold: { bg: "bg-mila-gold/10", fg: "text-mila-gold" },
};

function KpiCard({ icon: Icon, color, label, value, sub }: KpiCardProps) {
  const c = KPI_COLORS[color];
  return (
    <Card className="flex items-center gap-3 p-3 sm:p-5">
      <div className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0", c.bg)}>
        <Icon size={16} className={cn(c.fg, "sm:w-[22px] sm:h-[22px]")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs uppercase tracking-wider text-text-muted">
          {label}
        </p>
        <p className="text-lg sm:text-2xl font-bold text-text-primary truncate leading-tight">
          {value}
        </p>
        <p className="text-[10px] sm:text-xs text-text-muted truncate">{sub}</p>
      </div>
    </Card>
  );
}

interface BreakdownRowProps {
  label: string;
  detail?: string;
  amount: number;
  bold?: boolean;
  negative?: boolean;
  highlight?: boolean;
}

function BreakdownRow({ label, detail, amount, bold, negative, highlight }: BreakdownRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
      style={{
        background: highlight ? "var(--color-accent-subtle)" : undefined,
      }}
    >
      <div className="min-w-0">
        <p
          className="text-sm truncate"
          style={{
            color: bold ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontWeight: bold ? 600 : 400,
          }}
        >
          {label}
        </p>
        {detail && (
          <p className="text-[11px] text-text-muted truncate">{detail}</p>
        )}
      </div>
      <p
        className="text-sm sm:text-base font-semibold tabular-nums whitespace-nowrap"
        style={{
          color: highlight
            ? "var(--color-accent)"
            : negative
              ? "var(--color-warning)"
              : "var(--color-text-primary)",
          fontWeight: bold || highlight ? 700 : 500,
          fontSize: highlight ? "1.125rem" : undefined,
        }}
      >
        {formatPrice(amount)}
      </p>
    </div>
  );
}
