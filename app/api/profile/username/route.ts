import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  username?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as Body;
    const username = body.username?.trim().toLowerCase();
    if (!username || username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores." },
        { status: 400 },
      );
    }

    const { data: taken, error: takenError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();
    if (takenError) return NextResponse.json({ error: takenError.message }, { status: 500 });
    if (taken) return NextResponse.json({ error: "Username is already taken." }, { status: 409 });

    const { error } = await supabase
      .from("user_profiles")
      .update({ username, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: "ok", username });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
