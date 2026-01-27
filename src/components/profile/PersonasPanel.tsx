"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PersonaRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  plan: string;
  is_admin: boolean;
  trial_until: string | null;
};

export default function PersonasPanel() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [isPremium, setIsPremium] = useState(false);
  const [limitLabel, setLimitLabel] = useState("Free: 1 persona • Premium/Admin: unlimited");

  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [creating, setCreating] = useState(false);

  const canCreateMore = useMemo(() => {
    if (isPremium) return true;
    return personas.length < 1;
  }, [isPremium, personas.length]);

  async function loadAll() {
    setLoading(true);
    setNotice(null);

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setNotice("Please sign in to manage personas.");
      setPersonas([]);
      setIsPremium(false);
      setLoading(false);
      return;
    }

    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("id,plan,is_admin,trial_until")
      .eq("id", userRes.user.id)
      .single();

    if (pErr || !prof) {
      setNotice(pErr?.message ?? "Could not load profile.");
      setIsPremium(false);
    } else {
      const premium =
        !!prof.is_admin ||
        prof.plan === "premium" ||
        (!!prof.trial_until && new Date(prof.trial_until).getTime() > Date.now());

      setIsPremium(premium);
      setLimitLabel(premium ? "Unlimited" : "Free: 1 persona • Premium/Admin: unlimited");
    }

    const { data, error } = await supabase
      .from("personas")
      .select("id,user_id,name,description,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setNotice(error.message);
      setPersonas([]);
    } else {
      setPersonas((data as any) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
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

    setCreating(true);

    try {
      // ✅ Server-side enforced check (free: 1, premium/admin/trial: unlimited)
      const { data: allowed, error: rpcErr } = await supabase.rpc("can_create_persona");
      if (rpcErr) throw new Error(rpcErr.message);

      if (!allowed) {
        setNotice("⚠️ Free tier can only create 1 persona. Upgrade to Premium for unlimited.");
        setCreating(false);
        return;
      }

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in.");

      const { error } = await supabase.from("personas").insert({
        user_id: userRes.user.id,
        name: n,
        description: d || null,
      });

      if (error) throw new Error(error.message);

      setName("");
      setDescription("");
      setNotice("✅ Persona created.");
      await loadAll();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message ?? "Failed to create persona."}`);
    } finally {
      setCreating(false);
    }
  }

  async function deletePersona(id: string) {
    setNotice(null);

    try {
      const { error } = await supabase.from("personas").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setNotice("✅ Persona deleted.");
      await loadAll();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message ?? "Failed to delete persona."}`);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-100">Personas</div>
          <div className="mt-1 text-sm text-zinc-400">{limitLabel}</div>
        </div>
        <div className="text-sm text-zinc-300">
          {isPremium ? "Unlimited" : `Remaining: ${Math.max(0, 1 - personas.length)}/1`}
        </div>
      </div>

      {notice && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">
          {notice}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Create */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold text-zinc-100">Create a persona</div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Persona name (e.g., Philip 'The Explorer')"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this persona: background, tone, behavior, relationship style…"
            className="mt-3 h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          />

          <button
            onClick={createPersona}
            disabled={creating || !canCreateMore}
            className={
              "mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition " +
              (creating || !canCreateMore
                ? "bg-white/5 text-zinc-500 ring-white/10 cursor-not-allowed"
                : "bg-amber-500/20 text-amber-100 ring-amber-500/30 hover:bg-amber-500/25")
            }
          >
            {creating
              ? "Creating…"
              : canCreateMore
              ? "Create Persona"
              : "Free limit reached (Upgrade to Premium)"}
          </button>
        </div>

        {/* List */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold text-zinc-100">Your personas</div>

          {loading ? (
            <div className="mt-4 text-sm text-zinc-300">Loading…</div>
          ) : personas.length === 0 ? (
            <div className="mt-4 text-sm text-zinc-300">None yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-zinc-100">{p.name}</div>
                      <div className="mt-1 text-sm text-zinc-300 line-clamp-3">
                        {p.description ?? "—"}
                      </div>
                    </div>

                    <button
                      onClick={() => deletePersona(p.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={loadAll}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
