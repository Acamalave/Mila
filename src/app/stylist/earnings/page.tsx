"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { cn, formatPrice } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import {
  getCurrentQuincena,
  getQuincenaOf,
  quincenaLabel,
  type Quincena,
} from "@/lib/quincena";
import { services } from "@/data/services";
import Card from "@/components/ui/Card";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  CalendarDays,
  CalendarRange,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  FileText,
  BookOpen,
} from "lucide-react";
import type { CommissionRecord } from "@/types";

// Purely informational: this page shows WHAT the stylist earned and WHERE it
// came from (which invoice / booking generated the commission), grouped by
// quincena. There's no "paid/pending" concept here on purpose — settlement
// happens outside the app, so tracking it would only confuse the operator.

type PresetRange =
  | "current"
  | "thisMonth"
  | "thisYear"
  | "last90"
  | "custom";

interface DateRange {
  from: Date;
  to: Date;
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeRange(preset: PresetRange, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth();
  switch (preset) {
    case "current": {
      const q = getCurrentQuincena();
      return { from: q.start, to: q.end };
    }
    case "thisMonth":
      return {
        from: new Date(year, monthIdx, 1, 0, 0, 0, 0),
        to: new Date(year, monthIdx + 1, 0, 23, 59, 59, 999),
      };
    case "thisYear":
      return {
        from: new Date(year, 0, 1, 0, 0, 0, 0),
        to: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    case "last90":
      return {
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        to: now,
      };
    case "custom": {
      const from = customFrom ? new Date(`${customFrom}T00:00:00`) : new Date(year, monthIdx, 1);
      const to = customTo ? new Date(`${customTo}T23:59:59.999`) : now;
      return { from, to };
    }
  }
}

interface QuincenaGroup {
  q: Quincena;
  items: CommissionRecord[];
  total: number;
}

function CommissionRows({
  items,
  language,
}: {
  items: CommissionRecord[];
  language: "es" | "en";
}) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-text-muted">
        {language === "es"
          ? "Sin servicios registrados en este período."
          : "No services recorded in this period."}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-default text-left">
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
              {language === "es" ? "Servicio" : "Service"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
              {language === "es" ? "Origen" : "Source"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
              {language === "es" ? "Fecha" : "Date"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden lg:table-cell">
              {language === "es" ? "Monto" : "Amount"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden md:table-cell">
              {language === "es" ? "Tarifa" : "Rate"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
              {language === "es" ? "Ganancia" : "Earned"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {items.map((c) => {
            const service = services.find((s) => s.id === c.serviceId);
            const isFlat = !!c.commissionFlatPerUnit;
            const isBooking = !!c.bookingId;
            const isInvoice = !!c.invoiceId;
            const sourceId = c.invoiceId ?? c.bookingId ?? "";
            const sourceShort = sourceId ? sourceId.slice(-8) : "—";
            const sourceIcon = isInvoice ? FileText : isBooking ? BookOpen : null;
            const sourceLabel = isInvoice
              ? language === "es" ? "Factura" : "Invoice"
              : isBooking
                ? language === "es" ? "Reserva" : "Booking"
                : "";
            return (
              <tr key={c.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-text-primary">
                  {service?.name[language] ?? c.serviceId}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary hidden md:table-cell">
                  {sourceId ? (
                    <span className="inline-flex items-center gap-1.5">
                      {sourceIcon &&
                        (() => {
                          const Icon = sourceIcon;
                          return <Icon size={12} className="text-text-muted" />;
                        })()}
                      <span className="text-xs">
                        {sourceLabel}{" "}
                        <span className="font-mono text-text-muted">…{sourceShort}</span>
                      </span>
                    </span>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary hidden md:table-cell">
                  {formatShortDate(c.createdAt, language)}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary text-right hidden lg:table-cell">
                  {formatPrice(c.serviceAmount)}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary text-right hidden md:table-cell">
                  {isFlat
                    ? `$${c.commissionFlatPerUnit?.toFixed(2)} ${language === "es" ? "fijo" : "flat"}`
                    : `${c.commissionRate}%`}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-mila-gold text-right">
                  {formatPrice(c.commissionAmount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function StylistEarningsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { getStylistByPhone } = useStaff();
  const { getCommissionsForStylist } = useCommissions();

  const [preset, setPreset] = useState<PresetRange>("thisYear");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const stylist = useMemo(
    () => (user?.phone ? getStylistByPhone(user.phone) : undefined),
    [user?.phone, getStylistByPhone]
  );

  const commissions = useMemo(
    () => (stylist ? getCommissionsForStylist(stylist.id) : []),
    [stylist, getCommissionsForStylist]
  );

  const range = useMemo(
    () => computeRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  // Filter by createdAt within the selected range.
  const inRange = useMemo(() => {
    const fromMs = range.from.getTime();
    const toMs = range.to.getTime();
    return commissions.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= fromMs && t <= toMs;
    });
  }, [commissions, range]);

  // Fixed at-a-glance totals — independent of the range filter.
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const currentQ = useMemo(() => getCurrentQuincena(), []);

  const totals = useMemo(() => {
    let quincena = 0;
    let month = 0;
    let year = 0;
    for (const c of commissions) {
      const d = new Date(c.createdAt);
      if (d.getFullYear() === thisYear) {
        year += c.commissionAmount;
        if (d.getMonth() === thisMonth) month += c.commissionAmount;
      }
      if (d >= currentQ.start && d <= currentQ.end) {
        quincena += c.commissionAmount;
      }
    }
    return { quincena, month, year };
  }, [commissions, thisYear, thisMonth, currentQ]);

  // Group filtered commissions by quincena (newest first).
  const groups = useMemo<QuincenaGroup[]>(() => {
    const byId = new Map<string, { q: Quincena; items: CommissionRecord[] }>();
    for (const c of inRange) {
      const q = getQuincenaOf(c.createdAt);
      if (!byId.has(q.id)) byId.set(q.id, { q, items: [] });
      byId.get(q.id)!.items.push(c);
    }
    return Array.from(byId.values())
      .map(({ q, items }) => ({
        q,
        items: items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        total: items.reduce((s, c) => s + c.commissionAmount, 0),
      }))
      .sort((a, b) => b.q.start.getTime() - a.q.start.getTime());
  }, [inRange]);

  const rangeTotal = useMemo(
    () => inRange.reduce((s, c) => s + c.commissionAmount, 0),
    [inRange]
  );

  // The current quincena starts open so the stylist sees their recent work
  // without an extra click; every other quincena starts collapsed. `expanded`
  // stores the ids that DIFFER from that default.
  const isOpenForRender = (qId: string) => {
    const isDefaultOpen = qId === currentQ.id;
    return expanded.has(qId) ? !isDefaultOpen : isDefaultOpen;
  };
  const handleToggle = (qId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const summaryCards = [
    {
      icon: CalendarDays,
      value: formatPrice(totals.quincena),
      label: language === "es" ? "Quincena actual" : "Current fortnight",
      hint: quincenaLabel(currentQ, language),
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: CalendarRange,
      value: formatPrice(totals.month),
      label: language === "es" ? "Este mes" : "This month",
      hint: new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
        month: "long",
        year: "numeric",
      }).format(now),
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      icon: TrendingUp,
      value: formatPrice(totals.year),
      label: language === "es" ? "Este año" : "This year",
      hint: String(thisYear),
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  const presetOptions: { key: PresetRange; label: string }[] = [
    { key: "current", label: language === "es" ? "Quincena actual" : "Current fortnight" },
    { key: "thisMonth", label: language === "es" ? "Este mes" : "This month" },
    { key: "thisYear", label: language === "es" ? "Este año" : "This year" },
    { key: "last90", label: language === "es" ? "Últimos 90 días" : "Last 90 days" },
    { key: "custom", label: language === "es" ? "Personalizado" : "Custom" },
  ];

  if (!stylist) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted">
          {language === "es"
            ? "No se encontró perfil de estilista."
            : "Stylist profile not found."}
        </p>
      </div>
    );
  }

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
          {t("stylistDash", "myEarnings")}
        </h1>
        <p className="text-text-secondary mt-1">
          {language === "es"
            ? "Detalle de comisiones generadas por quincena"
            : "Commissions generated per fortnight"}
        </p>
      </motion.div>

      {/* Fixed summary cards */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl shrink-0", card.bg)}>
                <Icon size={22} className={card.color} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-text-primary truncate">
                  {card.value}
                </p>
                <p className="text-sm text-text-secondary">{card.label}</p>
                <p className="text-xs text-text-muted mt-0.5 truncate">
                  {card.hint}
                </p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Filter + grouped detail */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <Card padding="none">
          <div className="p-4 sm:p-5 border-b border-border-default flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">
                  {language === "es" ? "Rango" : "Range"}
                </label>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as PresetRange)}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-border-default text-sm text-text-primary cursor-pointer outline-none focus:border-mila-gold"
                >
                  {presetOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {preset === "custom" && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">
                      {language === "es" ? "Desde" : "From"}
                    </label>
                    <input
                      type="date"
                      value={customFrom || toIsoDate(range.from)}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-border-default text-sm text-text-primary outline-none focus:border-mila-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">
                      {language === "es" ? "Hasta" : "To"}
                    </label>
                    <input
                      type="date"
                      value={customTo || toIsoDate(range.to)}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-border-default text-sm text-text-primary outline-none focus:border-mila-gold"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                {language === "es" ? "Total del rango" : "Range total"}
              </p>
              <p className="text-xl font-bold text-mila-gold">
                {formatPrice(rangeTotal)}
              </p>
              <p className="text-xs text-text-muted">
                {inRange.length}{" "}
                {language === "es"
                  ? inRange.length === 1
                    ? "servicio"
                    : "servicios"
                  : inRange.length === 1
                    ? "service"
                    : "services"}
              </p>
            </div>
          </div>
        </Card>

        {groups.length === 0 ? (
          <Card>
            <p className="text-sm text-text-muted text-center py-4">
              {language === "es"
                ? "No hay comisiones en este rango."
                : "No commissions in this range."}
            </p>
          </Card>
        ) : (
          groups.map((g) => {
            const open = isOpenForRender(g.q.id);
            return (
              <Card key={g.q.id} padding="none">
                <button
                  onClick={() => handleToggle(g.q.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {quincenaLabel(g.q, language)}
                      {g.q.id === currentQ.id && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-mila-gold font-medium">
                          {language === "es" ? "· Actual" : "· Current"}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {g.items.length}{" "}
                      {language === "es"
                        ? g.items.length === 1
                          ? "servicio"
                          : "servicios"
                        : g.items.length === 1
                          ? "service"
                          : "services"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-lg font-bold text-mila-gold">
                      {formatPrice(g.total)}
                    </p>
                    {open ? (
                      <ChevronUp size={18} className="text-text-muted" />
                    ) : (
                      <ChevronDown size={18} className="text-text-muted" />
                    )}
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden border-t border-border-default"
                    >
                      <CommissionRows items={g.items} language={language} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}
