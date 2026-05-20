import { NextRequest, NextResponse } from "next/server";
import { processCardPayment, type CardPaymentRequest } from "@/lib/paguelofacil";
import { getDocument, setDocument } from "@/lib/firestore";
import type { Invoice } from "@/types";

// ---------------------------------------------------------------------------
// POST /api/payments/process
// ---------------------------------------------------------------------------

interface ProcessPaymentBody {
  amount: number;
  description: string;
  clientName: string;
  /** Optional explicit split; preferred over `clientName` when present. */
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail: string;
  clientPhone: string;
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvv: string;
  invoiceId?: string;
  idempotencyKey?: string;
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

// ---------------------------------------------------------------------------
// In-memory idempotency cache
// ---------------------------------------------------------------------------
// Survives within a single warm Lambda instance (not across cold starts) —
// enough to dedupe a double-clicked Pay button in one session. An in-flight
// entry lets a concurrent retry await the original charge instead of issuing
// a second one. Move to Firestore/Redis for cross-instance guarantees.

type Settled = { response: unknown; status: number };
interface CacheEntry {
  expires: number;
  response?: unknown;
  status?: number;
  inFlight?: Promise<Settled>;
}

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

const idempotencyCache: Map<string, CacheEntry> =
  (globalThis as unknown as { __milaIdempotencyCache?: Map<string, CacheEntry> })
    .__milaIdempotencyCache ?? new Map<string, CacheEntry>();
(globalThis as unknown as { __milaIdempotencyCache?: Map<string, CacheEntry> })
  .__milaIdempotencyCache = idempotencyCache;

function pruneIdempotencyCache(): void {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (entry.expires < now) idempotencyCache.delete(key);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessPaymentBody = await request.json();

    // Idempotency key — accepted from the JSON body or the Idempotency-Key header.
    const idempotencyKey =
      body.idempotencyKey || request.headers.get("idempotency-key")?.trim() || "";

    if (idempotencyKey) {
      pruneIdempotencyCache();
      const cached = idempotencyCache.get(idempotencyKey);
      if (cached) {
        // A charge with this key is still running — await it rather than
        // issuing a second one (guards against a fast double-click).
        if (cached.inFlight) {
          const settled = await cached.inFlight;
          return NextResponse.json(settled.response, { status: settled.status });
        }
        return NextResponse.json(cached.response, { status: cached.status ?? 200 });
      }
    }

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

    // --- Invoice amount verification ------------------------------------------
    // When the payment references a real invoice, the charged amount must match
    // the invoice total. This stops a tampered client from settling a large
    // invoice with a small charge, or re-charging an already-paid invoice.
    // (Booking deposits use a synthetic invoiceId with no invoice doc — those
    // simply skip this check.)
    if (body.invoiceId) {
      let invoice: Invoice | null = null;
      try {
        invoice = await getDocument<Invoice>("invoices", body.invoiceId);
      } catch (err) {
        console.warn(
          `[API] /api/payments/process: could not read invoice ${body.invoiceId}:`,
          err
        );
      }
      if (invoice) {
        if (invoice.status === "paid") {
          return NextResponse.json(
            { success: false, error: "Invoice is already paid" },
            { status: 409 }
          );
        }
        if (
          typeof invoice.amount === "number" &&
          Math.abs(invoice.amount - body.amount) > 0.01
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "Payment amount does not match the invoice total",
            },
            { status: 400 }
          );
        }
      }
    }

    // --- Process payment ------------------------------------------------------
    const paymentReq: CardPaymentRequest = {
      amount: body.amount,
      description: body.description,
      clientName: body.clientName,
      clientFirstName: body.clientFirstName,
      clientLastName: body.clientLastName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone,
      cardNumber: body.cardNumber,
      cardExpMonth: body.cardExpMonth,
      cardExpYear: body.cardExpYear,
      cardCvv: body.cardCvv,
      invoiceId: body.invoiceId,
    };

    // Register an in-flight entry so concurrent retries with the same key
    // await this charge instead of starting a second one.
    let resolveInFlight: (v: Settled) => void = () => {};
    if (idempotencyKey) {
      const inFlight = new Promise<Settled>((resolve) => {
        resolveInFlight = resolve;
      });
      idempotencyCache.set(idempotencyKey, {
        expires: Date.now() + IDEMPOTENCY_TTL_MS,
        inFlight,
      });
    }

    try {
      const result = await processCardPayment(paymentReq);

      let responseBody: unknown;
      let statusCode: number;

      if (!result.success) {
        // Distinguish: missing email → 400 (client must collect a real email),
        // gateway error → 500, decline → 402.
        if (result.status === "INVALID_EMAIL") statusCode = 400;
        else statusCode = result.status === "ERROR" ? 500 : 402;
        responseBody = {
          success: false,
          error: result.message,
          status: result.status,
          transactionId: result.transactionId,
        };

        // Persist the full gateway response for forensic review. We can't
        // tell from Paguelo Facil's terse "Rejected transaction" message why
        // a charge failed; the raw body sometimes includes the bank's actual
        // decline code. Fire-and-forget so a Firestore hiccup never blocks
        // the API response. Skip for INVALID_EMAIL (no gateway round-trip).
        if (result.status !== "INVALID_EMAIL" && result.rawResponse) {
          const debugId = `pf-debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          setDocument("paymentDebug", debugId, {
            createdAt: new Date().toISOString(),
            invoiceId: body.invoiceId ?? null,
            amount: body.amount,
            cardLast4: body.cardNumber.slice(-4),
            status: result.status,
            message: result.message,
            transactionId: result.transactionId,
            rawResponse: result.rawResponse,
          }).catch((err) =>
            console.warn("[API] paymentDebug write failed:", err)
          );
        }
      } else {
        statusCode = 200;
        responseBody = {
          success: true,
          transactionId: result.transactionId,
          status: result.status,
          message: result.message,
        };
      }

      // Cache the outcome (success and decline alike) so a retry does not re-charge.
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, {
          expires: Date.now() + IDEMPOTENCY_TTL_MS,
          response: responseBody,
          status: statusCode,
        });
      }
      resolveInFlight({ response: responseBody, status: statusCode });

      return NextResponse.json(responseBody, { status: statusCode });
    } catch (innerErr) {
      // Drop the entry so a genuine retry isn't blocked by a stale promise.
      if (idempotencyKey) idempotencyCache.delete(idempotencyKey);
      resolveInFlight({
        response: { success: false, error: "Internal server error" },
        status: 500,
      });
      throw innerErr;
    }
  } catch (error: unknown) {
    console.error("[API] /api/payments/process error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
