import { NextResponse } from "next/server";
import { fetchRawgGameAbout } from "@/lib/rawg";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ rawgId: string }> },
) {
  const { rawgId } = await context.params;
  const id = Number.parseInt(rawgId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid game id." }, { status: 400 });
  }

  try {
    const game = await fetchRawgGameAbout(id);
    return NextResponse.json({ game });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load game details." },
      { status: 502 },
    );
  }
}
