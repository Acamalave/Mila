/**
 * Paguelo Facil Payment Gateway — server-side wrapper.
 *
 * Uses the official REST transaction API:
 *   POST {base}/rest/processTx/AUTH_CAPTURE   (authorize + capture in one step)
 *   Header: `authorization: <token>`  (raw token — NOT "Bearer <token>")
 *
 * Body shape and field formatting mirror the configuration of our other
 * production deployment that bills against the same Paguelo Facil developer
 * account — keeping the two in sync prevents this gateway's anti-fraud engine
 * from flagging Mila's charges as different-shape and silently declining them
 * with `authStatus: "DR"` while Rush's identical charges go through.
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

// ---------------------------------------------------------------------------
// Hosted Payment Link — LinkDeamon flow
// ---------------------------------------------------------------------------
// Kept available for invoices we want to bill outside of the in-app flow
// (e.g. a "pay link" we email to a customer). The in-app modal uses the
// direct AUTH_CAPTURE flow below.

export interface PaymentLinkRequest {
  amount: number;
  description: string;
  /** Echoed back as PARM_1 — used to look up the invoice in the webhook. */
  reference: string;
  /** Absolute URL where the gateway redirects after payment. */
  returnUrl: string;
}

export function buildPaymentLinkUrl(req: PaymentLinkRequest): string {
  const cclw = clean(process.env.PAGUELO_CCLW);
  if (!cclw) {
    throw new Error("PAGUELO_CCLW is not set");
  }

  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}/LinkDeamon.cfm`);
  url.searchParams.set("CCLW", cclw);
  url.searchParams.set("CMTN", (Math.round(req.amount * 100) / 100).toFixed(2));
  url.searchParams.set(
    "CDSC",
    clean(req.description).slice(0, 80) || "Mila Concept"
  );
  url.searchParams.set("RETURN_URL", req.returnUrl);
  if (req.reference) url.searchParams.set("PARM_1", req.reference);
  return url.toString();
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
function detectCardType(cardNumber: string): "VISA" | "MASTERCARD" {
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
 * Validate the customer email. Paguelo Facil's anti-fraud rejects synthetic /
 * non-routable addresses (`.local`, `.invalid`, `.test`, `.example`) — and
 * sending the SAME fallback address for every charge gets the merchant
 * flagged. Return `null` so the caller can short-circuit and prompt the user
 * for a real email instead of submitting a charge that's guaranteed to be
 * rejected.
 */
function safeEmail(email: string): string | null {
  const e = clean(email).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) return null;
  if (/\.(local|invalid|test|example)$/.test(e)) return null;
  return e;
}

/**
 * Normalize a Panamanian phone number into a digits-only string with country
 * code. Paguelo Facil's risk engine flags 8-digit-only numbers as suspicious;
 * the working Rush integration always sends a phone with the 507 prefix.
 */
function safePhone(phone: string): string {
  const digits = clean(phone).replace(/\D/g, "");
  if (!digits) return "50760000000";
  // Already includes country code (typical formats: 507XXXXXXXX or longer)
  if (digits.length >= 11) return digits;
  // 8-digit local number — prepend Panama country code.
  if (digits.length === 8) return `507${digits}`;
  return digits.length >= 7 ? `507${digits}` : "50760000000";
}

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------
// Paguelo Facil can return `success: true` + `headerStatus.code: 200` and even
// a `codOper` for a REJECTED charge. The real verdict lives in
// `data.status` / `data.authStatus` / `data.messageSys`. We mirror the working
// validator from our Rush integration so the in-app modal never tells a
// customer "Pago aprobado" when the card was actually declined.

const APPROVED_STATUSES = new Set<string | number>([
  "PagadoExitoso",
  "Pagado",
  "Exitoso",
  "approved",
  "Aprobada",
  "Aprobado",
  1,
  "1",
]);

const DECLINED_STATUSES = new Set<string | number>([
  "Rechazado",
  "Rechazada",
  "rejected",
  "Reversado",
  "reversed",
  "DR",
  0,
  "0",
]);

const PENDING_STATUSES = new Set<string | number>([
  "Pendiente",
  "pending",
  "En revisión",
  2,
  "2",
]);

interface PFValidationResult {
  approved: boolean;
  declined: boolean;
  pending: boolean;
  codOper?: string;
  statusCode?: number;
  gatewayStatus?: string | number;
  messageSys?: string;
  reason?: string;
}

function validateResponse(paymentData: unknown): PFValidationResult {
  if (!paymentData || typeof paymentData !== "object") {
    return {
      approved: false,
      declined: true,
      pending: false,
      reason: "No response from payment gateway",
    };
  }

  const data = paymentData as Record<string, unknown>;
  const header = (data.headerStatus ?? {}) as { code?: number; description?: string };
  const inner = (data.data ?? {}) as {
    codOper?: string;
    messageSys?: string;
    status?: number | string;
    authStatus?: string;
    inRevision?: boolean;
  };

  const statusCode = header.code;
  const codOper = inner.codOper;
  const rawStatus = inner.status ?? inner.authStatus;
  const messageSys = inner.messageSys || (typeof data.message === "string" ? data.message : "");

  // 1. Top-level success must be true
  if (data.success !== true) {
    return {
      approved: false,
      declined: true,
      pending: false,
      statusCode,
      gatewayStatus: rawStatus,
      messageSys,
      reason: header.description || messageSys || "Payment not successful",
    };
  }

  // 2. headerStatus.code must be 200 (when present)
  if (statusCode !== undefined && statusCode !== null && statusCode !== 200) {
    return {
      approved: false,
      declined: true,
      pending: false,
      codOper,
      statusCode,
      gatewayStatus: rawStatus,
      messageSys,
      reason: header.description || `Gateway status code: ${statusCode}`,
    };
  }

  // 3. Explicit reject / pending classifications win
  if (inner.inRevision === true || PENDING_STATUSES.has(rawStatus ?? "")) {
    return {
      approved: false,
      declined: false,
      pending: true,
      codOper,
      statusCode,
      gatewayStatus: rawStatus,
      messageSys,
      reason: messageSys || "Pago en revisión",
    };
  }

  if (DECLINED_STATUSES.has(rawStatus ?? "")) {
    return {
      approved: false,
      declined: true,
      pending: false,
      codOper,
      statusCode,
      gatewayStatus: rawStatus,
      messageSys,
      reason: messageSys || header.description || "Transacción rechazada",
    };
  }

  // 4. No status field but everything else points to success → trust the
  //    codOper. The card has already been charged at this point.
  if (rawStatus === undefined || rawStatus === null || rawStatus === "") {
    if (statusCode === 200 && codOper) {
      return {
        approved: true,
        declined: false,
        pending: false,
        codOper,
        statusCode,
        gatewayStatus: "approved_no_status",
        messageSys,
      };
    }
    return {
      approved: false,
      declined: true,
      pending: false,
      codOper,
      statusCode,
      gatewayStatus: rawStatus,
      messageSys,
      reason: header.description || "Missing transaction status from gateway",
    };
  }

  // 5. Explicit approved
  if (APPROVED_STATUSES.has(rawStatus)) {
    return {
      approved: true,
      declined: false,
      pending: false,
      codOper,
      statusCode,
      gatewayStatus: rawStatus,
      messageSys,
    };
  }

  // 6. Unknown — fail closed
  return {
    approved: false,
    declined: true,
    pending: false,
    codOper,
    statusCode,
    gatewayStatus: rawStatus,
    messageSys,
    reason: messageSys || `Estado desconocido: ${rawStatus}`,
  };
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

    // Two-digit month with leading zero — the working Rush integration sends
    // "01"…"09" via padStart, and Paguelo Facil silently rejects single-digit
    // months with authStatus: "DR".
    const expMonth = req.cardExpMonth.replace(/\D/g, "").padStart(2, "0");
    // Two-digit year — accept "26" or "2026" and keep only the last two.
    const expYear = req.cardExpYear.replace(/\D/g, "").slice(-2);
    const cvv = req.cardCvv.replace(/\D/g, "");
    const email = safeEmail(req.clientEmail);
    if (!email) {
      return {
        success: false,
        transactionId: null,
        status: "INVALID_EMAIL",
        message:
          "Necesitamos un correo electrónico válido para procesar el pago. Por favor agrega uno a tu cuenta.",
      };
    }
    const phone = safePhone(req.clientPhone);
    const description = clean(req.description) || "Mila Concept";

    const body = {
      cclw,
      amount: Number((Math.round(req.amount * 100) / 100).toFixed(2)),
      taxAmount: 0,
      email,
      phone,
      // Concept up to 100 chars — matches what the working Rush integration
      // sends. The 50-char cap we had before was too aggressive.
      concept: description.slice(0, 100),
      description,
      lang: "ES",
      cardInformation: {
        cardNumber,
        expMonth,
        expYear,
        cvv,
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
        email,
        phone,
        concept: body.concept,
        card: {
          last4: cardNumber.slice(-4),
          expMonth,
          expYear,
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

    const validation = validateResponse(data);

    // Concise outcome line — easy to grep in Vercel.
    console.log(
      "[PagueloFacil] AUTH_CAPTURE outcome:",
      JSON.stringify({
        httpStatus: response.status,
        approved: validation.approved,
        pending: validation.pending,
        declined: validation.declined,
        statusCode: validation.statusCode,
        codOper: validation.codOper,
        gatewayStatus: validation.gatewayStatus,
        messageSys: validation.messageSys,
        reason: validation.reason,
      })
    );

    // For anything that's not an approval, also dump the full raw body so we
    // can read the gateway's own diagnostics. `messageSys: "Rejected
    // transaction"` alone is useless — Paguelo Facil's real verdict often
    // hides in other fields like `data.errorCode`, `data.bankResp`,
    // `data.processorMsg`, etc., that we don't surface explicitly.
    if (!validation.approved) {
      console.error(
        "[PagueloFacil] AUTH_CAPTURE raw body (not approved):",
        rawText.slice(0, 2000)
      );
    }

    if (!response.ok) {
      console.error(
        `[PagueloFacil] AUTH_CAPTURE HTTP ${response.status}:`,
        rawText.slice(0, 600)
      );
      return {
        success: false,
        transactionId: validation.codOper ?? null,
        status: "HTTP_ERROR",
        message:
          validation.reason ||
          `Paguelo Facil returned HTTP ${response.status}`,
        rawResponse: data ?? { raw: rawText.slice(0, 600) },
      };
    }

    if (validation.approved) {
      return {
        success: true,
        transactionId: validation.codOper ?? null,
        status: "APPROVED",
        message: validation.messageSys || "Pago aprobado",
        rawResponse: data ?? undefined,
      };
    }

    if (validation.pending) {
      // Pending = the gateway hasn't confirmed yet. Treat as "not approved"
      // for the synchronous caller; the webhook is responsible for the final
      // status change.
      return {
        success: false,
        transactionId: validation.codOper ?? null,
        status: "IN_REVIEW",
        message: validation.messageSys || "Pago en revisión",
        rawResponse: data ?? undefined,
      };
    }

    return {
      success: false,
      transactionId: validation.codOper ?? null,
      status: "DECLINED",
      message: validation.reason || validation.messageSys || "Pago rechazado",
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
