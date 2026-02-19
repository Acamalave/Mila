"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn, formatPrice, getStoredData } from "@/lib/utils";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { stylists } from "@/data/stylists";
import { getInitialDemoAppointments } from "@/data/appointments";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { CalendarDays, DollarSign, Users, TrendingUp } from "lucide-react";
import type { Booking } from "@/types";

export default function AdminOverviewPage() {
  const { language, t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
    }
    setBookings(stored);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const totalBookings = bookings.length;
    const todayBookings = bookings.filter((b) => b.date === today).length;

    const revenue = bookings
      .filter(
        (b) =>
          b.date >= monthStart &&
          (b.status === "confirmed" || b.status === "completed")
      )
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const uniqueClients = new Set(
      bookings
        .filter((b) => b.status !== "cancelled")
        .map((b) => b.clientId || b.guestPhone || b.guestName || b.id)
    ).size;

    return { totalBookings, todayBookings, revenue, uniqueClients };
  }, [bookings]);

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [bookings]
  );

  const getStylist = (id: string) => stylists.find((s) => s.id === id);

  const getServiceNames = (svcIds: string[] | undefined, lang: string) => {
    if (!svcIds || svcIds.length === 0) return lang === "es" ? "Consulta General" : "General Consultation";
    return svcIds.map(id => services.find(s => s.id === id)?.name[lang as "en" | "es"] ?? id).join(", ");
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "completed":
        return "gold";
      case "pending":
        return "warning";
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
      value: stats.totalBookings,
      label: t("admin", "totalBookings"),
      color: "text-mila-gold",
      bg: "bg-mila-gold/10",
    },
    {
      icon: TrendingUp,
      value: stats.todayBookings,
      label: t("admin", "todayBookings"),
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      icon: DollarSign,
      value: formatPrice(stats.revenue),
      label: t("admin", "revenue"),
      color: "text-mila-gold-light",
      bg: "bg-mila-gold-light/10",
    },
    {
      icon: Users,
      value: stats.uniqueClients,
      label: t("admin", "activeClients"),
      color: "text-info",
      bg: "bg-info/10",
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Title */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("admin", "title")}
        </h1>
        <p className="text-text-secondary mt-1">
          {t("admin", "overview")}
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
              <div
                className={cn(
                  "p-3 rounded-xl",
                  stat.bg
                )}
              >
                <Icon size={22} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                <p className="text-sm text-text-secondary">{stat.label}</p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Recent bookings table */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="p-6 border-b border-border-default">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
              {language === "es" ? "Reservas Recientes" : "Recent Bookings"}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Cliente" : "Client"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Servicio" : "Service"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                    {language === "es" ? "Estilista" : "Stylist"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {language === "es" ? "Fecha" : "Date"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {language === "es" ? "Hora" : "Time"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {t("admin", "status")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {language === "es" ? "Precio" : "Price"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {recentBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-text-muted"
                    >
                      {language === "es"
                        ? "No hay reservas aun"
                        : "No bookings yet"}
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((booking) => {
                    const stylist = getStylist(booking.stylistId);
                    const clientName =
                      booking.guestName || booking.clientId || "---";
                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-mila-cream/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-text-primary font-medium">
                          {clientName}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {getServiceNames(booking.serviceIds, language)}
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          {stylist && (
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={stylist.avatar}
                                alt={stylist.name}
                                size="sm"
                              />
                              <span className="text-sm text-text-secondary">
                                {stylist.name}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary hidden lg:table-cell">
                          {formatShortDate(booking.date, language)}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary hidden lg:table-cell">
                          {formatTime(booking.startTime)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={statusBadgeVariant(booking.status)}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                          {formatPrice(booking.totalPrice)}
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
