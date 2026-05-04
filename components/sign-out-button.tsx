"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function onSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button onClick={onSignOut} className="btn btn-secondary text-sm">
      Sign out
    </button>
  );
}
