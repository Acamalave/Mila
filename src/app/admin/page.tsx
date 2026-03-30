"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn, formatPrice, getStoredData, setStoredData } from "@/lib/utils";
import { onCollectionChange } from "@/lib/firestore";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { useStaff } from "@/providers/StaffProvider";
import { getInitialDemoAppointments } from "@/data/appointments";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { CalendarDays, DollarSign, Users, TrendingUp } from "lucide-react";
import type { Booking, User } from "@/types";

export default function AdminOverviewPage() {
  const { language, t } = useLanguage();
  const { allStylists } = useStaff();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const deletedIds = getStoredData<string[]>("mila-bookings-deleted", []);
    const deletedSet = new Set(deletedIds);

    let stored = getStoredData<Booking[]>("mila-bookings", []).filter(b => !deletedSet.has(b.id));
    setBookings(stored);

    // Load users for name resolution
    const storedUsers = getStoredData<User[]>("mila-users", []);
    setAllUsers(storedUsers);

    const unsubs = [
      onCollectionChange<Booking>("bookings", (firestoreBookings) => {
        if (firestoreBookings.length > 0) {
          setBookings((prev) => {
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

  const getStylist = (id: string) => allStylists.find((s) => s.id === id);

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
        className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3"
      >
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex flex-col items-center text-center gap-1.5 p-2.5 sm:flex-row sm:text-left sm:items-center sm:gap-3 sm:p-5">
              <div
                className={cn(
                  "p-1.5 sm:p-3 rounded-lg sm:rounded-xl shrink-0",
                  stat.bg
                )}
              >
                <Icon size={14} className={cn(stat.color, "sm:w-[22px] sm:h-[22px]")} />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-2xl font-bold text-text-primary truncate">
                  {stat.value}
                </p>
                <p className="text-[10px] sm:text-sm text-text-secondary truncate leading-tight">{stat.label}</p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Recent bookings table */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="p-4 sm:p-6 border-b border-border-default">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
              {language === "es" ? "Reservas Recientes" : "Recent Bookings"}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Cliente" : "Client"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Servicio" : "Service"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                    {language === "es" ? "Estilista" : "Stylist"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {language === "es" ? "Fecha" : "Date"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {language === "es" ? "Hora" : "Time"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {t("admin", "status")}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {language === "es" ? "Precio" : "Price"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
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
                    const resolvedUser = allUsers.find((u) => u.id === booking.clientId);
                    const clientName =
                      booking.guestName || resolvedUser?.name || booking.clientId || "---";
                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-primary font-medium">
                          {clientName}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary">
                          {getServiceNames(booking.serviceIds, language)}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 hidden md:table-cell">
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
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary hidden lg:table-cell">
                          {formatShortDate(booking.date, language)}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-text-secondary hidden lg:table-cell">
                          {formatTime(booking.startTime)}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4">
                          <Badge variant={statusBadgeVariant(booking.status)}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-text-primary text-right">
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
