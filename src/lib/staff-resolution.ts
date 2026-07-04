// =============================================================================
// Server-safe stylist resolution.
//
// The client (StaffProvider) assembles the working stylist list from three
// sources: the seed roster in src/data/stylists.ts, per-stylist overrides in
// staff-config/detail-overrides (commission rates, linked phone, etc.), and
// custom staff documents in the `staff` collection.
//
// Server routes used to read ONLY the `staff` collection — which does not
// contain the seed stylists — so webhook-driven commission generation hit
// `stylist_not_found` for every seed stylist and silently paid $0. This
// helper mirrors the client merge so both sides resolve the same roster.
//
// Pure data + Firestore reads; no React. Safe to import from API routes.
// =============================================================================

import { stylists as seedStylists } from "@/data/stylists";
import { getCollection, getArrayFromDoc, getDocument } from "@/lib/firestore";
import type { Stylist } from "@/types";

/**
 * Fetch the full effective stylist roster: seed stylists with their
 * detail-overrides applied, plus custom staff, minus soft-deleted ids.
 * Individual reads fail soft (empty) so a partial Firestore outage degrades
 * to "seed data only" instead of losing every commission.
 */
export async function fetchAllStylists(): Promise<Stylist[]> {
  const [customStaff, overrideItems, deletedDoc] = await Promise.all([
    getCollection<Stylist>("staff").catch((err) => {
      console.warn("[StaffResolution] Could not read staff collection:", err);
      return [] as Stylist[];
    }),
    getArrayFromDoc<{ id: string } & Partial<Stylist>>(
      "staff-config",
      "detail-overrides"
    ).catch((err) => {
      console.warn("[StaffResolution] Could not read detail-overrides:", err);
      return [] as ({ id: string } & Partial<Stylist>)[];
    }),
    getDocument<{ ids?: string[] }>("staff-config", "deleted").catch((err) => {
      console.warn("[StaffResolution] Could not read deleted staff ids:", err);
      return null;
    }),
  ]);

  const deleted = new Set(deletedDoc?.ids ?? []);
  const overridesById = new Map<string, Partial<Stylist>>();
  for (const item of overrideItems) {
    if (!item?.id) continue;
    const { id, ...rest } = item;
    overridesById.set(id, rest);
  }

  const byId = new Map<string, Stylist>();
  for (const seed of seedStylists) {
    if (deleted.has(seed.id)) continue;
    byId.set(seed.id, { ...seed, ...(overridesById.get(seed.id) ?? {}) } as Stylist);
  }
  for (const staff of customStaff) {
    if (deleted.has(staff.id)) continue;
    const existing = byId.get(staff.id);
    byId.set(staff.id, existing ? ({ ...existing, ...staff } as Stylist) : staff);
  }
  return Array.from(byId.values());
}

/** Same roster, keyed by id — the shape buildCommissionsForInvoice needs. */
export async function fetchStylistsById(): Promise<Map<string, Stylist>> {
  const stylists = await fetchAllStylists();
  return new Map(stylists.map((s) => [s.id, s]));
}
