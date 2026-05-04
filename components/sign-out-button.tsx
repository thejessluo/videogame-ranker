"use client";

import { resetGuestClientCache } from "@/lib/guest-client";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function onSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    resetGuestClientCache();
    window.location.href = "/";
  }

  return (
    <button onClick={onSignOut} className="btn btn-secondary text-sm">
      Sign out
    </button>
  );
}
