import { resolveRankingDbCtx } from "@/lib/ranking/request-actor";

export type HomeRankingRow = {
  rank_position: number;
  score: number;
  status: string;
  broad_rating: string;
  notes: string | null;
  tags: string[];
  game:
    | Array<{
        id: string;
        name: string;
        cover_url: string | null;
        genres_json: Array<{ name?: string }>;
      }>
    | {
        id: string;
        name: string;
        cover_url: string | null;
        genres_json: Array<{ name?: string }>;
      }
    | null;
};

export async function fetchMyRankings(limit?: number): Promise<HomeRankingRow[]> {
  const ctx = await resolveRankingDbCtx();
  if (!ctx) {
    return [];
  }

  const rankingsTable = ctx.mode === "user" ? "user_game_rankings" : "guest_game_rankings";
  const ownerCol = ctx.mode === "user" ? "user_id" : "guest_id";
  const ownerId = ctx.mode === "user" ? ctx.userId : ctx.guestId;

  let query = ctx.client
    .from(rankingsTable)
    .select(
      "rank_position,score,status,broad_rating,notes,tags,game:games(id,name,cover_url,genres_json)",
    )
    .eq(ownerCol, ownerId)
    .eq("list_scope", "global")
    .eq("list_key", "all")
    .order("rank_position", { ascending: true });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    return [];
  }
  return (data ?? []) as HomeRankingRow[];
}
