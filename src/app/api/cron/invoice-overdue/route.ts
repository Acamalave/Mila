// =============================================================================
// GET /api/cron/invoice-overdue
// Vercel Cron — runs daily at 09:00 (see vercel.json)
// Flags any "sent" invoice whose sentAt is more than 14 days ago as "overdue"
// and dispatches a reminder email + WhatsApp to the client.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { internalAuthHeaders } from "@/lib/internal-auth";

const OVERDUE_DAYS = 14;

interface InvoiceDoc {
  id: string;
  clientId: string;
  clientName?: string;
  amount: number;
  status: string;
  sentAt?: string;
  createdAt?: string;
  overdueAt?: string;
}

interface UserDoc {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  countryCode?: string;
}

export async function GET(request: NextRequest) {
  // ── Auth: verify Vercel CRON_SECRET (fail-closed) ──
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    // ── Query all "sent" invoices ──
    const invoicesRef = collection(db, "invoices");
    const q = query(invoicesRef, where("status", "==", "sent"));
    const snap = await getDocs(q);

    const now = Date.now();
    const overdueMs = OVERDUE_DAYS * 24 * 60 * 60 * 1000;

    const candidateInvoices: InvoiceDoc[] = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as InvoiceDoc)
      .filter((inv) => {
        // Already flagged overdue once before (then resent) — do not
        // re-flag and re-spam the client on every subsequent run.
        if (inv.overdueAt) return false;
        const reference = inv.sentAt ?? inv.createdAt;
        if (!reference) return false;
        const ts = new Date(reference).getTime();
        if (Number.isNaN(ts)) return false;
        return now - ts >= overdueMs;
      });

    if (candidateInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        flagged: 0,
        message: "No invoices to flag as overdue.",
      });
    }

    // ── Load user registry from Firestore ──
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap = new Map<string, UserDoc>();
    for (const d of usersSnap.docs) {
      const user = { id: d.id, ...d.data() } as UserDoc;
      usersMap.set(user.id, user);
    }

    const overdueAt = new Date().toISOString();
    const results: Array<{
      invoiceId: string;
      clientId: string;
      flagged: boolean;
      email: boolean;
      whatsapp: boolean;
      daysOverdue: number;
    }> = [];

    for (const invoice of candidateInvoices) {
      const client = usersMap.get(invoice.clientId);
      const clientName = invoice.clientName || client?.name || "";
      const amount = `$${(invoice.amount ?? 0).toFixed(2)}`;
      const paymentLink = `https://milaconcept.com/pay?invoice=${invoice.id}`;

      // Calculate days overdue for messaging
      const reference = invoice.sentAt ?? invoice.createdAt!;
      const daysElapsed = Math.floor(
        (now - new Date(reference).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Update status in Firestore
      let flagged = false;
      try {
        await setDoc(
          doc(db, "invoices", invoice.id),
          { status: "overdue", overdueAt },
          { merge: true }
        );
        flagged = true;
      } catch (err) {
        console.error(
          `[cron/invoice-overdue] Failed to update invoice ${invoice.id}:`,
          err
        );
      }

      let emailSent = false;
      let whatsappSent = false;

      // Email notification
      if (client?.email) {
        try {
          const res = await fetch(
            new URL("/api/notifications/email", request.url).toString(),
            {
              method: "POST",
              headers: { "Content-Type": "application/json", ...internalAuthHeaders() },
              body: JSON.stringify({
                to: client.email,
                template: "invoice-overdue",
                data: {
                  clientName,
                  amount,
                  invoiceId: invoice.id,
                  payLink: paymentLink,
                  daysOverdue: daysElapsed,
                },
                language: "es",
              }),
            }
          );
          emailSent = res.ok;
        } catch (err) {
          console.error(
            `[cron/invoice-overdue] Email failed for invoice ${invoice.id}:`,
            err
          );
        }
      }

      // WhatsApp notification
      if (client?.phone) {
        try {
          const res = await fetch(
            new URL("/api/notifications/whatsapp", request.url).toString(),
            {
              method: "POST",
              headers: { "Content-Type": "application/json", ...internalAuthHeaders() },
              body: JSON.stringify({
                phone: client.phone,
                countryCode: client.countryCode || "+507",
                template: "invoice-overdue",
                data: {
                  clientName,
                  amount,
                  invoiceId: invoice.id,
                  paymentLink,
                  daysOverdue: String(daysElapsed),
                },
                language: "es",
              }),
            }
          );
          whatsappSent = res.ok;
        } catch (err) {
          console.error(
            `[cron/invoice-overdue] WhatsApp failed for invoice ${invoice.id}:`,
            err
          );
        }
      }

      results.push({
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        flagged,
        email: emailSent,
        whatsapp: whatsappSent,
        daysOverdue: daysElapsed,
      });
    }

    return NextResponse.json({
      success: true,
      flagged: results.filter((r) => r.flagged).length,
      total: results.length,
      results,
    });
  } catch (err) {
    console.error("[cron/invoice-overdue] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
