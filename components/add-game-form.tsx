"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureGuestIdForApi, guestIdHeaders } from "@/lib/guest-client";
import { RANKING_GUEST_UNAVAILABLE } from "@/lib/ranking/guest-messages";
import type { BroadRating } from "@/lib/ranking/beli";

type SearchGame = {
  rawgId: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  released: string | null;
  genres: Array<{ id?: number; name: string; slug?: string }>;
};

/** Three tiers + traffic-light swatches (Beli-style). */
const SENTIMENT_OPTIONS: {
  rating: BroadRating;
  label: string;
  hint: string;
  swatch: string;
}[] = [
  {
    rating: "liked_it",
    label: "I liked it!",
    hint: "I'm locked in",
    swatch:
      "bg-[linear-gradient(145deg,#34d399_0%,#059669_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.25)]",
  },
  {
    rating: "fine",
    label: "It was fine",
    hint: "mid af",
    swatch:
      "bg-[linear-gradient(145deg,#fcd34d_0%,#ca8a04_95%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.28)]",
  },
  {
    rating: "didnt_like",
    label: "I didn't like it",
    hint: "brb uninstalling",
    swatch:
      "bg-[linear-gradient(145deg,#fda4af_0%,#e11d48_95%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.22)]",
  },
];

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
      <p className="mt-1 text-sm text-white/70">
        Search/select first, then sentiment popup, then comparison placement.
      </p>

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sentiment-modal-title"
          aria-describedby="sentiment-modal-desc"
        >
          <div className="panel relative w-full max-w-lg overflow-hidden p-6 shadow-2xl shadow-black/40 sm:p-8">
            <button
              type="button"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-white/55 transition hover:bg-white/10 hover:text-white/90"
              onClick={() => {
                setSelectedCandidate(null);
                setError(null);
              }}
              aria-label="Close sentiment modal"
            >
              ×
            </button>
            <div className="pr-8">
              <p id="sentiment-modal-desc" className="text-sm font-medium text-white/65">
                How was it?
              </p>
              <h3 id="sentiment-modal-title" className="mt-1 font-serif text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                {selectedCandidate.type === "rawg"
                  ? selectedCandidate.game.name
                  : selectedCandidate.game.title}
              </h3>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-center gap-6 sm:gap-8">
              {SENTIMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.rating}
                  type="button"
                  disabled={submitting}
                  className="group flex w-[6.25rem] shrink-0 flex-col items-center gap-2 rounded-2xl p-2 pb-1 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-45 sm:w-[6.75rem]"
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      if (selectedCandidate.type === "rawg") {
                        await addRawgWithSentiment(selectedCandidate.game, opt.rating);
                      } else {
                        await addManualWithSentiment(selectedCandidate.game, opt.rating);
                      }
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <span
                    className={`relative h-[4.25rem] w-[4.25rem] rounded-full ring-2 ring-black/25 transition duration-200 group-hover:scale-[1.06] group-hover:ring-white/25 group-active:scale-[0.97] sm:h-[4.75rem] sm:w-[4.75rem] ${opt.swatch}`}
                    aria-hidden
                  />
                  <span className="text-center text-[13px] font-semibold leading-tight text-white">{opt.label}</span>
                  <span className="text-center text-[11px] leading-snug text-white/45">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
