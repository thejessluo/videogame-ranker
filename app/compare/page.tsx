import { redirect } from "next/navigation";
import { CompareClient } from "@/components/compare-client";

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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-semibold">Compare</h1>
      <CompareClient sessionId={sessionId} />
    </main>
  );
}
