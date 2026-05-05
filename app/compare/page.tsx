import { redirect } from "next/navigation";
import { CompareClient } from "@/components/compare-client";
import { getProfileUsername } from "@/lib/profile/get-profile-username";
import { createClient } from "@/lib/supabase/server";

type ComparePageProps = {
  searchParams: Promise<{
    session?: string;
  }>;
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const sessionId = params.session;
  if (!sessionId) {
    redirect("/");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profileUsername = user ? await getProfileUsername(supabase, user.id) : null;
  const rankingsHref = profileUsername ? `/u/${encodeURIComponent(profileUsername)}` : "/rankings";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-semibold">Compare</h1>
      <CompareClient sessionId={sessionId} rankingsHref={rankingsHref} />
    </main>
  );
}
