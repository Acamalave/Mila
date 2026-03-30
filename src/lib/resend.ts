// =============================================================================
// Mila Concept - Resend Email Client
// Server-side email sending with graceful degradation
// =============================================================================

import { Resend } from "resend";
import {
  buildEmailContent,
  type TemplateType,
  type TemplateData,
  type Language,
} from "@/emails/templates";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Mila Concept <noreply@milaconcept.com>";

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string | string[];
  template: TemplateType;
  data: TemplateData;
  language?: Language;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

export async function sendEmail({
  to,
  template,
  data,
  language = "es",
}: SendEmailParams): Promise<SendEmailResult> {
  // Graceful degradation when Resend is not configured
  if (!resend) {
    console.warn(
      "[resend] RESEND_API_KEY is not configured. Email not sent.",
      { to, template }
    );
    return {
      success: false,
      error: "Email service is not configured. Set RESEND_API_KEY to enable.",
    };
  }

  try {
    const { subject, html } = buildEmailContent(template, data, language);

    const { data: result, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("[resend] Failed to send email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: result?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[resend] Exception sending email:", message);
    return { success: false, error: message };
  }
}
