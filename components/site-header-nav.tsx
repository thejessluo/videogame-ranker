import Link from "next/link";
import { ProfileMenu } from "@/components/profile-menu";
import { syncProfileUsernameFromMetadata } from "@/lib/profile/sync-username-from-metadata";
import { createClient } from "@/lib/supabase/server";

const navLinkClass =
  "text-sm font-medium text-white/75 transition-colors hover:text-white";

export async function SiteHeaderNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileUsername: string | null = null;
  if (user) {
    await syncProfileUsernameFromMetadata(supabase, user.id);
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    profileUsername = profile?.username?.trim() ?? null;
  }

  return (
    <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-4">
      <Link href="/about" className={navLinkClass}>
        About
      </Link>
      {user ? (
        <ProfileMenu username={profileUsername} email={user.email ?? null} />
      ) : (
        <Link href="/auth" className="btn btn-secondary text-sm">
          Sign in
        </Link>
      )}
    </nav>
  );
}
