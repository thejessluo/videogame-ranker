"use client";

import { ensureGuestIdForApi, guestIdHeaders } from "@/lib/guest-client";
import { SentimentPickerModal } from "@/components/sentiment-picker-modal";
import type { BroadRating } from "@/lib/ranking/beli";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RerankButton({
  gameId,
  gameName,
  inline,
}: {
  gameId: string;
  gameName: string;
  inline?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function startRerank(broadRating: BroadRating) {
    setLoading(true);
    setError(null);
    await ensureGuestIdForApi();
    const response = await fetch("/api/rankings/rerank", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...guestIdHeaders(),
      },
      body: JSON.stringify({ gameId, broadRating }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not start re-rank.");
      return;
    }

    setOpen(false);
    if (payload.status === "reranked_directly") {
      router.refresh();
      return;
    }

    if (payload.sessionId) {
      router.push(`/compare?session=${payload.sessionId}`);
    }
  }

  const inner = (
    <>
      <button
        className="btn btn-secondary !py-1 !px-2 text-xs"
        disabled={loading}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Re-rank
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
      <SentimentPickerModal
        open={open}
        gameName={gameName}
        submitting={loading}
        error={open ? error : null}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onSelect={startRerank}
      />
    </>
  );

  if (inline) {
    return <span className="inline-flex flex-wrap items-center gap-2">{inner}</span>;
  }

  return <div className="mt-2 flex items-center gap-2">{inner}</div>;
}
