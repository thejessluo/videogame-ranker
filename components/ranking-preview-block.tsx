import type { HomeRankingRow } from "@/lib/ranking/home-data";
import { RankingGameRows } from "@/components/ranking-game-rows";

export function RankingPreviewBlock({
  rows,
  title,
  emptyMessage,
  showRowActions = false,
}: {
  rows: HomeRankingRow[];
  title: string;
  emptyMessage: string;
  /** Re-rank / remove — use on the full rankings page; keep off the home preview. */
  showRowActions?: boolean;
}) {
  return (
    <section className="panel p-4 sm:p-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-white/70">{emptyMessage}</p>
      ) : (
        <RankingGameRows rows={rows} showRowActions={showRowActions} />
      )}
    </section>
  );
}
