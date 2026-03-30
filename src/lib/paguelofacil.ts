/**
 * Paguelo Facil Payment Gateway - Server-Side SDK Wrapper
 *
 * Environment variables required:
 *   PAGUELO_CCLW   - Merchant CCLW key
 *   PAGUELO_TOKEN   - API authentication token
 *   PAGUELO_ENVIRONMENT - "sandbox" | "production"
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
  taxAmount?: number;
}

export interface PaymentLinkRequest {
  amount: number;
  description: string;
  clientName: string;
  clientEmail: string;
  invoiceId?: string;
  returnUrl?: string;
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

const SANDBOX_URL = "https://sandbox.paguelofacil.com/rest/ccapi/v1";
const PRODUCTION_URL = "https://secure.paguelofacil.com/rest/ccapi/v1";

function getBaseUrl(): string {
  const env = process.env.PAGUELO_ENVIRONMENT ?? "sandbox";
  return env === "production" ? PRODUCTION_URL : SANDBOX_URL;
}

function getCredentials() {
  const cclw = process.env.PAGUELO_CCLW;
  const token = process.env.PAGUELO_TOKEN;

  if (!cclw || !token) {
    throw new Error(
      "Missing Paguelo Facil credentials. Set PAGUELO_CCLW and PAGUELO_TOKEN environment variables."
    );
  }

  return { cclw, token };
}

// ---------------------------------------------------------------------------
// Card Payment  (direct card charge via CCREQUEST)
// ---------------------------------------------------------------------------

export async function processCardPayment(
  req: CardPaymentRequest
): Promise<PagueloFacilResponse> {
  try {
    const { cclw, token } = getCredentials();
    const baseUrl = getBaseUrl();

    const body = {
      CCLW: cclw,
      CMTN: req.amount.toFixed(2),
      CDSC: req.description,
      CCNM: req.cardNumber.replace(/\s/g, ""),
      CCEM: req.cardExpMonth.padStart(2, "0"),
      CCEY: req.cardExpYear.padStart(2, "0"),
      CCCVV: req.cardCvv,
      CUSR: req.clientName,
      CEML: req.clientEmail,
      CPHN: req.clientPhone.replace(/[^0-9]/g, ""),
      CTAX: req.taxAmount?.toFixed(2) ?? "0.00",
      CREF: req.invoiceId ?? "",
    };

    const response = await fetch(`${baseUrl}/CCREQUEST`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        success: false,
        transactionId: null,
        status: "HTTP_ERROR",
        message: `Paguelo Facil returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // Paguelo Facil returns headerStatus.code === 200 on success
    const headerCode = data?.headerStatus?.code;
    const isSuccess = headerCode === 200 || headerCode === "200";

    return {
      success: isSuccess,
      transactionId: data?.data?.codOper ?? data?.data?.transactionId ?? null,
      status: isSuccess ? "APPROVED" : data?.headerStatus?.description ?? "DECLINED",
      message:
        data?.headerStatus?.description ??
        (isSuccess ? "Payment processed successfully" : "Payment was declined"),
      rawResponse: data,
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

// ---------------------------------------------------------------------------
// Payment Link  (redirect-based flow — alternative to direct card charge)
// ---------------------------------------------------------------------------

export async function createPaymentLink(
  req: PaymentLinkRequest
): Promise<PagueloFacilResponse> {
  try {
    const { cclw, token } = getCredentials();
    const baseUrl = getBaseUrl();

    const body = {
      CCLW: cclw,
      CMTN: req.amount.toFixed(2),
      CDSC: req.description,
      CUSR: req.clientName,
      CEML: req.clientEmail,
      CREF: req.invoiceId ?? "",
      RETURN_URL: req.returnUrl ?? "",
    };

    const response = await fetch(`${baseUrl}/CFLINK`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        success: false,
        transactionId: null,
        status: "HTTP_ERROR",
        message: `Paguelo Facil returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const headerCode = data?.headerStatus?.code;
    const isSuccess = headerCode === 200 || headerCode === "200";

    return {
      success: isSuccess,
      transactionId: data?.data?.codOper ?? null,
      status: isSuccess ? "LINK_CREATED" : data?.headerStatus?.description ?? "FAILED",
      message: data?.data?.url ?? data?.headerStatus?.description ?? "Could not create payment link",
      rawResponse: data,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error creating payment link";
    console.error("[PagueloFacil] createPaymentLink error:", message);
    return {
      success: false,
      transactionId: null,
      status: "ERROR",
      message,
    };
  }
}
