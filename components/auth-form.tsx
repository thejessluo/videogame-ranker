"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const action =
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({ email, password });
      const { error } = await action;

      if (error) {
        setMessage(error.message);
      } else if (mode === "signup") {
        setMessage("Account created. If email confirmation is enabled, check inbox.");
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel w-full max-w-sm p-5 sm:p-6">
      <h1 className="text-2xl font-semibold">Game Ladder</h1>
      <p className="mt-1 text-sm text-white/70">
        Save your genre-specific video game rankings.
      </p>

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-medium">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="mt-3 space-y-3">
        <label className="block text-sm font-medium">Password</label>
        <input
          required
          minLength={6}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      {message ? <p className="mt-4 text-sm text-white/75">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary mt-5 w-full disabled:opacity-60"
      >
        {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        className="btn btn-secondary mt-2 w-full"
        onClick={() => {
          setMode((value) => (value === "signin" ? "signup" : "signin"));
          setMessage(null);
        }}
      >
        {mode === "signin" ? "Need an account?" : "Already have an account?"}
      </button>
    </form>
  );
}
