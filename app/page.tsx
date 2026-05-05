import Link from "next/link";
import { AddGameForm } from "@/components/add-game-form";
import { RankingPreviewBlock } from "@/components/ranking-preview-block";
import { getProfileUsername } from "@/lib/profile/get-profile-username";
import { fetchMyRankings } from "@/lib/ranking/home-data";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleConfig } from "@/lib/supabase/admin";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profileUsername = user ? await getProfileUsername(supabase, user.id) : null;
  const rankingsHref = profileUsername ? `/u/${encodeURIComponent(profileUsername)}` : "/rankings";
  const top5 = await fetchMyRankings(5);
  const guestRankingConfigured = hasServiceRoleConfig();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <p className="mb-6 text-sm text-white/70">
        Rank by comparison, not by rating.
      </p>

      <AddGameForm
        allowBookmarks={Boolean(user)}
        warnAnonymousRankingUnavailable={!user && !guestRankingConfigured}
        rankingsHref={rankingsHref}
      />

      <div className="mt-6">
        <div className="mb-4 flex justify-end">
          <Link
            href={rankingsHref}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] underline-offset-[5px] decoration-[var(--accent)]/50 hover:underline"
          >
            See all your rankings
            <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
        <RankingPreviewBlock
          rows={top5}
          title="Your top 5 games"
          emptyMessage="No games ranked yet. Add one above."
          showSentiment={false}
        />
      </div>

      <p className="mt-6 text-center text-sm text-white/60">
        Tip:{" "}
        <Link href={rankingsHref} className="text-[var(--accent-2)]">
          open the full ranking page
        </Link>{" "}
        for genre filters and the complete list.
      </p>

      {!user ? (
        <p className="mt-10 text-center text-sm text-white/60">
          Rankings are saved in this browser. Sign in to keep them on your account, use bookmarks,
          and add friends.
        </p>
      ) : null}
    </main>
  );
}
