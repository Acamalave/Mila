import type { Booking } from "@/types/booking";

/**
 * Default empty bookings array.
 * In a real app this would come from an API or database.
 */
export const bookings: Booking[] = [];

/**
 * Returns a set of demo appointments spread across the next 7 days.
 * Dates are computed at call-time so the data always looks "upcoming".
 */
export function getInitialDemoAppointments(): Booking[] {
  const now = new Date();

  const addDays = (days: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  const isoNow = now.toISOString();

  return [
    {
      id: "booking-demo-upcoming-1",
      serviceIds: ["svc-cut-style"],
      stylistId: "stylist-camila",
      clientId: "user-sofia",
      date: addDays(1),
      startTime: "10:00",
      endTime: "11:00",
      status: "confirmed",
      totalPrice: 85,
      notes: "Trim and layers, keep length",
      createdAt: isoNow,
    },
    {
      id: "booking-demo-upcoming-2",
      serviceIds: ["svc-balayage"],
      stylistId: "stylist-valentina",
      clientId: "user-sofia",
      date: addDays(3),
      startTime: "14:00",
      endTime: "17:00",
      status: "confirmed",
      totalPrice: 250,
      notes: "Full balayage, warm tones",
      createdAt: isoNow,
    },
    {
      id: "booking-demo-upcoming-3",
      serviceIds: ["svc-treatment-hydrate"],
      stylistId: "stylist-lucia",
      clientId: null,
      date: addDays(5),
      startTime: "11:00",
      endTime: "12:15",
      status: "pending",
      totalPrice: 75,
      guestName: "Elena Rodriguez",
      guestPhone: "+507 6700-8000",
      createdAt: isoNow,
    },
    {
      id: "booking-demo-upcoming-4",
      serviceIds: ["svc-makeup-social"],
      stylistId: "stylist-mariana",
      clientId: "user-sofia",
      date: addDays(6),
      startTime: "16:00",
      endTime: "17:00",
      status: "confirmed",
      totalPrice: 120,
      notes: "Smokey eye look for gala dinner",
      createdAt: isoNow,
    },
  ];
}
