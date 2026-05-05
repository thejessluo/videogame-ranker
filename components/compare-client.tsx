"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ensureGuestIdForApi, guestIdHeaders } from "@/lib/guest-client";

type GameCard = {
  id: string;
  name: string;
  cover_url?: string | null;
  genres_json?: Array<{ name?: string }>;
  /** Present on the existing-list game in a matchup. */
  rankPosition?: number | null;
  listScore?: number | null;
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
    loading: true,
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
    await ensureGuestIdForApi();
    const response = await fetch(`/api/rankings/session?sessionId=${sessionId}`, {
      credentials: "include",
      headers: { ...guestIdHeaders() },
    });
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
        resultMessage:
          typeof payload.message === "string"
            ? payload.message
            : "Done! Your game was inserted into your ranking.",
        needsFollowup: false,
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

  useEffect(() => {
    queueMicrotask(() => {
      void loadMatchup();
    });
  }, [loadMatchup]);

  async function vote(preferred: "new" | "existing" | "skip") {
    setSubmitting(true);
    await ensureGuestIdForApi();

    const response = await fetch("/api/rankings/session", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...guestIdHeaders(),
      },
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

    if (payload.status === "done") {
      setSubmitting(false);
      setState({
        loading: false,
        error: null,
        done: true,
        resultMessage:
          typeof payload.message === "string"
            ? payload.message
            : "Done! Your game was inserted into your ranking.",
        needsFollowup: false,
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
                await ensureGuestIdForApi();
                const response = await fetch("/api/rankings/session/followup", {
                  method: "POST",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                    ...guestIdHeaders(),
                  },
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
                await ensureGuestIdForApi();
                const response = await fetch("/api/rankings/session/followup", {
                  method: "POST",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                    ...guestIdHeaders(),
                  },
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
        <p className="text-sm text-white/70">No matchup loaded.</p>
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

  const newGame = state.newGame;
  const comparedGame = state.comparedGame;
  const genreLine = (game: GameCard) =>
    (game.genres_json ?? [])
      .map((genre) => genre.name)
      .filter(Boolean)
      .join(", ");

  const comparedMeta =
    comparedGame.rankPosition != null || comparedGame.listScore != null ? (
      <p className="mt-2 text-sm font-medium text-emerald-300/95">
        {comparedGame.rankPosition != null ? `#${comparedGame.rankPosition}` : null}
        {comparedGame.rankPosition != null && comparedGame.listScore != null ? " · " : null}
        {comparedGame.listScore != null ? comparedGame.listScore.toFixed(1) : null}
      </p>
    ) : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-medium text-white/95">Which do you prefer?</p>
        {state.progress ? (
          <p className="mt-1 text-xs text-white/55">Position search: {state.progress}</p>
        ) : null}
      </div>

      {/* Stacked on small screens; side-by-side from lg so phones/tablets portrait stay vertical */}
      <div className="flex flex-col items-stretch gap-0 lg:flex-row lg:items-stretch lg:gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => vote("new")}
          className="group flex min-h-[140px] flex-1 flex-col rounded-2xl border border-white/20 bg-black/25 p-4 text-left shadow-sm transition hover:border-[var(--accent)] hover:bg-black/35 disabled:pointer-events-none disabled:opacity-55 lg:min-h-[220px]"
        >
          {newGame.cover_url ? (
            <Image
              src={newGame.cover_url}
              alt={newGame.name}
              width={400}
              height={220}
              className="mb-3 h-28 w-full rounded-xl object-cover lg:h-36"
            />
          ) : (
            <div className="mb-3 h-28 rounded-xl bg-white/10 lg:h-36" />
          )}
          <p className="text-lg font-semibold leading-snug text-white">{newGame.name}</p>
          <p className="mt-1 text-sm text-white/55">{genreLine(newGame) || "—"}</p>
        </button>

        <div className="relative flex min-h-12 shrink-0 items-center justify-center py-3 lg:w-16 lg:min-h-0 lg:py-8">
          <span
            className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-zinc-950 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg ring-4 ring-black/40"
            aria-hidden
          >
            or
          </span>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={() => vote("existing")}
          className="group flex min-h-[140px] flex-1 flex-col rounded-2xl border border-white/20 bg-black/25 p-4 text-left shadow-sm transition hover:border-[var(--accent)] hover:bg-black/35 disabled:pointer-events-none disabled:opacity-55 lg:min-h-[220px]"
        >
          {comparedGame.cover_url ? (
            <Image
              src={comparedGame.cover_url}
              alt={comparedGame.name}
              width={400}
              height={220}
              className="mb-3 h-28 w-full rounded-xl object-cover lg:h-36"
            />
          ) : (
            <div className="mb-3 h-28 rounded-xl bg-white/10 lg:h-36" />
          )}
          <p className="text-lg font-semibold leading-snug text-white">{comparedGame.name}</p>
          <p className="mt-1 text-sm text-white/55">{genreLine(comparedGame) || "—"}</p>
          {comparedMeta}
        </button>
      </div>

      <p className="text-center text-xs text-white/50">Tap the game you liked more</p>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
        <button
          type="button"
          className="rounded-full px-3 py-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={() => vote("skip")}
          disabled={submitting}
        >
          Too different / skip
        </button>
        <Link href="/rankings" className="text-[var(--accent-2)] hover:underline">
          View rankings
        </Link>
      </div>
    </div>
  );
}
