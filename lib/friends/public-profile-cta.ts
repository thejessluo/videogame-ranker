import type { createClient } from "@/lib/supabase/server";

type AppSupabase = Awaited<ReturnType<typeof createClient>>;

export type PublicFriendCtaInitial =
  | { kind: "signed_out" }
  | { kind: "self" }
  | { kind: "friends" }
  | { kind: "outgoing"; requestId: string }
  | { kind: "incoming"; requestId: string }
  | { kind: "can_add" };

function orderedPair(a: string, b: string) {
  return a < b ? { user_a_id: a, user_b_id: b } : { user_a_id: b, user_b_id: a };
}

export async function getPublicProfileFriendCtaInitial(
  supabase: AppSupabase,
  viewerId: string | null,
  profileUserId: string,
): Promise<PublicFriendCtaInitial> {
  if (!viewerId) return { kind: "signed_out" };
  if (viewerId === profileUserId) return { kind: "self" };

  const pair = orderedPair(viewerId, profileUserId);
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_a_id", pair.user_a_id)
    .eq("user_b_id", pair.user_b_id)
    .maybeSingle();
  if (friendship) return { kind: "friends" };

  const { data: outgoing } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", viewerId)
    .eq("to_user_id", profileUserId)
    .eq("status", "pending")
    .maybeSingle();
  if (outgoing?.id) return { kind: "outgoing", requestId: outgoing.id };

  const { data: incoming } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", profileUserId)
    .eq("to_user_id", viewerId)
    .eq("status", "pending")
    .maybeSingle();
  if (incoming?.id) return { kind: "incoming", requestId: incoming.id };

  return { kind: "can_add" };
}
