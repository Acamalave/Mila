// =============================================================================
// GET /api/payments/debug
//
// Read-only forensic endpoint for inspecting the Paguelo Facil rejection
// payloads we persist under `paymentDebug`. Restricted by the same
// INTERNAL_API_SECRET that guards our notification routes — never expose
// without that header.
//
// Returns the most recent N entries (default 5, max 20), each containing the
// full raw gateway response that came back with the decline.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/firestore";
import { isInternalRequestAuthorized } from "@/lib/internal-auth";

interface PaymentDebugDoc {
  createdAt?: string;
  invoiceId?: string | null;
  amount?: number;
  cardLast4?: string;
  status?: string;
  message?: string;
  transactionId?: string | null;
  rawResponse?: unknown;
}

export async function GET(request: NextRequest) {
  if (!isInternalRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "5");
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 5, 1), 20);

  try {
    const all = await getCollection<PaymentDebugDoc>("paymentDebug");
    // Sort newest first by ISO timestamp.
    all.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return NextResponse.json({
      count: all.length,
      returned: Math.min(limit, all.length),
      entries: all.slice(0, limit),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
