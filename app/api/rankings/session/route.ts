import { NextResponse } from "next/server";
import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { resolveRankingDbCtx } from "@/lib/ranking/request-actor";
import { runRankingSessionGet, runRankingSessionPost } from "@/lib/ranking/session-engine";

type AnswerBody = {
  sessionId: string;
  preferred: "new" | "existing" | "skip";
};

export async function GET(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });

    const ctx = await resolveRankingDbCtx();
    if (!ctx) {
      const admin = createAdminClientOrNull();
      if (!admin) {
        return NextResponse.json(
          {
            error:
              "Sign in to continue, or set SUPABASE_SERVICE_ROLE_KEY on the server for anonymous rankings.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await runRankingSessionGet(ctx, sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveRankingDbCtx();
    if (!ctx) {
      const admin = createAdminClientOrNull();
      if (!admin) {
        return NextResponse.json(
          {
            error:
              "Sign in to continue, or set SUPABASE_SERVICE_ROLE_KEY on the server for anonymous rankings.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as AnswerBody;
    if (!body.sessionId) return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });

    const result = await runRankingSessionPost(ctx, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
