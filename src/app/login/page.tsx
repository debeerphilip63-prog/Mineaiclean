"use client";

import AppShell from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function signInWithEmail() {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <AppShell active="home">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in with Google or get a magic link by email.
        </p>

        <button
          onClick={signInWithGoogle}
          className="mt-6 w-full rounded-2xl bg-amber-500/20 px-4 py-3 font-semibold text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
          <div className="h-px flex-1 bg-white/10" />
          OR
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <label className="text-sm font-semibold">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-amber-500/30"
        />

        <button
          onClick={signInWithEmail}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10"
        >
          Email me a login link
        </button>

        {sent && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            Check your inbox for a sign-in link.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </div>
    </AppShell>
  );
}
