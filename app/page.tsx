import Link from "next/link";
import { redirect } from "next/navigation";
import { AddGameForm } from "@/components/add-game-form";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Game Ladder</h1>
          <p className="text-sm text-white/70">
            Rank by comparison, not by rating.
          </p>
        </div>
        <SignOutButton />
      </header>

      <div className="mb-4 flex justify-end gap-4">
        <Link href="/bookmarks" className="text-sm text-[var(--accent-2)]">
          View bookmarks
        </Link>
        <Link href="/rankings" className="text-sm text-[var(--accent-2)]">
          View global ranking
        </Link>
      </div>

      <AddGameForm />
    </main>
  );
}
