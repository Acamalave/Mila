import type { Invoice, PaymentMethod } from "@/types";
import { formatPrice } from "@/lib/utils";

// Printable client receipt for Milà Concept. Builds a self-contained,
// black-on-white HTML ticket (~80mm — fits a thermal roll and also prints
// fine as a narrow strip on a normal printer) and sends it straight to the
// browser's print dialog through a hidden iframe. The iframe is used on
// purpose so the receipt is NOT styled by the app's dark/glass theme and so
// popup blockers don't swallow it.

// The real brand mark (same wordmark used across the web app) in black. The
// /logo-mila-brand.png asset is WHITE — built for dark backgrounds and would be
// invisible on a white receipt — so we ship a black-on-transparent copy at
// /logo-mila-black.png for print. print-color-adjust keeps it solid black when
// the browser would otherwise lighten images to save ink.
const LOGO_IMG = `<img class="brand-logo" src="/logo-mila-black.png" alt="Milà Concept" onerror="this.style.display='none'" />`;

const SALON = {
  tagline: "Salón de Belleza",
  addressLines: [
    "P.H. Balboa Office Center, Piso 18",
    "Of. 18 C2, Calle 27 Este — Ciudad de Panamá",
  ],
  phone: "+507 6583-0099",
  web: "www.milapty.com",
  instagram: "@milaconceptpty",
} as const;

const PAYMENT_LABELS: Record<PaymentMethod, { es: string; en: string }> = {
  card: { es: "Tarjeta", en: "Card" },
  cash: { es: "Efectivo", en: "Cash" },
  yappy: { es: "Yappy", en: "Yappy" },
  cubo: { es: "Cubo", en: "Cubo" },
  counter: { es: "Mostrador", en: "Counter" },
};

export interface ReceiptLine {
  name: string;
  quantity: number;
  price: number; // unit price
  stylistName?: string | null;
}

export interface ReceiptData {
  invoice: Invoice;
  lines: ReceiptLine[];
  language: "en" | "es";
  stylistName?: string | null;
  descriptionText?: string;
}

const t = (lang: "en" | "es", es: string, en: string) => (lang === "es" ? es : en);

// Escape user-controlled strings (client names, item names, notes) before they
// land in the receipt HTML.
const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (dateStr: string, lang: "en" | "es") => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return esc(dateStr);
  return d.toLocaleDateString(lang === "es" ? "es-PA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function buildReceiptHtml(data: ReceiptData): string {
  const { invoice, lines, language: lang } = data;

  const itemsRows = lines
    .map((line) => {
      const qty = line.quantity > 1 ? ` x${line.quantity}` : "";
      const lineTotal = line.price * line.quantity;
      const stylist = line.stylistName
        ? `<div class="muted sub">${esc(line.stylistName)}</div>`
        : "";
      return `
        <tr>
          <td class="item">${esc(line.name)}<span class="muted">${qty}</span>${stylist}</td>
          <td class="price">${esc(formatPrice(lineTotal))}</td>
        </tr>`;
    })
    .join("");

  const totalsRows: string[] = [];
  if (typeof invoice.subtotal === "number") {
    totalsRows.push(
      `<tr><td>Subtotal</td><td class="price">${esc(formatPrice(invoice.subtotal))}</td></tr>`
    );
  }
  if (typeof invoice.discount === "number" && invoice.discount > 0) {
    totalsRows.push(
      `<tr><td>${t(lang, "Descuento", "Discount")} (${invoice.discount}%)</td><td class="price">-${esc(
        formatPrice(invoice.discountAmount ?? 0)
      )}</td></tr>`
    );
  }
  if (typeof invoice.taxAmount === "number" && invoice.taxAmount > 0) {
    const rate = invoice.taxRate ? ` (${invoice.taxRate}%)` : "";
    totalsRows.push(
      `<tr><td>ITBMS${rate}</td><td class="price">${esc(formatPrice(invoice.taxAmount))}</td></tr>`
    );
  }

  const paymentLabel = invoice.paymentMethod
    ? PAYMENT_LABELS[invoice.paymentMethod]?.[lang] ?? invoice.paymentMethod
    : null;

  const metaRows: string[] = [
    `<div><span>${t(lang, "Recibo", "Receipt")}</span><b>${esc(invoice.id)}</b></div>`,
    `<div><span>${t(lang, "Fecha", "Date")}</span><b>${formatDate(invoice.date, lang)}</b></div>`,
    `<div><span>${t(lang, "Cliente", "Client")}</span><b>${esc(invoice.clientName)}</b></div>`,
  ];
  if (data.stylistName) {
    metaRows.push(
      `<div><span>${t(lang, "Estilista", "Stylist")}</span><b>${esc(data.stylistName)}</b></div>`
    );
  }

  const description = data.descriptionText
    ? `<div class="desc">${esc(data.descriptionText)}</div>`
    : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t(lang, "Recibo", "Receipt")} ${esc(invoice.id)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body {
    width: 80mm;
    padding: 6mm 5mm 8mm;
    font-family: "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.45;
    color: #000;
  }
  .brand-logo {
    display: block;
    width: 46mm;
    height: auto;
    margin: 0 auto 5px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .tagline { text-align: center; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
  .contact { text-align: center; font-size: 10px; color: #222; line-height: 1.5; }
  .divider { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .meta div { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; }
  .meta span { color: #444; }
  .meta b { font-weight: 600; text-align: right; }
  .desc { font-size: 11px; color: #333; margin-top: 4px; font-style: italic; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 2px 0; font-size: 11.5px; }
  .item { padding-right: 8px; }
  .price { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .muted { color: #555; }
  .sub { font-size: 10px; }
  .totals td { font-size: 12px; padding: 1px 0; }
  .grand td { font-size: 15px; font-weight: 700; padding-top: 6px; }
  .pay { text-align: center; font-size: 11px; margin-top: 2px; }
  .thanks { text-align: center; margin-top: 10px; font-size: 12px; }
  .thanks .ig { font-size: 11px; color: #333; margin-top: 2px; }
</style>
</head>
<body>
  ${LOGO_IMG}
  <div class="tagline">${SALON.tagline}</div>
  <div class="contact">
    ${SALON.addressLines.map((l) => esc(l)).join("<br/>")}<br/>
    ${t(lang, "Tel", "Tel")}: ${esc(SALON.phone)}<br/>
    ${esc(SALON.web)}
  </div>

  <hr class="divider" />

  <div class="meta">
    ${metaRows.join("\n    ")}
  </div>
  ${description}

  <hr class="divider" />

  <table>
    ${itemsRows || `<tr><td class="item">${t(lang, "Servicio", "Service")}</td><td class="price">${esc(formatPrice(invoice.amount))}</td></tr>`}
  </table>

  <hr class="divider" />

  <table class="totals">
    ${totalsRows.join("\n    ")}
    <tr class="grand"><td>TOTAL</td><td class="price">${esc(formatPrice(invoice.amount))}</td></tr>
  </table>

  ${paymentLabel ? `<div class="pay">${t(lang, "Método de pago", "Payment method")}: ${esc(paymentLabel)}</div>` : ""}

  <hr class="divider" />

  <div class="thanks">
    ${t(lang, "¡Gracias por tu visita!", "Thank you for your visit!")}
    <div class="ig">${esc(SALON.instagram)}</div>
  </div>
</body>
</html>`;
}

export function printReceipt(data: ReceiptData): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const html = buildReceiptHtml(data);
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  } as CSSStyleDeclaration);
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  let printed = false;
  const trigger = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      /* no-op: user may have cancelled */
    } finally {
      setTimeout(() => iframe.remove(), 800);
    }
  };

  // The iframe's load event fires only after its subresources (the logo image)
  // have loaded, so printing from here guarantees the logo is on the ticket.
  iframe.onload = () => setTimeout(trigger, 120);

  doc.open();
  doc.write(html);
  doc.close();

  // Safety net in case `load` never fires (e.g. the logo request hangs): by now
  // the image has had plenty of time, so print whatever is there.
  setTimeout(() => {
    if (!printed) trigger();
  }, 2500);
}
