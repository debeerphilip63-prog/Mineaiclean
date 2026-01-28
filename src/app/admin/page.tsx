// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";

type UserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/admin/users");
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error || "Failed to load users.");
        setUsers(json.users || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell active="admin">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-400">
          View registered users. (Only admins can access this page.)
        </p>

        {err && (
          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            ⚠ {err}
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="text-sm font-medium">Users</div>
            <div className="text-xs text-zinc-400">{users.length} total</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm text-zinc-300/70">Loading…</div>
          ) : users.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-300/70">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Last Sign-in</th>
                    <th className="px-4 py-3">User ID</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200/80">
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/10">
                      <td className="px-4 py-3">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">{u.created_at ?? "—"}</td>
                      <td className="px-4 py-3">{u.last_sign_in_at ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{u.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
