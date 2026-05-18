"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import {
  cn,
  formatPrice,
  getStoredData,
  setStoredData,
} from "@/lib/utils";
import { setDocument, onCollectionChange, getCollection } from "@/lib/firestore";
import { formatTime } from "@/lib/date-utils";
import { useService } from "@/providers/ServiceProvider";
import { useStaff } from "@/providers/StaffProvider";
import { getInitialDemoAppointments } from "@/data/appointments";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import NewBookingModal from "@/components/admin/NewBookingModal";
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
  Plus,
  CalendarClock,
} from "lucide-react";
import type { Booking, BookingStatus, User as AppUser } from "@/types";

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
  const { emit } = useEventBus();
  const { allStylists } = useStaff();
  const { allServices: services } = useService();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<AppUser[]>(() => getStoredData<AppUser[]>("mila-users", []));
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

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
    setBookings(stored);

    const unsub = onCollectionChange<Booking>("bookings", (firestoreBookings) => {
      if (firestoreBookings.length > 0) {
        setBookings((prev) => {
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

  // Load the user registry so bookings can show the client's real name
  // instead of the raw clientId (e.g. "user-60001234"). Merge Firestore with
  // the local registry so users not yet synced (e.g. offline walk-ins) still
  // resolve.
  useEffect(() => {
    const mergeUsers = (fsUsers: AppUser[]) => {
      const local = getStoredData<AppUser[]>("mila-users", []);
      const map = new Map<string, AppUser>();
      for (const u of local) if (u.id) map.set(u.id, u);
      for (const u of fsUsers) if (u.id) map.set(u.id, u);
      setUsers(Array.from(map.values()));
    };
    getCollection<AppUser>("users").then(mergeUsers).catch(() => {});
    const unsub = onCollectionChange<AppUser>("users", mergeUsers);
    return () => unsub();
  }, []);

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.id && u.name) map.set(u.id, u.name);
    }
    return map;
  }, [users]);

  // Resolve a booking's client display name: live registry name first, then
  // the name snapshotted on the booking, then a guest name. Never the id.
  const getClientName = useCallback(
    (booking: Booking): string => {
      return (
        (booking.clientId ? userNameById.get(booking.clientId) : undefined) ||
        booking.clientName ||
        booking.guestName ||
        (language === "es" ? "Cliente" : "Client")
      );
    },
    [userNameById, language]
  );

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

  const getStylist = (id: string) => allStylists.find((s) => s.id === id);

  const getServiceNames = (svcIds: string[] | undefined, lang: string) => {
    if (!svcIds || svcIds.length === 0) return lang === "es" ? "Consulta General" : "General Consultation";
    return svcIds.map(id => services.find(s => s.id === id)?.name[lang as "en" | "es"] ?? id).join(", ");
  };

  const updateBookingStatus = useCallback(
    (bookingId: string, newStatus: BookingStatus) => {
      const fullBooking = bookings.find((b) => b.id === bookingId);
      const updated = bookings.map((b) =>
        b.id === bookingId ? { ...b, status: newStatus } : b
      );
      setBookings(updated);
      setStoredData("mila-bookings", updated);
      setDocument("bookings", bookingId, { status: newStatus }).catch((err) => console.warn("[Mila] Booking sync failed:", err));
      // Emit full booking object so CommissionProvider can generate commissions
      emit("booking:updated", { ...fullBooking, status: newStatus });

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

  // Reschedule helpers
  const getRescheduleSlots = useCallback((): string[] => {
    if (!selectedBooking || !rescheduleDate) return [];
    const stylist = getStylist(selectedBooking.stylistId);
    if (!stylist) return [];
    const d = new Date(rescheduleDate + "T12:00:00");
    const dow = d.getDay();
    const schedule = stylist.schedule?.find((s) => s.dayOfWeek === dow);
    if (!schedule?.isAvailable) return [];
    const [sh, sm] = schedule.startTime.split(":").map(Number);
    const [eh, em] = schedule.endTime.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const totalDur =
      (selectedBooking.serviceIds ?? []).reduce((sum, id) => {
        const svc = services.find((s) => s.id === id);
        return sum + (svc?.durationMinutes ?? 30);
      }, 0) || 30;

    // Check conflicts against existing bookings for that stylist/date, excluding this booking
    const occupied = bookings
      .filter(
        (b) =>
          b.id !== selectedBooking.id &&
          b.stylistId === selectedBooking.stylistId &&
          b.date === rescheduleDate &&
          (b.status === "confirmed" || b.status === "pending")
      )
      .map((b) => {
        const [bsh, bsm] = b.startTime.split(":").map(Number);
        const [beh, bem] = b.endTime.split(":").map(Number);
        return { start: bsh * 60 + bsm, end: beh * 60 + bem };
      });

    const slots: string[] = [];
    for (let m = startMins; m + totalDur <= endMins; m += 30) {
      const slotEnd = m + totalDur;
      const conflicts = occupied.some((o) => m < o.end && slotEnd > o.start);
      if (!conflicts) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(
          `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
        );
      }
    }
    return slots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBooking, rescheduleDate, bookings, allStylists]);

  const handleReschedule = useCallback(() => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) return;
    const totalDur =
      (selectedBooking.serviceIds ?? []).reduce((sum, id) => {
        const svc = services.find((s) => s.id === id);
        return sum + (svc?.durationMinutes ?? 30);
      }, 0) || 30;
    const [h, m] = rescheduleTime.split(":").map(Number);
    const endMins = h * 60 + m + totalDur;
    const endTime = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(
      endMins % 60
    ).padStart(2, "0")}`;

    // Conflict check one last time
    const hasConflict = bookings.some(
      (b) =>
        b.id !== selectedBooking.id &&
        b.stylistId === selectedBooking.stylistId &&
        b.date === rescheduleDate &&
        (b.status === "confirmed" || b.status === "pending") &&
        rescheduleTime < b.endTime &&
        endTime > b.startTime
    );
    if (hasConflict) {
      addToast(
        language === "es"
          ? "Este horario acaba de ser reservado. Selecciona otro."
          : "This slot is already taken. Select another.",
        "error"
      );
      return;
    }

    const updated = bookings.map((b) =>
      b.id === selectedBooking.id
        ? { ...b, date: rescheduleDate, startTime: rescheduleTime, endTime }
        : b
    );
    setBookings(updated);
    setStoredData("mila-bookings", updated);
    setDocument("bookings", selectedBooking.id, {
      date: rescheduleDate,
      startTime: rescheduleTime,
      endTime,
    }).catch((err) => console.warn("[Mila] Booking sync failed:", err));

    const updatedBooking = {
      ...selectedBooking,
      date: rescheduleDate,
      startTime: rescheduleTime,
      endTime,
    };
    emit("booking:updated", updatedBooking);
    addToast(
      language === "es" ? "Cita reprogramada" : "Booking rescheduled",
      "success"
    );
    setSelectedBooking(null);
    setRescheduleMode(false);
    setRescheduleDate("");
    setRescheduleTime("");
  }, [
    selectedBooking,
    rescheduleDate,
    rescheduleTime,
    bookings,
    addToast,
    emit,
    language,
  ]);

  const handleBookingCreated = useCallback((booking: Booking) => {
    setBookings((prev) => {
      const next = [...prev, booking];
      return next;
    });
  }, []);

  const closeBookingModal = useCallback(() => {
    setSelectedBooking(null);
    setRescheduleMode(false);
    setRescheduleDate("");
    setRescheduleTime("");
  }, []);

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

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={goPrevWeek}>
            <ChevronLeft size={18} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {language === "es" ? "Hoy" : "Today"}
          </Button>
          <Button variant="ghost" size="sm" onClick={goNextWeek}>
            <ChevronRight size={18} />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewBookingModal(true)}
          >
            <Plus size={16} />
            {language === "es" ? "Nueva Cita" : "New Booking"}
          </Button>
        </div>
      </motion.div>

      {/* Week grid */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-2 sm:gap-4"
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
                  "px-3 sm:px-4 py-2 sm:py-3 border-b border-border-default",
                  isToday ? "bg-mila-gold/10" : "bg-white/5"
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

              <div className="p-2 sm:p-3 space-y-2 min-h-[100px] sm:min-h-[120px]">
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
                          "w-full text-left p-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer",
                          "shadow-[0_1px_2px_rgba(93,86,69,0.06)]",
                          statusBorder(booking.status)
                        )}
                        style={{ background: "var(--color-bg-glass)" }}
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
                          {getClientName(booking)}
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

      {/* New booking modal */}
      <NewBookingModal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
        onCreated={handleBookingCreated}
      />

      {/* Booking detail modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={closeBookingModal}
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
                      {getClientName(selectedBooking)}
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
                  <div className="rounded-lg p-3" style={{ background: "var(--color-bg-glass)" }}>
                    <p className="text-sm text-text-muted mb-1">
                      {language === "es" ? "Notas" : "Notes"}
                    </p>
                    <p className="text-sm text-text-primary">
                      {selectedBooking.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Reschedule form */}
              {rescheduleMode &&
                selectedBooking.status !== "cancelled" &&
                selectedBooking.status !== "completed" && (
                  <div
                    className="rounded-lg p-3 space-y-3 border"
                    style={{
                      background: "var(--color-bg-glass)",
                      borderColor: "var(--color-border-default)",
                    }}
                  >
                    <p className="text-sm font-medium text-text-primary">
                      {language === "es"
                        ? "Nueva fecha y hora"
                        : "New date and time"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-text-secondary">
                          {language === "es" ? "Fecha" : "Date"}
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={rescheduleDate}
                          onChange={(e) => {
                            setRescheduleDate(e.target.value);
                            setRescheduleTime("");
                          }}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{
                            background: "var(--color-bg-input)",
                            color: "var(--color-text-primary)",
                            border: "1px solid var(--color-border-default)",
                            outline: "none",
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-text-secondary">
                          {language === "es" ? "Hora" : "Time"}
                        </label>
                        <select
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          disabled={!rescheduleDate}
                          className="w-full px-3 py-2 rounded-lg text-sm appearance-none"
                          style={{
                            background: "var(--color-bg-input)",
                            color: "var(--color-text-primary)",
                            border: "1px solid var(--color-border-default)",
                            outline: "none",
                          }}
                        >
                          <option value="">
                            {!rescheduleDate
                              ? language === "es"
                                ? "Primero elige fecha"
                                : "Select date first"
                              : getRescheduleSlots().length === 0
                              ? language === "es"
                                ? "Sin horarios"
                                : "No slots"
                              : language === "es"
                              ? "Selecciona..."
                              : "Select..."}
                          </option>
                          {getRescheduleSlots().map((slot) => (
                            <option key={slot} value={slot}>
                              {formatTime(slot)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRescheduleMode(false);
                          setRescheduleDate("");
                          setRescheduleTime("");
                        }}
                      >
                        {language === "es" ? "Cancelar" : "Cancel"}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleReschedule}
                        disabled={!rescheduleDate || !rescheduleTime}
                      >
                        <Check size={14} />
                        {language === "es" ? "Guardar" : "Save"}
                      </Button>
                    </div>
                  </div>
                )}

              {/* Action buttons */}
              {!rescheduleMode &&
                selectedBooking.status !== "cancelled" &&
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
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleMode(true);
                            setRescheduleDate(selectedBooking.date);
                            setRescheduleTime("");
                          }}
                        >
                          <CalendarClock size={16} />
                          {language === "es" ? "Reprogramar" : "Reschedule"}
                        </Button>
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
