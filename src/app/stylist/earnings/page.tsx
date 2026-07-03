"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { cn, formatPrice } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { getCurrentQuincena, getQuincenaOf, quincenaLabel, type Quincena } from "@/lib/quincena";
import { services } from "@/data/services";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { CalendarDays, Clock, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { CommissionRecord } from "@/types";

interface QuincenaGroup {
  q: Quincena;
  items: CommissionRecord[];
  total: number;
  pending: number;
  paid: number;
  /** Latest paidAt across the group's items — used to render "paid on" in history. */
  lastPaidAt?: string;
}

function summarizeGroup(q: Quincena, items: CommissionRecord[]): QuincenaGroup {
  let total = 0;
  let pending = 0;
  let paid = 0;
  let lastPaidAt: string | undefined;
  for (const c of items) {
    total += c.commissionAmount;
    if (c.status === "paid") {
      paid += c.commissionAmount;
      if (c.paidAt && (!lastPaidAt || c.paidAt > lastPaidAt)) lastPaidAt = c.paidAt;
    } else {
      pending += c.commissionAmount;
    }
  }
  return { q, items, total, pending, paid, lastPaidAt };
}

function CommissionTable({
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
              {language === "es" ? "Fecha" : "Date"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden lg:table-cell">
              {language === "es" ? "Monto" : "Amount"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right hidden md:table-cell">
              {language === "es" ? "Tarifa" : "Rate"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
              {language === "es" ? "Ganado" : "Earned"}
            </th>
            <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-center">
              {language === "es" ? "Estado" : "Status"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {items.map((commission) => {
            const service = services.find((s) => s.id === commission.serviceId);
            const isFlat = !!commission.commissionFlatPerUnit;
            return (
              <tr key={commission.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-text-primary">
                  {service?.name[language] ?? commission.serviceId}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary hidden md:table-cell">
                  {formatShortDate(commission.createdAt, language)}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary text-right hidden lg:table-cell">
                  {formatPrice(commission.serviceAmount)}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-text-secondary text-right hidden md:table-cell">
                  {isFlat
                    ? `$${commission.commissionFlatPerUnit?.toFixed(2)} ${language === "es" ? "fijo" : "flat"}`
                    : `${commission.commissionRate}%`}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-text-primary text-right">
                  {formatPrice(commission.commissionAmount)}
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                  <Badge variant={commission.status === "paid" ? "success" : "warning"}>
                    {commission.status === "paid"
                      ? language === "es"
                        ? "Pagado"
                        : "Paid"
                      : language === "es"
                        ? "Pendiente"
                        : "Pending"}
                  </Badge>
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

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const stylist = useMemo(
    () => (user?.phone ? getStylistByPhone(user.phone) : undefined),
    [user?.phone, getStylistByPhone]
  );

  const commissions = useMemo(
    () => (stylist ? getCommissionsForStylist(stylist.id) : []),
    [stylist, getCommissionsForStylist]
  );

  // Group every commission by the quincena its createdAt falls into.
  const groups = useMemo<QuincenaGroup[]>(() => {
    const byId = new Map<string, { q: Quincena; items: CommissionRecord[] }>();
    for (const c of commissions) {
      const q = getQuincenaOf(c.createdAt);
      if (!byId.has(q.id)) byId.set(q.id, { q, items: [] });
      byId.get(q.id)!.items.push(c);
    }
    const summarized = Array.from(byId.values()).map(({ q, items }) =>
      summarizeGroup(q, items)
    );
    return summarized.sort((a, b) => b.q.start.getTime() - a.q.start.getTime());
  }, [commissions]);

  const currentQ = useMemo(() => getCurrentQuincena(), []);
  const currentGroup = useMemo<QuincenaGroup>(
    () => groups.find((g) => g.q.id === currentQ.id) ?? summarizeGroup(currentQ, []),
    [groups, currentQ]
  );
  const pastGroups = useMemo(
    () => groups.filter((g) => g.q.id !== currentQ.id),
    [groups, currentQ]
  );

  // Headline metrics that answer the three questions a stylist actually has:
  // "how am I doing THIS quincena", "what do you still owe me", "how much
  // have I been paid this year".
  const now = new Date();
  const thisYear = now.getFullYear();
  const totalPending = useMemo(
    () =>
      commissions
        .filter((c) => c.status === "pending")
        .reduce((s, c) => s + c.commissionAmount, 0),
    [commissions]
  );
  const paidThisYear = useMemo(
    () =>
      commissions
        .filter(
          (c) =>
            c.status === "paid" &&
            new Date(c.paidAt ?? c.createdAt).getFullYear() === thisYear
        )
        .reduce((s, c) => s + c.commissionAmount, 0),
    [commissions, thisYear]
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const summaryCards = [
    {
      icon: CalendarDays,
      value: formatPrice(currentGroup.total),
      label: language === "es" ? "Quincena actual" : "Current fortnight",
      hint: quincenaLabel(currentQ, language),
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: Clock,
      value: formatPrice(totalPending),
      label: language === "es" ? "Total por cobrar" : "Total unpaid",
      hint:
        language === "es"
          ? "Suma de comisiones pendientes"
          : "Sum of pending commissions",
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      icon: CheckCircle,
      value: formatPrice(paidThisYear),
      label:
        language === "es" ? `Cobrado en ${thisYear}` : `Paid in ${thisYear}`,
      hint:
        language === "es"
          ? "Total pagado este año"
          : "Total settled this year",
      color: "text-success",
      bg: "bg-success/10",
    },
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
            ? "Comisiones organizadas por quincena"
            : "Commissions grouped by fortnight"}
        </p>
      </motion.div>

      {/* Summary cards */}
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

      {/* Current quincena */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="p-4 sm:p-6 border-b border-border-default flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-text-muted font-medium">
                {language === "es" ? "Quincena actual" : "Current fortnight"}
              </p>
              <h2 className="text-lg font-semibold text-text-primary font-[family-name:var(--font-display)]">
                {quincenaLabel(currentQ, language)}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-muted">
                {language === "es" ? "Pendiente:" : "Pending:"}
              </span>
              <span className="font-semibold text-warning">
                {formatPrice(currentGroup.pending)}
              </span>
              {currentGroup.paid > 0 && (
                <>
                  <span className="text-text-muted ml-2">
                    {language === "es" ? "Pagado:" : "Paid:"}
                  </span>
                  <span className="font-semibold text-success">
                    {formatPrice(currentGroup.paid)}
                  </span>
                </>
              )}
            </div>
          </div>
          <CommissionTable items={currentGroup.items} language={language} />
        </Card>
      </motion.div>

      {/* Past quincenas history */}
      <motion.div variants={fadeInUp} className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary font-[family-name:var(--font-display)]">
          {language === "es" ? "Historial de quincenas" : "Fortnight history"}
        </h2>
        {pastGroups.length === 0 ? (
          <Card>
            <p className="text-sm text-text-muted text-center py-4">
              {language === "es"
                ? "Todavía no hay quincenas anteriores."
                : "No previous fortnights yet."}
            </p>
          </Card>
        ) : (
          pastGroups.map((g) => {
            const isOpen = expanded.has(g.q.id);
            const fullyPaid = g.pending === 0 && g.paid > 0;
            const partial = g.pending > 0 && g.paid > 0;
            return (
              <Card key={g.q.id} padding="none">
                <button
                  onClick={() => toggle(g.q.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {quincenaLabel(g.q, language)}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs">
                      {g.paid > 0 && (
                        <span className="text-success">
                          {language === "es" ? "Pagado" : "Paid"}: {formatPrice(g.paid)}
                        </span>
                      )}
                      {g.pending > 0 && (
                        <span className="text-warning">
                          {language === "es" ? "Pendiente" : "Pending"}: {formatPrice(g.pending)}
                        </span>
                      )}
                      {g.lastPaidAt && (
                        <span className="text-text-muted">
                          {language === "es" ? "Pagado el" : "Paid on"}{" "}
                          {formatShortDate(g.lastPaidAt, language)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-text-primary">
                        {formatPrice(g.total)}
                      </p>
                      <Badge
                        variant={fullyPaid ? "success" : partial ? "warning" : "default"}
                      >
                        {fullyPaid
                          ? language === "es"
                            ? "Pagada"
                            : "Paid"
                          : partial
                            ? language === "es"
                              ? "Parcial"
                              : "Partial"
                            : language === "es"
                              ? "Pendiente"
                              : "Pending"}
                      </Badge>
                    </div>
                    {isOpen ? (
                      <ChevronUp size={18} className="text-text-muted" />
                    ) : (
                      <ChevronDown size={18} className="text-text-muted" />
                    )}
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden border-t border-border-default"
                    >
                      <CommissionTable items={g.items} language={language} />
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
