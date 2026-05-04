/** 503 body / modal copy when guest ranking APIs cannot run (missing service role env). */
export const RANKING_GUEST_UNAVAILABLE =
  "Anonymous rankings need SUPABASE_SERVICE_ROLE_KEY on the server (Supabase → Project Settings → API → service_role). Add it to .env.local for local dev (run `npx supabase status` if you use the CLI), or sign in.";
