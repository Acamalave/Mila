// =============================================================================
// Commission generation — pure helpers shared by the client (CommissionProvider)
// and the server (payments webhook). Both call sites need the same logic so
// commissions land identically whether the invoice was paid from the POS, the
// client-side card modal, or via the Paguelo Facil webhook.
//
// Key design points
// -----------------
// • Pure: no React, no provider state, no `useState`. Safe to import from API
//   routes and Lambda functions.
// • Deterministic IDs: `comm-${invoiceId}-${itemIdx}-${stylistId}`. Calling the
//   generator twice for the same invoice (e.g. client modal AND webhook) is a
//   no-op because Firestore `setDocument(..., {merge: true})` upserts the same
//   doc. No duplicates.
// • Surface "lost" commissions: when an item has no stylist we can attribute
//   to, we emit a warning record so admins can act on it instead of losing the
//   payout silently.
// =============================================================================

import type { CommissionRecord, Invoice, Stylist } from "@/types";

export interface CommissionWarning {
  invoiceId: string;
  itemIndex: number;
  itemId: string;
  itemType: string;
  reason:
    | "missing_stylist_id"
    | "stylist_not_found"
    | "non_billable_item_type"
    | "zero_amount"
    | "invalid_rate";
  /** Stylist id we tried to look up — present for `stylist_not_found`. */
  stylistId?: string;
  detail?: string;
}

export interface CommissionGenerationResult {
  records: CommissionRecord[];
  warnings: CommissionWarning[];
}

/**
 * Resolve the commission percentage to apply for a given (stylist, item).
 *
 * Lookup order:
 *   1. Per-service override on the stylist (`serviceCommissions[serviceId]`).
 *   2. Per-product override (uses the same `serviceCommissions` array — keyed
 *      by product id when the item is a product the stylist also sells).
 *   3. `productCommission` (only for items of type `product`).
 *   4. `defaultCommission`.
 *   5. Hardcoded fallback of 40% — last resort, never reached when the staff
 *      form requires a default commission.
 */
export function commissionRateFor(
  stylist: Stylist,
  itemId: string,
  itemType: "service" | "product"
): number {
  const override = stylist.serviceCommissions?.find((sc) => sc.serviceId === itemId);
  if (override?.percentage != null) return override.percentage;
  if (itemType === "product" && typeof stylist.productCommission === "number") {
    return stylist.productCommission;
  }
  return stylist.defaultCommission ?? 40;
}

/** Items that we may need to commission. Today: services + products. */
const COMMISSIONABLE_ITEM_TYPES = new Set(["service", "product"]);

/**
 * Build a deterministic commission id for an (invoice, item, stylist) tuple.
 * Two callers writing the same id end up with one document instead of two —
 * that's the idempotency guarantee.
 */
export function buildCommissionId(
  invoiceId: string,
  itemIndex: number,
  stylistId: string
): string {
  return `comm-${invoiceId}-${itemIndex}-${stylistId}`;
}

/**
 * Generate commission records for a paid invoice without touching any I/O.
 * Caller is responsible for writing the records (and any warnings) to
 * Firestore or local state.
 *
 * Returns an empty result for invoices that are not yet `paid`. For invoices
 * with no items[] but a `stylistId` + `amount`, falls back to generating a
 * SINGLE commission for that stylist on the full invoice amount — this
 * covers "quick invoices" created from the admin form without explicit
 * line items. Per-item warnings are returned alongside the records so the
 * caller can surface them to an admin queue.
 */
export function buildCommissionsForInvoice(
  invoice: Invoice,
  stylistsById: ReadonlyMap<string, Stylist>
): CommissionGenerationResult {
  const records: CommissionRecord[] = [];
  const warnings: CommissionWarning[] = [];

  if (invoice.status !== "paid") return { records, warnings };

  // Fallback path: no items[]. Operators commonly create "quick invoices"
  // through the admin form by typing just a total + stylist + description.
  // Without this fallback those invoices would silently generate zero
  // commissions even though they're paid.
  if (!invoice.items || invoice.items.length === 0) {
    if (!invoice.stylistId) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: 0,
        itemId: invoice.serviceId ?? "invoice-amount",
        itemType: "service",
        reason: "missing_stylist_id",
        detail:
          "Invoice has no items[] and no invoice-level stylistId — no one to pay the commission to.",
      });
      return { records, warnings };
    }
    const stylist = stylistsById.get(invoice.stylistId);
    if (!stylist) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: 0,
        itemId: invoice.serviceId ?? "invoice-amount",
        itemType: "service",
        reason: "stylist_not_found",
        stylistId: invoice.stylistId,
      });
      return { records, warnings };
    }
    if (typeof invoice.amount !== "number" || invoice.amount <= 0) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: 0,
        itemId: invoice.serviceId ?? "invoice-amount",
        itemType: "service",
        reason: "zero_amount",
        stylistId: invoice.stylistId,
      });
      return { records, warnings };
    }
    // `invoice.amount` is already the FINAL total (post-discount + tax),
    // so we don't re-apply the discount here. We do strip the tax portion
    // when present, so the stylist only earns commission on the service /
    // product portion (not on what the gov takes).
    const taxAmount = invoice.taxAmount ?? 0;
    const commissionableBase =
      Math.round(Math.max(0, invoice.amount - taxAmount) * 100) / 100;
    const serviceId = invoice.serviceId ?? "invoice-amount";
    const rate = commissionRateFor(stylist, serviceId, "service");
    if (rate < 0 || rate > 100 || Number.isNaN(rate)) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: 0,
        itemId: serviceId,
        itemType: "service",
        reason: "invalid_rate",
        stylistId: invoice.stylistId,
        detail: `Rate ${rate} is outside [0, 100]`,
      });
      return { records, warnings };
    }
    const commissionAmount =
      Math.round(((commissionableBase * rate) / 100) * 100) / 100;
    records.push({
      id: buildCommissionId(invoice.id, 0, stylist.id),
      stylistId: stylist.id,
      invoiceId: invoice.id,
      serviceId,
      serviceAmount: commissionableBase,
      commissionRate: rate,
      commissionAmount,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return { records, warnings };
  }

  const discountPct = invoice.discount ?? 0;
  const createdAt = new Date().toISOString();

  invoice.items.forEach((item, index) => {
    if (!COMMISSIONABLE_ITEM_TYPES.has(item.type)) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: index,
        itemId: item.id,
        itemType: item.type,
        reason: "non_billable_item_type",
      });
      return;
    }

    // Per-item attribution wins; fall back to invoice-level stylistId.
    const itemStylistId = item.stylistId ?? invoice.stylistId;
    if (!itemStylistId) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: index,
        itemId: item.id,
        itemType: item.type,
        reason: "missing_stylist_id",
        detail:
          "Item has no stylistId and the invoice has no stylistId either — no one to pay the commission to.",
      });
      return;
    }

    const stylist = stylistsById.get(itemStylistId);
    if (!stylist) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: index,
        itemId: item.id,
        itemType: item.type,
        reason: "stylist_not_found",
        stylistId: itemStylistId,
      });
      return;
    }

    const itemGross = item.price * item.quantity;
    if (itemGross <= 0) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: index,
        itemId: item.id,
        itemType: item.type,
        reason: "zero_amount",
        stylistId: itemStylistId,
      });
      return;
    }

    const rate = commissionRateFor(stylist, item.id, item.type);
    if (rate < 0 || rate > 100 || Number.isNaN(rate)) {
      warnings.push({
        invoiceId: invoice.id,
        itemIndex: index,
        itemId: item.id,
        itemType: item.type,
        reason: "invalid_rate",
        stylistId: itemStylistId,
        detail: `Rate ${rate} is outside [0, 100]`,
      });
      return;
    }

    const itemNet = Math.round(itemGross * (1 - discountPct / 100) * 100) / 100;
    const commissionAmount = Math.round(((itemNet * rate) / 100) * 100) / 100;

    records.push({
      id: buildCommissionId(invoice.id, index, stylist.id),
      stylistId: stylist.id,
      invoiceId: invoice.id,
      serviceId: item.id,
      serviceAmount: itemNet,
      commissionRate: rate,
      commissionAmount,
      status: "pending",
      createdAt,
    });
  });

  return { records, warnings };
}
