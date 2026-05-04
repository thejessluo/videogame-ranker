"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RerankButton({ gameId }: { gameId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        className="btn btn-secondary !py-1 !px-2 text-xs"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const response = await fetch("/api/rankings/rerank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId }),
          });
          const payload = await response.json().catch(() => ({}));
          setLoading(false);

          if (!response.ok) {
            setError(payload.error ?? "Could not start re-rank.");
            return;
          }

          if (payload.status === "reranked_directly") {
            router.refresh();
            return;
          }

          if (payload.sessionId) {
            router.push(`/compare?session=${payload.sessionId}`);
          }
        }}
      >
        {loading ? "Starting..." : "Re-rank"}
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}
