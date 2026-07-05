// =============================================================================
// Revenue helpers — single source of truth for "money actually collected"
//
// Three pages used to compute this independently:
//   - /admin (today's KPIs)
//   - /admin/accounting (period totals + breakdown)
//   - /admin/billing (period summary)
//   - /accountant (mirrors accounting)
//
// Each had subtly different rules:
//   - Some filtered by `paidAt`, others by `date`
//   - Some included declined-then-refunded as "paid", others not
//   - End-of-period boundaries differed by a millisecond
//
// Consolidating into one helper keeps the three numbers in lock-step so an
// operator never sees $1,247 in one place and $1,253 in another.
// =============================================================================

import type { Invoice } from "@/types";
import { localIsoDate } from "@/lib/date-utils";

/**
 * Decide which timestamp counts an invoice as "in this period". A paid
 * invoice with `paidAt` uses that — that's when the money actually
 * cleared. Unpaid / draft / sent invoices fall back to their `date`
 * (issue date), which is what the operator filters by in the billing
 * tab.
 *
 * `paidAt` is a UTC ISO timestamp, so it is converted to the LOCAL
 * calendar day. Slicing the raw string put every payment made after
 * 7:00 PM (Panamá, UTC-5) on the NEXT day, zeroing the evening's
 * "revenue today" KPI.
 */
function settlementDate(inv: Invoice): string {
  if (inv.status === "paid" && inv.paidAt) return localIsoDate(inv.paidAt);
  return inv.date;
}

/** Inclusive date-range filter on the settlement date. */
export function invoicesInRange(
  invoices: Invoice[],
  startDateIso: string,
  endDateIso: string
): Invoice[] {
  return invoices.filter((inv) => {
    const d = settlementDate(inv);
    return d >= startDateIso && d <= endDateIso;
  });
}

/** Strictly paid invoices in the range. */
export function paidInvoicesInRange(
  invoices: Invoice[],
  startDateIso: string,
  endDateIso: string
): Invoice[] {
  return invoicesInRange(invoices, startDateIso, endDateIso).filter(
    (inv) => inv.status === "paid"
  );
}

/** Sum of paid invoice amounts in the range. */
export function paidRevenueInRange(
  invoices: Invoice[],
  startDateIso: string,
  endDateIso: string
): number {
  return paidInvoicesInRange(invoices, startDateIso, endDateIso).reduce(
    (sum, inv) => sum + (inv.amount ?? 0),
    0
  );
}

/**
 * Outstanding receivables in the range: sent + overdue invoices. Draft
 * and declined are excluded — drafts haven't been billed yet and declined
 * are written off.
 */
export function pendingInvoicesInRange(
  invoices: Invoice[],
  startDateIso: string,
  endDateIso: string
): Invoice[] {
  return invoicesInRange(invoices, startDateIso, endDateIso).filter(
    (inv) => inv.status === "sent" || inv.status === "overdue"
  );
}

/** Sum of pending receivable amounts in the range. */
export function pendingAmountInRange(
  invoices: Invoice[],
  startDateIso: string,
  endDateIso: string
): number {
  return pendingInvoicesInRange(invoices, startDateIso, endDateIso).reduce(
    (sum, inv) => sum + (inv.amount ?? 0),
    0
  );
}

/** Total billed (any non-declined status) in the range. */
export function totalBilledInRange(
  invoices: Invoice[],
  startDateIso: string,
  endDateIso: string
): number {
  return invoicesInRange(invoices, startDateIso, endDateIso).reduce(
    (sum, inv) => sum + (inv.amount ?? 0),
    0
  );
}
