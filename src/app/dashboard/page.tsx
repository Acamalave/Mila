"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { getStoredData, setStoredData, formatPrice } from "@/lib/utils";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { stylists } from "@/data/stylists";
import { getInitialDemoAppointments } from "@/data/appointments";
import type { Booking } from "@/types";
import type { Variants } from "motion/react";
import Badge from "@/components/ui/Badge";
import {
  CalendarDays,
  CalendarPlus,
  ShoppingBag,
  Star,
  UserCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

/* ── Shared glass style ─────────────────────────────────────────── */
const glassCard: React.CSSProperties = {
  background: "var(--color-bg-glass)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--color-border-default)",
  borderRadius: 20,
  boxShadow: "var(--shadow-card)",
  transition: "all 0.3s ease",
};

const glassCardHover: React.CSSProperties = {
  ...glassCard,
  cursor: "pointer",
};

/* ── Colors ─────────────────────────────────────────────────────── */
const colors = {
  primary: "var(--color-text-primary)",
  secondary: "var(--color-text-secondary)",
  muted: "var(--color-text-muted)",
  gold: "var(--color-accent)",
  darkGold: "var(--color-accent-dark)",
  bg: "var(--color-bg-page)",
};

/* ── Animations ─────────────────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const cardSpring = {
  whileHover: { scale: 1.04, boxShadow: "var(--shadow-card-hover)" },
  whileTap: { scale: 0.97 },
};

/* ── Component ──────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [appointments, setAppointments] = useState<Booking[]>([]);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
      setStoredData("mila-bookings", stored);
    }
    setAppointments(stored);
  }, []);

  /* ── Derived data ───────────────────────────────────────────── */
  const now = new Date();
  const upcoming = appointments
    .filter((a) => {
      const apptDate = new Date(`${a.date}T${a.startTime}`);
      return apptDate > now && a.status !== "cancelled";
    })
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.startTime}`).getTime() -
        new Date(`${b.date}T${b.startTime}`).getTime()
    );

  const nextAppointment = upcoming[0] ?? null;
  const restUpcoming = upcoming.slice(1, 4);

  /* ── Helpers ────────────────────────────────────────────────── */
  const statusVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success" as const;
      case "pending":
        return "warning" as const;
      case "cancelled":
        return "error" as const;
      case "completed":
        return "info" as const;
      default:
        return "default" as const;
    }
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      confirmed: { es: "Confirmada", en: "Confirmed" },
      pending: { es: "Pendiente", en: "Pending" },
      cancelled: { es: "Cancelada", en: "Cancelled" },
      completed: { es: "Completada", en: "Completed" },
    };
    return labels[status]?.[language] ?? status;
  };

  const getServiceNames = (appt: Booking): string => {
    const svcIds = appt.serviceIds ?? [];
    if (svcIds.length === 0)
      return language === "es" ? "Consulta General" : "General Consultation";
    return svcIds
      .map((id) => services.find((s) => s.id === id)?.name[language] ?? id)
      .join(", ");
  };

  /* ── Navigation cards config ────────────────────────────────── */
  const navCards = [
    {
      href: "/dashboard/appointments",
      icon: CalendarDays,
      label: language === "es" ? "Mis Citas" : "My Appointments",
      accent: false,
    },
    {
      href: "/",
      icon: CalendarPlus,
      label: language === "es" ? "Reservar Nueva" : "Book New",
      accent: true,
    },
    {
      href: "/dashboard/shop",
      icon: ShoppingBag,
      label: language === "es" ? "Tienda" : "Shop",
      accent: false,
    },
    {
      href: "/dashboard/reviews",
      icon: Star,
      label: language === "es" ? "Rese\u00f1as" : "Reviews",
      accent: false,
    },
    {
      href: "/dashboard/profile",
      icon: UserCircle,
      label: language === "es" ? "Mi Perfil" : "My Profile",
      accent: false,
    },
  ];

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-8"
    >
      {/* ─── Welcome Section ─────────────────────────────────── */}
      <motion.div variants={itemVariants} className="pt-1">
        <h1
          className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]"
          style={{ color: colors.primary }}
        >
          {t("dashboard", "welcome")}, {user?.name}
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.secondary }}>
          {language === "es" ? "Tu panel personal" : "Your personal panel"}
        </p>
      </motion.div>

      {/* ─── Hero Reservation Card ───────────────────────────── */}
      <motion.section variants={itemVariants}>
        {nextAppointment ? (
          <ReservationHeroCard
            appointment={nextAppointment}
            language={language}
            getServiceNames={getServiceNames}
            statusVariant={statusVariant}
            statusLabel={statusLabel}
          />
        ) : (
          <EmptyReservationCard language={language} />
        )}
      </motion.section>

      {/* ─── Navigation Grid ─────────────────────────────────── */}
      <motion.section variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {navCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  whileHover={cardSpring.whileHover}
                  whileTap={cardSpring.whileTap}
                  className="flex flex-col items-center justify-center gap-3 p-5"
                  style={
                    card.accent
                      ? {
                          ...glassCardHover,
                          background: "var(--color-bg-glass-selected)",
                          border: "1px solid var(--color-border-accent)",
                        }
                      : glassCardHover
                  }
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: card.accent
                        ? "var(--color-accent-subtle)"
                        : "var(--color-bg-glass)",
                      border: card.accent
                        ? "1px solid var(--color-border-accent)"
                        : "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <Icon
                      size={24}
                      style={{
                        color: card.accent ? colors.gold : colors.secondary,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium text-center leading-tight"
                    style={{
                      color: card.accent ? colors.gold : colors.primary,
                    }}
                  >
                    {card.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* ─── Upcoming Appointments ───────────────────────────── */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-base font-semibold font-[family-name:var(--font-display)]"
            style={{ color: colors.primary }}
          >
            {t("dashboard", "upcoming")}
          </h2>
          <Link
            href="/dashboard/appointments"
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: colors.gold }}
          >
            {t("common", "viewAll")}
            <ArrowRight size={13} />
          </Link>
        </div>

        {restUpcoming.length === 0 && !nextAppointment ? (
          <div className="py-10 text-center" style={glassCard}>
            <p className="text-sm" style={{ color: colors.muted }}>
              {t("dashboard", "noAppointments")}
            </p>
          </div>
        ) : restUpcoming.length === 0 ? (
          <div className="py-6 text-center" style={glassCard}>
            <p className="text-sm" style={{ color: colors.muted }}>
              {language === "es"
                ? "No hay m\u00e1s citas programadas"
                : "No more upcoming appointments"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {restUpcoming.map((appt, i) => {
              const stylist = stylists.find((s) => s.id === appt.stylistId);
              return (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.35 + i * 0.08,
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                  }}
                >
                  <div
                    className="flex items-center gap-4 p-4"
                    style={glassCard}
                  >
                    {/* Stylist avatar */}
                    {stylist?.avatar && (
                      <div
                        className="flex-shrink-0 overflow-hidden"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          border: "1px solid var(--color-border-accent)",
                        }}
                      >
                        <Image
                          src={stylist.avatar}
                          alt={stylist.name}
                          width={44}
                          height={44}
                          className="object-cover"
                          style={{ width: 44, height: 44 }}
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: colors.primary }}
                      >
                        {getServiceNames(appt)}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: colors.muted }}
                      >
                        {formatShortDate(appt.date, language)}
                      </p>
                    </div>

                    {/* Time + status */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="text-base font-bold tabular-nums"
                        style={{ color: colors.gold, letterSpacing: "0.02em" }}
                      >
                        {formatTime(appt.startTime)}
                      </span>
                      <Badge variant={statusVariant(appt.status)}>
                        {statusLabel(appt.status)}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════════ */

/* ── Hero Reservation Card ──────────────────────────────────────── */
function ReservationHeroCard({
  appointment,
  language,
  getServiceNames,
  statusVariant,
  statusLabel,
}: {
  appointment: Booking;
  language: "en" | "es";
  getServiceNames: (appt: Booking) => string;
  statusVariant: (status: string) => "success" | "warning" | "error" | "info" | "default";
  statusLabel: (status: string) => string;
}) {
  const stylist = stylists.find((s) => s.id === appointment.stylistId);

  return (
    <div
      className="relative overflow-hidden p-5 sm:p-6"
      style={{
        ...glassCard,
        borderLeft: "3px solid var(--color-accent)",
        background: "var(--color-bg-glass-selected)",
      }}
    >
      {/* Subtle gold glow */}
      <div
        className="absolute -top-20 -right-20 pointer-events-none"
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--color-accent-subtle) 0%, transparent 70%)",
        }}
      />

      {/* Section label */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} style={{ color: colors.gold }} />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: colors.gold }}
        >
          {language === "es" ? "Reserva Actual" : "Current Reservation"}
        </span>
      </div>

      {/* Content row */}
      <div className="flex items-center gap-4">
        {/* Specialist Photo */}
        {stylist?.avatar && (
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "2px solid var(--color-border-accent)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <Image
              src={stylist.avatar}
              alt={stylist.name}
              width={56}
              height={56}
              className="object-cover"
              style={{ width: 56, height: 56 }}
            />
          </div>
        )}

        {/* Service + Date */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm sm:text-base font-semibold truncate"
            style={{ color: colors.primary }}
          >
            {getServiceNames(appointment)}
          </p>
          <p className="text-xs mt-1" style={{ color: colors.muted }}>
            {formatShortDate(appointment.date, language)}
          </p>
        </div>

        {/* Time + Status */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: colors.gold, letterSpacing: "0.02em" }}
          >
            {formatTime(appointment.startTime)}
          </span>
          <Badge variant={statusVariant(appointment.status)}>
            {statusLabel(appointment.status)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

/* ── Empty Reservation Card ─────────────────────────────────────── */
function EmptyReservationCard({ language }: { language: "en" | "es" }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 px-6 text-center"
      style={glassCard}
    >
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--color-accent-subtle)",
          border: "1px solid var(--color-border-accent)",
        }}
      >
        <CalendarPlus size={24} style={{ color: colors.gold }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: colors.primary }}>
        {language === "es" ? "No tienes reservas" : "No reservations"}
      </p>
      <p className="text-xs mb-5" style={{ color: colors.muted }}>
        {language === "es"
          ? "Agenda tu pr\u00f3xima experiencia"
          : "Schedule your next experience"}
      </p>
      <Link href="/">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="px-6 py-2.5 text-sm font-semibold"
          style={{
            background: "var(--gradient-accent)",
            color: "var(--color-text-inverse)",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
          }}
        >
          {language === "es" ? "Reservar Ahora" : "Book Now"}
        </motion.button>
      </Link>
    </div>
  );
}
