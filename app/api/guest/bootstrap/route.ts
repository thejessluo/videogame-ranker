import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { VIDEOGAME_GUEST_COOKIE } from "@/lib/constants";
import { isValidGuestId } from "@/lib/guest-id";
import { hasServiceRoleConfig } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Ensures anonymous visitors have a guest id cookie; returns id for client header fallback. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const anonymousRankingEnabled = hasServiceRoleConfig();
  if (user) {
    return NextResponse.json({ signedIn: true as const, anonymousRankingEnabled });
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(VIDEOGAME_GUEST_COOKIE)?.value;
  if (isValidGuestId(existing)) {
    return NextResponse.json({
      signedIn: false as const,
      guestId: existing,
      anonymousRankingEnabled,
    });
  }

  const guestId = crypto.randomUUID();
  const res = NextResponse.json({ signedIn: false as const, guestId, anonymousRankingEnabled });
  res.cookies.set(VIDEOGAME_GUEST_COOKIE, guestId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 400,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
