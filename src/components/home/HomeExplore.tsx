"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Character = {
  id: string;
  name: string;
  tagline: string | null;
  category: string | null;
  is_nsfw: boolean;
  image_url: string | null;
  likes: number;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function HomeExplore() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [rows, setRows] = useState<Character[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id ?? null;

    // If you have profile settings for nsfw visibility, keep it simple:
    // Default: hide NSFW on home.
    const allowNSFW = false;

    let query = supabase
      .from("characters")
      .select("id,name,tagline,category,is_nsfw,image_url,likes")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(60);

    if (!allowNSFW) query = query.eq("is_nsfw", false);
    if (cat !== "All") query = query.eq("category", cat);
    if (q.trim().length > 0) query = query.ilike("name", `%${q.trim()}%`);

    const { data, error } = await query;

    if (error) {
      setError(error.message);
      setRows([]);
      return;
    }

    setRows((data ?? []) as Character[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  const categories = ["All", "Anime", "Game", "Fantasy", "Sci-Fi", "Horror", "Romance"];

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Explore</h2>
          <div className="mt-1 text-xs text-zinc-400">
            NSFW hidden (enable in Profile → Settings)
          </div>
        </div>

        {/* Filters responsive */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
            placeholder="Search characters..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 sm:w-[320px]"
          />

          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white sm:w-[200px]"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-black">
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={load}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-medium text-black hover:bg-amber-400 sm:w-auto"
          >
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          ⚠ {error}
        </div>
      )}

      {/* Responsive grid: 1 col mobile, 2 cols small, 3 cols large */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <div
            key={c.id}
            className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5"
          >
            <div className="relative h-44 w-full overflow-hidden bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image_url || "/avatars/default.png"}
                alt={c.name}
                className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-base font-semibold leading-tight">{c.name}</div>
                  <div className="rounded-full bg-white/10 px-2 py-1 text-xs text-zinc-200/80">
                    ❤️ {c.likes ?? 0}
                  </div>
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-zinc-200/70">
                  {c.tagline ?? "—"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200/80">
                {c.category ?? "General"}
              </div>

              <Link
                href={`/chat/${c.id}`}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
              >
                Chat
              </Link>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && !error && (
        <div className="mt-10 text-center text-sm text-zinc-400">
          No characters found. Try a different search or category.
        </div>
      )}
    </section>
  );
}
