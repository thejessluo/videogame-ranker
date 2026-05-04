import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase client + owner for ranking insert session / list reads. */
export type RankingDbCtx =
  | { mode: "user"; client: SupabaseClient; userId: string }
  | { mode: "guest"; client: SupabaseClient; guestId: string };
