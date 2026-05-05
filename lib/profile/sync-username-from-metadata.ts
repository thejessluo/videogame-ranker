import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * If the profile has no username yet but signUp stored `username` in auth user_metadata
 * (e.g. email confirmation delayed a session), copy it into user_profiles once.
 */
export async function syncProfileUsernameFromMetadata(
  supabase: SupabaseServer,
  userId: string,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pending = user?.user_metadata?.username;
  if (typeof pending !== "string") return null;

  const uname = pending.trim().toLowerCase();
  if (uname.length < 3 || !/^[a-z0-9_]+$/.test(uname)) return null;

  const { data: row } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (row?.username?.trim()) {
    return row.username.trim();
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      username: uname,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return null;
  return uname;
}
