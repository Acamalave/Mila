// =============================================================================
// GET /api/cron/booking-reminders
// Vercel Cron — runs daily at 10 AM (see vercel.json)
// Sends booking-reminder email + WhatsApp for tomorrow's confirmed bookings
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

interface BookingDoc {
  id: string;
  clientId: string | null;
  stylistId: string;
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

export async function GET(request: NextRequest) {
  // ── Auth: verify Vercel CRON_SECRET ──
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    // Tomorrow's date in YYYY-MM-DD (server runs in UTC; Panama is UTC-5)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]; // "YYYY-MM-DD"

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

      const reminderData = {
        clientName: client?.name ?? booking.guestName ?? "Client",
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        bookingId: booking.id,
      };

      let emailSent = false;
      let whatsappSent = false;

      // Determine the email recipient
      const email = client?.email;
      if (email) {
        try {
          const res = await fetch(new URL("/api/notifications/email", request.url).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email,
              template: "booking-reminder",
              data: reminderData,
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone,
              countryCode,
              template: "booking-reminder",
              data: reminderData,
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
