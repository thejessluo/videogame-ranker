import Image from "next/image";
import type { HomeRankingRow } from "@/lib/ranking/home-data";
import { RerankButton } from "@/components/rerank-button";
import { RemoveFromRankingButton } from "@/components/remove-from-ranking-button";

function readGame(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export function RankingPreviewBlock({
  rows,
  title,
  emptyMessage,
}: {
  rows: HomeRankingRow[];
  title: string;
  emptyMessage: string;
}) {
  return (
    <section className="panel p-4 sm:p-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-2">
        {rows.map((row) => {
          const game = readGame(row.game) as
            | { id?: string; name?: string; cover_url?: string | null }
            | null;
          return (
            <div
              key={`${game?.id ?? "game"}-${row.rank_position}`}
              className="rounded-xl bg-black/20 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                {game?.cover_url ? (
                  <Image
                    src={game.cover_url}
                    alt={game?.name ?? "Game cover"}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-md bg-white/10" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="mr-2 text-white/60">#{row.rank_position}</span>
                    {game?.name ?? "Unknown game"}
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    Score {row.score} · {row.broad_rating}
                  </p>
                  {game?.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RerankButton gameId={game.id} inline />
                      <RemoveFromRankingButton
                        gameId={game.id}
                        gameName={game.name ?? "this game"}
                        inline
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? <p className="text-sm text-white/70">{emptyMessage}</p> : null}
      </div>
    </section>
  );
}
