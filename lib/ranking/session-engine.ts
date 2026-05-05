import {
  displayScoresForOrderedList,
  normalizeBroadRating,
  tierInsertInclusiveBounds,
  type BroadRating,
} from "@/lib/ranking/beli";
import type { RankingDbCtx } from "@/lib/ranking/db-ctx";

type AnswerBody = {
  sessionId: string;
  preferred: "new" | "existing" | "skip";
};

type RankedRow = {
  game_id: string;
  rank_position?: number;
  score?: number | string | null;
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

function tables(ctx: RankingDbCtx) {
  if (ctx.mode === "user") {
    return {
      sessions: "ranking_insert_sessions" as const,
      rankings: "user_game_rankings" as const,
      comparisons: "ranking_comparisons" as const,
      ownerCol: "user_id" as const,
      ownerId: ctx.userId,
    };
  }
  return {
    sessions: "guest_ranking_insert_sessions" as const,
    rankings: "guest_game_rankings" as const,
    comparisons: "guest_ranking_comparisons" as const,
    ownerCol: "guest_id" as const,
    ownerId: ctx.guestId,
  };
}

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

/**
 * Non-empty ⇒ at least one ranked game shares a genre tag with the new game (else we “rank
 * globally” by tier only). Head-to-head order within a tier uses {@link buildTierComparableSlice},
 * not this genre filter, so we still compare against every same-tier neighbor in the list.
 */
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

/**
 * Rows to head-to-head compare against when placing the new game: every existing row in the same
 * sentiment tier whose global index lies in the tier slot `[minG, maxG)`. Built from the **full**
 * ordered list (not genre-filtered), so binary search can distinguish order among all peers in that
 * tier—genre overlap alone often leaves a single candidate and skips needed comparisons.
 */
function buildTierComparableSlice(
  fullRanked: RankedRow[],
  newTier: BroadRating,
  minG: number,
  maxG: number,
): RankedRow[] {
  return fullRanked.filter((row, gi) => {
    return normalizeBroadRating(row.broad_rating) === newTier && gi >= minG && gi <= maxG - 1;
  });
}

/** When no ranked game shares a genre tag, we slot using sentiment bands only (see rankGloballyFromPendingSession). */
const AUTO_PLACE_NO_GENRE_OVERLAP =
  "Added to your global ranking. None of your ranked games share a genre tag with this one, so we placed it using only your three-tier pick (liked it / fine / didn’t like): your choice maps to a score band, then a slot inside that band in your existing order—same idea as “rank globally anyway.”";

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

function clampBounds(low: number, high: number, size: number) {
  if (size <= 0) return { low: 0, high: -1 };
  const nextLow = Math.max(0, Math.min(low, size - 1));
  const nextHigh = Math.max(-1, Math.min(high, size - 1));
  return { low: nextLow, high: nextHigh };
}

function midpoint(low: number, high: number) {
  return Math.floor((low + high) / 2);
}

type CompactRankRow = {
  game_id: string;
  status: string;
  broad_rating: string;
  notes: string | null;
  tags: string[];
};

async function persistFinalRankingList(ctx: RankingDbCtx, finalList: CompactRankRow[]) {
  const scores = displayScoresForOrderedList(finalList);
  const t = tables(ctx);
  const ownerPayload =
    ctx.mode === "user" ? { user_id: ctx.userId } : { guest_id: ctx.guestId };

  const payload = finalList.map((row, index) => ({
    ...ownerPayload,
    list_scope: "global",
    list_key: "all",
    game_id: row.game_id,
    rank_position: index + 1,
    score: scores[index]!,
    status: row.status ?? "played",
    broad_rating: row.broad_rating ?? "fine",
    notes: row.notes ?? null,
    tags: row.tags ?? [],
    updated_at: new Date().toISOString(),
  }));

  const { error: deleteError } = await ctx.client
    .from(t.rankings)
    .delete()
    .eq(t.ownerCol, t.ownerId)
    .eq("list_scope", "global")
    .eq("list_key", "all");
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await ctx.client.from(t.rankings).insert(payload);
  if (insertError) throw new Error(insertError.message);
}

async function insertAtGlobalIndex(
  ctx: RankingDbCtx,
  session: SessionRow,
  fullRanked: RankedRow[],
  globalInsertIndex: number,
) {
  const insertRow: CompactRankRow = {
    game_id: session.game_id,
    status: session.status,
    broad_rating: session.broad_rating,
    notes: session.notes,
    tags: session.tags ?? [],
  };
  const base: CompactRankRow[] = fullRanked.map((r) => ({
    game_id: r.game_id,
    status: r.status,
    broad_rating: r.broad_rating,
    notes: r.notes,
    tags: r.tags ?? [],
  }));
  const finalList = [...base];
  finalList.splice(globalInsertIndex, 0, insertRow);
  await persistFinalRankingList(ctx, finalList);
}

/** Exported for API routes that insert a full order without a comparison session. */
export async function applyGlobalRankingOrder(ctx: RankingDbCtx, rows: CompactRankRow[]) {
  await persistFinalRankingList(ctx, rows);
}

async function getSession(ctx: RankingDbCtx, sessionId: string) {
  const t = tables(ctx);
  const { data, error } = await ctx.client
    .from(t.sessions)
    .select(
      `id,${t.ownerCol},game_id,low,high,broad_rating,status,notes,tags,list_scope,list_key,completed,new_game:games(id,name,cover_url,genres_json)`,
    )
    .eq("id", sessionId)
    .eq(t.ownerCol, t.ownerId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Session not found.");
  return data as SessionRow;
}

async function saveBounds(ctx: RankingDbCtx, sessionId: string, low: number, high: number) {
  const t = tables(ctx);
  await ctx.client
    .from(t.sessions)
    .update({ low, high, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

async function completeSession(ctx: RankingDbCtx, sessionId: string) {
  const t = tables(ctx);
  await ctx.client
    .from(t.sessions)
    .update({ completed: true, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

async function getRankedGames(ctx: RankingDbCtx) {
  const t = tables(ctx);
  const { data, error } = await ctx.client
    .from(t.rankings)
    .select(
      "id,game_id,rank_position,score,status,broad_rating,notes,tags,game:games(id,name,cover_url,genres_json)",
    )
    .eq(t.ownerCol, t.ownerId)
    .eq("list_scope", "global")
    .eq("list_key", "all")
    .order("rank_position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RankedRow[];
}

/**
 * Place the pending session game into the global list using sentiment bands only (same as
 * follow-up "rank globally anyway"). Used when there are no genre-overlapping ranked games
 * to compare against.
 */
export async function rankGloballyFromPendingSession(ctx: RankingDbCtx, sessionId: string) {
  const session = await getSession(ctx, sessionId);
  const t = tables(ctx);

  const { data: existing } = await ctx.client
    .from(t.rankings)
    .select("id")
    .eq(t.ownerCol, t.ownerId)
    .eq("list_scope", "global")
    .eq("list_key", "all")
    .eq("game_id", session.game_id)
    .maybeSingle();
  if (existing) {
    await completeSession(ctx, session.id);
    return;
  }

  const fullRanked = await getRankedGames(ctx);
  const rankedForInsert = fullRanked.map((row) => ({
    game_id: row.game_id,
    status: row.status,
    broad_rating: row.broad_rating,
    notes: row.notes,
    tags: row.tags ?? [],
  }));

  const br = normalizeBroadRating(session.broad_rating);
  const { minG, maxG } = tierInsertInclusiveBounds(rankedForInsert, br);
  let insertAt: number;
  if (minG > maxG) {
    insertAt = Math.min(rankedForInsert.length, Math.max(0, Math.floor(rankedForInsert.length / 2)));
  } else if (minG === maxG) {
    insertAt = minG;
  } else {
    insertAt = Math.floor((minG + maxG) / 2);
  }

  const finalList = [...rankedForInsert];
  finalList.splice(insertAt, 0, {
    game_id: session.game_id,
    status: session.status,
    broad_rating: session.broad_rating,
    notes: session.notes,
    tags: session.tags ?? [],
  });

  await persistFinalRankingList(ctx, finalList);

  await completeSession(ctx, session.id);
}

async function insertAtResolvedPosition(
  ctx: RankingDbCtx,
  session: SessionRow,
  fullRanked: RankedRow[],
  comparable: RankedRow[],
  comparableInsertAt: number,
) {
  const globalInsertAt = resolveGlobalInsertIndex(comparable, comparableInsertAt, fullRanked);
  const base: CompactRankRow[] = fullRanked.map((r) => ({
    game_id: r.game_id,
    status: r.status,
    broad_rating: r.broad_rating,
    notes: r.notes,
    tags: r.tags ?? [],
  }));
  const insertRow: CompactRankRow = {
    game_id: session.game_id,
    status: session.status,
    broad_rating: session.broad_rating,
    notes: session.notes,
    tags: session.tags ?? [],
  };
  const finalList = [...base];
  finalList.splice(globalInsertAt, 0, insertRow);
  await persistFinalRankingList(ctx, finalList);
}

export async function runRankingSessionGet(ctx: RankingDbCtx, sessionId: string) {
  const session = await getSession(ctx, sessionId);

  if (session.completed) return { status: "done" as const };

  const fullRanked = await getRankedGames(ctx);
  const newGame = normalizeGame(session.new_game);
  const comparable = getComparableRankedGames(fullRanked, newGame);

  if (comparable.length === 0) {
    await rankGloballyFromPendingSession(ctx, sessionId);
    return { status: "done" as const, message: AUTO_PLACE_NO_GENRE_OVERLAP };
  }

  const br = normalizeBroadRating(session.broad_rating);
  const { minG, maxG } = tierInsertInclusiveBounds(fullRanked, br);

  if (minG > maxG) {
    await rankGloballyFromPendingSession(ctx, sessionId);
    return { status: "done" as const, message: AUTO_PLACE_NO_GENRE_OVERLAP };
  }

  if (minG === maxG) {
    await insertAtGlobalIndex(ctx, session, fullRanked, minG);
    await completeSession(ctx, session.id);
    return { status: "done" as const };
  }

  const tierComparable = buildTierComparableSlice(fullRanked, br, minG, maxG);

  if (tierComparable.length === 0) {
    await insertAtGlobalIndex(ctx, session, fullRanked, minG);
    await completeSession(ctx, session.id);
    return { status: "done" as const };
  }

  let bounds = clampBounds(session.low, session.high, tierComparable.length);
  if (bounds.low > bounds.high || bounds.low < 0 || bounds.high >= tierComparable.length) {
    bounds = { low: 0, high: tierComparable.length - 1 };
    await saveBounds(ctx, session.id, bounds.low, bounds.high);
  } else if (bounds.low !== session.low || bounds.high !== session.high) {
    await saveBounds(ctx, session.id, bounds.low, bounds.high);
  }

  if (bounds.low > bounds.high) {
    await insertAtResolvedPosition(ctx, session, fullRanked, tierComparable, bounds.low);
    await completeSession(ctx, session.id);
    return { status: "done" as const };
  }

  const mid = midpoint(bounds.low, bounds.high);
  const compared = tierComparable[mid];
  if (!compared) {
    await insertAtResolvedPosition(ctx, session, fullRanked, tierComparable, bounds.low);
    await completeSession(ctx, session.id);
    return { status: "done" as const };
  }

  const comparedGamePayload = (() => {
    const g = normalizeGame(compared.game);
    if (!g) return null;
    const rawScore = compared.score;
    const listScore =
      rawScore !== undefined && rawScore !== null ? Number(rawScore) : null;
    return {
      ...g,
      rankPosition: compared.rank_position ?? null,
      listScore: Number.isFinite(listScore ?? NaN) ? listScore : null,
    };
  })();

  return {
    status: "comparing" as const,
    low: bounds.low,
    high: bounds.high,
    mid,
    newGame,
    comparedGame: comparedGamePayload,
    progress: `${Math.max(1, mid + 1)} / ${Math.max(1, tierComparable.length)}`,
  };
}

export async function runRankingSessionPost(ctx: RankingDbCtx, body: AnswerBody) {
  const t = tables(ctx);
  const session = await getSession(ctx, body.sessionId);
  const fullRanked = await getRankedGames(ctx);
  const newGame = normalizeGame(session.new_game);
  const comparable = getComparableRankedGames(fullRanked, newGame);

  if (body.preferred === "skip") {
    await completeSession(ctx, session.id);
    return {
      status: "skipped" as const,
      message: "Skipped comparison. Game was not auto-placed.",
    };
  }

  if (!session.completed && comparable.length === 0) {
    await rankGloballyFromPendingSession(ctx, body.sessionId);
    return { status: "done" as const, message: AUTO_PLACE_NO_GENRE_OVERLAP };
  }

  if (!session.completed && comparable.length > 0) {
    const br = normalizeBroadRating(session.broad_rating);
    const { minG, maxG } = tierInsertInclusiveBounds(fullRanked, br);

    if (minG > maxG) {
      await rankGloballyFromPendingSession(ctx, body.sessionId);
      return { status: "done" as const, message: AUTO_PLACE_NO_GENRE_OVERLAP };
    }

    if (minG === maxG) {
      await insertAtGlobalIndex(ctx, session, fullRanked, minG);
      await completeSession(ctx, session.id);
      return { status: "done" as const };
    }

    const tierComparable = buildTierComparableSlice(fullRanked, br, minG, maxG);

    if (tierComparable.length === 0) {
      await insertAtGlobalIndex(ctx, session, fullRanked, minG);
      await completeSession(ctx, session.id);
      return { status: "done" as const };
    }

    const bounds = clampBounds(session.low, session.high, tierComparable.length);
    if (bounds.low > bounds.high) {
      await insertAtResolvedPosition(ctx, session, fullRanked, tierComparable, bounds.low);
      await completeSession(ctx, session.id);
      return { status: "done" as const };
    }

    const mid = midpoint(bounds.low, bounds.high);
    const compared = tierComparable[mid];
    if (!compared) throw new Error("Comparison target missing.");

    let low = bounds.low;
    let high = bounds.high;
    if (body.preferred === "new") {
      high = mid - 1;
    } else {
      low = mid + 1;
    }

    if (ctx.mode === "user") {
      await ctx.client.from(t.comparisons).insert({
        user_id: ctx.userId,
        session_id: session.id,
        new_game_id: session.game_id,
        compared_game_id: compared.game_id,
        winner_game_id: body.preferred === "new" ? session.game_id : compared.game_id,
      });
    } else {
      await ctx.client.from(t.comparisons).insert({
        guest_id: ctx.guestId,
        session_id: session.id,
        new_game_id: session.game_id,
        compared_game_id: compared.game_id,
        winner_game_id: body.preferred === "new" ? session.game_id : compared.game_id,
      });
    }

    await ctx.client
      .from(t.sessions)
      .update({ low, high, updated_at: new Date().toISOString() })
      .eq("id", session.id);

    if (low <= high) return { status: "continue" as const };
    await insertAtResolvedPosition(ctx, session, fullRanked, tierComparable, low);
    await completeSession(ctx, session.id);

    return { status: "done" as const };
  }

  return { status: "done" as const };
}
