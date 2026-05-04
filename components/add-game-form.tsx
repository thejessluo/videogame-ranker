"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureGuestIdForApi, guestIdHeaders } from "@/lib/guest-client";

type SearchGame = {
  rawgId: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  released: string | null;
  genres: Array<{ id?: number; name: string; slug?: string }>;
};

const broadRatings = ["loved", "liked", "okay", "disliked", "hated"] as const;
type Candidate =
  | { type: "rawg"; game: SearchGame }
  | { type: "manual"; game: { title: string; genres: string[] } };

export function AddGameForm({ allowBookmarks = false }: { allowBookmarks?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualGenres, setManualGenres] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const tags = useMemo(
    () =>
      manualGenres
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [manualGenres],
  );

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/games/search?q=${encodeURIComponent(query.trim())}`);
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Search failed.");
      return;
    }
    setHasSearched(true);
    setResults(payload.games ?? []);
  }

  async function addRawgWithSentiment(
    game: SearchGame,
    broadRating: (typeof broadRatings)[number],
  ) {
    setError(null);
    await ensureGuestIdForApi();
    const response = await fetch("/api/rankings/add", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...guestIdHeaders(),
      },
      body: JSON.stringify({
        mode: "rawg",
        broadRating,
        rawgGame: game,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not add game.");
      return;
    }
    if (payload.status === "already_ranked") {
      setError("That game is already in your ranking.");
      setSelectedCandidate(null);
      return;
    }
    setSelectedCandidate(null);
    if (payload.sessionId) {
      router.push(`/compare?session=${payload.sessionId}`);
      router.refresh();
      return;
    }
    router.push("/rankings");
    router.refresh();
  }

  async function addManualWithSentiment(
    game: { title: string; genres: string[] },
    broadRating: (typeof broadRatings)[number],
  ) {
    setError(null);
    await ensureGuestIdForApi();
    const response = await fetch("/api/rankings/add", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...guestIdHeaders(),
      },
      body: JSON.stringify({
        mode: "manual",
        broadRating,
        manualGame: {
          title: game.title,
          genres: game.genres,
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not add manual game.");
      return;
    }
    if (payload.status === "already_ranked") {
      setError("That game is already in your ranking.");
      setSelectedCandidate(null);
      return;
    }
    setSelectedCandidate(null);
    if (payload.sessionId) {
      router.push(`/compare?session=${payload.sessionId}`);
      router.refresh();
      return;
    }
    router.push("/rankings");
    router.refresh();
  }

  async function bookmarkRawg(game: SearchGame) {
    if (!allowBookmarks) {
      setError("Sign in to save bookmarks.");
      return;
    }
    setError(null);
    const response = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "rawg",
        rawgGame: game,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not bookmark game.");
      return;
    }
    router.push("/bookmarks");
  }

  async function bookmarkManual() {
    if (!allowBookmarks) {
      setError("Sign in to save bookmarks.");
      return;
    }
    if (!manualTitle.trim()) return;
    setError(null);
    const response = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "manual",
        manualGame: {
          title: manualTitle.trim(),
          genres: tags,
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not bookmark game.");
      return;
    }
    router.push("/bookmarks");
  }

  return (
    <section className="panel p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Add and rank a game</h2>
      <p className="mt-1 text-sm text-white/70">
        Search/select first, then sentiment popup, then comparison placement.
      </p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search RAWG (e.g. Hades)"
          className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "..." : "Search"}
        </button>
      </form>

      {results.length > 0 ? (
        <div className="mt-3 space-y-2">
          {results.map((game) => (
            <div key={game.rawgId} className="panel p-3">
              <div className="flex items-center gap-3">
                {game.coverUrl ? (
                  <Image
                    src={game.coverUrl}
                    alt={game.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-md bg-white/10" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{game.name}</p>
                  <p className="text-xs text-white/70">
                    {game.released ?? "Unknown date"} ·{" "}
                    {game.genres.map((genre) => genre.name).join(", ")}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => {
                    setError(null);
                    setSelectedCandidate({ type: "rawg", game });
                  }}
                >
                  Rank this
                </button>
                {allowBookmarks ? (
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => bookmarkRawg(game)}
                  >
                    Bookmark
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hasSearched ? (
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="mb-2 text-sm font-medium">Manual add fallback</p>
          <p className="mb-3 text-xs text-white/60">
            Use this if your game did not appear in RAWG search results.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              placeholder="Game title"
              className="rounded-lg border border-white/15 bg-black/20 px-3 py-2"
            />
            <input
              value={manualGenres}
              onChange={(event) => setManualGenres(event.target.value)}
              placeholder="Genres (comma-separated)"
              className="rounded-lg border border-white/15 bg-black/20 px-3 py-2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!manualTitle.trim()) return;
                setError(null);
                setSelectedCandidate({
                  type: "manual",
                  game: { title: manualTitle.trim(), genres: tags },
                });
              }}
              className="btn btn-primary"
            >
              Rank manual game
            </button>
            {allowBookmarks ? (
              <button type="button" onClick={bookmarkManual} className="btn btn-secondary">
                Bookmark manual game
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error && !selectedCandidate ? (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      ) : null}

      {selectedCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="panel w-full max-w-md p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-white/70">How was it?</p>
                <h3 className="text-xl font-semibold">
                  {selectedCandidate.type === "rawg"
                    ? selectedCandidate.game.name
                    : selectedCandidate.game.title}
                </h3>
              </div>
              <button
                className="text-white/70"
                onClick={() => {
                  setSelectedCandidate(null);
                  setError(null);
                }}
                aria-label="Close sentiment modal"
              >
                X
              </button>
            </div>
            {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {broadRatings.map((rating) => (
                <button
                  key={rating}
                  disabled={submitting}
                  className="btn btn-secondary text-left capitalize"
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      if (selectedCandidate.type === "rawg") {
                        await addRawgWithSentiment(selectedCandidate.game, rating);
                      } else {
                        await addManualWithSentiment(selectedCandidate.game, rating);
                      }
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
