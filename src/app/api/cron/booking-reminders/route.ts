// =============================================================================
// GET /api/cron/booking-reminders
// Vercel Cron — runs daily at 10 AM (see vercel.json)
// Sends booking-reminder email + WhatsApp for tomorrow's confirmed bookings
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { internalAuthHeaders } from "@/lib/internal-auth";
import { services } from "@/data/services";

interface BookingDoc {
  id: string;
  clientId: string | null;
  clientName?: string;
  stylistId: string;
  stylistName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceIds: string[];
  totalPrice: number;
  guestName?: string;
  guestPhone?: string;
}

interface UserDoc {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  email?: string;
}

// Panama has no DST and sits at UTC-5 year-round.
const PANAMA_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // ── Auth: verify Vercel CRON_SECRET (fail-closed) ──
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    // Tomorrow's date in Panama local time (booking dates are stored as the
    // salon's local YYYY-MM-DD, so the comparison must use Panama time).
    const panamaNow = new Date(Date.now() - PANAMA_UTC_OFFSET_MS);
    const panamaTomorrow = new Date(panamaNow.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = panamaTomorrow.toISOString().split("T")[0]; // "YYYY-MM-DD"

    // ── Query confirmed bookings for tomorrow ──
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("date", "==", tomorrowStr),
      where("status", "==", "confirmed")
    );
    const snap = await getDocs(q);

    const bookings: BookingDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as BookingDoc[];

    if (bookings.length === 0) {
      return NextResponse.json({
        success: true,
        date: tomorrowStr,
        reminders: 0,
        message: "No confirmed bookings for tomorrow.",
      });
    }

    // ── Load user registry from Firestore ──
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap = new Map<string, UserDoc>();
    for (const d of usersSnap.docs) {
      const user = { id: d.id, ...d.data() } as UserDoc;
      usersMap.set(user.id, user);
    }

    // ── Send reminders ──
    const results: Array<{ bookingId: string; clientId: string | null; email: boolean; whatsapp: boolean }> = [];

    for (const booking of bookings) {
      const client = booking.clientId ? usersMap.get(booking.clientId) : undefined;

      const clientName = client?.name ?? booking.clientName ?? booking.guestName ?? "Cliente";
      const stylistName = booking.stylistName ?? "";
      const serviceNames = (booking.serviceIds ?? [])
        .map((id) => services.find((s) => s.id === id)?.name?.es)
        .filter((n): n is string => !!n);

      // The email and WhatsApp templates expect different field shapes.
      const emailData = {
        clientName,
        stylistName,
        date: booking.date,
        time: booking.startTime,
        services: serviceNames,
      };
      const whatsappData = {
        clientName,
        stylist: stylistName,
        date: booking.date,
        time: booking.startTime,
        service: serviceNames.join(", "),
      };

      let emailSent = false;
      let whatsappSent = false;

      // Determine the email recipient
      const email = client?.email;
      if (email) {
        try {
          const res = await fetch(new URL("/api/notifications/email", request.url).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...internalAuthHeaders() },
            body: JSON.stringify({
              to: email,
              template: "booking-reminder",
              data: emailData,
              language: "es",
            }),
          });
          emailSent = res.ok;
        } catch (err) {
          console.error(`[cron/booking-reminders] Email failed for booking ${booking.id}:`, err);
        }
      }

      // Determine the WhatsApp recipient
      const phone = client?.phone ?? booking.guestPhone;
      const countryCode = client?.countryCode ?? "+507";
      if (phone) {
        try {
          const res = await fetch(new URL("/api/notifications/whatsapp", request.url).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...internalAuthHeaders() },
            body: JSON.stringify({
              phone,
              countryCode,
              template: "booking-reminder",
              data: whatsappData,
              language: "es",
            }),
          });
          whatsappSent = res.ok;
        } catch (err) {
          console.error(`[cron/booking-reminders] WhatsApp failed for booking ${booking.id}:`, err);
        }
      }

      results.push({
        bookingId: booking.id,
        clientId: booking.clientId,
        email: emailSent,
        whatsapp: whatsappSent,
      });
    }

    return NextResponse.json({
      success: true,
      date: tomorrowStr,
      reminders: results.length,
      results,
    });
  } catch (err) {
    console.error("[cron/booking-reminders] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
