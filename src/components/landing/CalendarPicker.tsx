"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  isToday,
  startOfDay,
  getDay,
} from "date-fns";
import { es, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { stylists } from "@/data/stylists";
import { services } from "@/data/services";
import { useLanguage } from "@/providers/LanguageProvider";
import { useBooking } from "@/providers/BookingProvider";
import { useAuth } from "@/providers/AuthProvider";
import { formatPrice } from "@/lib/utils";
import type { TimeSlot } from "@/types";

interface CalendarPickerProps {
  onBook?: () => void;
  onLoginRequired?: () => void;
}

export default function CalendarPicker({ onBook, onLoginRequired }: CalendarPickerProps) {
  const { language, t } = useLanguage();
  const { state, dispatch } = useBooking();
  const { isAuthenticated } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));

  const locale = language === "es" ? es : enUS;

  const stylist = useMemo(
    () => stylists.find((s) => s.id === state.selectedStylistId),
    [state.selectedStylistId]
  );

  const selectedServices = useMemo(
    () => services.filter((s) => state.selectedServiceIds.includes(s.id)),
    [state.selectedServiceIds]
  );

  const totalDuration = useMemo(
    () => state.isGeneralAppointment ? 60 : selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0),
    [selectedServices, state.isGeneralAppointment]
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices]
  );

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Week view header text
  const weekHeaderText = useMemo(() => {
    const weekEnd = addDays(currentWeekStart, 6);
    const startMonth = format(currentWeekStart, "MMM", { locale });
    const endMonth = format(weekEnd, "MMM", { locale });
    const startDay = format(currentWeekStart, "d");
    const endDay = format(weekEnd, "d");
    const year = format(weekEnd, "yyyy");

    if (language === "es") {
      if (startMonth === endMonth) {
        return `${startDay} - ${endDay} ${startMonth} ${year}`;
      }
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
    }
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }, [currentWeekStart, language, locale]);

  // Check if a date is available based on stylist schedule
  const isDayAvailable = useCallback(
    (date: Date): boolean => {
      if (!stylist) return false;
      if (isBefore(date, startOfDay(new Date()))) return false;
      const dayOfWeek = getDay(date);
      const schedule = stylist.schedule.find(
        (s) => s.dayOfWeek === dayOfWeek && s.isAvailable
      );
      return !!schedule;
    },
    [stylist]
  );

  // Generate time slots for selected date
  const timeSlots = useMemo((): TimeSlot[] => {
    if (!state.selectedDate || !stylist) return [];
    const date = new Date(state.selectedDate + "T12:00:00");
    const dayOfWeek = getDay(date);
    const schedule = stylist.schedule.find(
      (s) => s.dayOfWeek === dayOfWeek && s.isAvailable
    );
    if (!schedule) return [];

    const slots: TimeSlot[] = [];
    const [startH, startM] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m + totalDuration <= endMinutes; m += 30) {
      const startHour = Math.floor(m / 60);
      const startMin = m % 60;
      const endM2 = m + totalDuration;
      const endHour = Math.floor(endM2 / 60);
      const endMin = endM2 % 60;

      slots.push({
        startTime: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`,
        endTime: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
        isAvailable: true,
      });
    }
    return slots;
  }, [state.selectedDate, stylist, totalDuration]);

  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  };

  const handleDateSelect = (date: Date) => {
    if (isDayAvailable(date)) {
      dispatch({ type: "SET_DATE", payload: format(date, "yyyy-MM-dd") });
      if (viewMode === "month") {
        setViewMode("week");
        setCurrentWeekStart(startOfWeek(date));
      }
    }
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    dispatch({ type: "SET_TIME_SLOT", payload: slot });
  };

  const handleBook = () => {
    if (!isAuthenticated) {
      onLoginRequired?.();
    } else {
      onBook?.();
    }
  };

  const handlePrev = () => {
    if (viewMode === "week") {
      setCurrentWeekStart(addDays(currentWeekStart, -7));
    } else {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "week") {
      setCurrentWeekStart(addDays(currentWeekStart, 7));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const toggleViewMode = () => {
    if (viewMode === "week") {
      // When expanding to month, sync month to the week being viewed
      setCurrentMonth(currentWeekStart);
      setViewMode("month");
    } else {
      // When collapsing, sync week to the current month start
      setCurrentWeekStart(startOfWeek(currentMonth));
      setViewMode("week");
    }
  };

  const selectedDate = state.selectedDate ? new Date(state.selectedDate + "T12:00:00") : null;
  const dayNames = language === "es"
    ? ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "S\u00e1"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Render a single day cell (shared between week and month views)
  const renderDayCell = (day: Date, index: number, isMonthView: boolean) => {
    const isCurrentMonth = isMonthView ? isSameMonth(day, currentMonth) : true;
    const isAvailable = isDayAvailable(day);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const dayIsToday = isToday(day);
    const showTodayDot = dayIsToday && !isSelected;

    return (
      <motion.button
        key={index}
        whileHover={isAvailable ? { scale: 1.15 } : {}}
        whileTap={isAvailable ? { scale: 0.9 } : {}}
        onClick={() => handleDateSelect(day)}
        disabled={!isAvailable}
        className="flex flex-col items-center justify-center p-1"
        style={{
          width: "100%",
          aspectRatio: "1",
          cursor: isAvailable ? "pointer" : "default",
          background: "none",
          border: "none",
        }}
      >
        <span
          className="flex items-center justify-center rounded-full"
          style={{
            width: 38,
            height: 38,
            fontSize: 14,
            fontWeight: isSelected ? 700 : 400,
            color: isSelected
              ? "#FAF8F5"
              : isAvailable
              ? "#FAF8F5"
              : isCurrentMonth
              ? "rgba(107, 101, 96, 0.4)"
              : "rgba(107, 101, 96, 0.2)",
            background: isSelected
              ? "linear-gradient(135deg, #8E7B54, #C4A96A)"
              : isAvailable
              ? "rgba(255, 255, 255, 0.04)"
              : "transparent",
            boxShadow: isSelected
              ? "0 4px 15px rgba(142, 123, 84, 0.4)"
              : "none",
            transition: "all 0.2s ease",
          }}
        >
          {format(day, "d")}
        </span>
        {/* Today indicator dot */}
        {showTodayDot && (
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#C4A96A",
              marginTop: 2,
              display: "block",
              flexShrink: 0,
            }}
          />
        )}
      </motion.button>
    );
  };

  return (
    <section className="py-12 sm:py-16 px-4 relative">
      <div className="max-w-2xl mx-auto">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
          >
            {t("home", "chooseDate")}
          </h2>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, #8E7B54, #C4A96A)", margin: "0 auto", borderRadius: 2 }} />
        </motion.div>

        {/* Calendar Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: "#141414",
            borderRadius: 20,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            overflow: "hidden",
          }}
        >
          {/* Navigation Header */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrev}
              style={{ color: "#C4A96A", cursor: "pointer", background: "none", border: "none" }}
            >
              <ChevronLeft size={20} />
            </motion.button>
            <h3
              className="text-base font-semibold capitalize"
              style={{ color: "#FAF8F5", fontFamily: "var(--font-display)" }}
            >
              {viewMode === "week"
                ? weekHeaderText
                : format(currentMonth, "MMMM yyyy", { locale })
              }
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              style={{ color: "#C4A96A", cursor: "pointer", background: "none", border: "none" }}
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 px-4 pt-3">
            {dayNames.map((d) => (
              <div
                key={d}
                className="text-center py-2"
                style={{ fontSize: 11, color: "#6B6560", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day Grid with AnimatePresence for view transitions */}
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === "week" ? (
              <motion.div
                key="week-view"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="grid grid-cols-7 px-4 pb-2">
                  {weekDays.map((day, i) => renderDayCell(day, i, false))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="month-view"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div className="grid grid-cols-7 px-4 pb-2">
                  {calendarDays.map((day, i) => renderDayCell(day, i, true))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle View Button */}
          <div className="px-4 pb-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleViewMode}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "#C4A96A",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {viewMode === "week" ? (
                <>
                  {language === "es" ? "Ver m\u00e1s fechas" : "See more dates"}
                  <ChevronDown size={14} />
                </>
              ) : (
                <>
                  {language === "es" ? "Ver menos" : "See less"}
                  <ChevronUp size={14} />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Time Slots */}
        <AnimatePresence>
          {state.selectedDate && timeSlots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6"
            >
              <p className="text-sm font-medium mb-3" style={{ color: "#ABA595" }}>
                {language === "es" ? "Horarios disponibles" : "Available times"}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((slot, i) => {
                  const isSelected =
                    state.selectedTimeSlot?.startTime === slot.startTime;
                  return (
                    <motion.button
                      key={slot.startTime}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleTimeSelect(slot)}
                      className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl"
                      style={{
                        background: isSelected
                          ? "linear-gradient(135deg, #8E7B54, #C4A96A)"
                          : "#141414",
                        border: isSelected
                          ? "2px solid #C4A96A"
                          : "2px solid rgba(255, 255, 255, 0.08)",
                        color: isSelected ? "#FAF8F5" : "#ABA595",
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 400,
                        cursor: "pointer",
                        boxShadow: isSelected
                          ? "0 4px 15px rgba(142, 123, 84, 0.3)"
                          : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Clock size={12} />
                      {formatTimeDisplay(slot.startTime)}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Book Button */}
        <AnimatePresence>
          {state.selectedDate && state.selectedTimeSlot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8"
            >
              {/* Summary */}
              <div
                className="p-4 rounded-xl mb-4"
                style={{
                  background: "rgba(142, 123, 84, 0.1)",
                  border: "1px solid rgba(142, 123, 84, 0.2)",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "#ABA595" }}>
                  {t("home", "yourBooking")}
                </p>
                <div className="mt-2 space-y-1">
                  <p style={{ fontSize: 13, color: "#FAF8F5" }}>
                    {stylist?.name} · {selectedDate ? format(selectedDate, "EEEE, MMMM d", { locale }) : ""}
                  </p>
                  <p style={{ fontSize: 13, color: "#C4A96A" }}>
                    {formatTimeDisplay(state.selectedTimeSlot.startTime)} - {formatTimeDisplay(state.selectedTimeSlot.endTime)}
                  </p>
                  {!state.isGeneralAppointment && (
                    <p style={{ fontSize: 14, color: "#C4A96A", fontWeight: 700, marginTop: 4 }}>
                      {formatPrice(totalPrice)}
                    </p>
                  )}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBook}
                className="w-full py-4 rounded-2xl font-semibold text-base"
                style={{
                  background: "linear-gradient(135deg, #8E7B54, #C4A96A)",
                  color: "#110D09",
                  boxShadow: "0 8px 30px rgba(142, 123, 84, 0.35)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isAuthenticated ? t("home", "bookAppointment") : t("home", "loginToBook")}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
