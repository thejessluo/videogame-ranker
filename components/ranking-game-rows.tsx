"use client";

import Image from "next/image";
import { useState } from "react";
import { GameAboutModal } from "@/components/game-about-modal";
import { RerankButton } from "@/components/rerank-button";
import { RemoveFromRankingButton } from "@/components/remove-from-ranking-button";
import { broadRatingDisplayLabel } from "@/lib/ranking/beli";
import type { HomeRankingRow } from "@/lib/ranking/home-data";

function readGame(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export function RankingGameRows({
  rows,
  showRowActions = false,
  showSentiment = true,
}: {
  rows: HomeRankingRow[];
  showRowActions?: boolean;
  showSentiment?: boolean;
}) {
  const [aboutRawgId, setAboutRawgId] = useState<number | null>(null);

  return (
    <>
      <div className="space-y-2">
        {rows.map((row) => {
          const game = readGame(row.game) as
            | {
                id?: string;
                name?: string;
                cover_url?: string | null;
                rawg_id?: number | null;
              }
            | null;
          const rawgRaw = game?.rawg_id;
          const rid =
            typeof rawgRaw === "string"
              ? Number.parseInt(rawgRaw, 10)
              : typeof rawgRaw === "number"
                ? rawgRaw
                : NaN;
          const rawgOk = Number.isFinite(rid) && rid > 0;

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
                    {rawgOk ? (
                      <button
                        type="button"
                        className="text-left font-medium text-white underline-offset-2 hover:text-[var(--accent-2)] hover:underline"
                        onClick={() => setAboutRawgId(Math.trunc(rid))}
                      >
                        {game?.name ?? "Unknown game"}
                      </button>
                    ) : (
                      <span>{game?.name ?? "Unknown game"}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    {showSentiment
                      ? `Score ${row.score} · ${broadRatingDisplayLabel(row.broad_rating)}`
                      : `Score ${row.score}`}
                  </p>
                  {showRowActions && game?.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RerankButton gameId={game.id} gameName={game.name ?? "this game"} inline />
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
      </div>
      <GameAboutModal rawgId={aboutRawgId} onClose={() => setAboutRawgId(null)} />
    </>
  );
}
