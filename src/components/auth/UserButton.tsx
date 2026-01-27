"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";

type UserView = {
  email: string | null;
  plan: "free" | "premium";
  is_admin: boolean;
};


export default function UserButton() {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<UserView | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
  const { data } = await supabase.auth.getUser();
  if (!mounted) return;

  if (!data.user) {
    setUser(null);
    return;
  }

  const email = data.user.email ?? null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan,is_admin")
    .eq("id", data.user.id)
    .single();

  // If profile doesn't exist yet for some reason, fallback safely
  if (error || !profile) {
    setUser({ email, plan: "free", is_admin: false });
    return;
  }

  setUser({
    email,
    plan: profile.plan,
    is_admin: profile.is_admin,
  });
}


    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
      >
        <span className="h-8 w-8 rounded-xl bg-white/5 ring-1 ring-white/10" />
        <span className="max-w-[180px] truncate text-zinc-200">{user.email ?? "Account"}</span>
        <span className="text-zinc-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B0F] shadow-lg">
          <div className="border-b border-white/10 p-3">
            <div className="text-xs text-zinc-400">Signed in as</div>
            <div className="truncate text-sm font-semibold text-zinc-200">
              {user.email ?? "Account"}
              <div className="mt-1 text-xs text-zinc-400">
  {user.is_admin ? "Admin" : user.plan === "premium" ? "Premium" : "Free"}
</div>

            </div>
          </div>

          <div className="p-2">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Profile
            </Link>
            <Link
              href="/my-characters"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              My Characters
            </Link>
            {user.is_admin && (
  <Link
    href="/admin"
    onClick={() => setOpen(false)}
    className="block rounded-xl px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/10"
  >
    Admin Dashboard
  </Link>
)}

            <button
              onClick={signOut}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/10"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
