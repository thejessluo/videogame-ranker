"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameAboutModal } from "@/components/game-about-modal";
import { RerankButton } from "@/components/rerank-button";
import { RemoveFromRankingButton } from "@/components/remove-from-ranking-button";
import { ensureGuestIdForApi, guestIdHeaders } from "@/lib/guest-client";
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
  const router = useRouter();
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

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
          const existingNote = row.notes?.trim() ?? "";
          const isEditing = editingGameId === game?.id;
          const hasNoteLane = isEditing || Boolean(existingNote);

          return (
            <div
              key={`${game?.id ?? "game"}-${row.rank_position}`}
              className="rounded-xl bg-black/20 px-3 py-3"
            >
              <div
                className={
                  hasNoteLane
                    ? "grid grid-cols-1 gap-3 sm:grid-cols-[19rem_minmax(0,1fr)] sm:items-stretch sm:gap-x-4 sm:gap-y-3"
                    : "flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3"
                }
              >
                <div
                  className={`flex min-w-0 w-full items-start gap-3 ${hasNoteLane ? "sm:h-full sm:max-w-none" : "shrink-0"}`}
                >
                  {game?.cover_url ? (
                    <Image
                      src={game.cover_url}
                      alt={game?.name ?? "Game cover"}
                      width={44}
                      height={44}
                      className="h-11 w-11 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-md bg-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium [text-wrap:pretty]">
                      <span className="mr-2 shrink-0 text-white/60">#{row.rank_position}</span>
                      {rawgOk ? (
                        <button
                          type="button"
                          className="whitespace-normal text-left font-medium text-white underline-offset-2 hover:text-[var(--accent-2)] hover:underline"
                          onClick={() => setAboutRawgId(Math.trunc(rid))}
                        >
                          {game?.name ?? "Unknown game"}
                        </button>
                      ) : (
                        <span className="whitespace-normal">{game?.name ?? "Unknown game"}</span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-white/70">
                        {showSentiment
                          ? `Score ${row.score} · ${broadRatingDisplayLabel(row.broad_rating)}`
                          : `Score ${row.score}`}
                      </span>
                    </div>
                    {showRowActions && game?.id ? (
                      <>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <RerankButton gameId={game.id} gameName={game.name ?? "this game"} inline />
                          <RemoveFromRankingButton
                            gameId={game.id}
                            gameName={game.name ?? "this game"}
                            inline
                          />
                          <button
                            type="button"
                            className="btn btn-secondary !py-1 !px-2 text-xs"
                            onClick={() => {
                              setNoteError(null);
                              setEditingGameId(game.id ?? null);
                              setNoteDraft(existingNote);
                            }}
                          >
                            {existingNote ? "Edit note" : "Add note"}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-start">
                    <div className="w-full max-w-sm rounded-lg border border-white/10 bg-black/25 p-2">
                      <textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value.slice(0, 140))}
                        maxLength={140}
                        rows={3}
                        className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-xs text-white placeholder:text-white/45"
                        placeholder="Optional note (max 140 chars)"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-white/55">{noteDraft.length}/140</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary !py-1 !px-2 text-xs"
                            onClick={() => {
                              setEditingGameId(null);
                              setNoteError(null);
                              setNoteDraft("");
                            }}
                            disabled={noteSaving}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary !py-1 !px-2 text-xs"
                            onClick={async () => {
                              if (!game.id) return;
                              setNoteSaving(true);
                              setNoteError(null);
                              await ensureGuestIdForApi();
                              const response = await fetch("/api/rankings/note", {
                                method: "POST",
                                credentials: "include",
                                headers: {
                                  "Content-Type": "application/json",
                                  ...guestIdHeaders(),
                                },
                                body: JSON.stringify({
                                  gameId: game.id,
                                  notes: noteDraft.trim().slice(0, 140),
                                }),
                              });
                              const payload = await response.json().catch(() => ({}));
                              setNoteSaving(false);
                              if (!response.ok) {
                                setNoteError(payload.error ?? "Could not save note.");
                                return;
                              }
                              setEditingGameId(null);
                              setNoteDraft("");
                              setNoteError(null);
                              router.refresh();
                            }}
                            disabled={noteSaving}
                          >
                            {noteSaving ? "Saving..." : "Save note"}
                          </button>
                        </div>
                      </div>
                      {noteError ? <p className="mt-1 text-xs text-red-300">{noteError}</p> : null}
                    </div>
                  </div>
                ) : existingNote ? (
                  <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-start">
                    <p className="w-full min-w-0 break-words text-left text-[11px] italic text-sky-200/65 max-sm:[text-wrap:pretty] sm:text-xs">
                      &ldquo;{existingNote}&rdquo;
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <GameAboutModal rawgId={aboutRawgId} onClose={() => setAboutRawgId(null)} />
    </>
  );
}
