// =============================================================================
// POST /api/notifications/email
// Send transactional emails via Resend
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import type { TemplateType, Language } from "@/emails/templates";

const VALID_TEMPLATES: TemplateType[] = [
  "booking-confirmation",
  "booking-reminder",
  "booking-cancellation",
  "invoice-sent",
  "payment-confirmed",
  "welcome",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, template, data, language } = body;

    // ----- Validation -----

    if (!to || (typeof to !== "string" && !Array.isArray(to))) {
      return NextResponse.json(
        { error: "Missing or invalid 'to' field. Provide an email address or array of addresses." },
        { status: 400 }
      );
    }

    if (!template || !VALID_TEMPLATES.includes(template as TemplateType)) {
      return NextResponse.json(
        {
          error: `Invalid 'template'. Must be one of: ${VALID_TEMPLATES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid 'data' object." },
        { status: 400 }
      );
    }

    const lang: Language = language === "en" ? "en" : "es";

    // ----- Send -----

    const result = await sendEmail({
      to,
      template: template as TemplateType,
      data,
      language: lang,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    console.error("[api/notifications/email] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
