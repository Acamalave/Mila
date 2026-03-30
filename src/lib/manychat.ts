const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const MANYCHAT_BASE_URL = "https://api.manychat.com/fb";

type TemplateType =
  | "booking-confirmation"
  | "booking-reminder"
  | "booking-cancellation"
  | "invoice-sent"
  | "payment-confirmed"
  | "welcome";

type Language = "es" | "en";

interface SendWhatsAppParams {
  phone: string;
  countryCode: string;
  template: TemplateType;
  data: Record<string, string>;
  language?: Language;
}

interface ManyChatResponse {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Bilingual plain-text message builders
// ---------------------------------------------------------------------------

function buildMessage(template: TemplateType, data: Record<string, string>, lang: Language): string {
  const t = templates[template];
  if (!t) return "";
  return t[lang](data);
}

const templates: Record<TemplateType, Record<Language, (d: Record<string, string>) => string>> = {
  "booking-confirmation": {
    es: (d) =>
      [
        `Hola ${d.clientName || ""},`,
        `Tu cita en MILA CONCEPT ha sido confirmada.`,
        ``,
        `Fecha: ${d.date || ""}`,
        `Hora: ${d.time || ""}`,
        `Servicio: ${d.service || ""}`,
        `Estilista: ${d.stylist || ""}`,
        ``,
        d.total ? `Total: $${d.total}` : "",
        ``,
        `Direccion: Costa del Este, Panama`,
        ``,
        `Si necesitas cambiar o cancelar tu cita, responde a este mensaje o visita milapty.com.`,
        ``,
        `Nos vemos pronto!`,
        `- Equipo MILA CONCEPT`,
      ]
        .filter(Boolean)
        .join("\n"),
    en: (d) =>
      [
        `Hi ${d.clientName || ""},`,
        `Your appointment at MILA CONCEPT has been confirmed.`,
        ``,
        `Date: ${d.date || ""}`,
        `Time: ${d.time || ""}`,
        `Service: ${d.service || ""}`,
        `Stylist: ${d.stylist || ""}`,
        ``,
        d.total ? `Total: $${d.total}` : "",
        ``,
        `Address: Costa del Este, Panama`,
        ``,
        `If you need to change or cancel, reply to this message or visit milapty.com.`,
        ``,
        `See you soon!`,
        `- MILA CONCEPT Team`,
      ]
        .filter(Boolean)
        .join("\n"),
  },

  "booking-reminder": {
    es: (d) =>
      [
        `Hola ${d.clientName || ""},`,
        `Este es un recordatorio de tu cita manana en MILA CONCEPT.`,
        ``,
        `Fecha: ${d.date || ""}`,
        `Hora: ${d.time || ""}`,
        `Servicio: ${d.service || ""}`,
        `Estilista: ${d.stylist || ""}`,
        ``,
        `Por favor llega 5 minutos antes. Si necesitas cancelar, avisanos con anticipacion.`,
        ``,
        `- Equipo MILA CONCEPT`,
      ].join("\n"),
    en: (d) =>
      [
        `Hi ${d.clientName || ""},`,
        `This is a reminder for your appointment tomorrow at MILA CONCEPT.`,
        ``,
        `Date: ${d.date || ""}`,
        `Time: ${d.time || ""}`,
        `Service: ${d.service || ""}`,
        `Stylist: ${d.stylist || ""}`,
        ``,
        `Please arrive 5 minutes early. If you need to cancel, let us know in advance.`,
        ``,
        `- MILA CONCEPT Team`,
      ].join("\n"),
  },

  "booking-cancellation": {
    es: (d) =>
      [
        `Hola ${d.clientName || ""},`,
        `Tu cita en MILA CONCEPT ha sido cancelada.`,
        ``,
        `Fecha original: ${d.date || ""}`,
        `Hora: ${d.time || ""}`,
        `Servicio: ${d.service || ""}`,
        ``,
        d.reason ? `Motivo: ${d.reason}` : "",
        ``,
        `Si deseas reagendar, visita milapty.com o responde a este mensaje.`,
        ``,
        `- Equipo MILA CONCEPT`,
      ]
        .filter(Boolean)
        .join("\n"),
    en: (d) =>
      [
        `Hi ${d.clientName || ""},`,
        `Your appointment at MILA CONCEPT has been cancelled.`,
        ``,
        `Original date: ${d.date || ""}`,
        `Time: ${d.time || ""}`,
        `Service: ${d.service || ""}`,
        ``,
        d.reason ? `Reason: ${d.reason}` : "",
        ``,
        `If you would like to reschedule, visit milapty.com or reply to this message.`,
        ``,
        `- MILA CONCEPT Team`,
      ]
        .filter(Boolean)
        .join("\n"),
  },

  "invoice-sent": {
    es: (d) =>
      [
        `Hola ${d.clientName || ""},`,
        `Te hemos enviado una factura desde MILA CONCEPT.`,
        ``,
        `Factura #: ${d.invoiceNumber || ""}`,
        `Total: $${d.total || "0.00"}`,
        ``,
        d.paymentLink ? `Paga aqui: ${d.paymentLink}` : "",
        ``,
        `Gracias por tu preferencia.`,
        `- Equipo MILA CONCEPT`,
      ]
        .filter(Boolean)
        .join("\n"),
    en: (d) =>
      [
        `Hi ${d.clientName || ""},`,
        `We have sent you an invoice from MILA CONCEPT.`,
        ``,
        `Invoice #: ${d.invoiceNumber || ""}`,
        `Total: $${d.total || "0.00"}`,
        ``,
        d.paymentLink ? `Pay here: ${d.paymentLink}` : "",
        ``,
        `Thank you for choosing us.`,
        `- MILA CONCEPT Team`,
      ]
        .filter(Boolean)
        .join("\n"),
  },

  "payment-confirmed": {
    es: (d) =>
      [
        `Hola ${d.clientName || ""},`,
        `Hemos recibido tu pago. Gracias!`,
        ``,
        `Monto: $${d.amount || "0.00"}`,
        d.invoiceNumber ? `Factura #: ${d.invoiceNumber}` : "",
        d.method ? `Metodo: ${d.method}` : "",
        ``,
        `Si tienes alguna pregunta, no dudes en contactarnos.`,
        `- Equipo MILA CONCEPT`,
      ]
        .filter(Boolean)
        .join("\n"),
    en: (d) =>
      [
        `Hi ${d.clientName || ""},`,
        `We have received your payment. Thank you!`,
        ``,
        `Amount: $${d.amount || "0.00"}`,
        d.invoiceNumber ? `Invoice #: ${d.invoiceNumber}` : "",
        d.method ? `Method: ${d.method}` : "",
        ``,
        `If you have any questions, feel free to contact us.`,
        `- MILA CONCEPT Team`,
      ]
        .filter(Boolean)
        .join("\n"),
  },

  welcome: {
    es: (d) =>
      [
        `Bienvenida a MILA CONCEPT, ${d.clientName || ""}!`,
        ``,
        `Estamos encantados de tenerte. Somos un salon exclusivo en Costa del Este, Panama, dedicado a realzar tu belleza.`,
        ``,
        `Reserva tu primera cita en milapty.com`,
        ``,
        `- Equipo MILA CONCEPT`,
      ].join("\n"),
    en: (d) =>
      [
        `Welcome to MILA CONCEPT, ${d.clientName || ""}!`,
        ``,
        `We are thrilled to have you. We are an exclusive salon in Costa del Este, Panama, dedicated to enhancing your beauty.`,
        ``,
        `Book your first appointment at milapty.com`,
        ``,
        `- MILA CONCEPT Team`,
      ].join("\n"),
  },
};

// ---------------------------------------------------------------------------
// ManyChat API helpers
// ---------------------------------------------------------------------------

async function manychatRequest(endpoint: string, body: Record<string, unknown>): Promise<ManyChatResponse> {
  if (!MANYCHAT_API_KEY) {
    console.warn("[manychat] MANYCHAT_API_KEY is not set – skipping WhatsApp message");
    return { success: false, error: "MANYCHAT_API_KEY not configured" };
  }

  try {
    const res = await fetch(`${MANYCHAT_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MANYCHAT_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("[manychat] API error", res.status, json);
      return { success: false, error: json?.message || `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[manychat] Request failed", message);
    return { success: false, error: message };
  }
}

/**
 * Find or create a ManyChat subscriber by phone number, then send them a
 * text message built from the given template.
 */
export async function sendWhatsApp({
  phone,
  countryCode,
  template,
  data,
  language = "es",
}: SendWhatsAppParams): Promise<ManyChatResponse> {
  if (!MANYCHAT_API_KEY) {
    console.warn("[manychat] MANYCHAT_API_KEY is not set – skipping WhatsApp message");
    return { success: false, error: "MANYCHAT_API_KEY not configured" };
  }

  // Normalise phone: strip leading + or 0, spaces, dashes
  const cleanPhone = phone.replace(/[\s\-+]/g, "").replace(/^0+/, "");
  const fullPhone = `${countryCode.replace("+", "")}${cleanPhone}`;

  // 1. Find or create subscriber by phone
  const subscriberRes = await manychatRequest("/subscriber/findBySystemField", {
    field_name: "phone",
    field_value: `+${fullPhone}`,
  });

  // Even if subscriber lookup fails we attempt to send via createSubscriber
  let subscriberId: string | undefined;

  if (subscriberRes.success) {
    // The API may return the subscriber id directly; we try to parse it
    // from the raw response in a real integration.
    // For resilience we also try the create-subscriber path below.
  }

  // 2. Ensure subscriber exists (upsert pattern)
  const createRes = await fetch(`${MANYCHAT_BASE_URL}/subscriber/createSubscriber`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MANYCHAT_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      phone: `+${fullPhone}`,
      whatsapp_phone: `+${fullPhone}`,
      first_name: data.clientName?.split(" ")[0] || "",
      last_name: data.clientName?.split(" ").slice(1).join(" ") || "",
      has_opt_in_whatsapp: true,
      consent_phrase: "Booking at MILA CONCEPT",
    }),
  });

  if (createRes.ok) {
    try {
      const createJson = await createRes.json();
      subscriberId = createJson?.data?.id;
    } catch {
      // continue without subscriber id
    }
  }

  if (!subscriberId) {
    return { success: false, error: "Could not find or create subscriber" };
  }

  // 3. Build plain-text message from template
  const messageText = buildMessage(template, data, language);

  if (!messageText) {
    return { success: false, error: `Unknown template: ${template}` };
  }

  // 4. Send content to subscriber
  const sendResult = await manychatRequest("/sending/sendContent", {
    subscriber_id: subscriberId,
    data: {
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: messageText,
          },
        ],
      },
    },
    message_tag: "CONFIRMED_EVENT_UPDATE",
  });

  return sendResult;
}
