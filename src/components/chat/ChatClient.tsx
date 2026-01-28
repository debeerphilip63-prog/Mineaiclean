"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatClient({ characterId }: { characterId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // If you already load chat history from DB, keep it.
    // This file focuses on mobile UX. So we only keep an empty starting state here.
    setMessages([]);
  }, [characterId]);

  useEffect(() => {
    // autoscroll
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setErr(null);
    setLoading(true);

    const next = [...messages, { role: "user", content: trimmed } as Msg];
    setMessages(next);
    setText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          message: trimmed,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Chat failed.");
      }

      const reply = (json?.reply as string) || "";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Chat container */}
      <div className="rounded-3xl border border-white/10 bg-white/5">
        {/* Messages area (scrollable) */}
        <div
          ref={listRef}
          className="h-[62vh] overflow-y-auto px-4 py-4 sm:h-[68vh] sm:px-6"
        >
          {messages.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300/80">
              Say hi 👋
            </div>
          )}

          <div className="mt-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[70%] ${
                    m.role === "user"
                      ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/15"
                      : "bg-white/5 text-zinc-200/90 ring-1 ring-white/10"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-300/70 ring-1 ring-white/10">
                  Typing…
                </div>
              </div>
            )}
          </div>
        </div>

        {err && (
          <div className="mx-4 mb-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 sm:mx-6">
            ⚠ {err}
          </div>
        )}

        {/* Input bar (sticky feel) */}
        <div className="border-t border-white/10 p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message…"
              className="min-h-[44px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              rows={1}
            />

            <button
              onClick={send}
              disabled={loading || !text.trim()}
              className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-medium text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>

          {/* iPhone safe area */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}
