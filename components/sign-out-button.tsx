"use client";

import { resetGuestClientCache } from "@/lib/guest-client";
import { createClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  async function onSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    resetGuestClientCache();
    window.location.href = "/";
  }

  return (
    <button type="button" onClick={onSignOut} className={className ?? "btn btn-secondary text-sm"}>
      Sign out
    </button>
  );
}
