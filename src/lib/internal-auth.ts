// =============================================================================
// Internal API authentication
//
// The /api/notifications/email and /api/notifications/whatsapp routes are
// internal-only primitives: they must never be callable directly from the
// public internet (otherwise they become an open email/WhatsApp spam relay).
//
// Server-side callers (webhook, cron jobs, the dispatch route) attach the
// shared INTERNAL_API_SECRET header. The notification routes reject any
// request that does not present it.
//
// Fail-closed: if INTERNAL_API_SECRET is not configured, the routes reject
// every request rather than silently accepting them.
// =============================================================================

const HEADER = "x-internal-secret";

/** The configured internal secret, or undefined if unset/blank. */
export function getInternalSecret(): string | undefined {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  return secret ? secret : undefined;
}

/** Headers a trusted server-side caller attaches when calling internal routes. */
export function internalAuthHeaders(): Record<string, string> {
  const secret = getInternalSecret();
  return secret ? { [HEADER]: secret } : {};
}

/**
 * Returns true only when the request presents the correct internal secret.
 * Fails closed when INTERNAL_API_SECRET is not configured.
 */
export function isInternalRequestAuthorized(request: Request): boolean {
  const expected = getInternalSecret();
  if (!expected) {
    console.error(
      "[internal-auth] INTERNAL_API_SECRET is not configured — rejecting request."
    );
    return false;
  }
  return request.headers.get(HEADER) === expected;
}
