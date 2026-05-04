export type BroadRating = "loved" | "liked" | "okay" | "disliked" | "hated";

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

export function scoreFromRank(index: number, totalGames: number) {
  if (totalGames <= 1) return 10;
  return Number((10 * (1 - index / (totalGames - 1))).toFixed(2));
}
