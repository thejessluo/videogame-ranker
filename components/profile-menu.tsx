"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 1h18v2H0V1zm0 5h18v2H0V6zm0 5h18v2H0v-2z" fill="currentColor" />
      </svg>
    </span>
  );
}

type Props = {
  username: string | null;
  email: string | null;
};

function finePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

export function ProfileMenu({ username, email }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const label = username ? username : email ? (email.split("@")[0] ?? "Profile") : "Profile";
  const profileHref = username ? `/u/${encodeURIComponent(username)}` : "/rankings";

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, close]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div
      ref={wrapRef}
      className="relative inline-block"
      onMouseEnter={() => finePointer() && setOpen(true)}
      onMouseLeave={() => finePointer() && setOpen(false)}
    >
      <button
        type="button"
        className="flex max-w-[min(14rem,70vw)] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 text-left text-sm font-medium text-white/90 transition hover:border-white/20 hover:bg-white/10"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 truncate">{label}</span>
        <HamburgerIcon className="shrink-0 text-white/75" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[100] min-w-[11rem] pt-1">
          <div
            role="menu"
            className="rounded-xl border border-white/12 bg-[var(--surface)] py-1 shadow-xl ring-1 ring-black/40"
          >
            <Link
              role="menuitem"
              href={profileHref}
              className="block px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/10"
              onClick={close}
            >
              Profile
            </Link>
            <Link
              role="menuitem"
              href="/friends"
              className="block px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/10"
              onClick={close}
            >
              Friends
            </Link>
            <Link
              role="menuitem"
              href="/bookmarks"
              className="block px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/10"
              onClick={close}
            >
              Bookmarks
            </Link>
            <div className="my-1 border-t border-white/10" />
            <div className="px-1 pb-1">
              <SignOutButton className="block w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
