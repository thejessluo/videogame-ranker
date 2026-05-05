import type { SupabaseClient } from "@supabase/supabase-js";
import { syncProfileUsernameFromMetadata } from "@/lib/profile/sync-username-from-metadata";

export async function getProfileUsername(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const synced = await syncProfileUsernameFromMetadata(supabase, userId);
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  return profile?.username?.trim() || synced || null;
}
