"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  FriendProfileSummary,
  IncomingFriendRequest,
  OutgoingFriendRequest,
} from "@/lib/friends/dashboard-data";

type Profile = FriendProfileSummary;

type FriendsPanelProps = {
  initialUsername: string;
  initialIncoming: IncomingFriendRequest[];
  initialOutgoing: OutgoingFriendRequest[];
  initialFriends: FriendProfileSummary[];
};

export function FriendsPanel({
  initialUsername,
  initialIncoming,
  initialOutgoing,
  initialFriends,
}: FriendsPanelProps) {
  const [username, setUsername] = useState(initialUsername);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  const [incoming, setIncoming] = useState<IncomingFriendRequest[]>(initialIncoming);
  const [outgoing, setOutgoing] = useState<OutgoingFriendRequest[]>(initialOutgoing);
  const [friends, setFriends] = useState<FriendProfileSummary[]>(initialFriends);

  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => search.trim().length >= 2, [search]);

  async function refresh() {
    setError(null);
    const response = await fetch("/api/friends");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not load friends.");
      return;
    }
    const me = payload.me as Profile | undefined;
    if (me?.username) {
      setUsername(me.username);
    }
    setIncoming(payload.incoming ?? []);
    setOutgoing(payload.outgoing ?? []);
    setFriends(payload.friends ?? []);
  }

  async function saveUsername() {
    setUsernameMessage(null);
    const response = await fetch("/api/profile/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setUsernameMessage(payload.error ?? "Could not save username.");
      return;
    }
    setUsernameMessage(`Saved @${payload.username}`);
  }

  async function runSearch() {
    if (!canSearch) return;
    setError(null);
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query: search.trim() }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Search failed.");
      return;
    }
    setSearchResults(payload.users ?? []);
  }

  async function sendRequest(toUserId: string) {
    setError(null);
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_request", toUserId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not send request.");
      return;
    }
    await refresh();
  }

  async function respond(requestId: string, decision: "accept" | "reject") {
    setError(null);
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond_request", requestId, decision }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not respond to request.");
      return;
    }
    await refresh();
  }

  async function cancelRequest(requestId: string) {
    setError(null);
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel_request", requestId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not cancel request.");
      return;
    }
    await refresh();
  }

  async function unfriend(friendUserId: string) {
    setError(null);
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unfriend", friendUserId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Could not unfriend.");
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      <section className="panel p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Your username</h2>
        <p className="mt-1 text-sm text-white/70">
          Friends find you by username (lowercase, letters/numbers/underscore).
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. jessplays"
            className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2"
          />
          <button className="btn btn-primary" onClick={saveUsername}>
            Save
          </button>
        </div>
        {usernameMessage ? <p className="mt-2 text-sm text-white/80">{usernameMessage}</p> : null}
      </section>

      <section className="panel p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Find friends</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search username"
            className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2"
          />
          <button className="btn btn-primary" onClick={runSearch} disabled={!canSearch}>
            Search
          </button>
        </div>

        {searchResults.length > 0 ? (
          <div className="mt-3 space-y-2">
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{u.username ? `@${u.username}` : u.id}</p>
                </div>
                <button className="btn btn-secondary !px-3 !py-1 text-xs" onClick={() => sendRequest(u.id)}>
                  Add friend
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Requests</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-white/70">Incoming</p>
            <div className="space-y-2">
              {incoming.length === 0 ? (
                <p className="text-sm text-white/60">None</p>
              ) : (
                incoming.map((req) => (
                  <div key={req.id} className="rounded-xl bg-black/20 px-3 py-2">
                    <p className="text-sm font-medium">
                      {req.from_user?.username ? `@${req.from_user.username}` : req.from_user_id}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button className="btn btn-primary !px-3 !py-1 text-xs" onClick={() => respond(req.id, "accept")}>
                        Accept
                      </button>
                      <button className="btn btn-secondary !px-3 !py-1 text-xs" onClick={() => respond(req.id, "reject")}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-white/70">Outgoing</p>
            <div className="space-y-2">
              {outgoing.length === 0 ? (
                <p className="text-sm text-white/60">None</p>
              ) : (
                outgoing.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                    <p className="text-sm font-medium">
                      {req.to_user?.username ? `@${req.to_user.username}` : req.to_user_id}
                    </p>
                    <button className="btn btn-secondary !px-3 !py-1 text-xs" onClick={() => cancelRequest(req.id)}>
                      Cancel
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Friends</h2>
        <div className="mt-3 space-y-2">
          {friends.length === 0 ? (
            <p className="text-sm text-white/60">No friends yet.</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                <Link href={`/friends/${friend.id}`} className="text-sm font-medium text-[var(--accent-2)]">
                  {friend.username ? `@${friend.username}` : friend.id}
                </Link>
                <button className="btn btn-secondary !px-3 !py-1 text-xs" onClick={() => unfriend(friend.id)}>
                  Unfriend
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
