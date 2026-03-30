import { format, addMinutes, parse, isBefore, isAfter, isEqual, startOfDay, addDays, getDay } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { TimeSlot, Booking } from "@/types";
import type { StylistSchedule } from "@/types/stylist";

function parseLocalDate(date: string): Date {
  // Parse "YYYY-MM-DD" as local date, not UTC
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: string, locale: string = "en"): string {
  if (!date) return "—";
  const d = date.includes("T") ? new Date(date) : parseLocalDate(date);
  if (isNaN(d.getTime())) return "—";
  return format(d, "EEEE, MMMM d, yyyy", {
    locale: locale === "es" ? es : enUS,
  });
}

export function formatShortDate(date: string, locale: string = "en"): string {
  if (!date) return "—";
  const d = date.includes("T") ? new Date(date) : parseLocalDate(date);
  if (isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy", {
    locale: locale === "es" ? es : enUS,
  });
}

export function formatTime(time: string): string {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function generateTimeSlots(
  schedule: StylistSchedule,
  serviceDuration: number,
  existingBookings: Booking[],
  date: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dateObj = parseLocalDate(date);
  const dayOfWeek = getDay(dateObj);

  if (!schedule.isAvailable || schedule.dayOfWeek !== dayOfWeek) {
    return [];
  }

  const startTime = parse(schedule.startTime, "HH:mm", dateObj);
  const endTime = parse(schedule.endTime, "HH:mm", dateObj);
  let current = startTime;

  while (isBefore(addMinutes(current, serviceDuration), endTime) || isEqual(addMinutes(current, serviceDuration), endTime)) {
    const slotStart = format(current, "HH:mm");
    const slotEnd = format(addMinutes(current, serviceDuration), "HH:mm");

    const isBooked = existingBookings.some((booking) => {
      if (booking.date !== date || booking.status === "cancelled") return false;
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime;
      return (
        (slotStart >= bookingStart && slotStart < bookingEnd) ||
        (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
        (slotStart <= bookingStart && slotEnd >= bookingEnd)
      );
    });

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      isAvailable: !isBooked,
    });

    current = addMinutes(current, 30);
  }

  return slots;
}

export function getAvailableDates(
  schedule: StylistSchedule[],
  daysAhead: number = 30
): string[] {
  const dates: string[] = [];
  const today = startOfDay(new Date());

  for (let i = 1; i <= daysAhead; i++) {
    const date = addDays(today, i);
    const dayOfWeek = getDay(date);
    const daySchedule = schedule.find(
      (s) => s.dayOfWeek === dayOfWeek && s.isAvailable
    );
    if (daySchedule) {
      dates.push(format(date, "yyyy-MM-dd"));
    }
  }

  return dates;
}
