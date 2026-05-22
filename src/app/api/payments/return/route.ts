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

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? null : n;
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

  // Result params from the redirect.
  const oper = pick(fields, "Oper", "oper", "codOper", "OPER", "CODOPER");
  const estado = pick(fields, "Estado", "estado", "RESPONSE", "status").toLowerCase();
  const totalPagado = parseAmount(pick(fields, "TotalPagado", "totalPagado", "Total", "CMTN"));
  const paramsSayApproved =
    totalPagado != null && totalPagado > 0 && estado !== "denegada" && estado !== "rechazada" && estado !== "0";

  // Load the invoice for the amount check and to short-circuit if already paid.
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

  // ── Server-side verification (authoritative) ──
  const lookup = oper ? await queryTransactionByOper(oper) : null;

  // Pick the amount to validate against: prefer PF's recorded amount, fall back
  // to the redirect's TotalPagado.
  const effectiveAmount = lookup?.amount ?? totalPagado;
  const amountMatches =
    invoiceAmount == null ||
    (effectiveAmount != null && Math.abs(effectiveAmount - invoiceAmount) <= 0.01);

  let outcome: "ok" | "error" | "pendiente";

  if (lookup?.declined || estado === "denegada" || estado === "rechazada") {
    outcome = "error";
  } else if (lookup?.approved && amountMatches) {
    // Strongest signal: PF's own record says approved and the amount checks out.
    const settled = await settleViaWebhook(origin, invoiceId, oper, effectiveAmount ?? invoiceAmount ?? 0);
    outcome = settled ? "ok" : "pendiente";
  } else if (lookup === null && paramsSayApproved && amountMatches) {
    // Lookup was inconclusive (network / unknown shape). Fall back to the
    // redirect params, but only when the amount matches the invoice exactly.
    console.warn(
      `[payments/return] Settling invoice ${invoiceId} from RETURN_URL params (lookup inconclusive). oper=${oper} amount=${effectiveAmount}`
    );
    const settled = await settleViaWebhook(origin, invoiceId, oper, effectiveAmount ?? invoiceAmount ?? 0);
    outcome = settled ? "ok" : "pendiente";
  } else {
    // Not confirmed approved — leave the invoice as-is for review.
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
