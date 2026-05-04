import Link from "next/link";
import { AddGameForm } from "@/components/add-game-form";
import { HomeNavLinks } from "@/components/home-nav-links";
import { RankingPreviewBlock } from "@/components/ranking-preview-block";
import { fetchMyRankings } from "@/lib/ranking/home-data";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const top10 = await fetchMyRankings(10);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <p className="mb-6 text-sm text-white/70">
        Rank by comparison, not by rating.
      </p>

      <HomeNavLinks />

      {!user ? (
        <p className="mb-4 text-sm text-white/60">
          Rankings are saved in this browser (cookie + server storage). Sign in to keep them on your
          account, use bookmarks, and add friends.
        </p>
      ) : null}

      <AddGameForm allowBookmarks={Boolean(user)} />

      <div className="mt-6">
        <RankingPreviewBlock
          rows={top10}
          title="Your top 10 global rankings"
          emptyMessage="No games ranked yet. Add one above."
        />
      </div>

      <p className="mt-6 text-center text-sm text-white/60">
        Tip:{" "}
        <Link href="/rankings" className="text-[var(--accent-2)]">
          open the full ranking page
        </Link>{" "}
        for genre filters and the complete list.
      </p>
    </main>
  );
}
