import Link from "next/link";
import { redirect } from "next/navigation";
import { BookmarksList } from "@/components/bookmarks-list";
import { createClient } from "@/lib/supabase/server";

type BookmarkRow = {
  id: string;
  created_at: string;
  game:
    | Array<{
        id: string;
        name: string;
        cover_url: string | null;
        genres_json: Array<{ name?: string }>;
      }>
    | {
        id: string;
        name: string;
        cover_url: string | null;
        genres_json: Array<{ name?: string }>;
      }
    | null;
};

export default async function BookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: bookmarks } = await supabase
    .from("user_game_bookmarks")
    .select("id,created_at,game:games(id,name,cover_url,genres_json)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookmarked games</h1>
          <p className="text-sm text-white/70">Want-to-play list (not ranked).</p>
        </div>
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-end sm:gap-3">
          <Link href="/friends" className="text-sm text-[var(--accent-2)]">
            Friends
          </Link>
          <Link href="/" className="text-sm text-[var(--accent-2)]">
            Back to add/search
          </Link>
        </div>
      </div>

      <section className="panel p-4">
        <BookmarksList initialBookmarks={(bookmarks ?? []) as BookmarkRow[]} />
      </section>
    </main>
  );
}
