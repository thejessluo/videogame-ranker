import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function HomeNavLinks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mb-4 flex flex-wrap justify-end gap-4">
      {user ? (
        <>
          <Link href="/friends" className="text-sm text-[var(--accent-2)]">
            Friends
          </Link>
          <Link href="/bookmarks" className="text-sm text-[var(--accent-2)]">
            Bookmarks
          </Link>
        </>
      ) : null}
      <Link href="/rankings" className="text-sm text-[var(--accent-2)]">
        See all global rankings
      </Link>
    </div>
  );
}
