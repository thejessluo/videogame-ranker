"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { PublicFriendCtaInitial } from "@/lib/friends/public-profile-cta";

type Props = {
  profileUserId: string;
  initial: PublicFriendCtaInitial;
};

export function PublicProfileFriendCta({ profileUserId, initial }: Props) {
  const router = useRouter();
  const [state, setState] = useState<PublicFriendCtaInitial>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(initial);
  }, [initial]);

  if (state.kind === "signed_out" || state.kind === "self") {
    return null;
  }

  async function post(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Something went wrong.");
        return null;
      }
      return payload;
    } finally {
      setBusy(false);
    }
  }

  async function sendRequest() {
    const payload = await post({ action: "send_request", toUserId: profileUserId });
    if (payload === null) return;
    if (payload.status === "friends") {
      setState({ kind: "friends" });
      router.refresh();
      return;
    }
    const requestId =
      typeof payload.requestId === "string"
        ? payload.requestId
        : undefined;
    if (requestId) {
      setState({ kind: "outgoing", requestId });
      router.refresh();
      return;
    }
    const dashboard = await fetch("/api/friends");
    const d = await dashboard.json().catch(() => ({}));
    const outgoing = (d.outgoing ?? []) as { id: string; to_user_id: string }[];
    const row = outgoing.find((r) => r.to_user_id === profileUserId);
    if (row?.id) setState({ kind: "outgoing", requestId: row.id });
    router.refresh();
  }

  async function respond(decision: "accept" | "reject") {
    if (state.kind !== "incoming") return;
    const result = await post({
      action: "respond_request",
      requestId: state.requestId,
      decision,
    });
    if (result === null) return;
    if (decision === "accept") {
      setState({ kind: "friends" });
    } else {
      setState({ kind: "can_add" });
    }
    router.refresh();
  }

  async function cancelOutgoing() {
    if (state.kind !== "outgoing") return;
    if (!state.requestId) return;
    const result = await post({ action: "cancel_request", requestId: state.requestId });
    if (result === null) return;
    setState({ kind: "can_add" });
    router.refresh();
  }

  if (state.kind === "friends") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-emerald-300/90">You&apos;re friends</span>
        <Link href="/friends" className="text-sm text-[var(--accent-2)]">
          Friends list
        </Link>
      </div>
    );
  }

  if (state.kind === "outgoing") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-sm text-white/75">Friend request sent</span>
        <button
          type="button"
          className="btn btn-secondary !px-3 !py-1 text-xs"
          disabled={busy || !state.requestId}
          onClick={() => void cancelOutgoing()}
        >
          Cancel request
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    );
  }

  if (state.kind === "incoming") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-white/75">This person sent you a friend request.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary !px-3 !py-1 text-xs"
            disabled={busy}
            onClick={() => void respond("accept")}
          >
            Accept
          </button>
          <button
            type="button"
            className="btn btn-secondary !px-3 !py-1 text-xs"
            disabled={busy}
            onClick={() => void respond("reject")}
          >
            Decline
          </button>
          <Link href="/friends" className="btn btn-secondary !px-3 !py-1 text-xs">
            Open Friends
          </Link>
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-primary !px-3 !py-1 text-sm"
        disabled={busy}
        onClick={() => void sendRequest()}
      >
        Add friend
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
