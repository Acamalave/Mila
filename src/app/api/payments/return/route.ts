// =============================================================================
// GET /api/payments/return
//
// The Paguelo Facil hosted page redirects here after the customer finishes
// paying. The query string echoes back PARM_1 (the invoice id) plus some
// gateway-specific fields like OPER / RESPONSE / CODOPER.
//
// This route is a UX-only redirect — the webhook is the source of truth for
// the payment status. We peek at Firestore in case the webhook already landed
// and pass a status flag in the query string so the dashboard can render the
// right toast.
//
// Paguelo Facil typically issues a GET, but some configurations POST instead,
// so we accept both.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/firestore";
import type { Invoice } from "@/types";

async function handle(request: NextRequest, fields: URLSearchParams) {
  const invoiceId =
    fields.get("PARM_1") ||
    fields.get("parm_1") ||
    fields.get("CARRY1") ||
    fields.get("carry1") ||
    fields.get("invoiceId") ||
    fields.get("reference") ||
    "";

  const dashboardUrl = new URL("/dashboard/appointments", request.nextUrl.origin);

  if (!invoiceId) {
    dashboardUrl.searchParams.set("pago", "desconocido");
    return NextResponse.redirect(dashboardUrl);
  }

  dashboardUrl.searchParams.set("invoice", invoiceId);

  let invoice: Invoice | null = null;
  try {
    invoice = await getDocument<Invoice>("invoices", invoiceId);
  } catch (err) {
    console.warn(`[payments/return] could not read invoice ${invoiceId}:`, err);
  }

  if (invoice?.status === "paid") {
    dashboardUrl.searchParams.set("pago", "ok");
  } else if (invoice?.status === "declined") {
    dashboardUrl.searchParams.set("pago", "error");
  } else {
    // Webhook hasn't arrived yet (very common — it can lag a few seconds).
    dashboardUrl.searchParams.set("pago", "pendiente");
  }

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
  // Merge with URL params so PARM_1 from either source is picked up.
  for (const [k, v] of request.nextUrl.searchParams.entries()) {
    if (!form.has(k)) form.append(k, v);
  }
  return handle(request, form);
}
