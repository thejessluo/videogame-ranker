import { redirect } from "next/navigation";
import { CompareClient } from "@/components/compare-client";
import { createClient } from "@/lib/supabase/server";

type ComparePageProps = {
  searchParams: Promise<{
    genre?: string;
  }>;
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const genreSlug = params.genre;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  if (!genreSlug) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold">Head-to-head</h1>
      <p className="mb-5 text-sm text-white/70">
        Genre: <span className="font-semibold text-white">{genreSlug}</span>
      </p>
      <CompareClient genreSlug={genreSlug} />
    </main>
  );
}
