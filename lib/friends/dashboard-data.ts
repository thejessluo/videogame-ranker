import type { createClient } from "@/lib/supabase/server";
import { syncProfileUsernameFromMetadata } from "@/lib/profile/sync-username-from-metadata";

type AppSupabase = Awaited<ReturnType<typeof createClient>>;

export type FriendProfileSummary = { id: string; username: string | null };

export type IncomingFriendRequest = {
  id: string;
  status: string;
  created_at: string;
  from_user_id: string;
  from_user: FriendProfileSummary | null;
};

export type OutgoingFriendRequest = {
  id: string;
  status: string;
  created_at: string;
  to_user_id: string;
  to_user: FriendProfileSummary | null;
};

export type FriendsDashboardPayload = {
  me: FriendProfileSummary;
  incoming: IncomingFriendRequest[];
  outgoing: OutgoingFriendRequest[];
  friends: FriendProfileSummary[];
};

export async function getFriendsDashboard(
  supabase: AppSupabase,
  userId: string,
): Promise<{ data: FriendsDashboardPayload | null; error: string | null }> {
  await syncProfileUsernameFromMetadata(supabase, userId);

  const { data: meProfile, error: meError } = await supabase
    .from("user_profiles")
    .select("id,username")
    .eq("id", userId)
    .maybeSingle();
  if (meError) return { data: null, error: meError.message };

  const { data: incoming, error: incomingError } = await supabase
    .from("friend_requests")
    .select("id,status,created_at,from_user_id")
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (incomingError) return { data: null, error: incomingError.message };

  const { data: outgoing, error: outgoingError } = await supabase
    .from("friend_requests")
    .select("id,status,created_at,to_user_id")
    .eq("from_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (outgoingError) return { data: null, error: outgoingError.message };

  const { data: friends, error: friendsError } = await supabase
    .from("friendships")
    .select("id,created_at,user_a_id,user_b_id")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (friendsError) return { data: null, error: friendsError.message };

  const friendIds =
    friends?.map((row) => (row.user_a_id === userId ? row.user_b_id : row.user_a_id)) ?? [];

  let friendProfiles: FriendProfileSummary[] = [];
  if (friendIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id,username")
      .in("id", friendIds);
    if (profilesError) return { data: null, error: profilesError.message };
    friendProfiles = profiles ?? [];
  }

  const incomingIds = Array.from(
    new Set((incoming ?? []).map((row) => row.from_user_id).filter(Boolean)),
  ) as string[];
  const outgoingIds = Array.from(
    new Set((outgoing ?? []).map((row) => row.to_user_id).filter(Boolean)),
  ) as string[];
  const profileIds = Array.from(new Set([...incomingIds, ...outgoingIds]));

  let profilesById: Record<string, FriendProfileSummary> = {};
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id,username")
      .in("id", profileIds);
    if (profilesError) return { data: null, error: profilesError.message };
    profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  return {
    data: {
      me: meProfile ?? { id: userId, username: null },
      incoming: (incoming ?? []).map((row) => ({
        ...row,
        from_user: profilesById[row.from_user_id] ?? null,
      })),
      outgoing: (outgoing ?? []).map((row) => ({
        ...row,
        to_user: profilesById[row.to_user_id] ?? null,
      })),
      friends: friendProfiles,
    },
    error: null,
  };
}
