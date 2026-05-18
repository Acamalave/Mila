/**
 * Paguelo Facil Payment Gateway — server-side wrapper.
 *
 * Uses the official REST transaction API:
 *   POST {base}/rest/processTx/AUTH_CAPTURE   (authorize + capture in one step)
 *   Header: `authorization: <token>`  (raw token — NOT "Bearer <token>")
 *
 * Environment variables required:
 *   PAGUELO_CCLW         - Merchant CCLW key
 *   PAGUELO_TOKEN        - API authentication token
 *   PAGUELO_ENVIRONMENT  - "sandbox" | "production"
 *
 * sandbox  → https://sandbox.paguelofacil.com   (test cards, no real money)
 * production → https://secure.paguelofacil.com  (real charges)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardPaymentRequest {
  amount: number;
  description: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  cardNumber: string;
  cardExpMonth: string; // MM
  cardExpYear: string; // YY
  cardCvv: string;
  invoiceId?: string;
}

export interface PagueloFacilResponse {
  success: boolean;
  transactionId: string | null;
  status: string;
  message: string;
  rawResponse?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SANDBOX_URL = "https://sandbox.paguelofacil.com";
const PRODUCTION_URL = "https://secure.paguelofacil.com";

// Sanitize env vars — Vercel may inject trailing newlines/whitespace
const clean = (v?: string) => (v ?? "").trim();

function getBaseUrl(): string {
  const env = clean(process.env.PAGUELO_ENVIRONMENT).toLowerCase() || "sandbox";
  return env === "production" ? PRODUCTION_URL : SANDBOX_URL;
}

function getCredentials() {
  const cclw = clean(process.env.PAGUELO_CCLW);
  const token = clean(process.env.PAGUELO_TOKEN);

  if (!cclw || !token) {
    throw new Error(
      "Missing Paguelo Facil credentials. Set PAGUELO_CCLW and PAGUELO_TOKEN environment variables."
    );
  }

  return { cclw, token };
}

/** Paguelo Facil's cardType field accepts "VISA" or "MASTERCARD". */
function detectCardType(cardNumber: string): string {
  return cardNumber.replace(/\D/g, "").startsWith("4") ? "VISA" : "MASTERCARD";
}

/** Split a full name into first / last for the gateway's card information. */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = clean(full).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Cliente", lastName: "Mila" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * The gateway validates the email. Synthetic addresses like
 * `<phone>@mila.local` are rejected, so fall back to a real domain.
 */
function safeEmail(email: string): string {
  const e = clean(email).toLowerCase();
  if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) && !e.endsWith(".local")) return e;
  return "pagos@milapty.com";
}

// ---------------------------------------------------------------------------
// Card Payment — direct charge via /rest/processTx/AUTH_CAPTURE
// ---------------------------------------------------------------------------

export async function processCardPayment(
  req: CardPaymentRequest
): Promise<PagueloFacilResponse> {
  try {
    const { cclw, token } = getCredentials();
    const baseUrl = getBaseUrl();
    const cardNumber = req.cardNumber.replace(/\D/g, "");
    const { firstName, lastName } = splitName(req.clientName);

    // Month without a leading zero ("01" → "1"), matching the gateway's
    // documented examples.
    const expMonth = String(
      parseInt(req.cardExpMonth.replace(/\D/g, ""), 10) || ""
    );

    // Body shape mirrors the official @shoopiapp/paguelofacil library exactly
    // (no extra fields — the gateway rejects unknown ones with a generic error).
    const body = {
      cclw,
      amount: Math.round(req.amount * 100) / 100,
      taxAmount: 0,
      email: safeEmail(req.clientEmail),
      phone: req.clientPhone.replace(/\D/g, "") || "60000000",
      concept: clean(req.description).slice(0, 50) || "Mila Concept",
      description: clean(req.description) || "Mila Concept",
      lang: "ES",
      cardInformation: {
        cardNumber,
        expMonth,
        // Gateway expects a 2-digit year (YY) — normalize "YY" or "YYYY".
        expYear: req.cardExpYear.replace(/\D/g, "").slice(-2),
        cvv: req.cardCvv.replace(/\D/g, ""),
        firstName,
        lastName,
        cardType: detectCardType(cardNumber),
      },
    };

    const url = `${baseUrl}/rest/processTx/AUTH_CAPTURE`;

    // Diagnostic log — never includes the full card number or CVV.
    console.log(
      "[PagueloFacil] AUTH_CAPTURE request:",
      JSON.stringify({
        url,
        cclwPrefix: cclw.slice(0, 8),
        tokenLength: token.length,
        amount: body.amount,
        taxAmount: body.taxAmount,
        email: body.email,
        phone: body.phone,
        concept: body.concept,
        card: {
          last4: cardNumber.slice(-4),
          expMonth,
          expYear: body.cardInformation.expYear,
          cardType: body.cardInformation.cardType,
          firstName,
          lastName,
        },
      })
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Paguelo Facil expects the raw token in the `authorization` header.
        Authorization: token,
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      // non-JSON response — keep data null, rawText surfaces below
    }

    const header = (data?.headerStatus ?? {}) as { code?: number; description?: string };
    const inner = (data?.data ?? {}) as {
      codOper?: string;
      messageSys?: string;
      status?: number | string;
      authStatus?: string;
      inRevision?: boolean;
      cardToken?: string;
      totalPay?: string;
    };
    const topSuccess = data?.success === true;

    // Log the decisive fields explicitly — the raw response is too large to
    // slice (binInfo dominates it and hides the transaction status fields).
    console.log(
      "[PagueloFacil] AUTH_CAPTURE result:",
      JSON.stringify({
        httpStatus: response.status,
        headerStatus: header,
        success: data?.success,
        codOper: inner.codOper,
        status: inner.status,
        authStatus: inner.authStatus,
        inRevision: inner.inRevision,
        cardToken: inner.cardToken,
        totalPay: inner.totalPay,
        messageSys: inner.messageSys,
      })
    );

    if (!response.ok) {
      console.error(
        `[PagueloFacil] AUTH_CAPTURE HTTP ${response.status}:`,
        rawText.slice(0, 600)
      );
      return {
        success: false,
        transactionId: null,
        status: "HTTP_ERROR",
        message:
          header.description ||
          (typeof data?.message === "string" ? data.message : "") ||
          `Paguelo Facil returned HTTP ${response.status}`,
        rawResponse: data ?? { raw: rawText.slice(0, 600) },
      };
    }

    // A charge is captured ONLY when the gateway's top-level `success` flag is
    // true AND the transaction is not held for fraud review. `headerStatus.code
    // 200` only means the API call itself succeeded — never the charge result.
    const inReview = inner.inRevision === true;
    const isSuccess = topSuccess && !inReview;
    const message =
      inner.messageSys ||
      inner.authStatus ||
      (typeof data?.message === "string" ? data.message : "") ||
      header.description ||
      (isSuccess ? "Pago aprobado" : inReview ? "Pago en revisión" : "Pago rechazado");

    if (!isSuccess) {
      console.error(
        "[PagueloFacil] AUTH_CAPTURE not approved:",
        JSON.stringify({
          topSuccess,
          inReview,
          authStatus: inner.authStatus,
          status: inner.status,
          messageSys: inner.messageSys,
        })
      );
    }

    return {
      success: isSuccess,
      transactionId: inner.codOper ?? null,
      status: isSuccess ? "APPROVED" : inReview ? "IN_REVIEW" : "DECLINED",
      message,
      rawResponse: data ?? undefined,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error processing payment";
    console.error("[PagueloFacil] processCardPayment error:", message);
    return {
      success: false,
      transactionId: null,
      status: "ERROR",
      message,
    };
  }
}
