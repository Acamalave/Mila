// =============================================================================
// POST /api/payments/create-link
//
// Constructs a Paguelo Facil "LinkDeamon" hosted-checkout URL for the given
// invoice and returns it. The client is expected to redirect the customer to
// that URL — they enter card data on Paguelo Facil's PCI-compliant page (3D
// Secure is handled there), then get bounced back to RETURN_URL. The
// authoritative payment confirmation always comes via the webhook.
//
// Body: { invoiceId: string }
// Response: { linkUrl: string }
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { buildPaymentLinkUrl } from "@/lib/paguelofacil";
import { getDocument } from "@/lib/firestore";
import type { Invoice } from "@/types";

interface CreateLinkBody {
  invoiceId?: string;
}

function describeInvoice(invoice: Invoice): string {
  const d = invoice.description;
  if (typeof d === "string") return d;
  if (d && typeof d === "object") return d.es || d.en || "";
  return "";
}

export async function POST(request: NextRequest) {
  let body: CreateLinkBody;
  try {
    body = (await request.json()) as CreateLinkBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const invoiceId = body.invoiceId?.trim();
  if (!invoiceId) {
    return NextResponse.json(
      { success: false, error: "invoiceId is required" },
      { status: 400 }
    );
  }

  let invoice: Invoice | null = null;
  try {
    invoice = await getDocument<Invoice>("invoices", invoiceId);
  } catch (err) {
    console.error(`[create-link] Could not read invoice ${invoiceId}:`, err);
    return NextResponse.json(
      { success: false, error: "Could not load invoice" },
      { status: 500 }
    );
  }

  if (!invoice) {
    return NextResponse.json(
      { success: false, error: "Invoice not found" },
      { status: 404 }
    );
  }

  if (invoice.status === "paid") {
    return NextResponse.json(
      { success: false, error: "Invoice is already paid" },
      { status: 409 }
    );
  }

  if (typeof invoice.amount !== "number" || invoice.amount <= 0) {
    return NextResponse.json(
      { success: false, error: "Invoice has no valid amount" },
      { status: 400 }
    );
  }

  const description =
    describeInvoice(invoice) || `Factura ${invoiceId} - Mila Concept`;

  const origin = request.nextUrl.origin;
  const returnUrl = new URL("/api/payments/return", origin).toString();

  let linkUrl: string;
  try {
    linkUrl = buildPaymentLinkUrl({
      amount: invoice.amount,
      description,
      reference: invoiceId,
      returnUrl,
    });
  } catch (err) {
    console.error("[create-link] Failed to build payment link:", err);
    return NextResponse.json(
      { success: false, error: "Payment gateway is not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, linkUrl });
}
