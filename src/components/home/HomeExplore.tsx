"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CharacterRow = {
  id: string;
  name: string;
  tagline: string | null;
  category: string | null;
  tags: string[] | null;
  image_url: string | null;
  is_nsfw: boolean;
  likes: number;
};

export default function HomeExplore() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const [nsfwEnabled, setNsfwEnabled] = useState(false);

  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState<string | null>(null);

  async function loadProfileFlagsAndLikes() {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setNsfwEnabled(false);
      setLikedSet(new Set());
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("nsfw_enabled,is_over_18")
      .eq("id", userRes.user.id)
      .single();

    setNsfwEnabled(!!prof?.nsfw_enabled && !!prof?.is_over_18);

    // Load which characters this user liked
    const { data: likedRows } = await supabase
      .from("character_likes")
      .select("character_id");

    const s = new Set<string>();
    (likedRows ?? []).forEach((r: any) => s.add(r.character_id));
    setLikedSet(s);
  }

  async function loadCharacters(nsfwOk: boolean) {
    setLoading(true);
    setNotice(null);

    let q = supabase
      .from("characters")
      .select("id,name,tagline,category,tags,image_url,is_nsfw,likes")
      .eq("visibility", "public")
      .order("likes", { ascending: false })
      .limit(60);

    if (!nsfwOk) q = q.eq("is_nsfw", false);

    const { data, error } = await q;

    if (error) {
      setNotice(error.message);
      setCharacters([]);
      setLoading(false);
      return;
    }

    setCharacters((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await loadProfileFlagsAndLikes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCharacters(nsfwEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nsfwEnabled]);

  const filtered = useMemo(() => {
    const qq = query.trim().toLowerCase();

    return characters.filter((c) => {
      const inQuery =
        !qq ||
        c.name.toLowerCase().includes(qq) ||
        (c.tagline ?? "").toLowerCase().includes(qq) ||
        (c.tags ?? []).some((t) => t.toLowerCase().includes(qq));

      const inCat = category === "All" || (c.category ?? "General") === category;

      return inQuery && inCat;
    });
  }, [characters, query, category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of characters) set.add(c.category ?? "General");
    return ["All", ...Array.from(set).sort()];
  }, [characters]);

  async function likeCharacter(e: React.MouseEvent, characterId: string) {
    e.preventDefault();
    e.stopPropagation();

    setNotice(null);

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setNotice("Please sign in to like characters.");
      return;
    }

    if (likedSet.has(characterId)) return;

    setLikingId(characterId);
    try {
      const { data, error } = await supabase.rpc("like_character", {
        p_character_id: characterId,
      });

      if (error) throw new Error(error.message);

      // Update UI
      setLikedSet((prev) => new Set(prev).add(characterId));
      setCharacters((prev) =>
        prev.map((c) => (c.id === characterId ? { ...c, likes: Number(data ?? c.likes) } : c))
      );
    } catch (err: any) {
      setNotice(`⚠️ ${err.message ?? "Failed to like."}`);
    } finally {
      setLikingId(null);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-zinc-100">Explore</div>
          <div className="text-sm text-zinc-400">
            {nsfwEnabled ? "NSFW enabled (18+)" : "NSFW hidden (enable in Profile → Settings)"}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search characters…"
            className="w-full sm:w-72 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-48 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="mt-6 text-zinc-200">Loading…</div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const liked = likedSet.has(c.id);
            const isBusy = likingId === c.id;

            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                <div className="relative h-44 w-full overflow-hidden">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-black/30" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold leading-tight text-zinc-100 truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-zinc-300/80">
                        ❤️ {Number(c.likes ?? 0).toLocaleString("en-US")}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.is_nsfw && (
                        <div className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-200 ring-1 ring-red-500/30">
                          NSFW
                        </div>
                      )}

                      <button
                        onClick={(e) => likeCharacter(e, c.id)}
                        disabled={liked || isBusy}
                        className={
                          "rounded-full px-3 py-2 text-xs ring-1 transition " +
                          (liked
                            ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30 cursor-default"
                            : isBusy
                            ? "bg-white/5 text-zinc-500 ring-white/10 cursor-not-allowed"
                            : "bg-white/5 text-zinc-200 ring-white/10 hover:bg-white/10")
                        }
                        title={liked ? "Liked" : "Like"}
                      >
                        {liked ? "Liked" : "Like"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-sm text-zinc-300 line-clamp-2">{c.tagline ?? "—"}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-200 ring-1 ring-white/10">
                      {c.category ?? "General"}
                    </span>
                    {(c.tags ?? []).slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-200 ring-1 ring-white/10"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
