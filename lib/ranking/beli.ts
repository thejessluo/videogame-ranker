export type BroadRating = "loved" | "liked" | "okay" | "disliked" | "hated";

/** Display-only numeric score; list order is source of truth. */
export const SENTIMENT_SCORE_BANDS: Record<BroadRating, { min: number; max: number }> = {
  loved: { min: 8.5, max: 10 },
  liked: { min: 7.0, max: 8.49 },
  okay: { min: 5.0, max: 6.99 },
  disliked: { min: 2.5, max: 4.99 },
  hated: { min: 0, max: 2.49 },
};

export function normalizeBroadRating(value: string | undefined | null): BroadRating {
  const v = (value ?? "okay").toLowerCase().trim();
  if (
    v === "loved" ||
    v === "liked" ||
    v === "okay" ||
    v === "disliked" ||
    v === "hated"
  ) {
    return v;
  }
  return "okay";
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

export function initialBoundsFromSentiment(
  total: number,
  broadRating: BroadRating,
) {
  if (total <= 1) return { low: 0, high: Math.max(total - 1, 0) };

  const q1 = Math.floor(total * 0.25);
  const q2 = Math.floor(total * 0.5);
  const q3 = Math.floor(total * 0.75);

  switch (broadRating) {
    case "loved":
      return { low: 0, high: Math.max(q1, 0) };
    case "liked":
      return { low: Math.max(q1, 0), high: Math.max(q2, 0) };
    case "okay":
      return { low: Math.max(q1, 0), high: Math.max(q3, 0) };
    case "disliked":
      return { low: Math.max(q2, 0), high: Math.max(total - 2, 0) };
    case "hated":
      return { low: Math.max(q3, 0), high: Math.max(total - 1, 0) };
    default:
      return { low: 0, high: Math.max(total - 1, 0) };
  }
}
