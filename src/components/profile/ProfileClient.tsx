"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SettingsPanel from "@/components/profile/SettingsPanel";
import PersonasPanel from "@/components/profile/PersonasPanel";

type Tab = "overview" | "characters" | "personas" | "settings";

type ProfileRow = {
  id: string;
  email: string | null;
  plan: "free" | "premium";
  is_admin: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
};

type CharacterRow = {
  id: string;
  name: string;
  tagline: string | null;
  visibility: "public" | "private";
  is_nsfw: boolean;
  likes_count?: number;
  created_at: string;
  image_url?: string | null;
};

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-2xl px-4 py-2 text-sm ring-1 transition " +
        (active
          ? "bg-amber-500/20 text-amber-100 ring-amber-500/30"
          : "bg-white/5 text-zinc-200 ring-white/10 hover:bg-white/10")
      }
    >
      {children}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      {children}
    </div>
  );
}

function characterImage(c: { id: string; image_url?: string | null }) {
  return c.image_url || `https://api.dicebear.com/9.x/thumbs/svg?seed=${c.id}`;
}

export default function ProfileClient() {
  const supabase = createSupabaseBrowserClient();

  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    if (!user) {
      setUid(null);
      setProfile(null);
      setCharacters([]);
      setLoading(false);
      return;
    }

    setUid(user.id);

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id,email,plan,is_admin,display_name,avatar_url")
      .eq("id", user.id)
      .single();

    if (profErr) {
      setError(profErr.message);
      setLoading(false);
      return;
    }

    setProfile(prof as any);

    const { data: chars, error: charsErr } = await supabase
      .from("characters")
      .select("id,name,tagline,visibility,is_nsfw,likes_count,created_at,image_url")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (charsErr) {
      setError(charsErr.message);
      setLoading(false);
      return;
    }

    setCharacters((chars as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planLabel = useMemo(() => {
    if (!profile) return "";
    if (profile.is_admin) return "Admin";
    return profile.plan === "premium" ? "Premium" : "Free";
  }, [profile]);

  const headerTitle = useMemo(() => {
    if (!profile) return "Your Account";
    return profile.display_name || profile.email || "Your Account";
  }, [profile]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card>
          <div className="text-zinc-200">Loading profile…</div>
        </Card>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card>
          <div className="text-zinc-100 text-lg font-semibold">You’re not signed in</div>
          <div className="mt-2 text-zinc-300">Please sign in to view your profile.</div>
          <div className="mt-4 flex gap-2">
            <Link
              href="/signup"
              className="rounded-2xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
            >
              Sign up / Sign in
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {error && (
        <div className="mb-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={
              profile?.avatar_url ||
              (profile ? `https://api.dicebear.com/9.x/thumbs/svg?seed=${profile.id}` : "")
            }
            alt="avatar"
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
          />
          <div>
            <div className="text-xl font-bold text-zinc-100">{headerTitle}</div>
            <div className="mt-1 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 ring-1 ring-white/10">
              {planLabel}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/create"
            className="rounded-2xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
          >
            Create Character
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </TabButton>
        <TabButton active={tab === "characters"} onClick={() => setTab("characters")}>
          Characters
        </TabButton>
        <TabButton active={tab === "personas"} onClick={() => setTab("personas")}>
          Personas
        </TabButton>
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>
          Settings
        </TabButton>
      </div>

      {/* Content */}
      <div className="mt-6">
        {tab === "overview" && (
          <Card>
            <div className="text-lg font-semibold text-zinc-100">Your stats</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                <div className="text-xs text-zinc-400">Characters</div>
                <div className="mt-1 text-2xl font-bold text-zinc-100">
                  {characters.length}
                </div>
              </div>
              <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                <div className="text-xs text-zinc-400">Plan</div>
                <div className="mt-1 text-2xl font-bold text-zinc-100">{planLabel}</div>
              </div>
              <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                <div className="text-xs text-zinc-400">Next</div>
                <div className="mt-1 text-sm text-zinc-200">
                  Pick a persona while chatting
                </div>
              </div>
            </div>
          </Card>
        )}

        {tab === "characters" && (
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-zinc-100">Your characters</div>
              <Link href="/my-characters" className="text-sm text-amber-200 hover:text-amber-100">
                Open full list →
              </Link>
            </div>

            {characters.length === 0 ? (
              <div className="mt-4 text-zinc-300">No characters yet.</div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {characters.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                  >
                    <div className="flex">
                      <div className="w-24 shrink-0">
                        <img
                          src={characterImage(c)}
                          alt={c.name}
                          className="h-24 w-24 object-cover"
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="text-base font-semibold text-zinc-100">{c.name}</div>
                        <div className="mt-1 text-sm text-zinc-300">{c.tagline ?? "—"}</div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-300">
                          <span className="rounded-full bg-white/10 px-2 py-1 ring-1 ring-white/10">
                            {c.visibility}
                          </span>
                          <span className="rounded-full bg-white/10 px-2 py-1 ring-1 ring-white/10">
                            {c.is_nsfw ? "NSFW" : "SFW"}
                          </span>
                          <span className="rounded-full bg-white/10 px-2 py-1 ring-1 ring-white/10">
                            ♥ {c.likes_count ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 p-3">
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
            )}
          </Card>
        )}

        {tab === "personas" && <PersonasPanel profile={profile} />}

        {tab === "settings" && (
          <SettingsPanel profile={profile} onProfileUpdated={loadAll} />
        )}
      </div>
    </div>
  );
}
