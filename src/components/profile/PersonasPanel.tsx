"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  plan?: string | null;
  is_admin?: boolean | null;
  trial_until?: string | null;
};

type PersonaRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at?: string;
};

function isTrialActive(trial_until?: string | null) {
  if (!trial_until) return false;
  return new Date(trial_until).getTime() > Date.now();
}

function isPremiumLike(profile: ProfileRow | null) {
  if (!profile) return false;
  return !!profile.is_admin || profile.plan === "premium" || isTrialActive(profile.trial_until);
}

export default function PersonasPanel({ profile }: { profile: ProfileRow | null }) {
  const supabase = createSupabaseBrowserClient();

  const premiumLike = useMemo(() => isPremiumLike(profile), [profile]);

  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [personas, setPersonas] = useState<PersonaRow[]>([]);

  async function loadPersonas() {
    setNotice(null);
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setNotice("Please sign in.");
      setPersonas([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("personas")
      .select("id,user_id,name,description,created_at")
      .eq("user_id", userRes.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // If your table doesn't have description, you’ll see that error here.
      setNotice(error.message);
      setPersonas([]);
      setLoading(false);
      return;
    }

    setPersonas((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadPersonas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPersona() {
    setNotice(null);

    const n = name.trim();
    const d = description.trim();

    if (!n) {
      setNotice("⚠️ Please enter a persona name.");
      return;
    }

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setNotice("Please sign in.");
      return;
    }

    // Free tier: 1 persona. Premium/Admin: unlimited.
    if (!premiumLike && personas.length >= 1) {
      setNotice("⚠️ Free tier allows 1 persona. Upgrade to Premium for unlimited.");
      return;
    }

    const { error } = await supabase.from("personas").insert({
      user_id: userRes.user.id,
      name: n,
      description: d || null,
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    setName("");
    setDescription("");
    setNotice("✅ Persona created.");
    await loadPersonas();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-100">Personas</div>
            <div className="mt-1 text-sm text-zinc-400">
              Free: 1 persona • Premium/Admin: unlimited
            </div>
          </div>
          <div className="text-sm text-zinc-300">{premiumLike ? "Unlimited" : "Free"}</div>
        </div>

        {notice && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">
            {notice}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Persona name (e.g., Philip 'The Explorer')"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this persona: background, tone, behavior, relationship style..."
            className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          />

          <button
            onClick={createPersona}
            className="w-full rounded-2xl bg-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
          >
            Create Persona
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-100">Your personas</div>
          <button
            onClick={loadPersonas}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-zinc-400">Loading…</div>
          ) : personas.length === 0 ? (
            <div className="text-sm text-zinc-400">None yet.</div>
          ) : (
            <div className="space-y-3">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="text-sm font-semibold text-zinc-100">{p.name}</div>
                  <div className="mt-1 text-sm text-zinc-400 whitespace-pre-wrap">
                    {p.description || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
