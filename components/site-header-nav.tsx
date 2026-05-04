import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

const navLinkClass =
  "text-sm font-medium text-white/75 transition-colors hover:text-white";

export async function SiteHeaderNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-4">
      <Link href="/about" className={navLinkClass}>
        About
      </Link>
      {user ? (
        <>
          <Link href="/friends" className={navLinkClass}>
            Friends
          </Link>
          <Link href="/bookmarks" className={navLinkClass}>
            Bookmarks
          </Link>
        </>
      ) : null}
      {user ? (
        <SignOutButton />
      ) : (
        <Link href="/auth" className="btn btn-secondary text-sm">
          Sign in
        </Link>
      )}
    </nav>
  );
}
