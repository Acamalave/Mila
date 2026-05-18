/**
 * Service-level overrides set by admin in /admin/services.
 *
 * The static `services` array in `@/data/services` is the seed; admin can
 * override `name`, `price`/`priceMax`, and `durationMinutes` per service.
 * Both POS, billing, and the public booking flow MUST consult these helpers
 * before reading the static seed — otherwise the price the admin edited never
 * reaches the client.
 */

import { getStoredData } from "@/lib/utils";
import { services } from "@/data/services";
import type { Service } from "@/types/service";

type PriceOverrides = Record<string, { price: number; priceMax?: number }>;
type NameOverrides = Record<string, { en: string; es: string }>;
type DurationOverrides = Record<string, number>;

function priceOverrides(): PriceOverrides {
  return getStoredData<PriceOverrides>("mila-service-price-overrides", {});
}

function nameOverrides(): NameOverrides {
  return getStoredData<NameOverrides>("mila-service-name-overrides", {});
}

function durationOverrides(): DurationOverrides {
  return getStoredData<DurationOverrides>("mila-service-duration-overrides", {});
}

/** Returns the service with admin overrides applied. Falls back to static
 * seed values when no override exists. Returns undefined if the seed itself
 * doesn't have a service with that id. */
export function getEffectiveService(serviceId: string): Service | undefined {
  const seed = services.find((s) => s.id === serviceId);
  if (!seed) return undefined;
  return applyOverrides(seed);
}

/** Apply overrides to a Service object. Pure helper — also used to map a
 * full list (e.g. for service pickers). */
export function applyOverrides(seed: Service): Service {
  const prices = priceOverrides();
  const names = nameOverrides();
  const durations = durationOverrides();
  const pOverride = prices[seed.id];
  const nOverride = names[seed.id];
  const dOverride = durations[seed.id];
  return {
    ...seed,
    name: nOverride ?? seed.name,
    price: pOverride?.price ?? seed.price,
    priceMax: pOverride?.priceMax ?? seed.priceMax,
    durationMinutes: dOverride ?? seed.durationMinutes,
  };
}

/** Returns the full service list with overrides applied. Use this whenever
 * you need to render or charge against services. */
export function getEffectiveServices(): Service[] {
  return services.map(applyOverrides);
}

export function getEffectivePrice(serviceId: string): number {
  return getEffectiveService(serviceId)?.price ?? 0;
}

export function getEffectiveName(
  serviceId: string,
  language: "en" | "es"
): string {
  return getEffectiveService(serviceId)?.name[language] ?? serviceId;
}

export function getEffectiveDuration(serviceId: string): number {
  return getEffectiveService(serviceId)?.durationMinutes ?? 30;
}
