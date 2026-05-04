"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { RawgGameAbout } from "@/lib/rawg";

type Props = {
  rawgId: number | null;
  onClose: () => void;
};

export function GameAboutModal({ rawgId, onClose }: Props) {
  const open = rawgId !== null;
  const [data, setData] = useState<RawgGameAbout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (rawgId === null) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);

    void (async () => {
      try {
        const response = await fetch(`/api/games/${rawgId}`);
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setError(typeof payload.error === "string" ? payload.error : "Could not load details.");
          return;
        }
        setData(payload.game as RawgGameAbout);
      } catch {
        if (!cancelled) setError("Could not load details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawgId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[48] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-about-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="panel flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">
              RAWG
            </p>
            <h2 id="game-about-title" className="truncate text-lg font-semibold text-white">
              {loading ? "Loading…" : data?.name ?? "Game"}
            </h2>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none text-white/55 transition hover:bg-white/10 hover:text-white/90"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error ? (
            <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-36 rounded-xl bg-white/10" />
              <div className="h-3 max-w-md rounded bg-white/10" />
              <div className="h-3 max-w-sm rounded bg-white/10" />
              <div className="h-24 rounded-lg bg-white/10" />
            </div>
          ) : null}

          {!loading && data ? (
            <>
              <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                {data.coverUrl ? (
                  <Image
                    src={data.coverUrl}
                    alt={data.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 672px) 100vw, 672px"
                    priority
                  />
                ) : (
                  <div className="flex h-full min-h-[140px] items-center justify-center text-sm text-white/40">
                    No cover image
                  </div>
                )}
              </div>

              <dl className="mb-4 grid gap-2 text-sm text-white/75">
                {data.released ? (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-white/55">Released</dt>
                    <dd>{data.released}</dd>
                  </div>
                ) : null}
                {data.genres.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-white/55">Genres</dt>
                    <dd>{data.genres.join(", ")}</dd>
                  </div>
                ) : null}
                {data.platforms.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-white/55">Platforms</dt>
                    <dd className="max-w-full">{data.platforms.join(", ")}</dd>
                  </div>
                ) : null}
                {data.developers.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-white/55">Developer</dt>
                    <dd>{data.developers.join(", ")}</dd>
                  </div>
                ) : null}
                {data.publishers.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-white/55">Publisher</dt>
                    <dd>{data.publishers.join(", ")}</dd>
                  </div>
                ) : null}
                {data.metacritic != null ? (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-white/55">Metacritic</dt>
                    <dd>{data.metacritic}</dd>
                  </div>
                ) : null}
                {data.website ? (
                  <div className="pt-1">
                    <a
                      href={data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-2)] underline decoration-white/20 underline-offset-2 hover:decoration-[var(--accent-2)]"
                    >
                      Official site
                    </a>
                  </div>
                ) : null}
              </dl>

              <div className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                  About
                </h3>
                {data.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {data.description}
                  </p>
                ) : (
                  <p className="text-sm text-white/50">
                    No description available from RAWG for this title.
                  </p>
                )}
              </div>

              {data.screenshots.length > 0 ? (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                    Screenshots
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.screenshots.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="relative aspect-video overflow-hidden rounded-lg bg-black/30"
                      >
                        <Image
                          src={url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 320px"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
