// =============================================================================
// Payment gateway fees — Paguelo Facil (Panamá)
//
// What the gateway keeps from every card charge. Used by the accountant
// dashboard to subtract from gross revenue and arrive at net.
//
// Defaults reflect Paguelo Facil's standard merchant rate for small
// retail/services accounts. If the operator negotiates a different rate
// they can later be moved to Firestore config; for now they live as
// constants so the math is auditable.
// =============================================================================

import type { Invoice } from "@/types";

/** Percentage of the charged amount the gateway keeps. */
export const PF_FEE_PERCENT = 3.95;
/** Fixed per-transaction fee in USD. */
export const PF_FEE_FIXED_USD = 0.3;

/**
 * Compute the gateway fee for a single card charge of `amount` USD.
 * Counter payments (cash) pay no gateway fee.
 */
export function gatewayFeeForAmount(amount: number): number {
  if (amount <= 0) return 0;
  const fee = (amount * PF_FEE_PERCENT) / 100 + PF_FEE_FIXED_USD;
  return Math.round(fee * 100) / 100;
}

/**
 * True when an invoice was charged via the gateway (card). Counter / cash
 * payments are zero-fee. The signal is `paymentMethod === "card"` when
 * set, with a fallback to `paymentTransactionId` presence for older
 * records that didn't store the method explicitly.
 */
export function wasChargedByGateway(invoice: Invoice): boolean {
  if (invoice.paymentMethod === "card") return true;
  if (invoice.paymentMethod === "counter") return false;
  // Legacy: assume any paid invoice with a transaction id (not a manual
  // marker like `manual-…`) went through the gateway.
  return (
    invoice.status === "paid" &&
    !!invoice.paymentTransactionId &&
    !invoice.paymentTransactionId.startsWith("manual-") &&
    !invoice.paymentTransactionId.startsWith("counter-")
  );
}

/**
 * Total gateway fees across a list of paid invoices. Helpful for period
 * aggregates.
 */
export function totalGatewayFees(invoices: Invoice[]): number {
  let sum = 0;
  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    if (!wasChargedByGateway(inv)) continue;
    sum += gatewayFeeForAmount(inv.amount);
  }
  return Math.round(sum * 100) / 100;
}
