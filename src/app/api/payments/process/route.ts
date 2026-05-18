import { NextRequest, NextResponse } from "next/server";
import { processCardPayment, type CardPaymentRequest } from "@/lib/paguelofacil";
import { getDocument } from "@/lib/firestore";
import type { Invoice } from "@/types";

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
// Keys live for 15 minutes. Any duplicate key received within 60 seconds of
// the original request reuses the cached response (rather than re-charging
// the gateway). After 60 seconds the cache is considered "stale" and a new
// charge will go through, but the key is still held for 15 min to prevent
// accidental replays. This guards against double-clicks and retries.

interface CachedEntry {
  response: unknown;
  status: number;
  createdAt: number;
  inFlight?: Promise<{ response: unknown; status: number }>;
}

const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000; // 15 min
const IDEMPOTENCY_REPLAY_WINDOW_MS = 60 * 1000; // 60 sec

// Using module-scoped Map so it persists across requests within the same Node
// process. In a serverless environment this is best-effort per instance.
const idempotencyCache: Map<string, CachedEntry> = (globalThis as unknown as { __milaIdempotencyCache?: Map<string, CachedEntry> }).__milaIdempotencyCache
  ?? new Map<string, CachedEntry>();
(globalThis as unknown as { __milaIdempotencyCache?: Map<string, CachedEntry> }).__milaIdempotencyCache = idempotencyCache;

function pruneExpiredKeys(): void {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // --- Idempotency check ----------------------------------------------------
    // Accept key from either the JSON body or the `Idempotency-Key` header.
    const idempotencyKey =
      body.idempotencyKey || request.headers.get("idempotency-key") || "";

    if (idempotencyKey) {
      pruneExpiredKeys();
      const cached = idempotencyCache.get(idempotencyKey);
      if (cached) {
        const age = Date.now() - cached.createdAt;
        // If there's an in-flight request with this key, wait for it instead
        // of kicking off a second charge.
        if (cached.inFlight) {
          const settled = await cached.inFlight;
          return NextResponse.json(settled.response, { status: settled.status });
        }
        // Replay the cached response if we're inside the 60-second window.
        if (age < IDEMPOTENCY_REPLAY_WINDOW_MS) {
          return NextResponse.json(cached.response, { status: cached.status });
        }
      }
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

    // Wrap the gateway call in a promise so any concurrent requests with the
    // same idempotency key can await the same outcome.
    let resolveInFlight: (v: { response: unknown; status: number }) => void = () => {};
    const inFlightPromise = new Promise<{ response: unknown; status: number }>((resolve) => {
      resolveInFlight = resolve;
    });

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        response: null,
        status: 0,
        createdAt: Date.now(),
        inFlight: inFlightPromise,
      });
    }

    try {
      const result = await processCardPayment(paymentReq);

      let responseBody: unknown;
      let statusCode: number;

      if (!result.success) {
        statusCode = result.status === "ERROR" ? 500 : 402;
        responseBody = {
          success: false,
          error: result.message,
          status: result.status,
          transactionId: result.transactionId,
        };
      } else {
        statusCode = 200;
        responseBody = {
          success: true,
          transactionId: result.transactionId,
          status: result.status,
          message: result.message,
        };
      }

      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, {
          response: responseBody,
          status: statusCode,
          createdAt: Date.now(),
        });
      }
      resolveInFlight({ response: responseBody, status: statusCode });

      return NextResponse.json(responseBody, { status: statusCode });
    } catch (innerErr) {
      // On unexpected failures, drop the cache entry so retries aren't
      // blocked by a stale in-flight promise.
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
