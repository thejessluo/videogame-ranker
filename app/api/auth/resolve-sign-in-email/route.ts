import { NextResponse } from "next/server";
import { createAdminClientOrNull } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Maps "email" or "username" to the Supabase auth email for signInWithPassword.
 * Username lookup requires SUPABASE_SERVICE_ROLE_KEY on the server.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { identifier?: string };
    const raw = body.identifier?.trim();
    if (!raw) {
      return NextResponse.json({ error: "Missing email or username." }, { status: 400 });
    }

    if (raw.includes("@")) {
      return NextResponse.json({ email: raw.toLowerCase() });
    }

    const admin = createAdminClientOrNull();
    if (!admin) {
      return NextResponse.json(
        { error: "Signing in with username requires server configuration (service role)." },
        { status: 503 },
      );
    }

    const username = raw.toLowerCase();
    if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "Could not look up account." }, { status: 500 });
    }
    if (!profile?.id) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
