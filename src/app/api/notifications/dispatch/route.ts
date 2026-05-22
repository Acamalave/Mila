// =============================================================================
// POST /api/notifications/dispatch
//
// Public-facing notification trigger. The client never calls the raw
// email/whatsapp routes (those are internal-only); it asks this route to
// dispatch a notification for a real entity.
//
// Why this is safe (not an open relay):
//   - The recipient is resolved server-side from Firestore (a real client of a
//     real booking/invoice) — the caller cannot choose an arbitrary address.
//   - The template is one of a fixed set with fixed layouts and server-built
//     links — the caller cannot inject arbitrary content or pay/phishing links.
//   - Identical (event, entity) dispatches are de-duplicated for a short window.
//
// Server-side callers (webhook, crons) use the internal email/whatsapp routes
// directly with the INTERNAL_API_SECRET instead.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/firestore";
import { sendEmail } from "@/lib/resend";
import { sendWhatsApp } from "@/lib/manychat";
import type { TemplateData } from "@/emails/templates";
import type { Invoice, User } from "@/types";

type DispatchEvent =
  | "booking-confirmation"
  | "booking-cancellation"
  | "invoice-sent"
  | "payment-confirmed";

interface DispatchBody {
  event: DispatchEvent;
  language?: "es" | "en";
  // Booking events
  clientId?: string | null;
  clientName?: string;
  stylistName?: string;
  date?: string;
  time?: string;
  serviceNames?: string[];
  // Invoice events
  invoiceId?: string;
  transactionId?: string;
}

const VALID_EVENTS: DispatchEvent[] = [
  "booking-confirmation",
  "booking-cancellation",
  "invoice-sent",
  "payment-confirmed",
];

type ChannelResult = "sent" | "failed" | "skipped";

// Best-effort, per-instance dedupe so a duplicated client emission (React
// strict-mode double render, double event) does not fire two notifications.
const recentDispatches: Map<string, number> =
  (globalThis as unknown as { __milaDispatchDedupe?: Map<string, number> })
    .__milaDispatchDedupe ?? new Map<string, number>();
(globalThis as unknown as { __milaDispatchDedupe?: Map<string, number> })
  .__milaDispatchDedupe = recentDispatches;

const DEDUPE_WINDOW_MS = 30_000;

/**
 * Read a document, retrying briefly. Entities are created with a
 * fire-and-forget Firestore write, so a dispatch fired immediately afterwards
 * may race the sync — a couple of short retries closes that window.
 */
async function getDocumentWithRetry<T>(
  collectionName: string,
  id: string,
  attempts = 3
): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const found = await getDocument<T>(collectionName, id);
      if (found) return found;
    } catch (err) {
      console.warn(`[dispatch] read ${collectionName}/${id} attempt ${i + 1} failed:`, err);
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600));
  }
  return null;
}

function isDuplicate(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of recentDispatches.entries()) {
    if (now - ts > DEDUPE_WINDOW_MS) recentDispatches.delete(k);
  }
  if (recentDispatches.has(key)) return true;
  recentDispatches.set(key, now);
  return false;
}

export async function POST(request: NextRequest) {
  let body: DispatchBody;
  try {
    body = (await request.json()) as DispatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { event } = body;
  if (!event || !VALID_EVENTS.includes(event)) {
    return NextResponse.json(
      { ok: false, error: `Invalid 'event'. Must be one of: ${VALID_EVENTS.join(", ")}` },
      { status: 400 }
    );
  }

  const language: "es" | "en" = body.language === "en" ? "en" : "es";

  // ── Resolve recipient + template data server-side ──
  let recipient: User | null = null;
  let emailData: TemplateData | null = null;
  let whatsappData: Record<string, string> | null = null;
  let dedupeKey: string = event;

  try {
    if (event === "booking-confirmation" || event === "booking-cancellation") {
      if (!body.clientId) {
        return NextResponse.json(
          { ok: false, error: "Missing 'clientId'" },
          { status: 400 }
        );
      }
      recipient = await getDocumentWithRetry<User>("users", body.clientId);
      const clientName = recipient?.name || body.clientName || "Cliente";
      const stylistName = body.stylistName || "";
      const date = body.date || "";
      const time = body.time || "";
      const serviceNames = Array.isArray(body.serviceNames) ? body.serviceNames : [];

      emailData = { clientName, stylistName, date, time, services: serviceNames };
      whatsappData = {
        clientName,
        stylist: stylistName,
        date,
        time,
        service: serviceNames.join(", "),
      };
      dedupeKey = `${event}:${body.clientId}:${date}:${time}`;
    } else {
      // invoice-sent | payment-confirmed
      if (!body.invoiceId) {
        return NextResponse.json(
          { ok: false, error: "Missing 'invoiceId'" },
          { status: 400 }
        );
      }
      const invoice = await getDocumentWithRetry<Invoice>("invoices", body.invoiceId);
      if (!invoice) {
        return NextResponse.json(
          { ok: false, error: "Invoice not found" },
          { status: 404 }
        );
      }
      recipient = invoice.clientId
        ? await getDocumentWithRetry<User>("users", invoice.clientId)
        : null;
      const clientName = invoice.clientName || recipient?.name || "Cliente";
      const amountNum = typeof invoice.amount === "number" ? invoice.amount : 0;
      const amountDisplay = `$${amountNum.toFixed(2)}`;
      const payLink = `https://www.milapty.com/pay?invoice=${invoice.id}`;

      if (event === "invoice-sent") {
        emailData = {
          clientName,
          amount: amountDisplay,
          invoiceId: invoice.id,
          payLink,
        };
        whatsappData = {
          clientName,
          invoiceNumber: invoice.id,
          total: amountNum.toFixed(2),
          paymentLink: payLink,
        };
      } else {
        const transactionId =
          body.transactionId || invoice.paymentTransactionId || "";
        emailData = { clientName, amount: amountDisplay, transactionId };
        whatsappData = {
          clientName,
          amount: amountNum.toFixed(2),
          invoiceNumber: invoice.id,
          method:
            invoice.paymentMethod === "counter" ? "Pago en salón" : "Tarjeta",
        };
      }
      dedupeKey = `${event}:${invoice.id}`;
    }
  } catch (err) {
    console.error("[dispatch] Failed to resolve notification data:", err);
    return NextResponse.json(
      { ok: false, error: "Could not resolve notification data" },
      { status: 500 }
    );
  }

  if (isDuplicate(dedupeKey)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // ── Send on both channels ──
  let email: ChannelResult = "skipped";
  let whatsapp: ChannelResult = "skipped";

  if (recipient?.email && emailData) {
    try {
      const res = await sendEmail({
        to: recipient.email,
        template: event,
        data: emailData,
        language,
      });
      email = res.success ? "sent" : "failed";
    } catch (err) {
      console.error(`[dispatch] Email (${event}) failed:`, err);
      email = "failed";
    }
  }

  if (recipient?.phone && whatsappData) {
    try {
      const res = await sendWhatsApp({
        phone: recipient.phone,
        countryCode: recipient.countryCode || "+507",
        template: event,
        data: whatsappData,
        language,
      });
      whatsapp = res.success ? "sent" : "failed";
    } catch (err) {
      console.error(`[dispatch] WhatsApp (${event}) failed:`, err);
      whatsapp = "failed";
    }
  }

  return NextResponse.json({ ok: true, email, whatsapp });
}
