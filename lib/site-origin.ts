/**
 * Public site origin for Supabase auth redirects (e.g. signUp emailRedirectTo).
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://your-app.vercel.app) so
 * confirmation links never use localhost from a misconfigured Supabase Site URL.
 * When unset, falls back to the current browser origin.
 */
export function getPublicSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
