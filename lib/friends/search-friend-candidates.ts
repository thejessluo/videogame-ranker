import { createAdminClientOrNull } from "@/lib/supabase/admin";

export type FriendSearchRow = { id: string; username: string | null };

/** Strip ilike wildcards so user input cannot broaden matches unintentionally. */
function sanitizeIlikeFragment(raw: string) {
  return raw.replace(/\\/g, "").replace(/%/g, "").replace(/_/g, "").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Server-only: uses service role to search profiles (RLS blocks discovery from the user client).
 * Username: partial match. Email: exact match on auth email via RPC (when deployed).
 */
export async function searchFriendCandidates(
  currentUserId: string,
  rawQuery: string,
): Promise<{ users: FriendSearchRow[]; error: string | null }> {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return { users: [], error: null };
  }

  const admin = createAdminClientOrNull();
  if (!admin) {
    return {
      users: [],
      error: "Friend search is not available (missing SUPABASE_SERVICE_ROLE_KEY on the server).",
    };
  }

  const seen = new Set<string>();
  const users: FriendSearchRow[] = [];

  function push(row: FriendSearchRow) {
    if (row.id === currentUserId || seen.has(row.id)) return;
    seen.add(row.id);
    users.push(row);
  }

  const usernameFragment = sanitizeIlikeFragment(query);
  if (usernameFragment.length >= 2) {
    const { data: usernameRows, error: unError } = await admin
      .from("user_profiles")
      .select("id,username")
      .ilike("username", `%${usernameFragment}%`)
      .neq("id", currentUserId)
      .limit(20);

    if (unError) {
      return { users: [], error: unError.message };
    }
    for (const row of usernameRows ?? []) {
      push(row as FriendSearchRow);
    }
  }

  if (EMAIL_RE.test(query)) {
    const { data: emailRows, error: rpcError } = await admin.rpc("find_user_by_email", {
      lookup_email: query.toLowerCase(),
    });

    if (rpcError) {
      const msg = rpcError.message ?? "";
      if (!/function public\.find_user_by_email|does not exist/i.test(msg)) {
        return { users: [], error: rpcError.message };
      }
    } else if (emailRows && Array.isArray(emailRows)) {
      for (const row of emailRows as FriendSearchRow[]) {
        push(row);
      }
    }
  }

  return { users: users.slice(0, 20), error: null };
}
