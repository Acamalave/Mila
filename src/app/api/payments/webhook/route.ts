import { NextRequest, NextResponse } from "next/server";
import { setDocument } from "@/lib/firestore";

// ---------------------------------------------------------------------------
// POST /api/payments/webhook
//
// Receives payment status updates from Paguelo Facil.
// Updates the invoice status in Firestore so real-time listeners pick it up.
// Returns 200 immediately so the gateway does not retry.
// ---------------------------------------------------------------------------

interface WebhookPayload {
  codOper?: string;
  status?: string;
  amount?: string | number;
  reference?: string;
  date?: string;
  [key: string]: unknown;
}

// Map Paguelo Facil statuses to our internal representation
function mapStatus(pgfStatus: string | undefined): "paid" | "failed" | null {
  if (!pgfStatus) return null;
  const normalized = pgfStatus.toUpperCase();
  if (normalized === "APROBADA" || normalized === "APPROVED" || normalized === "1") return "paid";
  if (
    normalized === "DECLINADA" ||
    normalized === "DECLINED" ||
    normalized === "RECHAZADA" ||
    normalized === "FAILED" ||
    normalized === "0" ||
    normalized === "2"
  ) return "failed";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();

    console.log("[Webhook] Paguelo Facil payment update received:", {
      codOper: payload.codOper ?? "N/A",
      status: payload.status ?? "N/A",
      amount: payload.amount ?? "N/A",
      reference: payload.reference ?? "N/A",
      date: payload.date ?? "N/A",
    });

    const invoiceId = payload.reference;
    const mappedStatus = mapStatus(payload.status);

    if (invoiceId && mappedStatus === "paid") {
      const paidAt = new Date().toISOString();
      const transactionId = payload.codOper || `pgf-${Date.now()}`;

      // Update invoice in Firestore — real-time listeners will sync to clients
      await setDocument("invoices", invoiceId, {
        status: "paid",
        paidAt,
        paymentTransactionId: transactionId,
      });

      // Record the payment transaction
      await setDocument("payments", transactionId, {
        invoiceId,
        status: "completed",
        amount: payload.amount,
        gateway: "paguelofacil",
        rawWebhook: payload,
        createdAt: paidAt,
      });

      console.log(`[Webhook] Invoice ${invoiceId} marked as paid (txn: ${transactionId})`);
    } else if (invoiceId && mappedStatus === "failed") {
      // Gateway declined the card — record the failed attempt but leave invoice as "sent" so client can retry
      const failedAt = new Date().toISOString();
      const transactionId = payload.codOper || `pgf-failed-${Date.now()}`;

      await setDocument("payments", transactionId, {
        invoiceId,
        status: "failed",
        amount: payload.amount,
        gateway: "paguelofacil",
        rawWebhook: payload,
        createdAt: failedAt,
      });

      console.log(`[Webhook] Payment declined for invoice ${invoiceId} (txn: ${transactionId}) — invoice remains "sent" for retry`);
    } else {
      console.log("[Webhook] No actionable status update — skipped.");
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    // Always return 200 to prevent the gateway from retrying on parse errors.
    console.error("[Webhook] Error processing Paguelo Facil webhook:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
