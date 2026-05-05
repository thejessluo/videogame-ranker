"use client";

import Link from "next/link";
import { useState } from "react";

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

type Props = {
  /** Plain username (no @), must match public profile URL */
  username: string;
};

export function ShareRankingButton({ username }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyShare() {
    setStatus("idle");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/u/${encodeURIComponent(username)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void copyShare()}
        className="btn btn-secondary inline-flex items-center gap-2 !px-3 !py-1.5 text-sm"
        title="Copy link to your public ranking"
      >
        <ShareIcon className="h-[1.1rem] w-[1.1rem]" />
        Share ranking
      </button>
      {status === "copied" ? (
        <span className="text-xs text-emerald-300/90">Copied to clipboard</span>
      ) : null}
      {status === "error" ? (
        <span className="text-xs text-red-300/90">Could not copy — try again</span>
      ) : null}
    </div>
  );
}

/** When signed in but username not set yet */
export function ShareRankingPlaceholder() {
  return (
    <p className="max-w-[14rem] text-right text-xs leading-snug text-white/55">
      <Link href="/friends" className="text-[var(--accent-2)] underline underline-offset-2">
        Choose a username
      </Link>{" "}
      on Friends to share your ranking
    </p>
  );
}
