"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  cn,
  formatPrice,
  getStoredData,
  setStoredData,
} from "@/lib/utils";
import { formatTime } from "@/lib/date-utils";
import { services } from "@/data/services";
import { stylists } from "@/data/stylists";
import { getInitialDemoAppointments } from "@/data/appointments";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Scissors,
  Check,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import type { Booking, BookingStatus } from "@/types";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDaysToDate(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function formatWeekDay(d: Date, lang: string): string {
  return d.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function AdminCalendarPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    let stored = getStoredData<Booking[]>("mila-bookings", []);
    if (stored.length === 0) {
      stored = getInitialDemoAppointments();
      setStoredData("mila-bookings", stored);
    }
    setBookings(stored);
  }, []);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDaysToDate(weekStart, i));
  }, [weekStart]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    weekDays.forEach((d) => {
      const dateStr = toDateString(d);
      map[dateStr] = bookings
        .filter((b) => b.date === dateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [bookings, weekDays]);

  const goToToday = () => setWeekStart(getMonday(new Date()));
  const goPrevWeek = () => setWeekStart(addDaysToDate(weekStart, -7));
  const goNextWeek = () => setWeekStart(addDaysToDate(weekStart, 7));

  const getStylist = (id: string) => stylists.find((s) => s.id === id);

  const getServiceNames = (svcIds: string[] | undefined, lang: string) => {
    if (!svcIds || svcIds.length === 0) return lang === "es" ? "Consulta General" : "General Consultation";
    return svcIds.map(id => services.find(s => s.id === id)?.name[lang as "en" | "es"] ?? id).join(", ");
  };

  const updateBookingStatus = useCallback(
    (bookingId: string, newStatus: BookingStatus) => {
      const updated = bookings.map((b) =>
        b.id === bookingId ? { ...b, status: newStatus } : b
      );
      setBookings(updated);
      setStoredData("mila-bookings", updated);

      const statusMessages: Record<BookingStatus, { en: string; es: string }> = {
        confirmed: { en: "Booking confirmed", es: "Reserva confirmada" },
        cancelled: { en: "Booking cancelled", es: "Reserva cancelada" },
        "no-show": { en: "Marked as no-show", es: "Marcado como no asistio" },
        completed: { en: "Booking completed", es: "Reserva completada" },
        pending: { en: "Booking set to pending", es: "Reserva pendiente" },
      };

      addToast(
        statusMessages[newStatus][language],
        newStatus === "cancelled" || newStatus === "no-show" ? "error" : "success"
      );

      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
    },
    [bookings, selectedBooking, addToast, language]
  );

  const statusBorder = (status: string) => {
    switch (status) {
      case "confirmed":
      case "completed":
        return "border-l-4 border-l-success";
      case "pending":
        return "border-l-4 border-l-warning";
      case "cancelled":
      case "no-show":
        return "border-l-4 border-l-error";
      default:
        return "border-l-4 border-l-border-default";
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success" as const;
      case "completed":
        return "gold" as const;
      case "pending":
        return "warning" as const;
      case "cancelled":
      case "no-show":
        return "error" as const;
      default:
        return "default" as const;
    }
  };

  const todayStr = toDateString(new Date());

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={fadeInUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
            {t("admin", "calendar")}
          </h1>
          <p className="text-text-secondary mt-1">
            {language === "es" ? "Vista semanal de citas" : "Weekly appointment view"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goPrevWeek}>
            <ChevronLeft size={18} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {language === "es" ? "Hoy" : "Today"}
          </Button>
          <Button variant="ghost" size="sm" onClick={goNextWeek}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </motion.div>

      {/* Week grid */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4"
      >
        {weekDays.map((day) => {
          const dateStr = toDateString(day);
          const dayBookings = bookingsByDate[dateStr] || [];
          const isToday = dateStr === todayStr;

          return (
            <Card
              key={dateStr}
              padding="none"
              className={cn(isToday && "ring-2 ring-mila-gold/40")}
            >
              <div
                className={cn(
                  "px-4 py-3 border-b border-border-default",
                  isToday ? "bg-mila-gold/10" : "bg-mila-cream/50"
                )}
              >
                <p
                  className={cn(
                    "text-sm font-medium capitalize",
                    isToday ? "text-mila-gold" : "text-text-primary"
                  )}
                >
                  {formatWeekDay(day, language)}
                </p>
                {dayBookings.length > 0 && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {dayBookings.length}{" "}
                    {dayBookings.length === 1
                      ? language === "es"
                        ? "cita"
                        : "booking"
                      : language === "es"
                      ? "citas"
                      : "bookings"}
                  </p>
                )}
              </div>

              <div className="p-3 space-y-2 min-h-[120px]">
                {dayBookings.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">
                    {language === "es" ? "Sin citas" : "No bookings"}
                  </p>
                ) : (
                  dayBookings.map((booking) => {
                    const stylist = getStylist(booking.stylistId);
                    return (
                      <button
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg bg-white hover:bg-mila-cream/60 transition-colors cursor-pointer",
                          "shadow-[0_1px_2px_rgba(93,86,69,0.06)]",
                          statusBorder(booking.status)
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                          <Clock size={12} />
                          <span>
                            {formatTime(booking.startTime)} -{" "}
                            {formatTime(booking.endTime)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-text-primary truncate">
                          {getServiceNames(booking.serviceIds, language)}
                        </p>
                        {stylist && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Avatar
                              src={stylist.avatar}
                              alt={stylist.name}
                              size="sm"
                            />
                            <span className="text-xs text-text-secondary truncate">
                              {stylist.name}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-text-muted mt-1 truncate">
                          {booking.guestName || booking.clientId || "---"}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Booking detail modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={language === "es" ? "Detalle de Cita" : "Booking Details"}
        size="md"
      >
        {selectedBooking && (() => {
          const stylist = getStylist(selectedBooking.stylistId);
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Badge variant={statusBadgeVariant(selectedBooking.status)}>
                  {selectedBooking.status}
                </Badge>
                <span className="text-lg font-bold text-text-primary">
                  {formatPrice(selectedBooking.totalPrice)}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Scissors size={16} className="text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-muted">
                      {language === "es" ? "Servicio" : "Service"}
                    </p>
                    <p className="font-medium">
                      {getServiceNames(selectedBooking.serviceIds, language)}
                    </p>
                  </div>
                </div>

                {stylist && (
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={stylist.avatar}
                      alt={stylist.name}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm text-text-muted">
                        {language === "es" ? "Estilista" : "Stylist"}
                      </p>
                      <p className="font-medium">{stylist.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <User size={16} className="text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-muted">
                      {language === "es" ? "Cliente" : "Client"}
                    </p>
                    <p className="font-medium">
                      {selectedBooking.guestName ||
                        selectedBooking.clientId ||
                        "---"}
                    </p>
                    {selectedBooking.guestPhone && (
                      <p className="text-xs text-text-muted">
                        {selectedBooking.guestPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-text-muted flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text-muted">
                      {language === "es" ? "Fecha y Hora" : "Date & Time"}
                    </p>
                    <p className="font-medium">
                      {new Date(selectedBooking.date).toLocaleDateString(
                        language === "es" ? "es-ES" : "en-US",
                        { weekday: "long", month: "long", day: "numeric" }
                      )}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {formatTime(selectedBooking.startTime)} -{" "}
                      {formatTime(selectedBooking.endTime)}
                    </p>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div className="bg-mila-cream/60 rounded-lg p-3">
                    <p className="text-sm text-text-muted mb-1">
                      {language === "es" ? "Notas" : "Notes"}
                    </p>
                    <p className="text-sm text-text-primary">
                      {selectedBooking.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {selectedBooking.status !== "cancelled" &&
                selectedBooking.status !== "completed" && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border-default">
                    {selectedBooking.status === "pending" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          updateBookingStatus(
                            selectedBooking.id,
                            "confirmed"
                          )
                        }
                      >
                        <Check size={16} />
                        {language === "es" ? "Confirmar" : "Confirm"}
                      </Button>
                    )}
                    {(selectedBooking.status === "confirmed" ||
                      selectedBooking.status === "pending") && (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            updateBookingStatus(
                              selectedBooking.id,
                              "cancelled"
                            )
                          }
                        >
                          <XCircle size={16} />
                          {language === "es" ? "Cancelar" : "Cancel"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateBookingStatus(
                              selectedBooking.id,
                              "no-show"
                            )
                          }
                        >
                          <AlertTriangle size={16} />
                          {language === "es" ? "No asistio" : "No-Show"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
            </div>
          );
        })()}
      </Modal>
    </motion.div>
  );
}
