"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import { getStoredData, setStoredData, formatPrice } from "@/lib/utils";
import { setDocument, onCollectionChange } from "@/lib/firestore";
import { formatShortDate, formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { useStaff } from "@/providers/StaffProvider";
import { getInitialDemoAppointments } from "@/data/appointments";
import type { Booking, BookingStatus } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { CalendarDays, CalendarClock } from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  getDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { es as esLocale, enUS } from "date-fns/locale";

export default function AppointmentsPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const { emit } = useEventBus();
  const { allStylists } = useStaff();
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [rescheduleAppt, setRescheduleAppt] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
      setStoredData("mila-bookings", stored);
      for (const b of stored) {
        const { id, ...data } = b;
        setDocument("bookings", id, data).catch((err) => console.warn("[Mila] Booking sync failed:", err));
      }
    }
    setAppointments(stored);

    const unsub = onCollectionChange<Booking>("bookings", (firestoreBookings) => {
      if (firestoreBookings.length > 0) {
        setAppointments((prev) => {
          const merged = new Map<string, Booking>();
          for (const b of prev) merged.set(b.id, b);
          for (const b of firestoreBookings) merged.set(b.id, b);
          const next = Array.from(merged.values());
          setStoredData("mila-bookings", next);
          return next;
        });
      }
    });
    return () => unsub();
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
    setCancelConfirmId(bookingId);
  }

  function confirmCancelBooking() {
    if (!cancelConfirmId) return;
    const fullBooking = appointments.find((a) => a.id === cancelConfirmId);
    const updated = appointments.map((a) =>
      a.id === cancelConfirmId ? { ...a, status: "cancelled" as BookingStatus } : a
    );
    setAppointments(updated);
    setStoredData("mila-bookings", updated);
    setDocument("bookings", cancelConfirmId, { status: "cancelled" }).catch((err) => console.warn("[Mila] Booking sync failed:", err));
    emit("booking:updated", { ...fullBooking, status: "cancelled" });
    addToast(
      language === "es" ? "Cita cancelada" : "Appointment cancelled",
      "info"
    );
    setCancelConfirmId(null);
  }

  function canCancel(appt: Booking): boolean {
    const apptDate = new Date(`${appt.date}T${appt.startTime}`);
    return (
      apptDate > now &&
      (appt.status === "pending" || appt.status === "confirmed")
    );
  }

  function canReschedule(appt: Booking): boolean {
    const apptDate = new Date(`${appt.date}T${appt.startTime}`);
    return apptDate > now && appt.status === "confirmed";
  }

  function openReschedule(appt: Booking) {
    setRescheduleAppt(appt);
    setRescheduleDate("");
    setRescheduleTime("");
  }

  // Generate available dates for next 14 days based on stylist schedule
  function getAvailableDates(): { date: Date; dateStr: string }[] {
    if (!rescheduleAppt) return [];
    const stylist = allStylists.find((s) => s.id === rescheduleAppt.stylistId);
    if (!stylist) return [];
    const dates: { date: Date; dateStr: string }[] = [];
    for (let i = 1; i <= 21; i++) {
      const d = addDays(new Date(), i);
      const dow = getDay(d);
      const sched = stylist.schedule.find((s) => s.dayOfWeek === dow && s.isAvailable);
      if (sched) {
        dates.push({ date: d, dateStr: format(d, "yyyy-MM-dd") });
      }
    }
    return dates;
  }

  // Generate time slots for selected reschedule date, filtering out conflicts
  function getRescheduleSlots(): string[] {
    if (!rescheduleAppt || !rescheduleDate) return [];
    const stylist = allStylists.find((s) => s.id === rescheduleAppt.stylistId);
    if (!stylist) return [];
    const d = new Date(rescheduleDate + "T12:00:00");
    const dow = getDay(d);
    const sched = stylist.schedule.find((s) => s.dayOfWeek === dow && s.isAvailable);
    if (!sched) return [];

    const totalDuration = (rescheduleAppt.serviceIds ?? []).reduce((sum, sid) => {
      const svc = services.find((s) => s.id === sid);
      return sum + (svc?.durationMinutes ?? 60);
    }, 0) || 60;

    // Get existing bookings for this stylist on this date, excluding the one being rescheduled
    const dayBookings = appointments.filter(
      (b) =>
        b.id !== rescheduleAppt.id &&
        b.stylistId === rescheduleAppt.stylistId &&
        b.date === rescheduleDate &&
        (b.status === "confirmed" || b.status === "pending")
    );

    const [startH, startM] = sched.startTime.split(":").map(Number);
    const [endH, endM] = sched.endTime.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const slots: string[] = [];
    for (let m = startMin; m + totalDuration <= endMin; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const slotStart = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const slotEndMin = m + totalDuration;
      const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, "0")}:${String(slotEndMin % 60).padStart(2, "0")}`;

      // Check for overlap with existing bookings
      const hasConflict = dayBookings.some((b) => {
        if (!b.endTime || !b.startTime) return false;
        return slotStart < b.endTime && slotEnd > b.startTime;
      });

      if (!hasConflict) {
        slots.push(slotStart);
      }
    }
    return slots;
  }

  function handleReschedule() {
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTime) return;
    const totalDuration = (rescheduleAppt.serviceIds ?? []).reduce((sum, sid) => {
      const svc = services.find((s) => s.id === sid);
      return sum + (svc?.durationMinutes ?? 60);
    }, 0) || 60;
    const [h, m] = rescheduleTime.split(":").map(Number);
    const endMin = h * 60 + m + totalDuration;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    const updated = appointments.map((a) =>
      a.id === rescheduleAppt.id
        ? { ...a, date: rescheduleDate, startTime: rescheduleTime, endTime }
        : a
    );
    setAppointments(updated);
    setStoredData("mila-bookings", updated);
    setDocument("bookings", rescheduleAppt.id, {
      date: rescheduleDate,
      startTime: rescheduleTime,
      endTime,
    }).catch((err) => console.warn("[Mila] Booking sync failed:", err));
    emit("booking:updated", { id: rescheduleAppt.id, date: rescheduleDate });
    addToast(
      language === "es" ? "Cita reprogramada" : "Appointment rescheduled",
      "success"
    );
    setRescheduleAppt(null);
  }

  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  };

  const locale = language === "es" ? esLocale : enUS;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={fadeInUp}>
        <div style={{ width: 32, height: 1, background: "var(--gradient-accent-h)", marginBottom: 12 }} />
        <h1 style={{ fontFamily: "var(--font-accent)", fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 300, fontStyle: "italic", color: "var(--color-text-primary)", lineHeight: 1.1, textTransform: "none", letterSpacing: "normal" }}>
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
            const stylist = allStylists.find((s) => s.id === appt.stylistId);
            const isFuture = new Date(`${appt.date}T${appt.startTime}`) > now;
            const isPast = !isFuture;

            return (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className={isPast ? "opacity-70" : ""}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: service info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="truncate" style={{ fontFamily: "var(--font-accent)", fontSize: 16, fontWeight: 400, fontStyle: "italic", color: "var(--color-text-primary)" }}>
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
                      <p className="mt-1" style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                        {formatShortDate(appt.date, language)} &middot;{" "}
                        {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                      </p>
                    </div>

                    {/* Right: price and actions */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <p style={{ fontFamily: "var(--font-accent)", fontSize: 20, fontWeight: 400, color: "var(--color-accent)" }}>
                        {formatPrice(appt.totalPrice)}
                      </p>
                      {canReschedule(appt) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openReschedule(appt)}
                        >
                          <CalendarClock size={14} className="mr-1 inline" />
                          {t("dashboard", "reschedule")}
                        </Button>
                      )}
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
      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleAppt}
        onClose={() => setRescheduleAppt(null)}
        title={t("dashboard", "rescheduleTitle")}
        size="md"
      >
        <div className="space-y-5">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("dashboard", "selectNewDate")}
          </p>

          {/* Date Selection */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
              {language === "es" ? "Fecha" : "Date"}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {getAvailableDates().map(({ date, dateStr }) => (
                <button
                  key={dateStr}
                  onClick={() => { setRescheduleDate(dateStr); setRescheduleTime(""); }}
                  className="py-2.5 px-2 rounded-xl text-center"
                  style={{
                    background: rescheduleDate === dateStr ? "var(--gradient-accent)" : "var(--color-bg-glass)",
                    border: `1px solid ${rescheduleDate === dateStr ? "var(--color-accent)" : "var(--color-border-default)"}`,
                    color: rescheduleDate === dateStr ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                    fontSize: 12,
                    fontWeight: rescheduleDate === dateStr ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  <span className="block text-[10px] uppercase">
                    {format(date, "EEE", { locale })}
                  </span>
                  <span className="block font-medium">{format(date, "d MMM", { locale })}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {rescheduleDate && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
                {language === "es" ? "Hora" : "Time"}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto">
                {getRescheduleSlots().map((time) => (
                  <button
                    key={time}
                    onClick={() => setRescheduleTime(time)}
                    className="py-3 px-2 rounded-xl text-center"
                    style={{
                      background: rescheduleTime === time ? "var(--gradient-accent)" : "var(--color-bg-glass)",
                      border: `1px solid ${rescheduleTime === time ? "var(--color-accent)" : "var(--color-border-default)"}`,
                      color: rescheduleTime === time ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                      fontSize: 14,
                      fontWeight: rescheduleTime === time ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {formatTimeDisplay(time)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleReschedule}
            disabled={!rescheduleDate || !rescheduleTime}
            className="w-full py-4 rounded-2xl font-semibold text-base"
            style={{
              background: rescheduleDate && rescheduleTime ? "var(--gradient-accent)" : "var(--color-bg-glass)",
              color: rescheduleDate && rescheduleTime ? "var(--color-text-inverse)" : "var(--color-text-muted)",
              boxShadow: rescheduleDate && rescheduleTime ? "var(--shadow-glow)" : "none",
              border: rescheduleDate && rescheduleTime ? "none" : "1px solid var(--color-border-default)",
              cursor: rescheduleDate && rescheduleTime ? "pointer" : "not-allowed",
              opacity: rescheduleDate && rescheduleTime ? 1 : 0.5,
            }}
          >
            {t("dashboard", "rescheduleConfirm")}
          </button>
        </div>
      </Modal>

      {/* Cancel Booking Confirmation */}
      <ConfirmDialog
        isOpen={!!cancelConfirmId}
        title={language === "es" ? "Cancelar Cita" : "Cancel Appointment"}
        message={language === "es"
          ? "¿Estás segura de que deseas cancelar esta cita? Esta acción no se puede deshacer."
          : "Are you sure you want to cancel this appointment? This action cannot be undone."}
        confirmLabel={language === "es" ? "Sí, Cancelar" : "Yes, Cancel"}
        cancelLabel={language === "es" ? "No, Mantener" : "No, Keep"}
        variant="danger"
        onConfirm={confirmCancelBooking}
        onCancel={() => setCancelConfirmId(null)}
      />
    </motion.div>
  );
}
