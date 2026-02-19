"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { getStoredData, setStoredData, formatPrice } from "@/lib/utils";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { stylists } from "@/data/stylists";
import { getInitialDemoAppointments } from "@/data/appointments";
import type { Booking } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  CalendarPlus,
  ShoppingBag,
  Star,
  ArrowRight,
  Clock,
  User as UserIcon,
  Sparkles,
} from "lucide-react";

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

  const now = new Date();
  const upcoming = appointments
    .filter((a) => {
      const apptDate = new Date(`${a.date}T${a.startTime}`);
      return apptDate > now && a.status !== "cancelled";
    })
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());

  const nextAppointment = upcoming[0] ?? null;
  const restUpcoming = upcoming.slice(1, 4);

  const statusVariant = (status: string) => {
    switch (status) {
      case "confirmed": return "success" as const;
      case "pending": return "warning" as const;
      case "cancelled": return "error" as const;
      case "completed": return "info" as const;
      default: return "default" as const;
    }
  };

  const getServiceNames = (appt: Booking): string => {
    const svcIds = appt.serviceIds ?? [];
    if (svcIds.length === 0) return language === "es" ? "Consulta General" : "General Consultation";
    return svcIds
      .map((id) => services.find((s) => s.id === id)?.name[language] ?? id)
      .join(", ");
  };

  const quickActions = [
    {
      href: "/",
      icon: CalendarPlus,
      label: language === "es" ? "Reservar Nueva Cita" : "Book New Appointment",
      description: language === "es" ? "Agenda una nueva cita" : "Schedule a new appointment",
    },
    {
      href: "/dashboard/shop",
      icon: ShoppingBag,
      label: t("dashboard", "shop"),
      description: language === "es" ? "Explora nuestros productos" : "Browse our products",
    },
    {
      href: "/dashboard/reviews",
      icon: Star,
      label: t("dashboard", "reviews"),
      description: language === "es" ? "Comparte tu experiencia" : "Share your experience",
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("dashboard", "welcome")}, {user?.name}
        </h1>
        <p className="text-text-muted mt-1">{t("dashboard", "title")}</p>
      </motion.div>

      {/* Current Reservation (Highlighted) */}
      {nextAppointment && (
        <motion.section variants={fadeInUp}>
          <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary mb-4">
            {language === "es" ? "Reserva Actual" : "Current Reservation"}
          </h2>
          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: "linear-gradient(135deg, rgba(142, 123, 84, 0.08), rgba(196, 169, 106, 0.05))",
              border: "1px solid rgba(142, 123, 84, 0.15)",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-mila-gold" />
                  <p className="font-semibold text-text-primary">
                    {getServiceNames(nextAppointment)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <UserIcon size={14} />
                  <span>{stylists.find((s) => s.id === nextAppointment.stylistId)?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                  <Clock size={14} />
                  <span>
                    {formatShortDate(nextAppointment.date, language)} &middot;{" "}
                    {formatTime(nextAppointment.startTime)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {nextAppointment.totalPrice > 0 && (
                  <span className="text-lg font-bold text-mila-gold">
                    {formatPrice(nextAppointment.totalPrice)}
                  </span>
                )}
                <Badge variant={statusVariant(nextAppointment.status)}>
                  {nextAppointment.status}
                </Badge>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Upcoming Appointments */}
      <motion.section variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
            {t("dashboard", "upcoming")}
          </h2>
          <Link
            href="/dashboard/appointments"
            className="text-sm text-mila-gold hover:text-mila-gold-dark flex items-center gap-1 transition-colors"
          >
            {t("common", "viewAll")}
            <ArrowRight size={14} />
          </Link>
        </div>

        {restUpcoming.length === 0 && !nextAppointment ? (
          <Card>
            <p className="text-text-muted text-center py-6">
              {t("dashboard", "noAppointments")}
            </p>
          </Card>
        ) : restUpcoming.length === 0 ? (
          <Card>
            <p className="text-text-muted text-center py-4 text-sm">
              {language === "es" ? "No hay m\u00e1s citas programadas" : "No more upcoming appointments"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {restUpcoming.map((appt, i) => {
              const stylist = stylists.find((s) => s.id === appt.stylistId);

              return (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                >
                  <Card hover className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary truncate">
                        {getServiceNames(appt)}
                      </p>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {stylist?.name ?? appt.stylistId} &middot; {stylist?.role[language]}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">
                          {formatShortDate(appt.date, language)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatTime(appt.startTime)}
                        </p>
                      </div>
                      <Badge variant={statusVariant(appt.status)}>
                        {appt.status}
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Quick Actions */}
      <motion.section variants={fadeInUp}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card hover className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-mila-gold/10 flex items-center justify-center mx-auto mb-3">
                    <Icon size={22} className="text-mila-gold" />
                  </div>
                  <p className="font-semibold text-text-primary">{action.label}</p>
                  <p className="text-xs text-text-muted mt-1">{action.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}
