/**
 * Cross-device soft-delete helper.
 *
 * Each domain (bookings, invoices, commissions, users, staff) keeps a
 * `<domain>-config/deleted` document with `{ ids: string[] }`. Local code
 * mirrors that into `localStorage["mila-<domain>-deleted"]` for fast reads.
 *
 * Always re-read the localStorage set from disk before filtering — closures
 * over a snapshot taken at mount time miss runtime deletions performed in
 * other components.
 */

import { getStoredData, setStoredData } from "@/lib/utils";
import { setDocument, onDocumentChange } from "@/lib/firestore";

export type DeletedDomain = "bookings" | "invoices" | "commissions" | "users" | "staff";

const STORAGE_PREFIX = "mila-";
const STORAGE_SUFFIX = "-deleted";
const CONFIG_COLLECTION_SUFFIX = "-config";
const CONFIG_DOC_ID = "deleted";

function storageKey(domain: DeletedDomain): string {
  return `${STORAGE_PREFIX}${domain}${STORAGE_SUFFIX}`;
}

function configCollection(domain: DeletedDomain): string {
  return `${domain}${CONFIG_COLLECTION_SUFFIX}`;
}

/** Read the latest deleted-id Set for a domain. Always call inside listeners
 * — never close over the result, since other components may add IDs at any
 * time. */
export function getDeletedSet(domain: DeletedDomain): Set<string> {
  return new Set(getStoredData<string[]>(storageKey(domain), []));
}

/** Mark an ID as deleted locally and propagate to Firestore so other devices
 * stop reading it back. Idempotent. */
export function markDeleted(domain: DeletedDomain, id: string): void {
  const ids = getStoredData<string[]>(storageKey(domain), []);
  if (ids.includes(id)) return;
  const next = [...ids, id];
  setStoredData(storageKey(domain), next);
  setDocument(configCollection(domain), CONFIG_DOC_ID, { ids: next }).catch((err) =>
    console.warn(`[Mila] Failed to sync ${domain} delete:`, err)
  );
}

/** Subscribe to remote deletions for a domain — useful in providers so the
 * local set picks up deletes performed on another device. Returns the
 * unsubscribe function. */
export function subscribeDeletedSet(
  domain: DeletedDomain,
  callback?: (ids: string[]) => void
): () => void {
  return onDocumentChange<{ ids?: string[] }>(
    configCollection(domain),
    CONFIG_DOC_ID,
    (data) => {
      if (!data?.ids) return;
      const merged = Array.from(new Set([
        ...getStoredData<string[]>(storageKey(domain), []),
        ...data.ids,
      ]));
      setStoredData(storageKey(domain), merged);
      callback?.(merged);
    }
  );
}

/** Push any locally-known deletes to Firestore. Use on provider mount so a
 * device that deleted IDs while offline syncs them up on reconnect. */
export function pushLocalDeletes(domain: DeletedDomain): void {
  const ids = getStoredData<string[]>(storageKey(domain), []);
  if (ids.length === 0) return;
  setDocument(configCollection(domain), CONFIG_DOC_ID, { ids }).catch(() => {});
}
