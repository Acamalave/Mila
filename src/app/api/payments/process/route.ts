import { NextRequest, NextResponse } from "next/server";
import { processCardPayment, type CardPaymentRequest } from "@/lib/paguelofacil";

// ---------------------------------------------------------------------------
// POST /api/payments/process
// ---------------------------------------------------------------------------

interface ProcessPaymentBody {
  amount: number;
  description: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvv: string;
  invoiceId?: string;
}

const REQUIRED_FIELDS: (keyof ProcessPaymentBody)[] = [
  "amount",
  "description",
  "clientName",
  "clientEmail",
  "clientPhone",
  "cardNumber",
  "cardExpMonth",
  "cardExpYear",
  "cardCvv",
];

// In-memory idempotency cache. Survives within a single Lambda warm instance,
// not across cold starts — good enough to dedupe a double-clicked Pay button
// inside a single user session. Persist to Firestore for cross-instance reuse
// if/when this becomes a problem.
const idempotencyCache = new Map<string, { expires: number; response: unknown; status: number }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

function pruneIdempotencyCache(): void {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (entry.expires < now) idempotencyCache.delete(key);
  }
}

export async function POST(request: NextRequest) {
  try {
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (idempotencyKey) {
      pruneIdempotencyCache();
      const cached = idempotencyCache.get(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached.response, { status: cached.status });
      }
    }

    const body: ProcessPaymentBody = await request.json();

    // --- Validation -----------------------------------------------------------
    const missing = REQUIRED_FIELDS.filter(
      (field) => body[field] === undefined || body[field] === null || body[field] === ""
    );

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // --- Process payment ------------------------------------------------------
    const paymentReq: CardPaymentRequest = {
      amount: body.amount,
      description: body.description,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      cardNumber: body.cardNumber,
      cardExpMonth: body.cardExpMonth,
      cardExpYear: body.cardExpYear,
      cardCvv: body.cardCvv,
      invoiceId: body.invoiceId,
    };

    const result = await processCardPayment(paymentReq);

    if (!result.success) {
      // 402 Payment Required for declined / gateway-level failures
      const statusCode = result.status === "ERROR" ? 500 : 402;
      const errorPayload = {
        success: false,
        error: result.message,
        status: result.status,
        transactionId: result.transactionId,
      };
      // Cache failures too — a double-click after a decline shouldn't re-charge
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, {
          expires: Date.now() + IDEMPOTENCY_TTL_MS,
          response: errorPayload,
          status: statusCode,
        });
      }
      return NextResponse.json(errorPayload, { status: statusCode });
    }

    const successPayload = {
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      message: result.message,
    };
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        expires: Date.now() + IDEMPOTENCY_TTL_MS,
        response: successPayload,
        status: 200,
      });
    }
    return NextResponse.json(successPayload);
  } catch (error: unknown) {
    console.error("[API] /api/payments/process error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
