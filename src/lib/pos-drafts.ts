// =============================================================================
// POS drafts — local-only "save for later" snapshots of an in-progress sale
//
// The POS auto-persists the CURRENT cart to `mila-pos-cart` so a refresh
// preserves work. Drafts are different: the operator explicitly stashes a
// sale they can't finish right now (waiting on cash, customer stepped out,
// helping someone else first…) and the cart is cleared so they can start a
// new sale. The stashed draft renders under the main card with resume +
// delete actions.
//
// Storage: localStorage under `mila-pos-drafts` as an array. Local-only by
// design — drafts are short-lived, device-bound, and shouldn't sync to
// Firestore (they're personal scratch space, not a business record).
// =============================================================================

import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import type { InvoiceItem } from "@/types";
import type { POSClient } from "@/components/admin/pos/POSClientSelector";

const STORAGE_KEY = "mila-pos-drafts";

export interface POSDraft {
  id: string;
  /** ISO timestamp when the draft was created/saved. */
  createdAt: string;
  /** Snapshot of the cart at the time of saving. */
  client: POSClient | null;
  items: InvoiceItem[];
  stylistId: string | null;
  discount: number;
  /** Optional note the operator typed when saving — for context later. */
  note?: string;
}

/** Read all drafts, newest first. Returns a fresh array, never the stored ref. */
export function listDrafts(): POSDraft[] {
  const raw = getStoredData<POSDraft[]>(STORAGE_KEY, []);
  return [...raw].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Save a new draft. Always creates a new id — never updates an existing one,
 * even if the cart "looks the same" — operators may legitimately want
 * multiple parallel drafts open.
 */
export function saveDraft(
  snapshot: Omit<POSDraft, "id" | "createdAt">
): POSDraft {
  const draft: POSDraft = {
    id: `draft-${generateId()}`,
    createdAt: new Date().toISOString(),
    ...snapshot,
  };
  const next = [draft, ...listDrafts()];
  setStoredData(STORAGE_KEY, next);
  return draft;
}

/** Remove a draft by id. Idempotent: missing id is a no-op. */
export function removeDraft(id: string): void {
  const next = listDrafts().filter((d) => d.id !== id);
  setStoredData(STORAGE_KEY, next);
}

/**
 * A cart is "worth saving" when there's meaningful state. Empty cart with
 * nothing picked is discardable. Any of these counts as draft-worthy:
 *   - at least one item in the cart, OR
 *   - a client picked (even alone — operator likely intends to keep them
 *     while gathering items), OR
 *   - a stylist picked (alone — covers the "phone rang, I started by
 *     picking who would serve them" workflow).
 */
export function isCartDraftWorthy(
  client: POSClient | null,
  items: InvoiceItem[],
  stylistId: string | null
): boolean {
  return items.length > 0 || !!client || !!stylistId;
}
