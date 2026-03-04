"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { cn, formatPrice, getStoredData } from "@/lib/utils";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { getInitialDemoAppointments } from "@/data/appointments";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { CalendarDays, TrendingUp, DollarSign, Star } from "lucide-react";
import type { Booking } from "@/types";

export default function StylistOverviewPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { getStylistByPhone } = useStaff();
  const { getStylistEarnings } = useCommissions();

  const stylist = user?.phone ? getStylistByPhone(user.phone) : undefined;

  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
    }
    setBookings(stored);
  }, []);

  const myBookings = useMemo(
    () => (stylist ? bookings.filter((b) => b.stylistId === stylist.id) : []),
    [bookings, stylist]
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
      .toISOString()
      .split("T")[0];
    const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + sundayOffset)
      .toISOString()
      .split("T")[0];

    const todayAppointments = myBookings.filter((b) => b.date === today).length;

    const weekAppointments = myBookings.filter(
      (b) => b.date >= weekStart && b.date <= weekEnd
    ).length;

    const monthEarnings = stylist
      ? getStylistEarnings(stylist.id, "month").total
      : 0;

    return { todayAppointments, weekAppointments, monthEarnings };
  }, [myBookings, stylist, getStylistEarnings]);

  const upcomingBookings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return myBookings
      .filter(
        (b) =>
          b.date >= today &&
          (b.status === "confirmed" || b.status === "pending")
      )
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 3);
  }, [myBookings]);

  const getServiceNames = (svcIds: string[]) =>
    svcIds
      .map(
        (id) =>
          services.find((s) => s.id === id)?.name[language as "en" | "es"] ?? id
      )
      .join(", ");

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "pending":
        return "warning";
      case "completed":
        return "gold";
      case "cancelled":
        return "error";
      case "no-show":
        return "error";
      default:
        return "default";
    }
  };

  const statCards = [
    {
      icon: CalendarDays,
      value: stats.todayAppointments,
      label: t("stylistDash", "todayAppointments"),
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: TrendingUp,
      value: stats.weekAppointments,
      label: t("stylistDash", "weekAppointments"),
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      icon: DollarSign,
      value: formatPrice(stats.monthEarnings),
      label: t("stylistDash", "monthEarnings"),
      color: "text-mila-gold-light",
      bg: "bg-mila-gold-light/10",
    },
    {
      icon: Star,
      value: stylist?.rating ?? 0,
      label: `${stylist?.reviewCount ?? 0} reviews`,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      sublabel: t("stylistDash", "myRating"),
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
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("stylistDash", "welcome")}, {stylist?.name ?? user?.name}!
        </h1>
        <p className="text-text-secondary mt-1">
          {t("stylistDash", "overview")}
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <Icon size={22} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                <p className="text-sm text-text-secondary">
                  {stat.sublabel ?? stat.label}
                </p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Upcoming Appointments */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="p-6 border-b border-border-default">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
              {t("stylistDash", "upcomingAppointments")}
            </h2>
          </div>
          <div className="divide-y divide-border-default">
            {upcomingBookings.length === 0 ? (
              <div className="px-6 py-12 text-center text-text-muted">
                {t("stylistDash", "noUpcoming")}
              </div>
            ) : (
              upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:bg-mila-cream/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {getServiceNames(booking.serviceIds)}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {formatShortDate(booking.date, language)} &middot;{" "}
                      {formatTime(booking.startTime)} &ndash;{" "}
                      {formatTime(booking.endTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-primary">
                      {formatPrice(booking.totalPrice)}
                    </span>
                    <Badge variant={statusBadgeVariant(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
