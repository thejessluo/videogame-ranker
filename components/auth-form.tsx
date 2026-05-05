"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatAuthErrorMessage } from "@/lib/auth-error-message";
import { resetGuestClientCache } from "@/lib/guest-client";
import { getPublicSiteOrigin } from "@/lib/site-origin";

type Mode = "signin" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error" | "warning">("error");
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();

      if (mode === "signin") {
        const identifier = email.trim();
        let loginEmail = identifier;
        if (!identifier.includes("@")) {
          const res = await fetch("/api/auth/resolve-sign-in-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            setMessageVariant("error");
            setMessage(
              typeof payload.error === "string" ? payload.error : "Invalid email or password.",
            );
            return;
          }
          loginEmail = payload.email as string;
        } else {
          loginEmail = identifier.toLowerCase();
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) {
          const { text, variant } = formatAuthErrorMessage(error.message);
          setMessageVariant(variant);
          setMessage(text);
        } else {
          resetGuestClientCache();
          router.push("/");
          router.refresh();
        }
        return;
      }

      const uname = username.trim().toLowerCase();
      if (uname.length < 3 || !/^[a-z0-9_]+$/.test(uname)) {
        setMessageVariant("error");
        setMessage(
          "Username must be at least 3 characters (lowercase letters, numbers, underscore only).",
        );
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getPublicSiteOrigin()}/auth`,
          data: {
            username: uname,
          },
        },
      });

      if (error) {
        const { text, variant } = formatAuthErrorMessage(error.message);
        setMessageVariant(variant);
        setMessage(text);
        return;
      }

      if (!data.session) {
        setMessageVariant("success");
        setMessage(
          "Account created. If email confirmation is required, check your inbox — then sign in with your email or username.",
        );
        return;
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          username: uname,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.session.user.id);

      if (profileError) {
        setMessageVariant("error");
        const msg =
          profileError.code === "23505" || profileError.message?.toLowerCase().includes("unique")
            ? "Username is already taken."
            : profileError.message || "Could not save username.";
        setMessage(msg);
        return;
      }

      resetGuestClientCache();
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel w-full max-w-sm p-5 sm:p-6">
      <h1 className="text-2xl font-semibold">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-1 text-sm text-white/70">
        Save your video game rankings and share your ladder with friends.
      </p>

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-medium">
          {mode === "signin" ? "Email or username" : "Email"}
        </label>
        <input
          required
          type={mode === "signin" ? "text" : "email"}
          autoComplete={mode === "signin" ? "username" : "email"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={mode === "signin" ? "you@example.com or jessplays" : undefined}
          className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      {mode === "signup" ? (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-medium">Username</label>
          <input
            required
            type="text"
            autoComplete="username"
            minLength={3}
            maxLength={32}
            pattern="[a-z0-9_]{3,32}"
            title="Lowercase letters, numbers, and underscores only"
            placeholder="e.g. jessplays"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <p className="text-xs text-white/55">
            Lowercase, letters/numbers/underscore. Shown on shared links and friends search.
          </p>
        </div>
      ) : null}

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

      {message ? (
        <p
          className={`mt-4 whitespace-pre-line text-sm ${
            messageVariant === "success"
              ? "text-emerald-300/90"
              : messageVariant === "warning"
                ? "text-amber-200/90"
                : "text-red-300/90"
          }`}
        >
          {message}
        </p>
      ) : null}

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
          setMessageVariant("error");
          setUsername("");
        }}
      >
        {mode === "signin" ? "Need an account?" : "Already have an account?"}
      </button>
    </form>
  );
}
