"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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

export function BookmarksList({ initialBookmarks }: { initialBookmarks: Bookmark[] }) {
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const sorted = useMemo(
    () =>
      [...bookmarks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [bookmarks],
  );

  return (
    <div className="space-y-2">
      {sorted.map((bookmark) => {
        const game = toGame(bookmark.game);
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
              <button
                className="btn btn-secondary !px-2 !py-1 text-xs"
                onClick={async () => {
                  await fetch(`/api/bookmarks?id=${bookmark.id}`, { method: "DELETE" });
                  setBookmarks((previous) =>
                    previous.filter((entry) => entry.id !== bookmark.id),
                  );
                }}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 ? (
        <p className="text-sm text-white/70">No bookmarks yet. Add games to your want-to-play list.</p>
      ) : null}
    </div>
  );
}
