import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/manychat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, countryCode, template, data, language } = body;

    // Validate required fields
    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'phone'" },
        { status: 400 },
      );
    }

    if (!countryCode || typeof countryCode !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'countryCode'" },
        { status: 400 },
      );
    }

    const validTemplates = [
      "booking-confirmation",
      "booking-reminder",
      "booking-cancellation",
      "invoice-sent",
      "payment-confirmed",
      "welcome",
    ];

    if (!template || !validTemplates.includes(template)) {
      return NextResponse.json(
        { success: false, error: `Invalid template. Must be one of: ${validTemplates.join(", ")}` },
        { status: 400 },
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'data' object" },
        { status: 400 },
      );
    }

    const result = await sendWhatsApp({
      phone,
      countryCode,
      template,
      data,
      language: language || "es",
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[whatsapp/route] Unhandled error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
