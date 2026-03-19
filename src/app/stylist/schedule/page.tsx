"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { getStoredData, setStoredData } from "@/lib/utils";
import { onCollectionChange } from "@/lib/firestore";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { getInitialDemoAppointments } from "@/data/appointments";
import { services } from "@/data/services";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { CalendarDays, Clock } from "lucide-react";
import type { Booking, StylistSchedule } from "@/types";

export default function StylistSchedulePage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { getStylistByPhone, updateSchedule } = useStaff();

  const stylist = user?.phone ? getStylistByPhone(user.phone) : undefined;

  // --- Bookings ---
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
    }
    setBookings(stored);

    const unsubBookings = onCollectionChange<Booking>("bookings", (firestoreBookings) => {
      if (firestoreBookings.length > 0) {
        const local = getStoredData<Booking[]>("mila-bookings", []);
        const merged = new Map<string, Booking>();
        for (const b of local) if (b.id) merged.set(b.id, b);
        for (const b of firestoreBookings) if (b.id) merged.set(b.id, b);
        const all = Array.from(merged.values());
        setBookings(all);
        setStoredData("mila-bookings", all);
      }
    });
    return () => unsubBookings();
  }, []);

  const myBookings = useMemo(
    () => (stylist ? bookings.filter((b) => b.stylistId === stylist.id) : []),
    [bookings, stylist]
  );

  // --- Week dates ---
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + mondayOffset
    );

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  // --- Day names ---
  const dayNames =
    language === "es"
      ? ["Dom", "Lun", "Mar", "Mi\u00e9", "Jue", "Vie", "S\u00e1b"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Short day labels for the week row (Mon-Sun order)
  const weekDayLabels = useMemo(() => {
    // weekDates starts on Monday, so indices 1,2,3,4,5,6,0
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((i) => dayNames[i]);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Appointments for selected day ---
  const selectedDayBookings = useMemo(() => {
    return myBookings
      .filter(
        (b) =>
          b.date === selectedDate &&
          (b.status === "confirmed" || b.status === "pending")
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [myBookings, selectedDate]);

  // --- Helper: service names ---
  const getServiceNames = useCallback(
    (svcIds: string[]) =>
      svcIds
        .map(
          (id) =>
            services.find((s) => s.id === id)?.name[
              language as "en" | "es"
            ] ?? id
        )
        .join(", "),
    [language]
  );

  // --- Helper: status badge variant ---
  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success" as const;
      case "pending":
        return "warning" as const;
      case "completed":
        return "gold" as const;
      case "cancelled":
      case "no-show":
        return "error" as const;
      default:
        return "default" as const;
    }
  };

  // --- Toggle availability ---
  const handleToggleAvailability = useCallback(
    (dayOfWeek: number) => {
      if (!stylist) return;
      const updatedSchedule: StylistSchedule[] = stylist.schedule.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, isAvailable: !s.isAvailable } : s
      );
      updateSchedule(stylist.id, updatedSchedule);
    },
    [stylist, updateSchedule]
  );

  // --- Date number from date string ---
  const getDateNumber = (dateStr: string) => {
    return new Date(dateStr + "T12:00:00").getDate();
  };

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
          {t("stylistDash", "mySchedule")}
        </h1>
        <p className="text-text-secondary mt-1">
          {stylist?.name ?? user?.name}
        </p>
      </motion.div>

      {/* ============ SECTION A: Weekly Schedule View ============ */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="p-6 border-b border-border-default flex items-center gap-3">
            <CalendarDays size={20} className="text-mila-gold" />
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
              {t("stylistDash", "todayAppointments")}
            </h2>
          </div>

          {/* Day selector row */}
          <div className="p-4 flex gap-2 overflow-x-auto">
            {weekDates.map((dateStr, idx) => {
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    flex flex-col items-center justify-center min-w-[56px] px-3 py-2 rounded-xl
                    transition-all duration-200 text-sm font-medium
                    ${
                      isSelected
                        ? "bg-mila-gold text-mila-espresso shadow-lg"
                        : isToday
                        ? "bg-mila-gold/15 text-mila-gold border border-mila-gold/30"
                        : "bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary"
                    }
                  `}
                >
                  <span className="text-[10px] uppercase tracking-wide opacity-80">
                    {weekDayLabels[idx]}
                  </span>
                  <span className="text-lg font-bold mt-0.5">
                    {getDateNumber(dateStr)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Appointments for selected day */}
          <div className="divide-y divide-border-default">
            {selectedDayBookings.length === 0 ? (
              <div className="px-6 py-12 text-center text-text-muted">
                {t("stylistDash", "noUpcoming")}
              </div>
            ) : (
              selectedDayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 hover:bg-white/5 transition-colors"
                >
                  {/* Time */}
                  <div className="flex items-center gap-2 text-mila-gold shrink-0">
                    <Clock size={16} />
                    <span className="text-sm font-medium whitespace-nowrap">
                      {formatTime(booking.startTime)} &ndash;{" "}
                      {formatTime(booking.endTime)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {booking.guestName ?? booking.clientId ?? "---"}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {getServiceNames(booking.serviceIds)}
                    </p>
                  </div>

                  {/* Status */}
                  <Badge variant={statusBadgeVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                </div>
              ))
            )}
          </div>

          {/* Selected date label */}
          <div className="px-6 py-3 border-t border-border-default">
            <p className="text-xs text-text-muted">
              {formatShortDate(selectedDate, language)}
            </p>
          </div>
        </Card>
      </motion.div>

      {/* ============ SECTION B: My Weekly Availability ============ */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="p-6 border-b border-border-default flex items-center gap-3">
            <Clock size={20} className="text-mila-gold" />
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
              {t("stylistDash", "myWeeklySchedule")}
            </h2>
          </div>

          <div className="divide-y divide-border-default">
            {stylist?.schedule && stylist.schedule.length > 0 ? (
              stylist.schedule.map((sched) => (
                <div
                  key={sched.dayOfWeek}
                  className="px-6 py-4 flex items-center gap-4"
                >
                  {/* Day name */}
                  <span className="text-sm font-medium text-text-primary w-12 shrink-0">
                    {dayNames[sched.dayOfWeek]}
                  </span>

                  {/* Time range */}
                  <span className="text-sm text-text-secondary flex-1">
                    {sched.isAvailable
                      ? `${formatTime(sched.startTime)} - ${formatTime(sched.endTime)}`
                      : "\u2014"}
                  </span>

                  {/* Toggle button */}
                  <button
                    onClick={() => handleToggleAvailability(sched.dayOfWeek)}
                    className={`
                      px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
                      ${
                        sched.isAvailable
                          ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      }
                    `}
                  >
                    {sched.isAvailable
                      ? t("stylistDash", "available")
                      : t("stylistDash", "unavailable")}
                  </button>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-text-muted">
                {t("stylistDash", "noUpcoming")}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
