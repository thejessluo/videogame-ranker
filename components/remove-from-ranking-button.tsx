"use client";

import { ensureGuestIdForApi, guestIdHeaders } from "@/lib/guest-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveFromRankingButton({
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
  const router = useRouter();

  const inner = (
    <>
      <button
        type="button"
        className="btn btn-secondary !py-1 !px-2 text-xs text-red-200/90 ring-1 ring-red-400/30 hover:bg-red-950/40"
        disabled={loading}
        onClick={async () => {
          if (
            !window.confirm(
              `Remove “${gameName}” from your ranking? This cannot be undone.`,
            )
          ) {
            return;
          }
          setLoading(true);
          setError(null);
          await ensureGuestIdForApi();
          const response = await fetch("/api/rankings/remove", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...guestIdHeaders(),
            },
            body: JSON.stringify({ gameId }),
          });
          const payload = await response.json().catch(() => ({}));
          setLoading(false);
          if (!response.ok) {
            setError(payload.error ?? "Could not remove game.");
            return;
          }
          router.refresh();
        }}
      >
        {loading ? "Removing…" : "Remove"}
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </>
  );

  if (inline) {
    return <span className="inline-flex flex-wrap items-center gap-2">{inner}</span>;
  }

  return <div className="mt-2 flex flex-wrap items-center gap-2">{inner}</div>;
}
