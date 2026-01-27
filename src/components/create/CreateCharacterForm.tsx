"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CreateCharacterForm() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [isPremium, setIsPremium] = useState(false);

  // form fields
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState("");
  const [personality, setPersonality] = useState("");
  const [greeting, setGreeting] = useState("");
  const [exampleDialogue, setExampleDialogue] = useState("");
  const [isNsfw, setIsNsfw] = useState(false);

  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const [saving, setSaving] = useState(false);

  // AI generate state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const canUsePrivate = useMemo(() => isPremium, [isPremium]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotice(null);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setNotice("Please sign in to create a character.");
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
        if (!premium) setVisibility("public");
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadImage(file: File) {
    setNotice(null);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in.");

      const bucketCandidates = ["characters", "character-images", "character_images"];
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userRes.user.id}/${crypto.randomUUID()}.${ext}`;

      let publicUrl: string | null = null;
      let lastErr: any = null;

      for (const bucket of bucketCandidates) {
        const up = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
        if (up.error) {
          lastErr = up.error;
          continue;
        }
        const pub = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = pub.data.publicUrl;
        break;
      }

      if (!publicUrl) throw new Error(lastErr?.message ?? "Upload failed. Check your storage bucket.");

      setImageUrl(publicUrl);
      setNotice("✅ Image uploaded.");
    } catch (e: any) {
      setNotice(`⚠️ ${e.message ?? "Upload failed."}`);
    }
  }

  async function aiGenerate() {
    setNotice(null);

    if (!isPremium) {
      setNotice("⚠️ Premium feature. Please upgrade to generate images.");
      return;
    }

    const p = aiPrompt.trim();
    if (!p) {
      setNotice("⚠️ Please enter an image prompt.");
      return;
    }

    setAiBusy(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Image generation failed.");

      setImageUrl(data.url);
      setAiOpen(false);
      setAiPrompt("");
      setNotice("✅ AI image generated.");
    } catch (e: any) {
      setNotice(`⚠️ ${e.message ?? "Failed to generate image."}`);
    } finally {
      setAiBusy(false);
    }
  }

  async function createCharacter() {
    setNotice(null);

    const n = name.trim();
    if (!n) {
      setNotice("⚠️ Please enter a character name.");
      return;
    }

    if (!imageUrl) {
      setNotice("⚠️ Please upload a character image first.");
      return;
    }

    setSaving(true);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in.");

      const finalVisibility = isPremium ? visibility : "public";

      // Free tier: only 1 public character
      if (finalVisibility === "public") {
        const { data: allowed, error: rpcErr } = await supabase.rpc("can_create_public_character");
        if (rpcErr) throw new Error(rpcErr.message);
        if (!allowed) {
          setNotice("⚠️ Free tier can only create 1 public character. Upgrade to Premium for unlimited.");
          setSaving(false);
          return;
        }
      }

      const tagsArr = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: any = {
        creator_id: userRes.user.id,
        name: n,
        tagline: tagline.trim() || null,
        category: category.trim() || "General",
        tags: tagsArr,
        description: personality.trim() || null,
        scenario: personality.trim() || null,
        greeting: greeting.trim() || null,
        example_dialogue: exampleDialogue.trim() || null,
        image_url: imageUrl,
        is_nsfw: isNsfw,
        visibility: finalVisibility,
      };

      const { error } = await supabase.from("characters").insert(payload);
      if (error) throw new Error(error.message);

      setNotice("✅ Character created.");
      router.push("/my-characters");
    } catch (e: any) {
      setNotice(`⚠️ ${e.message ?? "Failed to create character."}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-100">Create Character</div>
          <div className="mt-1 text-sm text-zinc-400">
            {isPremium
              ? "Premium: unlimited characters • public/private • AI images"
              : "Free: 1 public character • upload your own image"}
          </div>
        </div>
        {!loading && <div className="text-sm text-zinc-300">{isPremium ? "Premium/Admin" : "Free"}</div>}
      </div>

      {notice && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">
          {notice}
        </div>
      )}

      <div className="mt-6 grid gap-6">
        {/* Image */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold text-zinc-100">Character image</div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="block cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 hover:bg-white/10 text-center">
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                }}
              />
            </label>

            <button
              onClick={() => (isPremium ? setAiOpen(true) : window.location.assign("/upgrade"))}
              className={
                "rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition " +
                (isPremium
                  ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-white/5 text-zinc-200 ring-white/10 hover:bg-white/10")
              }
            >
              {isPremium ? "AI Generate" : "Upgrade to use AI Generate"}
            </button>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4 flex items-center justify-center">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="character" className="h-48 w-full rounded-2xl object-cover" />
            ) : (
              <div className="text-sm text-zinc-500">No image yet</div>
            )}
          </div>
        </div>

        {/* Basics */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold text-zinc-100">Basics</div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name *"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
            />
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Short description (tagline)"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (e.g., Fantasy, Sci-Fi)"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
            />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <label className="flex items-center gap-3 text-sm text-zinc-200">
                <input type="checkbox" checked={isNsfw} onChange={(e) => setIsNsfw(e.target.checked)} />
                NSFW content
              </label>
              <div className="mt-1 text-xs text-zinc-500">NSFW is still hidden unless user enables NSFW (18+) in Settings.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="text-sm text-zinc-200 font-medium">Visibility</div>
              {!canUsePrivate ? (
                <div className="mt-2 text-sm text-zinc-400">
                  Free tier: characters must be <span className="text-zinc-200">public</span>.
                </div>
              ) : (
                <div className="mt-2 flex gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input type="radio" checked={visibility === "public"} onChange={() => setVisibility("public")} />
                    Public
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} />
                    Private
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold text-zinc-100">Personality & Behavior</div>

          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Describe the character’s personality, background, and behavior…"
            className="mt-4 h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          />

          <textarea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="Greeting message…"
            className="mt-3 h-20 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          />

          <textarea
            value={exampleDialogue}
            onChange={(e) => setExampleDialogue(e.target.value)}
            placeholder="Example dialogue (optional)…"
            className="mt-3 h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
          />
        </div>

        <button
          onClick={createCharacter}
          disabled={saving || loading}
          className={
            "w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition " +
            (saving || loading
              ? "bg-white/5 text-zinc-500 ring-white/10 cursor-not-allowed"
              : "bg-amber-500/20 text-amber-100 ring-amber-500/30 hover:bg-amber-500/25")
          }
        >
          {saving ? "Creating…" : "Create Character"}
        </button>
      </div>

      {/* AI modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <div className="text-lg font-semibold text-zinc-100">AI Generate character image</div>
            <div className="mt-1 text-sm text-zinc-400">Describe the character image you want.</div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Portrait photo, rugged street guy, warm cinematic lighting, realistic..."
              className="mt-4 h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setAiOpen(false)}
                disabled={aiBusy}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={aiGenerate}
                disabled={aiBusy}
                className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-emerald-300 disabled:opacity-60"
              >
                {aiBusy ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
