"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureGuestIdForApi, guestIdHeaders } from "@/lib/guest-client";
import { RANKING_GUEST_UNAVAILABLE } from "@/lib/ranking/guest-messages";
import type { BroadRating } from "@/lib/ranking/beli";
import { GameAboutModal } from "@/components/game-about-modal";
import { SentimentPickerModal } from "@/components/sentiment-picker-modal";

type SearchGame = {
  rawgId: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  released: string | null;
  genres: Array<{ id?: number; name: string; slug?: string }>;
};

type Candidate =
  | { type: "rawg"; game: SearchGame }
  | { type: "manual"; game: { title: string; genres: string[] } };

export function AddGameForm({
  allowBookmarks = false,
  warnAnonymousRankingUnavailable = false,
}: {
  allowBookmarks?: boolean;
  /** Server knows env; show before user wastes a click on sentiment. */
  warnAnonymousRankingUnavailable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualGenres, setManualGenres] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aboutRawgId, setAboutRawgId] = useState<number | null>(null);
  const router = useRouter();

  const tags = useMemo(
    () =>
      manualGenres
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [manualGenres],
  );

  /** Immediate search (Search button / Enter) — bypasses debounce. */
  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Search failed.");
        return;
      }
      setHasSearched(true);
      setResults(payload.games ?? []);
    } finally {
      setLoading(false);
    }
  }

  /** Debounced live search while typing (≥2 characters). */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setError(null);

    const timer = window.setTimeout(() => {
      setLoading(true);
      void (async () => {
        try {
          const response = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            setError(payload.error ?? "Search failed.");
            return;
          }
          setHasSearched(true);
          setResults(payload.games ?? []);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Search failed.");
        } finally {
          setLoading(false);
        }
      })();
    }, 320);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function addRawgWithSentiment(
    game: SearchGame,
    broadRating: BroadRating,
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
      setError(
        payload.error ??
          (response.status === 503 ? RANKING_GUEST_UNAVAILABLE : "Could not add game."),
      );
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
    broadRating: BroadRating,
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
      setError(
        payload.error ??
          (response.status === 503 ? RANKING_GUEST_UNAVAILABLE : "Could not add manual game."),
      );
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

      {warnAnonymousRankingUnavailable ? (
        <div
          className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100/95"
          role="status"
        >
          <p>
            Anonymous rankings aren’t available here yet — add{" "}
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[13px] text-white/90">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{" "}
            to <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[13px]">.env.local</code>{" "}
            (Supabase → Project Settings → API → <span className="whitespace-nowrap">service_role</span>), or{" "}
            <Link
              href="/auth"
              className="font-medium text-[var(--accent-2)] underline decoration-white/25 underline-offset-2"
            >
              sign in
            </Link>
            .
          </p>
        </div>
      ) : null}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const q = query.trim();
          if (q.length < 2) {
            setResults([]);
            setHasSearched(false);
            setError(null);
            setLoading(false);
            return;
          }
          void search();
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a video game (e.g. Hades)"
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
                  <button
                    type="button"
                    className="block max-w-full truncate text-left font-medium text-white underline-offset-2 hover:text-[var(--accent-2)] hover:underline"
                    onClick={() => setAboutRawgId(game.rawgId)}
                  >
                    {game.name}
                  </button>
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

      <GameAboutModal rawgId={aboutRawgId} onClose={() => setAboutRawgId(null)} />

      <SentimentPickerModal
        open={Boolean(selectedCandidate)}
        gameName={
          selectedCandidate
            ? selectedCandidate.type === "rawg"
              ? selectedCandidate.game.name
              : selectedCandidate.game.title
            : ""
        }
        submitting={submitting}
        error={selectedCandidate ? error : null}
        onClose={() => {
          setSelectedCandidate(null);
          setError(null);
        }}
        onSelect={async (rating) => {
          if (!selectedCandidate) return;
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
      />
    </section>
  );
}
