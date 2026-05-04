"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

type MatchupGame = {
  id: string;
  name: string;
  cover_url: string | null;
  rating: number;
  released: string | null;
};

type State = {
  loading: boolean;
  error: string | null;
  games: MatchupGame[];
};

export function CompareClient({ genreSlug }: { genreSlug: string }) {
  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    games: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const loadMatchup = useCallback(async () => {
    let response = await fetch(`/api/matchup?genre=${encodeURIComponent(genreSlug)}`);

    if (response.status === 409) {
      await fetch("/api/rawg/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genreSlug, perGenreLimit: 40 }),
      });
      response = await fetch(`/api/matchup?genre=${encodeURIComponent(genreSlug)}`);
    }

    const payload = await response.json();
    if (!response.ok) {
      setState({
        loading: false,
        error: payload.error ?? "Could not load matchup.",
        games: [],
      });
      return;
    }

    setState({
      loading: false,
      error: null,
      games: payload.games ?? [],
    });
  }, [genreSlug]);

  async function vote(winnerGameId: string) {
    if (state.games.length !== 2) return;
    const [gameA, gameB] = state.games;
    setSubmitting(true);

    const response = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genreSlug,
        gameAId: gameA.id,
        gameBId: gameB.id,
        winnerGameId,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setState((previous) => ({
        ...previous,
        error: payload.error ?? "Could not submit vote.",
      }));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setState((previous) => ({ ...previous, loading: true, error: null }));
    await loadMatchup();
  }

  if (state.loading) {
    return <p className="text-sm text-white/70">Loading matchup...</p>;
  }

  if (state.error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-300">{state.error}</p>
        <button
          className="btn btn-secondary"
          onClick={async () => {
            setState({ loading: true, error: null, games: [] });
            await loadMatchup();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.games.length !== 2) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-white/70">
          Tap below to fetch your next matchup in this genre.
        </p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            setState({ loading: true, error: null, games: [] });
            await loadMatchup();
          }}
        >
          Load matchup
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/70">
        Pick the better game. Ratings update instantly in this genre.
      </p>

      <div className="grid gap-3">
        {state.games.map((game) => (
          <button
            key={game.id}
            disabled={submitting}
            onClick={() => vote(game.id)}
            className="panel flex w-full items-center gap-3 p-3 text-left transition hover:opacity-95 disabled:opacity-70"
          >
            {game.cover_url ? (
              <Image
                src={game.cover_url}
                alt={game.name}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-lg object-cover"
              />
            ) : (
              <div className="h-[72px] w-[72px] rounded-lg bg-white/10" />
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{game.name}</p>
              <p className="text-xs text-white/70">
                Elo {Math.round(game.rating)} {game.released ? `· ${game.released}` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between text-sm">
        <Link href="/" className="text-white/70">
          Change genre
        </Link>
        <Link href={`/rankings?genre=${genreSlug}`} className="text-[var(--accent-2)]">
          View rankings
        </Link>
      </div>
    </div>
  );
}
