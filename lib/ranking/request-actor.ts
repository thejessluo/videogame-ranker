import { cookies } from "next/headers";
import { VIDEOGAME_GUEST_COOKIE } from "@/lib/constants";
import { isValidGuestId } from "@/lib/guest-id";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { RankingDbCtx } from "@/lib/ranking/db-ctx";

export async function resolveRankingDbCtx(): Promise<RankingDbCtx | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return { mode: "user", client: supabase, userId: user.id };
  }

  const cookieStore = await cookies();
  const guestId = cookieStore.get(VIDEOGAME_GUEST_COOKIE)?.value;
  if (!isValidGuestId(guestId)) {
    return null;
  }

  const admin = createAdminClientOrNull();
  if (!admin) {
    return null;
  }

  return { mode: "guest", client: admin, guestId };
}
