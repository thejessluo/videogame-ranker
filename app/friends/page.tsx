import Link from "next/link";
import { redirect } from "next/navigation";
import { FriendsPanel } from "@/components/friends-panel";
import { getFriendsDashboard } from "@/lib/friends/dashboard-data";
import { createClient } from "@/lib/supabase/server";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: initial, error } = await getFriendsDashboard(supabase, user.id);
  if (error || !initial) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-red-300">{error ?? "Could not load friends."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Friends</h1>
          <p className="text-sm text-white/70">
            Add people by username, then open their rankings and bookmarks.
          </p>
        </div>
        <Link href="/" className="text-sm text-[var(--accent-2)]">
          Home
        </Link>
      </div>

      <FriendsPanel
        initialUsername={initial.me.username ?? ""}
        initialIncoming={initial.incoming}
        initialOutgoing={initial.outgoing}
        initialFriends={initial.friends}
      />
    </main>
  );
}
