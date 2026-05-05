"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SentimentPickerModal } from "@/components/sentiment-picker-modal";
import type { BroadRating } from "@/lib/ranking/beli";

type Bookmark = {
  id: string;
  created_at: string;
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

function toGame(game: Bookmark["game"]) {
  if (Array.isArray(game)) return game[0] ?? null;
  return game;
}

export function BookmarksList({
  initialBookmarks,
  rankingsHref = "/rankings",
}: {
  initialBookmarks: Bookmark[];
  rankingsHref?: string;
}) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [rankTarget, setRankTarget] = useState<{
    bookmarkId: string;
    gameId: string;
    gameName: string;
  } | null>(null);
  const [rankError, setRankError] = useState<string | null>(null);
  const [rankSubmitting, setRankSubmitting] = useState(false);

  const sorted = useMemo(
    () =>
      [...bookmarks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [bookmarks],
  );

  async function removeBookmark(bookmarkId: string) {
    await fetch(`/api/bookmarks?id=${bookmarkId}`, { method: "DELETE" });
    setBookmarks((previous) => previous.filter((entry) => entry.id !== bookmarkId));
  }

  async function startRankWithSentiment(rating: BroadRating) {
    if (!rankTarget) return;
    setRankError(null);
    setRankSubmitting(true);
    try {
      const response = await fetch("/api/rankings/add", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "existing",
          gameId: rankTarget.gameId,
          broadRating: rating,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRankError(
          typeof payload.error === "string" ? payload.error : "Could not start ranking.",
        );
        return;
      }
      if (payload.status === "already_ranked") {
        setRankError("That game is already in your ranking.");
        return;
      }

      const bookmarkId = rankTarget.bookmarkId;
      setRankTarget(null);

      if (payload.sessionId) {
        router.push(`/compare?session=${payload.sessionId}`);
        router.refresh();
        return;
      }

      await removeBookmark(bookmarkId);
      router.push(rankingsHref);
      router.refresh();
    } finally {
      setRankSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {sorted.map((bookmark) => {
          const game = toGame(bookmark.game);
          const gameId = game?.id;
          return (
            <div key={bookmark.id} className="rounded-xl bg-black/20 px-3 py-3">
              <div className="flex items-center gap-3">
                {game?.cover_url ? (
                  <Image
                    src={game.cover_url}
                    alt={game.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-md bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{game?.name ?? "Unknown game"}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {(game?.genres_json ?? [])
                      .map((genre) => genre.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary !px-2 !py-1 text-xs"
                    disabled={!gameId}
                    onClick={() => {
                      if (!gameId || !game) return;
                      setRankError(null);
                      setRankTarget({
                        bookmarkId: bookmark.id,
                        gameId,
                        gameName: game.name,
                      });
                    }}
                  >
                    Rank
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary !px-2 !py-1 text-xs"
                    onClick={() => void removeBookmark(bookmark.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 ? (
          <p className="text-sm text-white/70">No bookmarks yet. Add games to your want-to-play list.</p>
        ) : null}
      </div>

      <SentimentPickerModal
        open={Boolean(rankTarget)}
        gameName={rankTarget?.gameName ?? ""}
        submitting={rankSubmitting}
        error={rankError}
        onClose={() => {
          setRankTarget(null);
          setRankError(null);
        }}
        onSelect={(rating) => startRankWithSentiment(rating)}
      />
    </>
  );
}
