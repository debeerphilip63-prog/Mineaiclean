"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

type CharacterRow = {
  id: string;
  name: string;
  tagline: string | null;
  visibility: "public" | "private";
  is_nsfw: boolean;
  created_at: string;
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-zinc-200 ring-1 ring-white/10">
      {children}
    </span>
  );
}

export default function MyCharactersGrid() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CharacterRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("characters")
        .select("id,name,tagline,visibility,is_nsfw,created_at")
        .eq("owner_id", userRes.user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) setError(error.message);
      setRows((data as any) ?? []);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
        Loading your characters…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
        {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
        No characters yet. Create one first.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((c) => (
        <div
          key={c.id}
          className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10"
        >
          <div className="relative h-44 bg-gradient-to-br from-zinc-800/40 to-zinc-950/70">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(245,158,11,0.18),transparent_55%)]" />
            <div className="absolute left-3 top-3 flex gap-2">
              <Pill>{c.visibility}</Pill>
              <Pill>{c.is_nsfw ? "NSFW" : "SFW"}</Pill>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="text-lg font-bold leading-tight">{c.name}</div>
              <div className="mt-1 text-sm text-zinc-300/90">
                {c.tagline ?? "—"}
              </div>
            </div>
          </div>

          <div className="p-4">
            <Link
              href={`/chat/${c.id}`}
              className="block w-full rounded-2xl bg-amber-500/20 px-4 py-2 text-center text-sm font-semibold text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
            >
              Chat
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
