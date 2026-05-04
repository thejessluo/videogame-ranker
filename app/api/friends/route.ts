import { NextResponse } from "next/server";
import { getFriendsDashboard } from "@/lib/friends/dashboard-data";
import { createClient } from "@/lib/supabase/server";

type FriendAction =
  | { action: "list" }
  | { action: "search"; query: string }
  | { action: "send_request"; toUserId: string }
  | { action: "respond_request"; requestId: string; decision: "accept" | "reject" }
  | { action: "cancel_request"; requestId: string }
  | { action: "unfriend"; friendUserId: string };

function orderedPair(a: string, b: string) {
  return a < b ? { user_a_id: a, user_b_id: b } : { user_a_id: b, user_b_id: a };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data, error } = await getFriendsDashboard(supabase, user.id);
    if (error || !data) return NextResponse.json({ error: error ?? "Could not load friends." }, { status: 500 });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as FriendAction;

    if (body.action === "search") {
      const query = body.query?.trim();
      if (!query || query.length < 2) {
        return NextResponse.json({ users: [] });
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id,username")
        .ilike("username", `%${query}%`)
        .neq("id", user.id)
        .limit(20);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ users: data ?? [] });
    }

    if (body.action === "send_request") {
      if (!body.toUserId || body.toUserId === user.id) {
        return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });
      }

      const { data: reverse } = await supabase
        .from("friend_requests")
        .select("id,status")
        .eq("from_user_id", body.toUserId)
        .eq("to_user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (reverse?.id) {
        const pair = orderedPair(user.id, body.toUserId);
        const { error: friendshipError } = await supabase.from("friendships").insert(pair);
        if (friendshipError) return NextResponse.json({ error: friendshipError.message }, { status: 500 });

        await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", reverse.id);
        await supabase
          .from("friend_requests")
          .update({ status: "accepted" })
          .eq("from_user_id", user.id)
          .eq("to_user_id", body.toUserId)
          .eq("status", "pending");

        return NextResponse.json({ status: "friends" });
      }

      const { error } = await supabase.from("friend_requests").upsert(
        {
          from_user_id: user.id,
          to_user_id: body.toUserId,
          status: "pending",
        },
        { onConflict: "from_user_id,to_user_id" },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ status: "requested" });
    }

    if (body.action === "respond_request") {
      if (!body.requestId) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });

      const { data: reqRow, error: reqError } = await supabase
        .from("friend_requests")
        .select("id,from_user_id,to_user_id,status")
        .eq("id", body.requestId)
        .single();
      if (reqError || !reqRow) return NextResponse.json({ error: reqError?.message }, { status: 404 });
      if (reqRow.to_user_id !== user.id) {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
      }
      if (reqRow.status !== "pending") {
        return NextResponse.json({ error: "Request is not pending." }, { status: 400 });
      }

      if (body.decision === "reject") {
        const { error } = await supabase
          .from("friend_requests")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", body.requestId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ status: "rejected" });
      }

      const pair = orderedPair(reqRow.from_user_id, reqRow.to_user_id);
      const { error: friendshipError } = await supabase.from("friendships").insert(pair);
      if (friendshipError) return NextResponse.json({ error: friendshipError.message }, { status: 500 });

      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", body.requestId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabase
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("from_user_id", reqRow.to_user_id)
        .eq("to_user_id", reqRow.from_user_id)
        .eq("status", "pending");

      return NextResponse.json({ status: "accepted" });
    }

    if (body.action === "cancel_request") {
      if (!body.requestId) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });
      const { data: reqRow, error: reqError } = await supabase
        .from("friend_requests")
        .select("id,from_user_id,status")
        .eq("id", body.requestId)
        .single();
      if (reqError || !reqRow) return NextResponse.json({ error: reqError?.message }, { status: 404 });
      if (reqRow.from_user_id !== user.id) {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
      }
      if (reqRow.status !== "pending") {
        return NextResponse.json({ error: "Request is not pending." }, { status: 400 });
      }

      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", body.requestId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ status: "cancelled" });
    }

    if (body.action === "unfriend") {
      if (!body.friendUserId) return NextResponse.json({ error: "Missing friendUserId." }, { status: 400 });
      const pair = orderedPair(user.id, body.friendUserId);

      const { error: deleteFriendshipError } = await supabase
        .from("friendships")
        .delete()
        .eq("user_a_id", pair.user_a_id)
        .eq("user_b_id", pair.user_b_id);
      if (deleteFriendshipError) {
        return NextResponse.json({ error: deleteFriendshipError.message }, { status: 500 });
      }

      await supabase
        .from("friend_requests")
        .delete()
        .or(
          `and(from_user_id.eq.${user.id},to_user_id.eq.${body.friendUserId}),and(from_user_id.eq.${body.friendUserId},to_user_id.eq.${user.id})`,
        );

      return NextResponse.json({ status: "unfriended" });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
