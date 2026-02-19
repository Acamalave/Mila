"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { getStoredData, setStoredData, formatPrice } from "@/lib/utils";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { stylists } from "@/data/stylists";
import { getInitialDemoAppointments } from "@/data/appointments";
import type { Booking, BookingStatus } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { CalendarDays } from "lucide-react";

export default function AppointmentsPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
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

  const sorted = [...appointments].sort((a, b) => {
    const aDate = new Date(`${a.date}T${a.startTime}`);
    const bDate = new Date(`${b.date}T${b.startTime}`);
    const aFuture = aDate > now && a.status !== "cancelled";
    const bFuture = bDate > now && b.status !== "cancelled";

    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    return aDate.getTime() - bDate.getTime();
  });

  const statusVariant = (status: BookingStatus) => {
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

  function handleCancel(bookingId: string) {
    if (!confirm(t("dashboard", "cancelConfirm"))) return;

    const updated = appointments.map((a) =>
      a.id === bookingId ? { ...a, status: "cancelled" as BookingStatus } : a
    );
    setAppointments(updated);
    setStoredData("mila-bookings", updated);
    addToast(
      language === "es" ? "Cita cancelada" : "Appointment cancelled",
      "info"
    );
  }

  function canCancel(appt: Booking): boolean {
    const apptDate = new Date(`${appt.date}T${appt.startTime}`);
    return (
      apptDate > now &&
      (appt.status === "pending" || appt.status === "confirmed")
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <CalendarDays size={24} className="text-mila-gold" />
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("dashboard", "appointments")}
        </h1>
      </motion.div>

      {sorted.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <Card>
            <p className="text-text-muted text-center py-8">
              {t("dashboard", "noAppointments")}
            </p>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {sorted.map((appt, i) => {
            const stylist = stylists.find((s) => s.id === appt.stylistId);
            const isFuture = new Date(`${appt.date}T${appt.startTime}`) > now;
            const isPast = !isFuture;

            return (
              <motion.div
                key={appt.id}
                variants={fadeInUp}
                custom={i}
              >
                <Card className={isPast ? "opacity-70" : ""}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: service info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-text-primary truncate">
                          {getServiceNames(appt)}
                        </p>
                        <Badge variant={statusVariant(appt.status)}>
                          {appt.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {stylist?.name ?? appt.stylistId} &middot;{" "}
                        {stylist?.role[language]}
                      </p>
                      <p className="text-sm text-text-muted mt-1">
                        {formatShortDate(appt.date, language)} &middot;{" "}
                        {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                      </p>
                    </div>

                    {/* Right: price and actions */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <p className="text-lg font-semibold text-mila-gold">
                        {formatPrice(appt.totalPrice)}
                      </p>
                      {canCancel(appt) && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancel(appt.id)}
                        >
                          {t("dashboard", "cancel")}
                        </Button>
                      )}
                    </div>
                  </div>

                  {appt.notes && (
                    <p className="text-xs text-text-muted mt-3 pt-3 border-t border-border-default">
                      {appt.notes}
                    </p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
