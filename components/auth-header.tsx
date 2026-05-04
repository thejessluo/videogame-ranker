import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export async function AuthHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <SignOutButton />
  ) : (
    <Link href="/auth" className="btn btn-secondary text-sm">
      Sign in
    </Link>
  );
}
