"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

type GameCard = {
  id: string;
  name: string;
  cover_url?: string | null;
  genres_json?: Array<{ name?: string }>;
};

type State = {
  loading: boolean;
  error: string | null;
  done: boolean;
  resultMessage: string | null;
  needsFollowup: boolean;
  newGame: GameCard | null;
  comparedGame: GameCard | null;
  progress: string | null;
};

export function CompareClient({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    done: false,
    resultMessage: null,
    needsFollowup: false,
    newGame: null,
    comparedGame: null,
    progress: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);

  const loadMatchup = useCallback(async () => {
    const response = await fetch(`/api/rankings/session?sessionId=${sessionId}`);
    const payload = await response.json();
    if (!response.ok) {
      setState({
        loading: false,
        error: payload.error ?? "Could not load matchup.",
        done: false,
        resultMessage: null,
        needsFollowup: false,
        newGame: null,
        comparedGame: null,
        progress: null,
      });
      return;
    }

    if (payload.status === "done" || payload.status === "ready_to_insert") {
      setState({
        loading: false,
        error: null,
        done: true,
        resultMessage: "Done! Your game was inserted into your ranking.",
        needsFollowup: false,
        newGame: null,
        comparedGame: null,
        progress: null,
      });
      return;
    }

    if (payload.status === "no_comparable_games") {
      setState({
        loading: false,
        error: null,
        done: true,
        resultMessage:
          payload.message ?? "No comparable games found yet, so this game was not placed.",
        needsFollowup: true,
        newGame: null,
        comparedGame: null,
        progress: null,
      });
      return;
    }

    setState({
      loading: false,
      error: null,
      done: false,
      resultMessage: null,
      needsFollowup: false,
      newGame: payload.newGame,
      comparedGame: payload.comparedGame,
      progress: payload.progress ?? null,
    });
  }, [sessionId]);

  async function vote(preferred: "new" | "existing" | "skip") {
    setSubmitting(true);

    const response = await fetch("/api/rankings/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        preferred,
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

    const payload = await response.json().catch(() => ({}));
    if (payload.status === "skipped") {
      setSubmitting(false);
      setState({
        loading: false,
        error: null,
        done: true,
        resultMessage: payload.message ?? "Skipped. Game was not auto-placed.",
        needsFollowup: true,
        newGame: null,
        comparedGame: null,
        progress: null,
      });
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
            setState((previous) => ({ ...previous, loading: true, error: null }));
            await loadMatchup();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.done) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-300">{state.resultMessage ?? "Done."}</p>
        {state.needsFollowup ? (
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              disabled={followupLoading}
              onClick={async () => {
                setFollowupLoading(true);
                const response = await fetch("/api/rankings/session/followup", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sessionId,
                    action: "rank_globally_anyway",
                  }),
                });
                const payload = await response.json().catch(() => ({}));
                setFollowupLoading(false);
                if (!response.ok) {
                  setState((previous) => ({
                    ...previous,
                    error: payload.error ?? "Could not rank globally.",
                    done: false,
                  }));
                  return;
                }
                setState((previous) => ({
                  ...previous,
                  resultMessage: "Placed in your global ranking.",
                  needsFollowup: false,
                }));
              }}
            >
              Rank globally anyway
            </button>
            <button
              className="btn btn-secondary"
              disabled={followupLoading}
              onClick={async () => {
                setFollowupLoading(true);
                const response = await fetch("/api/rankings/session/followup", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sessionId,
                    action: "save_unranked",
                  }),
                });
                const payload = await response.json().catch(() => ({}));
                setFollowupLoading(false);
                if (!response.ok) {
                  setState((previous) => ({
                    ...previous,
                    error: payload.error ?? "Could not save as unranked.",
                    done: false,
                  }));
                  return;
                }
                setState((previous) => ({
                  ...previous,
                  resultMessage: "Saved unranked for later.",
                  needsFollowup: false,
                }));
              }}
            >
              Save unranked for later
            </button>
          </div>
        ) : null}
        <Link href="/rankings" className="btn btn-primary inline-flex">
          View ranking
        </Link>
      </div>
    );
  }

  if (!state.newGame || !state.comparedGame) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-white/70">
          Tap below to start your next comparison.
        </p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            setState((previous) => ({ ...previous, loading: true, error: null }));
            await loadMatchup();
          }}
        >
          Start comparisons
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/70">
        Which did you like more?
      </p>
      {state.progress ? <p className="text-xs text-white/60">Position search: {state.progress}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {[state.newGame, state.comparedGame].map((game, index) => (
          <div key={game.id} className="panel p-3">
            {game.cover_url ? (
              <Image
                src={game.cover_url}
                alt={game.name}
                width={300}
                height={180}
                className="mb-2 h-32 w-full rounded-lg object-cover"
              />
            ) : null}
            <p className="truncate text-base font-semibold">{game.name}</p>
            <p className="mt-1 text-xs text-white/70">
              {(game.genres_json ?? [])
                .map((genre) => genre.name)
                .filter(Boolean)
                .join(", ")}
            </p>
            <button
              className="btn btn-primary mt-3 w-full"
              onClick={() => vote(index === 0 ? "new" : "existing")}
              disabled={submitting}
            >
              Prefer {index === 0 ? "left" : "right"}
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <button className="text-white/70" onClick={() => vote("skip")} disabled={submitting}>
          Too different / skip
        </button>
        <Link href="/rankings" className="text-[var(--accent-2)]">
          View rankings
        </Link>
      </div>
    </div>
  );
}
