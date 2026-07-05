"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn, formatPrice, getStoredData, setStoredData } from "@/lib/utils";
import { onCollectionChange, onDocumentChange, deleteDocument } from "@/lib/firestore";
import { formatTime, localIsoDate } from "@/lib/date-utils";
import { services } from "@/data/services";
import { useStaff } from "@/providers/StaffProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  CalendarDays,
  DollarSign,
  ShoppingCart,
  Clock,
  TrendingUp,
  AlertCircle,
  Crown,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { paidInvoicesInRange } from "@/lib/revenue";
import type { Booking, BookingStatus, User } from "@/types";

// ---------------------------------------------------------------------------
// Date helpers — local to the file, no need to share
// ---------------------------------------------------------------------------

/** "2026-05-20" for today in local time, suitable for comparing with booking.date strings. */
function todayIsoDate(): string {
  return localIsoDate();
}

/** Monday-start week range as ISO date strings (inclusive both ends). */
function weekRangeIso(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const offset = day === 0 ? -6 : 1 - day; // shift so Monday is start
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: localIsoDate(monday),
    end: localIsoDate(sunday),
  };
}

function previousWeekRangeIso(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset - 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: localIsoDate(monday),
    end: localIsoDate(sunday),
  };
}

// ---------------------------------------------------------------------------

export default function AdminOverviewPage() {
  const { language, t } = useLanguage();
  const { allStylists } = useStaff();
  const { invoices } = useInvoices();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const localDeleted = getStoredData<string[]>("mila-bookings-deleted", []);
    for (const id of localDeleted) {
      deleteDocument("bookings", id).catch(() => {});
    }

    const getDeletedSet = () => new Set(getStoredData<string[]>("mila-bookings-deleted", []));

    const stored = getStoredData<Booking[]>("mila-bookings", []).filter(
      (b) => !getDeletedSet().has(b.id)
    );
    setBookings(stored);
    setAllUsers(getStoredData<User[]>("mila-users", []));

    const unsubs = [
      onDocumentChange<{ ids?: string[] }>("bookings-config", "deleted", (data) => {
        if (data?.ids) {
          const merged = Array.from(
            new Set([...getStoredData<string[]>("mila-bookings-deleted", []), ...data.ids])
          );
          setStoredData("mila-bookings-deleted", merged);
          for (const id of data.ids) deleteDocument("bookings", id).catch(() => {});
          setBookings((prev) => prev.filter((b) => !new Set(merged).has(b.id)));
        }
      }),
      onCollectionChange<Booking>("bookings", (firestoreBookings) => {
        if (firestoreBookings.length > 0) {
          setBookings((prev) => {
            const deletedSet = getDeletedSet();
            const merged = new Map<string, Booking>();
            for (const b of prev) if (!deletedSet.has(b.id)) merged.set(b.id, b);
            for (const b of firestoreBookings) if (!deletedSet.has(b.id)) merged.set(b.id, b);
            const next = Array.from(merged.values());
            setStoredData("mila-bookings", next);
            return next;
          });
        }
      }),
      onCollectionChange<User>("users", (firestoreUsers) => {
        if (firestoreUsers.length > 0) {
          setAllUsers((prev) => {
            const merged = new Map<string, User>();
            for (const u of prev) if (u.id) merged.set(u.id, u);
            for (const u of firestoreUsers) if (u.id) merged.set(u.id, u);
            return Array.from(merged.values());
          });
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const today = todayIsoDate();
  const week = useMemo(() => weekRangeIso(), []);
  const prevWeek = useMemo(() => previousWeekRangeIso(), []);

  // ── Bookings split by relevant windows ───────────────────────────────────
  const todaysBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === today && b.status !== "cancelled")
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, today]
  );

  const weekBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.date >= week.start &&
          b.date <= week.end &&
          b.status !== "cancelled"
      ),
    [bookings, week]
  );

  const prevWeekBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.date >= prevWeek.start &&
          b.date <= prevWeek.end &&
          b.status !== "cancelled"
      ),
    [bookings, prevWeek]
  );

  // ── Invoices split by windows ─────────────────────────────────────────────
  // Shared helper so the numbers here match /admin/accounting + /admin/billing
  // for the same period.
  const paidInvoicesToday = useMemo(
    () => paidInvoicesInRange(invoices, today, today),
    [invoices, today]
  );

  const paidInvoicesWeek = useMemo(
    () => paidInvoicesInRange(invoices, week.start, week.end),
    [invoices, week]
  );

  // POS sales = paid invoices with no bookingId (counter sale, not tied to a booking)
  const posSalesToday = useMemo(
    () => paidInvoicesToday.filter((inv) => !inv.bookingId),
    [paidInvoicesToday]
  );

  const pendingInvoices = useMemo(
    () =>
      invoices.filter((inv) => inv.status === "sent" || inv.status === "overdue"),
    [invoices]
  );

  // ── Next appointment (today or future, after current time) ───────────────
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const nowDate = localIsoDate(now);
    const nowTime = now.toTimeString().slice(0, 5); // "HH:MM"
    return bookings
      .filter(
        (b) =>
          b.status !== "cancelled" &&
          b.status !== "completed" &&
          (b.date > nowDate || (b.date === nowDate && b.startTime >= nowTime))
      )
      .sort((a, b) =>
        a.date === b.date
          ? a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date)
      )[0];
  }, [bookings]);

  // ── Top stylist this week (by # of bookings) ─────────────────────────────
  const topStylistThisWeek = useMemo(() => {
    const counts = new Map<string, { count: number; revenue: number }>();
    for (const b of weekBookings) {
      if (!b.stylistId) continue;
      const cur = counts.get(b.stylistId) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += b.totalPrice;
      counts.set(b.stylistId, cur);
    }
    let topId: string | null = null;
    let topRev = 0;
    for (const [id, v] of counts) {
      if (v.revenue > topRev) {
        topRev = v.revenue;
        topId = id;
      }
    }
    if (!topId) return null;
    const stylist = allStylists.find((s) => s.id === topId);
    if (!stylist) return null;
    const { count, revenue } = counts.get(topId)!;
    return { stylist, count, revenue };
  }, [weekBookings, allStylists]);

  // ── Aggregates ───────────────────────────────────────────────────────────
  const revenueToday = paidInvoicesToday.reduce((s, i) => s + i.amount, 0);
  const revenueWeek = paidInvoicesWeek.reduce((s, i) => s + i.amount, 0);
  const posTodayTotal = posSalesToday.reduce((s, i) => s + i.amount, 0);
  const weekCountVsPrev =
    prevWeekBookings.length === 0
      ? null
      : Math.round(
          ((weekBookings.length - prevWeekBookings.length) / prevWeekBookings.length) * 100
        );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getStylist = (id: string) => allStylists.find((s) => s.id === id);
  const getServiceNames = (svcIds: string[] | undefined, lang: string) => {
    if (!svcIds || svcIds.length === 0)
      return lang === "es" ? "Consulta General" : "General Consultation";
    return svcIds
      .map((id) => services.find((s) => s.id === id)?.name[lang as "en" | "es"] ?? id)
      .join(", ");
  };

  const statusBadgeVariant = (
    status: BookingStatus
  ): "success" | "gold" | "warning" | "error" | "default" => {
    switch (status) {
      case "confirmed":
        return "success";
      case "completed":
        return "gold";
      case "pending":
        return "warning";
      case "cancelled":
      case "no-show":
        return "error";
      default:
        return "default";
    }
  };

  const statusLabel = (status: BookingStatus) => {
    if (language === "es") {
      switch (status) {
        case "confirmed":
          return "Confirmada";
        case "completed":
          return "Completada";
        case "pending":
          return "Pendiente";
        case "cancelled":
          return "Cancelada";
        case "no-show":
          return "No asistió";
        default:
          return status;
      }
    }
    return status;
  };

  const todayHeading = new Date().toLocaleDateString(
    language === "es" ? "es-ES" : "en-US",
    { weekday: "long", day: "numeric", month: "long" }
  );

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8"
    >
      {/* Title + today's date */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("admin", "title")}
        </h1>
        <p className="text-text-secondary mt-1 capitalize">{todayHeading}</p>
      </motion.div>

      {/* ──────────────────────────────────────────────────────────────────
          DAILY KPIs (4 cards) — what matters TODAY
          ────────────────────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
      >
        {/* Today's bookings */}
        <KpiCard
          icon={CalendarDays}
          color="gold"
          label={language === "es" ? "Citas Hoy" : "Bookings Today"}
          value={String(todaysBookings.length)}
          sub={
            todaysBookings.length > 0
              ? `${
                  todaysBookings.filter((b) => b.status === "confirmed").length
                } ${language === "es" ? "confirmadas" : "confirmed"}`
              : language === "es"
                ? "Día libre"
                : "Free day"
          }
        />

        {/* Revenue today */}
        <KpiCard
          icon={DollarSign}
          color="success"
          label={language === "es" ? "Ingresos Hoy" : "Revenue Today"}
          value={formatPrice(revenueToday)}
          sub={`${paidInvoicesToday.length} ${
            language === "es"
              ? paidInvoicesToday.length === 1
                ? "factura cobrada"
                : "facturas cobradas"
              : paidInvoicesToday.length === 1
                ? "invoice paid"
                : "invoices paid"
          }`}
        />

        {/* POS sales today */}
        <KpiCard
          icon={ShoppingCart}
          color="accent"
          label={language === "es" ? "Ventas POS Hoy" : "POS Sales Today"}
          value={formatPrice(posTodayTotal)}
          sub={`${posSalesToday.length} ${
            language === "es"
              ? posSalesToday.length === 1
                ? "venta"
                : "ventas"
              : posSalesToday.length === 1
                ? "sale"
                : "sales"
          }`}
        />

        {/* Next appointment */}
        <KpiCard
          icon={Clock}
          color="info"
          label={language === "es" ? "Próxima Cita" : "Next Appointment"}
          value={nextAppointment ? formatTime(nextAppointment.startTime) : "—"}
          sub={
            nextAppointment
              ? nextAppointment.date === today
                ? language === "es"
                  ? "hoy"
                  : "today"
                : new Date(nextAppointment.date).toLocaleDateString(
                    language === "es" ? "es-ES" : "en-US",
                    { weekday: "short", day: "numeric", month: "short" }
                  )
              : language === "es"
                ? "Sin próximas"
                : "None scheduled"
          }
        />
      </motion.div>

      {/* ──────────────────────────────────────────────────────────────────
          PENDING INVOICES ALERT — only shows when there's actually pending work
          ────────────────────────────────────────────────────────────────── */}
      {pendingInvoices.length > 0 && (
        <motion.div variants={fadeInUp}>
          <Link href="/admin/billing">
            <Card padding="md" className="cursor-pointer hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-warning/10 flex-shrink-0">
                  <AlertCircle size={20} className="text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {pendingInvoices.length}{" "}
                    {language === "es"
                      ? pendingInvoices.length === 1
                        ? "factura pendiente de cobro"
                        : "facturas pendientes de cobro"
                      : pendingInvoices.length === 1
                        ? "invoice awaiting payment"
                        : "invoices awaiting payment"}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatPrice(pendingInvoices.reduce((s, i) => s + i.amount, 0))}{" "}
                    {language === "es" ? "por cobrar" : "outstanding"}
                  </p>
                </div>
                <ArrowRight size={16} className="text-text-muted flex-shrink-0" />
              </div>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          TODAY'S APPOINTMENTS — as visual cards, sorted by time
          ────────────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
              {language === "es" ? "Agenda de Hoy" : "Today's Agenda"}
            </h2>
            <p className="text-xs text-text-muted">
              {todaysBookings.length}{" "}
              {language === "es"
                ? todaysBookings.length === 1
                  ? "cita programada"
                  : "citas programadas"
                : todaysBookings.length === 1
                  ? "appointment scheduled"
                  : "appointments scheduled"}
            </p>
          </div>
          <Link
            href="/admin/calendar"
            className="text-xs font-medium text-mila-gold hover:underline flex items-center gap-1"
          >
            {language === "es" ? "Ver calendario" : "View calendar"}
            <ArrowRight size={12} />
          </Link>
        </div>

        {todaysBookings.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-6">
              <CalendarDays
                size={28}
                className="mx-auto mb-2 text-text-muted opacity-60"
              />
              <p className="text-sm text-text-muted">
                {language === "es"
                  ? "Sin citas para hoy"
                  : "No appointments today"}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {todaysBookings.map((booking) => {
              const stylist = getStylist(booking.stylistId);
              const resolvedUser = allUsers.find((u) => u.id === booking.clientId);
              const clientName =
                resolvedUser?.name ||
                booking.clientName ||
                booking.guestName ||
                (language === "es" ? "Cliente" : "Client");
              return (
                <AppointmentCard
                  key={booking.id}
                  time={formatTime(booking.startTime)}
                  clientName={clientName}
                  serviceName={getServiceNames(booking.serviceIds, language)}
                  stylistName={stylist?.name ?? null}
                  stylistAvatar={stylist?.avatar ?? null}
                  status={booking.status}
                  statusLabel={statusLabel(booking.status)}
                  statusVariant={statusBadgeVariant(booking.status)}
                  price={booking.totalPrice}
                />
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ──────────────────────────────────────────────────────────────────
          WEEK SUMMARY (3 cards: revenue / bookings trend / top stylist)
          ────────────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary mb-4">
          {language === "es" ? "Esta Semana" : "This Week"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Week revenue */}
          <Card padding="md" className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-wider">
              <DollarSign size={14} />
              {language === "es" ? "Ingresos" : "Revenue"}
            </div>
            <p className="text-3xl font-bold text-text-primary">
              {formatPrice(revenueWeek)}
            </p>
            <p className="text-xs text-text-muted">
              {paidInvoicesWeek.length}{" "}
              {language === "es"
                ? paidInvoicesWeek.length === 1
                  ? "factura cobrada"
                  : "facturas cobradas"
                : paidInvoicesWeek.length === 1
                  ? "invoice paid"
                  : "invoices paid"}
            </p>
          </Card>

          {/* Week bookings trend */}
          <Card padding="md" className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-wider">
              <TrendingUp size={14} />
              {language === "es" ? "Citas" : "Bookings"}
            </div>
            <p className="text-3xl font-bold text-text-primary">
              {weekBookings.length}
            </p>
            {weekCountVsPrev !== null ? (
              <p
                className="text-xs font-medium"
                style={{
                  color:
                    weekCountVsPrev >= 0 ? "var(--color-success)" : "#ef4444",
                }}
              >
                {weekCountVsPrev >= 0 ? "▲" : "▼"} {Math.abs(weekCountVsPrev)}%{" "}
                {language === "es" ? "vs semana pasada" : "vs last week"}
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                {language === "es"
                  ? "Sin datos de la semana pasada"
                  : "No prior week data"}
              </p>
            )}
          </Card>

          {/* Top stylist this week */}
          <Card padding="md" className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-wider">
              <Crown size={14} />
              {language === "es" ? "Top Estilista" : "Top Stylist"}
            </div>
            {topStylistThisWeek ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar
                    src={topStylistThisWeek.stylist.avatar}
                    alt={topStylistThisWeek.stylist.name}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {topStylistThisWeek.stylist.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {topStylistThisWeek.count}{" "}
                      {language === "es"
                        ? topStylistThisWeek.count === 1
                          ? "cita"
                          : "citas"
                        : topStylistThisWeek.count === 1
                          ? "booking"
                          : "bookings"}
                    </p>
                  </div>
                </div>
                <p className="text-base font-bold text-mila-gold">
                  {formatPrice(topStylistThisWeek.revenue)}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                {language === "es"
                  ? "Sin reservas esta semana"
                  : "No bookings this week"}
              </p>
            )}
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ===========================================================================
// Reusable: KPI card. 4 of these line up at the top.
// ===========================================================================

interface KpiCardProps {
  icon: typeof CalendarDays;
  color: "gold" | "success" | "accent" | "info";
  label: string;
  value: string;
  sub: string;
}

const COLOR_CLASSES: Record<
  KpiCardProps["color"],
  { bg: string; fg: string }
> = {
  gold: { bg: "bg-mila-gold/10", fg: "text-mila-gold" },
  success: { bg: "bg-success/10", fg: "text-success" },
  accent: { bg: "bg-mila-gold-light/10", fg: "text-mila-gold-light" },
  info: { bg: "bg-info/10", fg: "text-info" },
};

function KpiCard({ icon: Icon, color, label, value, sub }: KpiCardProps) {
  const c = COLOR_CLASSES[color];
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

// ===========================================================================
// Reusable: appointment card. Replaces the old recent-bookings table row.
// ===========================================================================

interface AppointmentCardProps {
  time: string;
  clientName: string;
  serviceName: string;
  stylistName: string | null;
  stylistAvatar: string | null;
  status: BookingStatus;
  statusLabel: string;
  statusVariant: "success" | "gold" | "warning" | "error" | "default";
  price: number;
}

function AppointmentCard({
  time,
  clientName,
  serviceName,
  stylistName,
  stylistAvatar,
  status,
  statusLabel,
  statusVariant,
  price,
}: AppointmentCardProps) {
  const accentByStatus: Record<BookingStatus, string> = {
    confirmed: "var(--color-success)",
    completed: "var(--color-accent)",
    pending: "var(--color-warning)",
    cancelled: "#ef4444",
    "no-show": "#ef4444",
  };
  const accent = accentByStatus[status] ?? "var(--color-border-default)";

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-stretch">
        {/* Time column — colored bar + big time */}
        <div
          className="flex flex-col items-center justify-center px-4 py-3 flex-shrink-0"
          style={{
            background: `${accent}1a`, // 10% opacity
            borderRight: `3px solid ${accent}`,
            minWidth: 80,
          }}
        >
          <p
            className="text-base font-bold tabular-nums leading-none"
            style={{ color: accent, fontFamily: "var(--font-display)" }}
          >
            {time}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate">
                {clientName}
              </p>
              <p className="text-xs text-text-muted truncate">{serviceName}</p>
            </div>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            {stylistName ? (
              <div className="flex items-center gap-1.5 min-w-0">
                {stylistAvatar && (
                  <Avatar src={stylistAvatar} alt={stylistName} size="sm" />
                )}
                <span className="text-xs text-text-secondary truncate">
                  {stylistName}
                </span>
              </div>
            ) : (
              <span className="text-xs text-text-muted">—</span>
            )}
            <span className="text-sm font-bold text-mila-gold flex-shrink-0">
              {formatPrice(price)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
