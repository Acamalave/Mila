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
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          status: result.status,
          transactionId: result.transactionId,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("[API] /api/payments/process error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
