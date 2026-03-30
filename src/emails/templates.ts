// =============================================================================
// Mila Concept - Email Templates
// Luxury beauty salon email templates with bilingual support (es/en)
// =============================================================================

export type TemplateType =
  | "booking-confirmation"
  | "booking-reminder"
  | "booking-cancellation"
  | "invoice-sent"
  | "payment-confirmed"
  | "welcome";

export type Language = "es" | "en";

export interface TemplateResult {
  subject: string;
  html: string;
}

export interface BookingData {
  clientName: string;
  stylistName: string;
  date: string;
  time: string;
  services: string[];
}

export interface InvoiceData {
  clientName: string;
  amount: string;
  invoiceId: string;
  payLink?: string;
}

export interface PaymentData {
  clientName: string;
  amount: string;
  transactionId: string;
}

export interface WelcomeData {
  clientName: string;
}

export type TemplateData = BookingData | InvoiceData | PaymentData | WelcomeData;

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------

function layout(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Mila Concept</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Inner container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#111111;border-radius:8px;overflow:hidden;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding:40px 40px 24px 40px;border-bottom:1px solid #222222;">
              <div style="font-size:28px;font-weight:300;letter-spacing:6px;color:#C4A96A;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                MILA CONCEPT
              </div>
              <div style="margin-top:6px;font-size:11px;letter-spacing:3px;color:#666666;text-transform:uppercase;">
                Beauty &amp; Wellness
              </div>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;border-top:1px solid #222222;text-align:center;">
              <div style="font-size:11px;letter-spacing:2px;color:#C4A96A;text-transform:uppercase;margin-bottom:12px;">
                Mila Concept
              </div>
              <div style="font-size:12px;color:#555555;line-height:1.6;">
                Panama City, Panama<br>
                <a href="https://milaconcept.com" style="color:#C4A96A;text-decoration:none;">milaconcept.com</a>
              </div>
              <div style="margin-top:16px;font-size:11px;color:#444444;">
                &copy; ${new Date().getFullYear()} Mila Concept. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
        <!-- /Inner container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Reusable style snippets
// ---------------------------------------------------------------------------

const styles = {
  heading: 'style="margin:0 0 24px 0;font-size:22px;font-weight:300;color:#f5f0eb;letter-spacing:1px;"',
  paragraph: 'style="margin:0 0 16px 0;font-size:15px;color:#b0a99f;line-height:1.7;"',
  goldText: 'style="color:#C4A96A;font-weight:500;"',
  detailsBox: 'style="background-color:#1a1a1a;border-left:3px solid #C4A96A;border-radius:4px;padding:20px 24px;margin:24px 0;"',
  detailLabel: 'style="font-size:11px;color:#777777;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px 0;"',
  detailValue: 'style="font-size:15px;color:#f5f0eb;margin:0 0 16px 0;font-weight:400;"',
  button: 'style="display:inline-block;background-color:#C4A96A;color:#0a0a0a;font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:4px;mso-padding-alt:0;"',
  divider: 'style="border:none;border-top:1px solid #222222;margin:28px 0;"',
  serviceItem: 'style="font-size:14px;color:#d4cfc8;padding:6px 0;border-bottom:1px solid #1f1f1f;"',
};

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

export function buildBookingConfirmation(data: BookingData, lang: Language): TemplateResult {
  const isEs = lang === "es";

  const servicesList = data.services
    .map((s) => `<div ${styles.serviceItem}>&bull;&ensp;${s}</div>`)
    .join("");

  const subject = isEs
    ? `Cita confirmada - ${data.date}`
    : `Booking Confirmed - ${data.date}`;

  const html = layout(
    `
    <h1 ${styles.heading}>${isEs ? "Cita Confirmada" : "Booking Confirmed"}</h1>
    <p ${styles.paragraph}>
      ${isEs
        ? `Hola <span ${styles.goldText}>${data.clientName}</span>, tu cita ha sido confirmada exitosamente.`
        : `Hello <span ${styles.goldText}>${data.clientName}</span>, your appointment has been successfully confirmed.`}
    </p>

    <div ${styles.detailsBox}>
      <p ${styles.detailLabel}>${isEs ? "Estilista" : "Stylist"}</p>
      <p ${styles.detailValue}>${data.stylistName}</p>

      <p ${styles.detailLabel}>${isEs ? "Fecha" : "Date"}</p>
      <p ${styles.detailValue}>${data.date}</p>

      <p ${styles.detailLabel}>${isEs ? "Hora" : "Time"}</p>
      <p ${styles.detailValue}>${data.time}</p>

      <p ${styles.detailLabel}>${isEs ? "Servicios" : "Services"}</p>
      <div style="margin-top:4px;">
        ${servicesList}
      </div>
    </div>

    <p ${styles.paragraph}>
      ${isEs
        ? "Te esperamos. Si necesitas cambiar tu cita, no dudes en contactarnos."
        : "We look forward to seeing you. If you need to reschedule, don't hesitate to reach out."}
    </p>
    <hr ${styles.divider}>
    <p style="margin:0;font-size:12px;color:#555555;line-height:1.6;">
      ${isEs
        ? "Si tienes alguna pregunta, responde directamente a este correo."
        : "If you have any questions, simply reply to this email."}
    </p>
    `,
    isEs ? "Tu cita ha sido confirmada" : "Your appointment has been confirmed"
  );

  return { subject, html };
}

export function buildBookingReminder(data: BookingData, lang: Language): TemplateResult {
  const isEs = lang === "es";

  const servicesList = data.services
    .map((s) => `<div ${styles.serviceItem}>&bull;&ensp;${s}</div>`)
    .join("");

  const subject = isEs
    ? `Recordatorio: tu cita es mañana`
    : `Reminder: Your Appointment is Tomorrow`;

  const html = layout(
    `
    <h1 ${styles.heading}>${isEs ? "Recordatorio de Cita" : "Appointment Reminder"}</h1>
    <p ${styles.paragraph}>
      ${isEs
        ? `Hola <span ${styles.goldText}>${data.clientName}</span>, este es un recordatorio amable de que tu cita es <strong style="color:#f5f0eb;">mañana</strong>.`
        : `Hello <span ${styles.goldText}>${data.clientName}</span>, this is a friendly reminder that your appointment is <strong style="color:#f5f0eb;">tomorrow</strong>.`}
    </p>

    <div ${styles.detailsBox}>
      <p ${styles.detailLabel}>${isEs ? "Estilista" : "Stylist"}</p>
      <p ${styles.detailValue}>${data.stylistName}</p>

      <p ${styles.detailLabel}>${isEs ? "Fecha" : "Date"}</p>
      <p ${styles.detailValue}>${data.date}</p>

      <p ${styles.detailLabel}>${isEs ? "Hora" : "Time"}</p>
      <p ${styles.detailValue}>${data.time}</p>

      <p ${styles.detailLabel}>${isEs ? "Servicios" : "Services"}</p>
      <div style="margin-top:4px;">
        ${servicesList}
      </div>
    </div>

    <p ${styles.paragraph}>
      ${isEs
        ? "Te recomendamos llegar 10 minutos antes de tu cita para una experiencia sin prisas."
        : "We recommend arriving 10 minutes before your appointment for an unhurried experience."}
    </p>
    <hr ${styles.divider}>
    <p style="margin:0;font-size:12px;color:#555555;line-height:1.6;">
      ${isEs
        ? "Si necesitas reprogramar, por favor contáctanos con al menos 24 horas de anticipación."
        : "If you need to reschedule, please contact us at least 24 hours in advance."}
    </p>
    `,
    isEs ? "Tu cita es mañana" : "Your appointment is tomorrow"
  );

  return { subject, html };
}

export function buildBookingCancellation(data: BookingData, lang: Language): TemplateResult {
  const isEs = lang === "es";

  const subject = isEs
    ? `Cita cancelada - ${data.date}`
    : `Appointment Cancelled - ${data.date}`;

  const html = layout(
    `
    <h1 ${styles.heading}>${isEs ? "Cita Cancelada" : "Appointment Cancelled"}</h1>
    <p ${styles.paragraph}>
      ${isEs
        ? `Hola <span ${styles.goldText}>${data.clientName}</span>, tu cita ha sido cancelada.`
        : `Hello <span ${styles.goldText}>${data.clientName}</span>, your appointment has been cancelled.`}
    </p>

    <div ${styles.detailsBox}>
      <p ${styles.detailLabel}>${isEs ? "Estilista" : "Stylist"}</p>
      <p ${styles.detailValue}>${data.stylistName}</p>

      <p ${styles.detailLabel}>${isEs ? "Fecha" : "Date"}</p>
      <p ${styles.detailValue}>${data.date}</p>

      <p ${styles.detailLabel}>${isEs ? "Hora" : "Time"}</p>
      <p ${styles.detailValue}>${data.time}</p>
    </div>

    <p ${styles.paragraph}>
      ${isEs
        ? "Si deseas reprogramar tu cita, estaremos encantados de atenderte."
        : "If you'd like to reschedule, we'd be happy to accommodate you."}
    </p>

    <div style="text-align:center;margin:32px 0 16px 0;">
      <a href="https://milaconcept.com/book" ${styles.button}>
        ${isEs ? "Reservar Nueva Cita" : "Book New Appointment"}
      </a>
    </div>

    <hr ${styles.divider}>
    <p style="margin:0;font-size:12px;color:#555555;line-height:1.6;">
      ${isEs
        ? "Si tienes alguna pregunta, no dudes en contactarnos."
        : "If you have any questions, feel free to reach out."}
    </p>
    `,
    isEs ? "Tu cita ha sido cancelada" : "Your appointment has been cancelled"
  );

  return { subject, html };
}

export function buildInvoiceSent(data: InvoiceData, lang: Language): TemplateResult {
  const isEs = lang === "es";
  const payLink = data.payLink || "https://milaconcept.com/pay";

  const subject = isEs
    ? `Factura #${data.invoiceId} - Mila Concept`
    : `Invoice #${data.invoiceId} - Mila Concept`;

  const html = layout(
    `
    <h1 ${styles.heading}>${isEs ? "Nueva Factura" : "New Invoice"}</h1>
    <p ${styles.paragraph}>
      ${isEs
        ? `Hola <span ${styles.goldText}>${data.clientName}</span>, se ha generado una nueva factura para ti.`
        : `Hello <span ${styles.goldText}>${data.clientName}</span>, a new invoice has been generated for you.`}
    </p>

    <div ${styles.detailsBox}>
      <p ${styles.detailLabel}>${isEs ? "Factura" : "Invoice"}</p>
      <p ${styles.detailValue}>#${data.invoiceId}</p>

      <p ${styles.detailLabel}>${isEs ? "Monto" : "Amount"}</p>
      <p style="font-size:28px;color:#C4A96A;margin:0;font-weight:300;letter-spacing:1px;">
        ${data.amount}
      </p>
    </div>

    <div style="text-align:center;margin:32px 0 16px 0;">
      <a href="${payLink}" ${styles.button}>
        ${isEs ? "Pagar Ahora" : "Pay Now"}
      </a>
    </div>

    <hr ${styles.divider}>
    <p style="margin:0;font-size:12px;color:#555555;line-height:1.6;">
      ${isEs
        ? "Si ya realizaste el pago, puedes ignorar este mensaje."
        : "If you've already made payment, you can ignore this message."}
    </p>
    `,
    isEs ? `Factura #${data.invoiceId}` : `Invoice #${data.invoiceId}`
  );

  return { subject, html };
}

export function buildPaymentConfirmed(data: PaymentData, lang: Language): TemplateResult {
  const isEs = lang === "es";

  const subject = isEs
    ? `Pago confirmado - ${data.amount}`
    : `Payment Confirmed - ${data.amount}`;

  const html = layout(
    `
    <h1 ${styles.heading}>${isEs ? "Pago Confirmado" : "Payment Confirmed"}</h1>
    <p ${styles.paragraph}>
      ${isEs
        ? `Hola <span ${styles.goldText}>${data.clientName}</span>, hemos recibido tu pago exitosamente.`
        : `Hello <span ${styles.goldText}>${data.clientName}</span>, your payment has been successfully received.`}
    </p>

    <div ${styles.detailsBox}>
      <p ${styles.detailLabel}>${isEs ? "Monto Pagado" : "Amount Paid"}</p>
      <p style="font-size:28px;color:#C4A96A;margin:0 0 16px 0;font-weight:300;letter-spacing:1px;">
        ${data.amount}
      </p>

      <p ${styles.detailLabel}>${isEs ? "ID de Transacción" : "Transaction ID"}</p>
      <p ${styles.detailValue} style="font-family:monospace;font-size:13px;color:#999999;margin:0;">
        ${data.transactionId}
      </p>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background-color:#1a2e1a;line-height:48px;font-size:24px;">
        &#10003;
      </div>
    </div>

    <p ${styles.paragraph} style="text-align:center;">
      ${isEs
        ? "Gracias por tu preferencia. Esperamos verte pronto."
        : "Thank you for your patronage. We look forward to seeing you soon."}
    </p>

    <hr ${styles.divider}>
    <p style="margin:0;font-size:12px;color:#555555;line-height:1.6;">
      ${isEs
        ? "Este correo sirve como comprobante de pago."
        : "This email serves as your payment receipt."}
    </p>
    `,
    isEs ? "Tu pago ha sido confirmado" : "Your payment has been confirmed"
  );

  return { subject, html };
}

export function buildWelcome(data: WelcomeData, lang: Language): TemplateResult {
  const isEs = lang === "es";

  const subject = isEs
    ? `Bienvenida a Mila Concept`
    : `Welcome to Mila Concept`;

  const html = layout(
    `
    <h1 ${styles.heading}>${isEs ? "Bienvenida" : "Welcome"}</h1>
    <p ${styles.paragraph}>
      ${isEs
        ? `Hola <span ${styles.goldText}>${data.clientName}</span>,`
        : `Hello <span ${styles.goldText}>${data.clientName}</span>,`}
    </p>
    <p ${styles.paragraph}>
      ${isEs
        ? "Es un placer darte la bienvenida a Mila Concept. Estamos dedicados a ofrecerte una experiencia de belleza excepcional en un ambiente de lujo y tranquilidad."
        : "It's our pleasure to welcome you to Mila Concept. We are dedicated to providing you with an exceptional beauty experience in an atmosphere of luxury and tranquility."}
    </p>

    <div ${styles.detailsBox}>
      <p style="margin:0;font-size:14px;color:#b0a99f;line-height:1.8;">
        ${isEs ? "Con nosotros podrás disfrutar de:" : "With us you can enjoy:"}
      </p>
      <div style="margin-top:12px;">
        <div ${styles.serviceItem}>&bull;&ensp;${isEs ? "Estilistas de primer nivel" : "Top-tier stylists"}</div>
        <div ${styles.serviceItem}>&bull;&ensp;${isEs ? "Productos premium" : "Premium products"}</div>
        <div ${styles.serviceItem}>&bull;&ensp;${isEs ? "Ambiente exclusivo y relajante" : "Exclusive & relaxing atmosphere"}</div>
        <div ${styles.serviceItem}>&bull;&ensp;${isEs ? "Atención personalizada" : "Personalized attention"}</div>
      </div>
    </div>

    <div style="text-align:center;margin:32px 0 16px 0;">
      <a href="https://milaconcept.com/book" ${styles.button}>
        ${isEs ? "Reservar Tu Primera Cita" : "Book Your First Appointment"}
      </a>
    </div>

    <hr ${styles.divider}>
    <p style="margin:0;font-size:12px;color:#555555;line-height:1.6;text-align:center;">
      ${isEs
        ? "Estamos aquí para ti. No dudes en contactarnos en cualquier momento."
        : "We're here for you. Don't hesitate to reach out at any time."}
    </p>
    `,
    isEs ? "Bienvenida a Mila Concept" : "Welcome to Mila Concept"
  );

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export function buildEmailContent(
  template: TemplateType,
  data: TemplateData,
  lang: Language = "es"
): TemplateResult {
  switch (template) {
    case "booking-confirmation":
      return buildBookingConfirmation(data as BookingData, lang);
    case "booking-reminder":
      return buildBookingReminder(data as BookingData, lang);
    case "booking-cancellation":
      return buildBookingCancellation(data as BookingData, lang);
    case "invoice-sent":
      return buildInvoiceSent(data as InvoiceData, lang);
    case "payment-confirmed":
      return buildPaymentConfirmed(data as PaymentData, lang);
    case "welcome":
      return buildWelcome(data as WelcomeData, lang);
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}
