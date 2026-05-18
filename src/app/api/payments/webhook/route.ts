// =============================================================================
// POST /api/payments/webhook
//
// Receives payment status updates from Paguelo Facil.
// Updates the invoice status in Firestore so real-time listeners pick it up,
// records the transaction, and notifies the client. Returns 200 immediately so
// the gateway does not retry (except on failed authentication → 401).
//
// Authentication
// --------------
// Paguelo Facil does not sign webhook bodies; the only proof of origin is
// either (a) a shared-secret query param / header configured in the merchant
// dashboard, or (b) the source IP. We check both, configurable via env:
//   PAGUELO_WEBHOOK_SECRET — required, sent as `?secret=…` or `X-Webhook-Secret`
//   PAGUELO_WEBHOOK_IPS    — optional comma-separated allow-list of source IPs
// Without a secret configured we refuse every request (fail-closed) so a
// misconfiguration can never let an attacker mark invoices as paid.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { setDocument, getDocument } from "@/lib/firestore";
import { internalAuthHeaders } from "@/lib/internal-auth";
import type { Invoice } from "@/types";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const expectedSecret = (process.env.PAGUELO_WEBHOOK_SECRET ?? "").trim();
  if (!expectedSecret) {
    console.error(
      "[Webhook] PAGUELO_WEBHOOK_SECRET is not set — refusing all webhook updates"
    );
    return false;
  }

  const headerSecret =
    request.headers.get("x-webhook-secret")?.trim() ||
    request.headers.get("x-paguelo-token")?.trim();
  const querySecret = request.nextUrl.searchParams.get("secret")?.trim();
  const provided = headerSecret || querySecret || "";
  if (provided !== expectedSecret) return false;

  const allowList = (process.env.PAGUELO_WEBHOOK_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (allowList.length === 0) return true;

  const sourceIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    "";
  return allowList.includes(sourceIp);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookPayload {
  codOper?: string;
  status?: string;
  amount?: string | number;
  reference?: string;
  referenceNumber?: string;
  CREF?: string;
  CREFN?: string;
  invoiceId?: string;
  date?: string;
  authCode?: string;
  [key: string]: unknown;
}

type NormalizedStatus = "paid" | "declined" | "pending" | "refunded" | null;

interface UserDoc {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map Paguelo Facil statuses to our internal representation. */
function mapStatus(pgfStatus: string | undefined): NormalizedStatus {
  if (!pgfStatus) return null;
  const normalized = String(pgfStatus).toUpperCase();

  if (
    normalized === "APROBADA" ||
    normalized === "APPROVED" ||
    normalized === "COMPLETED" ||
    normalized === "1"
  ) {
    return "paid";
  }

  if (
    normalized === "DECLINADA" ||
    normalized === "DECLINED" ||
    normalized === "RECHAZADA" ||
    normalized === "FAILED" ||
    normalized === "ERROR" ||
    normalized === "0" ||
    normalized === "2"
  ) {
    return "declined";
  }

  if (normalized === "PENDING" || normalized === "PENDIENTE") {
    return "pending";
  }

  if (
    normalized === "REFUNDED" ||
    normalized === "REFUND" ||
    normalized === "REEMBOLSADA" ||
    normalized === "REVERSED"
  ) {
    return "refunded";
  }

  return null;
}

/** Pull the invoice id from whatever field Paguelo Facil sent it in. */
function extractInvoiceId(payload: WebhookPayload): string | undefined {
  return (
    payload.reference ||
    payload.referenceNumber ||
    payload.CREF ||
    payload.CREFN ||
    payload.invoiceId
  );
}

/** Parse a webhook amount (string | number | undefined) into a number, or null. */
function parseAmount(raw: string | number | undefined): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Fire off an email notification to the client. Fire-and-forget. */
function notifyEmail(
  origin: string,
  to: string,
  template: "payment-confirmed" | "payment-declined",
  data: Record<string, string>
): void {
  void fetch(new URL("/api/notifications/email", origin).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...internalAuthHeaders() },
    body: JSON.stringify({ to, template, data, language: "es" }),
  }).catch((err) => {
    console.warn(`[Webhook] Email (${template}) dispatch failed:`, err);
  });
}

/** Fire off a WhatsApp notification to the client. Fire-and-forget. */
function notifyWhatsApp(
  origin: string,
  phone: string,
  countryCode: string,
  template: "payment-confirmed" | "payment-declined",
  data: Record<string, string>
): void {
  void fetch(new URL("/api/notifications/whatsapp", origin).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...internalAuthHeaders() },
    body: JSON.stringify({ phone, countryCode, template, data, language: "es" }),
  }).catch((err) => {
    console.warn(`[Webhook] WhatsApp (${template}) dispatch failed:`, err);
  });
}

/** Safely convert amount (string | number | undefined) to a formatted dollar string. */
function formatAmount(raw: string | number | undefined, fallback?: number): string {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? parseFloat(raw)
        : NaN;
  if (!Number.isNaN(n) && n > 0) return `$${n.toFixed(2)}`;
  if (fallback != null) return `$${fallback.toFixed(2)}`;
  return "$0.00";
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // ── Auth check ──
  if (!isAuthorized(request)) {
    console.error("[Webhook] Unauthorized webhook request");
    return NextResponse.json({ received: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch (err) {
    console.error("[Webhook] Failed to parse webhook JSON:", err);
    // Always 200 so Paguelo Facil does not retry on parse errors
    return NextResponse.json({ received: true, error: "invalid_json" }, { status: 200 });
  }

  console.log("[Webhook] Paguelo Facil payment update received:", {
    codOper: payload.codOper ?? "N/A",
    status: payload.status ?? "N/A",
    amount: payload.amount ?? "N/A",
    reference: extractInvoiceId(payload) ?? "N/A",
    date: payload.date ?? "N/A",
    authCode: payload.authCode ?? "N/A",
  });

  const invoiceId = extractInvoiceId(payload);
  const mappedStatus = mapStatus(payload.status);
  const nowIso = new Date().toISOString();

  if (!invoiceId) {
    console.warn("[Webhook] No invoice reference in payload — cannot update invoice");
    return NextResponse.json({ received: true, note: "missing_reference" }, { status: 200 });
  }

  if (!mappedStatus) {
    console.log(`[Webhook] Unknown status "${payload.status ?? "(none)"}" — skipping.`);
    return NextResponse.json({ received: true, note: "unknown_status" }, { status: 200 });
  }

  // Fetch invoice (best effort).
  let invoice: Invoice | null = null;
  try {
    invoice = await getDocument<Invoice>("invoices", invoiceId);
  } catch (err) {
    console.warn(
      `[Webhook] Could not read invoice ${invoiceId} from Firestore (will still try to update):`,
      err
    );
  }

  // Look up client (if any) so we can notify them
  let client: UserDoc | null = null;
  if (invoice?.clientId) {
    try {
      client = await getDocument<UserDoc>("users", invoice.clientId);
    } catch (err) {
      console.warn(`[Webhook] Could not read user ${invoice.clientId}:`, err);
    }
  }

  const clientName = client?.name || invoice?.clientName || "Cliente";
  const amountDisplay = formatAmount(payload.amount, invoice?.amount);
  const transactionId =
    payload.codOper || payload.authCode || `pgf-${mappedStatus}-${Date.now()}`;
  const origin = request.nextUrl.origin;

  // ── Branch on mapped status ──
  try {
    if (mappedStatus === "paid") {
      // Verify the webhook-reported amount matches the invoice amount before
      // trusting a "paid" status. A mismatch means the payload was tampered
      // with or refers to a different charge — never mark such an invoice paid.
      if (invoice && typeof invoice.amount === "number") {
        const reported = parseAmount(payload.amount);
        if (reported !== null && Math.abs(reported - invoice.amount) > 0.01) {
          console.error(
            `[Webhook] Amount mismatch for invoice ${invoiceId}: webhook reported ${reported}, invoice expects ${invoice.amount}. Refusing to mark as paid.`
          );
          return NextResponse.json(
            { received: true, note: "amount_mismatch", invoiceId },
            { status: 200 }
          );
        }
      }

      // 1. Update invoice → "paid"
      await setDocument("invoices", invoiceId, {
        status: "paid",
        paidAt: nowIso,
        paymentTransactionId: transactionId,
      });

      // 2. Record transaction
      await setDocument("payments", transactionId, {
        invoiceId,
        status: "completed",
        amount: payload.amount,
        gateway: "paguelofacil",
        authCode: payload.authCode ?? null,
        rawWebhook: payload as Record<string, unknown>,
        createdAt: nowIso,
      });

      console.log(
        `[Webhook] Invoice ${invoiceId} marked as paid (txn: ${transactionId})`
      );

      // 3. Notify client — fire-and-forget via the dispatch route. The route's
      //    shared dedupe prevents a duplicate confirmation when the client-side
      //    payment flow also marks the same invoice as paid.
      void fetch(new URL("/api/notifications/dispatch", origin).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "payment-confirmed", invoiceId, transactionId }),
      }).catch((err) =>
        console.warn("[Webhook] payment-confirmed dispatch failed:", err)
      );
    } else if (mappedStatus === "declined") {
      // Only transition to "declined" if the invoice was in a valid prior state.
      const canTransition =
        !invoice ||
        invoice.status === "sent" ||
        invoice.status === "overdue" ||
        invoice.status === "draft";

      if (canTransition) {
        await setDocument("invoices", invoiceId, {
          status: "declined",
          declinedAt: nowIso,
        });
      } else {
        console.warn(
          `[Webhook] Skipping invoice status transition — current status "${invoice?.status}" cannot move to "declined".`
        );
      }

      // Record the failed transaction attempt
      await setDocument("payments", transactionId, {
        invoiceId,
        status: "failed",
        amount: payload.amount,
        gateway: "paguelofacil",
        authCode: payload.authCode ?? null,
        rawWebhook: payload as Record<string, unknown>,
        createdAt: nowIso,
      });

      console.log(
        `[Webhook] Payment declined for invoice ${invoiceId} (txn: ${transactionId})`
      );

      // Notify client — fire-and-forget
      if (client?.email) {
        notifyEmail(origin, client.email, "payment-declined", {
          clientName,
          amount: amountDisplay,
          invoiceId,
          reason: String(payload.status ?? "Payment declined"),
          retryLink: `https://milaconcept.com/pay?invoice=${invoiceId}`,
        });
      }
      if (client?.phone) {
        notifyWhatsApp(
          origin,
          client.phone,
          client.countryCode || "+507",
          "payment-declined",
          {
            clientName,
            amount: String(payload.amount ?? invoice?.amount ?? "0.00"),
            invoiceId,
            reason: String(payload.status ?? ""),
            retryLink: `https://milaconcept.com/pay?invoice=${invoiceId}`,
          }
        );
      }
    } else if (mappedStatus === "pending") {
      // Payment still processing — nothing to update, just log.
      console.log(
        `[Webhook] Payment still pending for invoice ${invoiceId} — no action taken.`
      );
    } else if (mappedStatus === "refunded") {
      // We don't have a first-class "refunded" invoice status, so we fall back to
      // "declined" + a note, and record a refund transaction separately.
      await setDocument("invoices", invoiceId, {
        status: "declined",
        declinedAt: nowIso,
        refundedAt: nowIso,
      });

      await setDocument("payments", transactionId, {
        invoiceId,
        status: "refunded",
        amount: payload.amount,
        gateway: "paguelofacil",
        authCode: payload.authCode ?? null,
        rawWebhook: payload as Record<string, unknown>,
        createdAt: nowIso,
      });

      console.log(`[Webhook] Invoice ${invoiceId} refunded (txn: ${transactionId})`);

      // Notify client via the "payment-declined" template — closest fit.
      if (client?.email) {
        notifyEmail(origin, client.email, "payment-declined", {
          clientName,
          amount: amountDisplay,
          invoiceId,
          reason: "Reembolsado / Refunded",
        });
      }
    }
  } catch (err) {
    // Firestore or notification failures should not cause retries — log loudly
    // but still return 200.
    console.error(
      `[Webhook] Error processing Paguelo Facil webhook for invoice ${invoiceId}:`,
      err
    );
  }

  return NextResponse.json(
    {
      received: true,
      invoiceId,
      status: mappedStatus,
      transactionId,
    },
    { status: 200 }
  );
}
