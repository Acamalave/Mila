/**
 * Internal note about a client written by staff (admin / accountant).
 *
 * IMPORTANT: never surface these notes to the client themselves — they
 * may contain candid observations or commercial detail. UI-side, only
 * admin surfaces fetch this collection.
 */
export interface ClientNote {
  id: string;
  /** User id (mila-users) the note belongs to. */
  clientId: string;
  text: string;
  /** ISO timestamp. UI sorts by this descending (newest first). */
  createdAt: string;
  /** Staff member id who wrote the note. Optional — older imports may
   *  not have one. */
  createdBy?: string;
  /** Staff member display name at the time the note was written. */
  createdByName?: string;
  /** Optional context: was this note added during a POS sale? Helps the
   *  card surface "Agregada al cobrar" vs "Agregada manualmente". */
  source?: "pos-sale" | "admin-manual";
  /** Optional reference to the invoice this note was created alongside,
   *  when source === "pos-sale". */
  invoiceId?: string;
}
