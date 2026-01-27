"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type PersonaRow = {
  id: string;
  name: string;
  description: string;
};

export default function ChatClient({ characterId }: { characterId: string }) {
  const supabase = createSupabaseBrowserClient();

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [personaId, setPersonaId] = useState<string | "">("");

  // Load personas + messages
  useEffect(() => {
    loadPersonas();
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  async function loadPersonas() {
    const { data } = await supabase
      .from("personas")
      .select("id,name,description")
      .order("created_at", { ascending: false });

    setPersonas((data as any) ?? []);
  }

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("id,role,content")
      .order("created_at", { ascending: true })
      .limit(50);

    setMessages((data as any) ?? []);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterId,
        message: text,
        personaId: personaId || null,
      }),
    });

    const json = await res.json();

    if (json.reply) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: text },
        { id: crypto.randomUUID(), role: "assistant", content: json.reply },
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Persona selector */}
      <div className="mb-3 flex items-center gap-3">
        <label className="text-sm text-zinc-400">Chat as:</label>
        <select
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none"
        >
          <option value="">Yourself</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "max-w-[75%] rounded-2xl px-4 py-2 text-sm " +
              (m.role === "user"
                ? "ml-auto bg-amber-500/20 text-amber-100"
                : "bg-white/10 text-zinc-100")
            }
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message…"
          className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="rounded-2xl bg-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
        >
          Send
        </button>
      </div>
    </div>
  );
}
