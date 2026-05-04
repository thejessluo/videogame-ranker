import { NextResponse } from "next/server";
import { scoreFromRank } from "@/lib/ranking/beli";
import { createClient } from "@/lib/supabase/server";

type AnswerBody = {
  sessionId: string;
  preferred: "new" | "existing" | "skip";
};

type RankedRow = {
  game_id: string;
  rank_position?: number;
  status: string;
  broad_rating: string;
  notes: string | null;
  tags: string[];
  game?:
    | Array<{
        id: string;
        name: string;
        cover_url: string | null;
        genres_json: Array<{ name?: string; slug?: string }>;
      }>
    | {
        id: string;
        name: string;
        cover_url: string | null;
        genres_json: Array<{ name?: string; slug?: string }>;
      };
};

type GameRecord = {
  id: string;
  name: string;
  cover_url: string | null;
  genres_json: Array<{ name?: string; slug?: string }>;
};

type SessionRow = {
  id: string;
  user_id?: string;
  game_id: string;
  low: number;
  high: number;
  broad_rating: string;
  status: string;
  notes: string | null;
  tags: string[];
  list_scope?: string;
  list_key?: string;
  completed: boolean;
  new_game?:
    | Array<{
        id: string;
        name: string;
        cover_url: string | null;
        genres_json: Array<{ name?: string; slug?: string }>;
      }>
    | {
        id: string;
        name: string;
        cover_url: string | null;
        genres_json: Array<{ name?: string; slug?: string }>;
      };
};

function normalizeGame(value: RankedRow["game"] | SessionRow["new_game"]): GameRecord | null {
  if (Array.isArray(value)) return (value[0] as GameRecord) ?? null;
  if (value && typeof value === "object") return value as GameRecord;
  return null;
}

function getGenreKeys(game: GameRecord | null) {
  if (!game?.genres_json) return [];
  return game.genres_json
    .map((genre) => (genre.slug ?? genre.name ?? "").toLowerCase().trim())
    .filter(Boolean);
}

function getComparableRankedGames(fullRanked: RankedRow[], newGame: GameRecord | null) {
  const newGenres = new Set(getGenreKeys(newGame));
  if (newGenres.size === 0) {
    return fullRanked;
  }

  return fullRanked.filter((row) => {
    const game = normalizeGame(row.game);
    return getGenreKeys(game).some((genreKey) => newGenres.has(genreKey));
  });
}

function resolveGlobalInsertIndex(
  comparable: RankedRow[],
  comparableInsertAt: number,
  fullRanked: RankedRow[],
) {
  if (comparable.length === 0) return fullRanked.length;

  if (comparableInsertAt <= 0) {
    const firstPosition = comparable[0].rank_position ?? 1;
    return Math.max(0, firstPosition - 1);
  }

  if (comparableInsertAt >= comparable.length) {
    const lastPosition = comparable[comparable.length - 1].rank_position ?? fullRanked.length;
    return Math.min(fullRanked.length, lastPosition);
  }

  const nextPosition = comparable[comparableInsertAt].rank_position ?? fullRanked.length;
  return Math.max(0, Math.min(fullRanked.length, nextPosition - 1));
}

async function getSession(
  sessionId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase
    .from("ranking_insert_sessions")
    .select(
      "id,user_id,game_id,low,high,broad_rating,status,notes,tags,list_scope,list_key,completed,new_game:games(id,name,cover_url,genres_json)",
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Session not found.");
  return data as SessionRow;
}

function clampBounds(low: number, high: number, size: number) {
  if (size <= 0) return { low: 0, high: -1 };
  const nextLow = Math.max(0, Math.min(low, size - 1));
  const nextHigh = Math.max(-1, Math.min(high, size - 1));
  return { low: nextLow, high: nextHigh };
}

async function saveBounds(
  sessionId: string,
  low: number,
  high: number,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  await supabase
    .from("ranking_insert_sessions")
    .update({ low, high, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

async function completeSession(
  sessionId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  await supabase
    .from("ranking_insert_sessions")
    .update({ completed: true, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

async function insertAtResolvedPosition(
  userId: string,
  session: SessionRow,
  fullRanked: RankedRow[],
  comparable: RankedRow[],
  comparableInsertAt: number,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const globalInsertAt = resolveGlobalInsertIndex(comparable, comparableInsertAt, fullRanked);
  const finalList = [...fullRanked];
  finalList.splice(globalInsertAt, 0, {
    game_id: session.game_id,
    status: session.status,
    broad_rating: session.broad_rating,
    notes: session.notes,
    tags: session.tags ?? [],
  });

  const payload = finalList.map((row, index) => ({
    user_id: userId,
    list_scope: "global",
    list_key: "all",
    game_id: row.game_id,
    rank_position: index + 1,
    score: scoreFromRank(index, finalList.length),
    status: row.status ?? "played",
    broad_rating: row.broad_rating ?? "okay",
    notes: row.notes ?? null,
    tags: row.tags ?? [],
    updated_at: new Date().toISOString(),
  }));

  const { error: deleteError } = await supabase
    .from("user_game_rankings")
    .delete()
    .eq("user_id", userId)
    .eq("list_scope", "global")
    .eq("list_key", "all");
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from("user_game_rankings").insert(payload);
  if (insertError) throw new Error(insertError.message);
}

async function getRankedGames(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("user_game_rankings")
    .select(
      "id,game_id,rank_position,score,status,broad_rating,notes,tags,game:games(id,name,cover_url,genres_json)",
    )
    .eq("user_id", userId)
    .eq("list_scope", "global")
    .eq("list_key", "all")
    .order("rank_position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RankedRow[];
}

function midpoint(low: number, high: number) {
  return Math.floor((low + high) / 2);
}

export async function GET(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const session = await getSession(sessionId, user.id, supabase);

    if (session.completed) return NextResponse.json({ status: "done" });

    const fullRanked = await getRankedGames(user.id, supabase);
    const newGame = normalizeGame(session.new_game);
    const comparable = getComparableRankedGames(fullRanked, newGame);

    if (comparable.length === 0) {
      await completeSession(session.id, supabase);
      return NextResponse.json({
        status: "no_comparable_games",
        message:
          "No comparable games found in your ranked list yet. Add more games in similar genres first.",
      });
    }

    const bounds = clampBounds(session.low, session.high, comparable.length);
    if (bounds.low !== session.low || bounds.high !== session.high) {
      await saveBounds(session.id, bounds.low, bounds.high, supabase);
    }

    if (bounds.low > bounds.high || fullRanked.length === 0) {
      return NextResponse.json({ status: "ready_to_insert" });
    }

    const mid = midpoint(bounds.low, bounds.high);
    const compared = comparable[mid];
    if (!compared) return NextResponse.json({ status: "ready_to_insert" });

    return NextResponse.json({
      status: "comparing",
      low: bounds.low,
      high: bounds.high,
      mid,
      newGame,
      comparedGame: normalizeGame(compared.game),
      progress: `${Math.max(1, mid + 1)} / ${Math.max(1, comparable.length)}`,
    });
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

    const body = (await request.json()) as AnswerBody;
    if (!body.sessionId) return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });

    const session = await getSession(body.sessionId, user.id, supabase);
    const fullRanked = await getRankedGames(user.id, supabase);
    const newGame = normalizeGame(session.new_game);
    const comparable = getComparableRankedGames(fullRanked, newGame);

    if (body.preferred === "skip") {
      await completeSession(session.id, supabase);
      return NextResponse.json({
        status: "skipped",
        message: "Skipped comparison. Game was not auto-placed.",
      });
    }

    if (!session.completed && comparable.length > 0) {
      const bounds = clampBounds(session.low, session.high, comparable.length);
      if (bounds.low > bounds.high) {
        await insertAtResolvedPosition(
          user.id,
          session,
          fullRanked,
          comparable,
          bounds.low,
          supabase,
        );
        await completeSession(session.id, supabase);
        return NextResponse.json({ status: "done" });
      }

      const mid = midpoint(bounds.low, bounds.high);
      const compared = comparable[mid];
      if (!compared) return NextResponse.json({ error: "Comparison target missing." }, { status: 500 });

      let low = bounds.low;
      let high = bounds.high;
      if (body.preferred === "new") {
        high = mid - 1;
      } else {
        low = mid + 1;
      }

      await supabase.from("ranking_comparisons").insert({
        user_id: user.id,
        session_id: session.id,
        new_game_id: session.game_id,
        compared_game_id: compared.game_id,
        winner_game_id: body.preferred === "new" ? session.game_id : compared.game_id,
      });

      await supabase
        .from("ranking_insert_sessions")
        .update({ low, high, updated_at: new Date().toISOString() })
        .eq("id", session.id);

      if (low <= high) return NextResponse.json({ status: "continue" });
      await insertAtResolvedPosition(user.id, session, fullRanked, comparable, low, supabase);
      await completeSession(session.id, supabase);

      return NextResponse.json({ status: "done" });
    }

    return NextResponse.json({ status: "done" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
