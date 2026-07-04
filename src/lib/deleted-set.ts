/**
 * Cross-device soft-delete helper.
 *
 * Each domain (bookings, invoices, commissions, users, staff) keeps a
 * `<domain>-config/deleted` document with `{ ids: string[] }`. Local code
 * mirrors that into `localStorage["mila-<domain>-deleted"]` for fast reads.
 *
 * There is also a `<domain>-config/restored` document with the same shape.
 * An id present there is treated as ALIVE even if some device still lists it
 * as deleted — this is the recovery path for records that were tombstoned by
 * mistake (e.g. the old orphan auto-cleanup hiding valid commissions).
 * Restored wins over deleted; a later markDeleted() re-deletes by removing
 * the id from the restored set again.
 *
 * Always re-read the localStorage set from disk before filtering — closures
 * over a snapshot taken at mount time miss runtime deletions performed in
 * other components.
 */

import { getStoredData, setStoredData } from "@/lib/utils";
import { setDocument, getDocument, onDocumentChange } from "@/lib/firestore";

export type DeletedDomain = "bookings" | "invoices" | "commissions" | "users" | "staff";

const STORAGE_PREFIX = "mila-";
const CONFIG_COLLECTION_SUFFIX = "-config";
const DELETED_DOC_ID = "deleted";
const RESTORED_DOC_ID = "restored";

function deletedKey(domain: DeletedDomain): string {
  return `${STORAGE_PREFIX}${domain}-deleted`;
}

function restoredKey(domain: DeletedDomain): string {
  return `${STORAGE_PREFIX}${domain}-restored`;
}

function configCollection(domain: DeletedDomain): string {
  return `${domain}${CONFIG_COLLECTION_SUFFIX}`;
}

function rawDeleted(domain: DeletedDomain): string[] {
  return getStoredData<string[]>(deletedKey(domain), []);
}

function rawRestored(domain: DeletedDomain): string[] {
  return getStoredData<string[]>(restoredKey(domain), []);
}

/** Read the latest EFFECTIVE deleted-id Set for a domain (deleted minus
 * restored). Always call inside listeners — never close over the result,
 * since other components may add IDs at any time. */
export function getDeletedSet(domain: DeletedDomain): Set<string> {
  const restored = new Set(rawRestored(domain));
  return new Set(rawDeleted(domain).filter((id) => !restored.has(id)));
}

/**
 * Union the given ids into a `<domain>-config` doc WITHOUT clobbering ids
 * some other device added meanwhile. `setDoc({merge:true})` replaces the
 * whole `ids` array, so a device with a stale local mirror used to erase
 * everyone else's tombstones — read-union-write closes that hole (a
 * concurrent writer can still race us, but the periodic re-push on mount
 * makes the union converge instead of oscillating).
 */
async function unionIdsIntoDoc(
  domain: DeletedDomain,
  docId: string,
  ids: string[]
): Promise<void> {
  const remote = await getDocument<{ ids?: string[] }>(configCollection(domain), docId);
  const merged = Array.from(new Set([...(remote?.ids ?? []), ...ids]));
  if (remote?.ids && merged.length === remote.ids.length) return; // nothing new
  await setDocument(configCollection(domain), docId, { ids: merged });
}

/** Mark an ID as deleted locally and propagate to Firestore so other devices
 * stop reading it back. If the id had been restored, the restore is undone so
 * the delete takes effect again. Idempotent. */
export function markDeleted(domain: DeletedDomain, id: string): void {
  const restored = rawRestored(domain);
  if (restored.includes(id)) {
    const nextRestored = restored.filter((r) => r !== id);
    setStoredData(restoredKey(domain), nextRestored);
    setDocument(configCollection(domain), RESTORED_DOC_ID, { ids: nextRestored }).catch(
      (err) => console.warn(`[Mila] Failed to sync ${domain} un-restore:`, err)
    );
  }
  const ids = rawDeleted(domain);
  if (ids.includes(id)) return;
  const next = [...ids, id];
  setStoredData(deletedKey(domain), next);
  unionIdsIntoDoc(domain, DELETED_DOC_ID, next).catch((err) =>
    console.warn(`[Mila] Failed to sync ${domain} delete:`, err)
  );
}

/** Subscribe to remote deletions AND restorations for a domain — useful in
 * providers so the local sets pick up changes performed on another device.
 * Returns the unsubscribe function. The callback (when given) receives the
 * effective deleted ids. */
export function subscribeDeletedSet(
  domain: DeletedDomain,
  callback?: (ids: string[]) => void
): () => void {
  const emit = () => callback?.(Array.from(getDeletedSet(domain)));

  const unsubDeleted = onDocumentChange<{ ids?: string[] }>(
    configCollection(domain),
    DELETED_DOC_ID,
    (data) => {
      if (!data?.ids) return;
      const merged = Array.from(new Set([...rawDeleted(domain), ...data.ids]));
      setStoredData(deletedKey(domain), merged);
      emit();
    }
  );
  const unsubRestored = onDocumentChange<{ ids?: string[] }>(
    configCollection(domain),
    RESTORED_DOC_ID,
    (data) => {
      if (!data?.ids) return;
      const merged = Array.from(new Set([...rawRestored(domain), ...data.ids]));
      setStoredData(restoredKey(domain), merged);
      emit();
    }
  );
  return () => {
    unsubDeleted();
    unsubRestored();
  };
}

/** Push any locally-known deletes to Firestore. Use on provider mount so a
 * device that deleted IDs while offline syncs them up on reconnect. UNIONS
 * with whatever the remote doc already has — a device with a stale local
 * mirror must never erase tombstones created elsewhere. Ids that were
 * restored (locally known) are excluded so a stale device doesn't resurrect
 * a tombstone that admin explicitly lifted. */
export function pushLocalDeletes(domain: DeletedDomain): void {
  const restored = new Set(rawRestored(domain));
  const ids = rawDeleted(domain).filter((id) => !restored.has(id));
  if (ids.length === 0) return;
  unionIdsIntoDoc(domain, DELETED_DOC_ID, ids).catch(() => {});
}
