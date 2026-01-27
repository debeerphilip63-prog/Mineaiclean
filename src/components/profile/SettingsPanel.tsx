"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  email: string | null;
  plan: "free" | "premium";
  is_admin: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
  is_over_18?: boolean;
  nsfw_enabled?: boolean;
};

export default function SettingsPanel({
  profile,
  onProfileUpdated,
}: {
  profile: ProfileRow | null;
  onProfileUpdated: () => Promise<void> | void;
}) {
  const supabase = createSupabaseBrowserClient();

  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isOver18, setIsOver18] = useState(false);
  const [nsfwEnabled, setNsfwEnabled] = useState(false);

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setNewEmail(profile?.email ?? "");
    setIsOver18(!!profile?.is_over_18);
    setNsfwEnabled(!!profile?.nsfw_enabled);
  }, [profile]);

  const avatarSrc = useMemo(() => {
    if (!profile) return "";
    return profile.avatar_url || `https://api.dicebear.com/9.x/thumbs/svg?seed=${profile.id}`;
  }, [profile]);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setNotice(null);

    try {
      // If user unchecks 18+, we force NSFW off
      const safeNsfwEnabled = isOver18 ? nsfwEnabled : false;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          is_over_18: isOver18,
          nsfw_enabled: safeNsfwEnabled,
        })
        .eq("id", profile.id);

      if (error) throw new Error(error.message);

      setNotice("✅ Settings saved.");
      await onProfileUpdated();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message ?? "Failed to save."}`);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!profile) return;
    setSaving(true);
    setNotice(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${profile.id}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
      });
      if (upErr) throw new Error(upErr.message);

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (dbErr) throw new Error(dbErr.message);

      setNotice("✅ Avatar updated.");
      await onProfileUpdated();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message ?? "Avatar upload failed."}`);
    } finally {
      setSaving(false);
    }
  }

  async function changeEmail() {
    const email = newEmail.trim();
    if (!email) return;

    setSaving(true);
    setNotice(null);

    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw new Error(error.message);

      setNotice("✅ Check your inbox to confirm your new email.");
    } catch (e: any) {
      setNotice(`⚠️ ${e.message ?? "Email change failed."}`);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
        No profile loaded.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-lg font-semibold text-zinc-100">Settings</div>
      <div className="mt-1 text-sm text-zinc-400">
        Edit your display name, avatar, email, and NSFW preferences.
      </div>

      {notice && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">
          {notice}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Avatar */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold text-zinc-100">Profile picture</div>
          <div className="mt-4 flex items-center gap-4">
            <img
              src={avatarSrc}
              alt="avatar"
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
            />
            <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </label>
          </div>
        </div>

        {/* Display Name */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm font-semibold text-zinc-100">Display name</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        {/* Email */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5 md:col-span-2">
          <div className="text-sm font-semibold text-zinc-100">Email address</div>
          <div className="mt-1 text-xs text-zinc-500">
            Changing email requires verification.
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <button
              disabled={saving}
              onClick={changeEmail}
              className={
                "rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition " +
                (saving
                  ? "bg-white/5 text-zinc-500 ring-white/10 cursor-not-allowed"
                  : "bg-white/5 text-zinc-200 ring-white/10 hover:bg-white/10")
              }
            >
              Change email
            </button>
          </div>
        </div>

        {/* NSFW gate */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5 md:col-span-2">
          <div className="text-sm font-semibold text-zinc-100">NSFW settings (18+)</div>
          <div className="mt-2 text-sm text-zinc-400">
            NSFW characters are hidden and blocked until you confirm 18+ and enable NSFW.
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <label className="flex items-center gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={isOver18}
                onChange={(e) => setIsOver18(e.target.checked)}
              />
              I confirm I am 18 or older
            </label>

            <label className="flex items-center gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={nsfwEnabled}
                disabled={!isOver18}
                onChange={(e) => setNsfwEnabled(e.target.checked)}
              />
              Enable NSFW characters
            </label>

            {!isOver18 && (
              <div className="text-xs text-zinc-500">
                NSFW toggle is disabled until you confirm 18+.
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        disabled={saving}
        onClick={saveProfile}
        className={
          "mt-6 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition " +
          (saving
            ? "bg-white/5 text-zinc-500 ring-white/10 cursor-not-allowed"
            : "bg-amber-500/20 text-amber-100 ring-amber-500/30 hover:bg-amber-500/25")
        }
      >
        Save settings
      </button>
    </div>
  );
}
