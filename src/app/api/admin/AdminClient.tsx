"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: "free" | "premium";
  is_admin: boolean;
  trial_until: string | null;
};

export default function AdminClient() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setNotice(null);

    const res = await fetch("/api/admin/users");
    const json = await res.json();

    if (!res.ok) {
      setNotice(json.error || "Failed to load users");
      setLoading(false);
      return;
    }

    setRows(json.users || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateUser(id: string, patch: Partial<UserRow>) {
    setNotice(null);

    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });

    const json = await res.json();

    if (!res.ok) {
      setNotice(json.error || "Update failed");
      return;
    }

    setNotice("✅ Updated.");
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-xl font-bold text-zinc-100">Admin Dashboard</div>
        <div className="mt-1 text-sm text-zinc-400">
          Grant premium, give trials, manage users.
        </div>

        {notice && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="mt-6 text-zinc-200">Loading…</div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-200">
              <thead className="text-xs text-zinc-400">
                <tr>
                  <th className="py-2">Email</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Trial until</th>
                  <th className="py-2">Admin</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t border-white/10">
                    <td className="py-3">{u.email ?? "—"}</td>
                    <td className="py-3">{u.display_name ?? "—"}</td>
                    <td className="py-3">{u.plan}</td>
                    <td className="py-3">{u.trial_until ?? "—"}</td>
                    <td className="py-3">{u.is_admin ? "yes" : "no"}</td>
                    <td className="py-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                        onClick={() => updateUser(u.id, { plan: "premium" })}
                      >
                        Make Premium
                      </button>

                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                        onClick={() => updateUser(u.id, { plan: "free" })}
                      >
                        Make Free
                      </button>

                      <button
                        className="rounded-xl bg-amber-500/20 px-3 py-2 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          updateUser(u.id, { trial_until: d.toISOString() });
                        }}
                      >
                        7-day trial
                      </button>

                      <button
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                        onClick={() => updateUser(u.id, { trial_until: null })}
                      >
                        Clear trial
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={load}
              className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
