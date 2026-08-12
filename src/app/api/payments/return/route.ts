// =============================================================================
// GET / POST /api/payments/return
//
// Paguelo Facil's hosted page (LinkDeamon) redirects the customer here after
// they finish paying. The query string echoes PARM_1 (our invoice id) plus the
// transaction result: Estado ("Aprobada"/"Denegada"), Oper (operation code),
// TotalPagado, etc.
//
// Paguelo Facil has no separately-configurable server-to-server webhook in the
// merchant panel for this account, so RETURN_URL is the authoritative moment we
// learn the outcome. Because these params arrive through the customer's browser
// (and could be spoofed), we DO NOT trust them blindly: we re-confirm the
// transaction server-side via Paguelo Facil's Consulta de Transacciones API
// before settling. When the lookup is approved (or, as a fallback, the redirect
// says approved AND the amount matches the invoice exactly), we hand the
// settlement to our own /api/payments/webhook — reusing all of its logic
// (mark paid, confirm booking deposits, generate commissions, notify) with the
// shared secret. Then we redirect the customer to their dashboard.
//
// Paguelo Facil typically issues a GET, but some configs POST, so we accept both.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/firestore";
import { queryTransactionByOper } from "@/lib/paguelofacil";
import type { Invoice } from "@/types";

function pick(fields: URLSearchParams, ...keys: string[]): string {
  for (const k of keys) {
    const v = fields.get(k);
    if (v) return v;
  }
  return "";
}

/** Forward a confirmed payment to our own webhook so all settlement logic
 *  (invoice → paid, booking deposit → confirmed, commissions, notifications)
 *  runs in one place. Returns true on a 2xx from the webhook. */
async function settleViaWebhook(
  origin: string,
  invoiceId: string,
  oper: string,
  amount: number
): Promise<boolean> {
  const secret = (process.env.PAGUELO_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    console.error("[payments/return] PAGUELO_WEBHOOK_SECRET not set — cannot settle");
    return false;
  }
  try {
    const res = await fetch(new URL("/api/payments/webhook", origin).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify({
        codOper: oper || `pgf-return-${Date.now()}`,
        status: "1", // approved → webhook maps to "paid"
        amount,
        reference: invoiceId,
        date: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[payments/return] settleViaWebhook failed:", err);
    return false;
  }
}

async function handle(request: NextRequest, fields: URLSearchParams) {
  const invoiceId = pick(
    fields,
    "PARM_1",
    "parm_1",
    "CARRY1",
    "carry1",
    "invoiceId",
    "reference"
  );

  const origin = request.nextUrl.origin;
  const dashboardUrl = new URL("/dashboard/appointments", origin);

  if (!invoiceId) {
    dashboardUrl.searchParams.set("pago", "desconocido");
    return NextResponse.redirect(dashboardUrl);
  }
  dashboardUrl.searchParams.set("invoice", invoiceId);

  // Result params from the redirect. These arrive through the CUSTOMER'S
  // browser and are therefore attacker-controlled — they may steer the UX
  // message but must NEVER, on their own, settle an invoice.
  const oper = pick(fields, "Oper", "oper", "codOper", "OPER", "CODOPER");
  const estado = pick(fields, "Estado", "estado", "RESPONSE", "status").toLowerCase();

  // Load the invoice to short-circuit if already paid.
  let invoice: Invoice | null = null;
  try {
    invoice = await getDocument<Invoice>("invoices", invoiceId);
  } catch (err) {
    console.warn(`[payments/return] could not read invoice ${invoiceId}:`, err);
  }

  if (invoice?.status === "paid") {
    dashboardUrl.searchParams.set("pago", "ok");
    return NextResponse.redirect(dashboardUrl);
  }

  const invoiceAmount = typeof invoice?.amount === "number" ? invoice.amount : null;

  // ── Server-side verification (the ONLY thing that can settle) ──
  // We settle exclusively on Paguelo Facil's own record of the transaction,
  // looked up by operation code with our secret token. Without a verifiable
  // `Oper` there is nothing to confirm, so we never settle from the redirect
  // params alone — that fallback let anyone with an invoice id + amount mark
  // it paid by hitting this URL with no Oper.
  const lookup = oper ? await queryTransactionByOper(oper) : null;

  // The amount must match Paguelo Facil's recorded amount for the transaction.
  // We do NOT fall back to the browser-supplied TotalPagado here.
  const amountMatches =
    invoiceAmount == null ||
    (lookup?.amount != null && Math.abs(lookup.amount - invoiceAmount) <= 0.01);

  let outcome: "ok" | "error" | "pendiente";

  if (lookup?.declined || estado === "denegada" || estado === "rechazada") {
    outcome = "error";
  } else if (lookup?.approved && amountMatches) {
    // Verified approved by Paguelo Facil AND the amount checks out.
    const settled = await settleViaWebhook(
      origin,
      invoiceId,
      oper,
      lookup.amount ?? invoiceAmount ?? 0
    );
    outcome = settled ? "ok" : "pendiente";
  } else {
    // Could not verify the payment server-side (no Oper, lookup inconclusive,
    // amount mismatch, or approved-but-amount-off). Leave the invoice untouched
    // for manual review rather than trusting the browser. The webhook, if it
    // later arrives, is the other authoritative settlement path.
    if (lookup?.approved && !amountMatches) {
      console.warn(
        `[payments/return] Amount mismatch for ${invoiceId}: PF ${lookup.amount} vs invoice ${invoiceAmount} — not settling.`
      );
    }
    outcome = "pendiente";
  }

  dashboardUrl.searchParams.set("pago", outcome);
  return NextResponse.redirect(dashboardUrl);
}

export async function GET(request: NextRequest) {
  return handle(request, request.nextUrl.searchParams);
}

export async function POST(request: NextRequest) {
  let form: URLSearchParams;
  try {
    const text = await request.text();
    form = new URLSearchParams(text);
  } catch {
    form = new URLSearchParams();
  }
  // Merge with URL params so fields from either source are picked up.
  for (const [k, v] of request.nextUrl.searchParams.entries()) {
    if (!form.has(k)) form.append(k, v);
  }
  return handle(request, form);
}
