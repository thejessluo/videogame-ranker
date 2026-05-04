import { createClient } from "@supabase/supabase-js";

/** True when anonymous (guest) ranking APIs can run. Guest tables are service-role only in RLS. */
export function hasServiceRoleConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/** Server-only Supabase client (bypasses RLS). Used for anonymous guest rankings. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (or URL). Guest rankings require the service role key on the server.",
    );
  }
  return createClient(url, key);
}

export function createAdminClientOrNull() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}
