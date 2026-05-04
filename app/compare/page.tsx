import { redirect } from "next/navigation";
import { CompareClient } from "@/components/compare-client";
import { createClient } from "@/lib/supabase/server";

type ComparePageProps = {
  searchParams: Promise<{
    session?: string;
  }>;
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const sessionId = params.session;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  if (!sessionId) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold">Place this game</h1>
      <p className="mb-5 text-sm text-white/70">Binary search insertion flow.</p>
      <CompareClient sessionId={sessionId} />
    </main>
  );
}
