export type BroadRating = "liked_it" | "fine" | "didnt_like";

/** Display-only numeric score; list order is source of truth. */
export const SENTIMENT_SCORE_BANDS: Record<BroadRating, { min: number; max: number }> = {
  liked_it: { min: 7.0, max: 10.0 },
  fine: { min: 4.0, max: 6.99 },
  didnt_like: { min: 0.0, max: 3.99 },
};

/** Short labels for UI (matches picker copy). */
export const BROAD_RATING_DISPLAY: Record<BroadRating, string> = {
  liked_it: "I liked it!",
  fine: "It was fine",
  didnt_like: "I didn't like it",
};

export function broadRatingDisplayLabel(value: string | undefined | null): string {
  return BROAD_RATING_DISPLAY[normalizeBroadRating(value)];
}

/**
 * Maps stored `broad_rating` text to the current tier model.
 * Legacy 5-tier values are folded into the nearest new band.
 */
export function normalizeBroadRating(value: string | undefined | null): BroadRating {
  const v = (value ?? "fine").toLowerCase().trim();
  if (v === "liked_it" || v === "liked-it") return "liked_it";
  if (v === "fine") return "fine";
  if (v === "didnt_like" || v === "didnt-like" || v === "did_not_like") return "didnt_like";
  // Legacy migration
  if (v === "loved" || v === "liked") return "liked_it";
  if (v === "okay") return "fine";
  if (v === "disliked" || v === "hated") return "didnt_like";
  return "fine";
}

function roundScore(value: number) {
  return Number(value.toFixed(2));
}

/**
 * Within one sentiment band, spread scores by order among games sharing that sentiment.
 * sentimentRankIndex 0 = best (highest in list) within the group → band max.
 */
export function scoreFromSentimentOrdinal(
  sentimentRankIndex: number,
  sentimentGroupSize: number,
  broadRating: string,
) {
  const key = normalizeBroadRating(broadRating);
  const { min, max } = SENTIMENT_SCORE_BANDS[key];
  if (sentimentGroupSize <= 1) {
    return roundScore(max);
  }
  const denom = Math.max(1, sentimentGroupSize - 1);
  const raw = min + (1 - sentimentRankIndex / denom) * (max - min);
  return roundScore(Math.min(max, Math.max(min, raw)));
}

/**
 * Ordered list = absolute rank (best first). Each DB rewrite deletes + reinserts the full list
 * with rank_position 1..n and fresh scores — scores are never “carried forward” independently of order.
 * Each score stays inside its row’s sentiment band; only position within that band changes.
 */
export function displayScoresForOrderedList<T extends { broad_rating?: string | null }>(
  orderedRows: T[],
): number[] {
  const counts = new Map<BroadRating, number>();
  for (const row of orderedRows) {
    const br = normalizeBroadRating(row.broad_rating);
    counts.set(br, (counts.get(br) ?? 0) + 1);
  }
  const nextIndex = new Map<BroadRating, number>();
  const scores: number[] = [];
  for (const row of orderedRows) {
    const br = normalizeBroadRating(row.broad_rating);
    const idx = nextIndex.get(br) ?? 0;
    nextIndex.set(br, idx + 1);
    const size = counts.get(br) ?? 1;
    scores.push(scoreFromSentimentOrdinal(idx, size, br));
  }
  return scores;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Valid inclusive global insert index range `[minG, maxG]` for `newTier` when the list is
 * strictly segmented as **liked_it → fine → didnt_like** (index 0 = best).
 * Used so a lower tier (e.g. fine) is never head-to-head placed above a higher tier (liked_it)
 * when the tier slot is already unique (e.g. two liked_it, new fine → only `g === 2`).
 */
export function tierInsertInclusiveBounds(
  fullRanked: { broad_rating?: string | null }[],
  newTier: BroadRating,
): { minG: number; maxG: number } {
  const n = fullRanked.length;
  const tiers = fullRanked.map((r) => normalizeBroadRating(r.broad_rating));

  if (newTier === "liked_it") {
    const firstNonLiked = tiers.findIndex((t) => t !== "liked_it");
    const maxG = firstNonLiked === -1 ? n : firstNonLiked;
    return { minG: 0, maxG };
  }

  if (newTier === "fine") {
    const lastLiked = tiers.lastIndexOf("liked_it");
    const firstDont = tiers.indexOf("didnt_like");
    const minG = lastLiked === -1 ? 0 : lastLiked + 1;
    const maxG = firstDont === -1 ? n : firstDont;
    return { minG, maxG };
  }

  const lastFine = tiers.lastIndexOf("fine");
  const lastLiked = tiers.lastIndexOf("liked_it");
  const lastMiddle = Math.max(lastFine, lastLiked);
  const minG = lastMiddle === -1 ? 0 : lastMiddle + 1;
  return { minG, maxG: n };
}
