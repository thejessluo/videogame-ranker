let cachedGuestId: string | null = null;
let bootstrapPromise: Promise<void> | null = null;
let bootstrapDoneSignedIn = false;

/** Clears cached guest id (e.g. after sign-in as a real user). */
export function resetGuestClientCache() {
  cachedGuestId = null;
  bootstrapPromise = null;
  bootstrapDoneSignedIn = false;
}

/**
 * Ensures we have a guest id for ranking API calls (cookie + optional header fallback).
 * Safe to call before every guest ranking request; dedupes in flight.
 */
export async function ensureGuestIdForApi(): Promise<void> {
  if (cachedGuestId || bootstrapDoneSignedIn) return;
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const response = await fetch("/api/guest/bootstrap", { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (data.signedIn === true) {
        cachedGuestId = null;
        bootstrapDoneSignedIn = true;
        return;
      }
      if (typeof data.guestId === "string" && data.guestId.length > 0) {
        cachedGuestId = data.guestId;
      }
    })().finally(() => {
      bootstrapPromise = null;
    });
  }
  await bootstrapPromise;
}

export function guestIdHeaders(): HeadersInit {
  if (!cachedGuestId) return {};
  return { "x-videogame-guest-id": cachedGuestId };
}
