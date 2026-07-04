"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { useService } from "@/providers/ServiceProvider";
import { useProducts } from "@/providers/ProductProvider";
import { commissionWorkDate } from "@/lib/commissions";
import { cn, formatPrice } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import {
  getCurrentQuincena,
  getQuincenaOf,
  quincenaLabel,
  type Quincena,
} from "@/lib/quincena";
import Card from "@/components/ui/Card";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  CalendarDays,
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
  resolveName,
  resolveDate,
  resolveClient,
}: {
  items: CommissionRecord[];
  language: "es" | "en";
  /** Display name for the commission's service/product. */
  resolveName: (c: CommissionRecord) => string;
  /** Effective YYYY-MM-DD date of the work (invoice date, not typing date). */
  resolveDate: (c: CommissionRecord) => string;
  /** Client name from the source invoice, when known. */
  resolveClient: (c: CommissionRecord) => string | null;
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
              {language === "es" ? "Cliente" : "Client"}
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
            const isFlat = !!c.commissionFlatPerUnit;
            const isBooking = !!c.bookingId;
            const isInvoice = !!c.invoiceId;
            const SourceIcon = isInvoice ? FileText : isBooking ? BookOpen : null;
            const client = resolveClient(c);
            return (
              <tr key={c.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-text-primary">
                  {resolveName(c)}
                  {/* On phones the Cliente column is hidden, so the client
                      rides under the service name where it's always visible. */}
                  {client && (
                    <p className="text-xs font-normal text-text-muted mt-0.5 md:hidden">
                      {client}
                    </p>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary hidden md:table-cell">
                  {client ? (
                    <span className="inline-flex items-center gap-1.5">
                      {SourceIcon && <SourceIcon size={12} className="text-text-muted" />}
                      <span className="text-xs">{client}</span>
                    </span>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary hidden md:table-cell">
                  {formatShortDate(resolveDate(c), language)}
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
  const { invoices } = useInvoices();
  const { allServices } = useService();
  const { allProducts } = useProducts();

  // Source-invoice issue dates — fallback for commissions created before
  // `workDate` existed, so old records still land in the right quincena.
  const invoiceDateById = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoices) if (inv.date) map.set(inv.id, inv.date);
    return map;
  }, [invoices]);

  /** Effective YYYY-MM-DD the work happened (workDate → invoice date → createdAt). */
  const resolveDate = useMemo(
    () => (c: CommissionRecord) => commissionWorkDate(c, invoiceDateById),
    [invoiceDateById]
  );

  /** Client name from the source invoice — null for booking-only records. */
  const resolveClient = useMemo(() => {
    const byInvoiceId = new Map<string, string>();
    for (const inv of invoices) {
      if (inv.clientName) byInvoiceId.set(inv.id, inv.clientName);
    }
    return (c: CommissionRecord): string | null =>
      (c.invoiceId && byInvoiceId.get(c.invoiceId)) || null;
  }, [invoices]);

  /** Name from the record itself, then the live catalogs (incl. custom
   * services/products the static seed doesn't know about), then the line
   * item on the source invoice (covers catalog items deleted since). */
  const resolveName = useMemo(
    () => (c: CommissionRecord): string => {
      if (c.serviceName) return c.serviceName;
      const service = allServices.find((s) => s.id === c.serviceId);
      if (service) return service.name[language];
      const product = allProducts.find((p) => p.id === c.serviceId);
      if (product) return product.name;
      if (c.invoiceId) {
        const item = invoices
          .find((inv) => inv.id === c.invoiceId)
          ?.items?.find((it) => it.id === c.serviceId);
        if (item?.name) return item.name;
      }
      if (c.serviceId === "invoice-amount") {
        return language === "es" ? "Factura completa" : "Whole invoice";
      }
      return c.serviceId;
    },
    [allServices, allProducts, invoices, language]
  );

  const [preset, setPreset] = useState<PresetRange>("current");
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

  // Filter by the date the work happened (not when it was typed into the
  // system) within the selected range. Noon anchors the YYYY-MM-DD string
  // safely inside the local day regardless of timezone.
  const inRange = useMemo(() => {
    const fromMs = range.from.getTime();
    const toMs = range.to.getTime();
    return commissions.filter((c) => {
      const t = new Date(`${resolveDate(c)}T12:00:00`).getTime();
      return t >= fromMs && t <= toMs;
    });
  }, [commissions, range, resolveDate]);

  // At-a-glance card: the current quincena only — historic periods are
  // reachable through the range filter below instead of fixed KPI cards.
  const currentQ = useMemo(() => getCurrentQuincena(), []);

  const currentQuincenaTotal = useMemo(() => {
    const fromMs = currentQ.start.getTime();
    const toMs = currentQ.end.getTime();
    let sum = 0;
    for (const c of commissions) {
      const t = new Date(`${resolveDate(c)}T12:00:00`).getTime();
      if (t >= fromMs && t <= toMs) sum += c.commissionAmount;
    }
    return sum;
  }, [commissions, resolveDate, currentQ]);

  // Group filtered commissions by the quincena the work happened in
  // (newest first).
  const groups = useMemo<QuincenaGroup[]>(() => {
    const byId = new Map<string, { q: Quincena; items: CommissionRecord[] }>();
    for (const c of inRange) {
      const q = getQuincenaOf(`${resolveDate(c)}T12:00:00`);
      if (!byId.has(q.id)) byId.set(q.id, { q, items: [] });
      byId.get(q.id)!.items.push(c);
    }
    return Array.from(byId.values())
      .map(({ q, items }) => ({
        q,
        items: items.sort((a, b) =>
          resolveDate(b).localeCompare(resolveDate(a))
        ),
        total: items.reduce((s, c) => s + c.commissionAmount, 0),
      }))
      .sort((a, b) => b.q.start.getTime() - a.q.start.getTime());
  }, [inRange, resolveDate]);

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

      {/* Current quincena summary card */}
      <motion.div variants={fadeInUp}>
        <Card className="flex items-center gap-4">
          <div className={cn("p-3 rounded-xl shrink-0", "bg-mila-gold/10")}>
            <CalendarDays size={22} className="text-mila-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-text-primary truncate">
              {formatPrice(currentQuincenaTotal)}
            </p>
            <p className="text-sm text-text-secondary">
              {language === "es" ? "Quincena actual" : "Current fortnight"}
            </p>
            <p className="text-xs text-text-muted mt-0.5 truncate">
              {quincenaLabel(currentQ, language)}
            </p>
          </div>
        </Card>
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
                      <CommissionRows
                        items={g.items}
                        language={language}
                        resolveName={resolveName}
                        resolveDate={resolveDate}
                        resolveClient={resolveClient}
                      />
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
