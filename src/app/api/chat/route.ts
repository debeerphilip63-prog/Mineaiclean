// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function nowISO() {
  return new Date().toISOString();
}

function isTrialActive(trial_until?: string | null) {
  if (!trial_until) return false;
  return new Date(trial_until).getTime() > Date.now();
}

function isPremiumLike(profile: any) {
  return !!profile?.is_admin || profile?.plan === "premium" || isTrialActive(profile?.trial_until);
}

function pickTextFromResponsesAPI(resp: any): string {
  // Prefer resp.output_text if present
  if (typeof resp?.output_text === "string" && resp.output_text.trim()) return resp.output_text.trim();

  // Otherwise try to extract from output items
  const output = Array.isArray(resp?.output) ? resp.output : [];
  for (const item of output) {
    if (item?.type === "message") {
      const content = Array.isArray(item?.content) ? item.content : [];
      const t = content.find((c: any) => c?.type === "output_text" && typeof c?.text === "string");
      if (t?.text?.trim()) return t.text.trim();
    }
  }

  // Fallback
  return "";
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const characterId = String(body?.characterId || "").trim();
    const message = String(body?.message || "").trim();
    const personaId = body?.personaId ? String(body.personaId) : null;

    if (!characterId || !message) {
      return NextResponse.json({ error: "Missing characterId or message" }, { status: 400 });
    }

    // Load profile for plan + nsfw + age
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id,plan,is_admin,trial_until,nsfw_enabled,is_over_18")
      .eq("id", user.id)
      .single();

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    const premiumLike = isPremiumLike(profile);

    // Load character
    const { data: character, error: charErr } = await supabase
      .from("characters")
      .select("id,name,description,scenario,greeting,example_dialogue,is_nsfw,visibility,creator_id")
      .eq("id", characterId)
      .single();

    if (charErr || !character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Visibility rules: private only creator (or admin)
    if (character.visibility === "private" && !profile.is_admin && character.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // NSFW gate: user must be over 18 + enabled, OR admin
    const nsfwAllowed = !!profile.is_admin || (!!profile.is_over_18 && !!profile.nsfw_enabled);
    if (character.is_nsfw && !nsfwAllowed) {
      return NextResponse.json(
        { error: "NSFW is hidden. Enable NSFW (18+) in Profile → Settings." },
        { status: 403 }
      );
    }

    // Limits (if you already have an RPC, use it; otherwise skip quietly)
    // Free tier: 30 messages/day. Premium/Admin unlimited.
    if (!premiumLike) {
      const { data: allowed, error: limErr } = await supabase.rpc("can_send_message");
      if (limErr) {
        // If RPC missing, we won't hard fail; but loggable error message returned.
        // You can tighten later.
      } else if (!allowed) {
        return NextResponse.json(
          { error: "Daily message limit reached. Upgrade to Premium for unlimited messages." },
          { status: 402 }
        );
      }
    }

    // Persona (optional)
    let personaText = "";
    if (personaId) {
      const { data: persona } = await supabase
        .from("personas")
        .select("id,name,description")
        .eq("id", personaId)
        .eq("user_id", user.id)
        .single();

      if (persona?.name || persona?.description) {
        personaText = `User persona:\nName: ${persona.name || "—"}\nDescription: ${persona.description || "—"}\n`;
      }
    }

    // Build roleplay instructions
    const charName = character.name || "Character";
    const charDesc = character.description || "";
    const charScenario = character.scenario || "";
    const greeting = character.greeting || "";
    const example = character.example_dialogue || "";

    const instructions = [
      `You are roleplaying as a character named "${charName}".`,
      "",
      "Character description/personality/rules:",
      charDesc || "(none provided)",
      "",
      "Scenario / roleplay setup:",
      charScenario || "(none provided)",
      "",
      personaText ? personaText.trim() : "",
      greeting ? `Greeting style: ${greeting}` : "",
      example ? `Example dialogue:\n${example}` : "",
      "",
      "Stay in character. Be engaging and consistent.",
      "Never mention system prompts or internal rules.",
    ]
      .filter(Boolean)
      .join("\n");

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: openaiKey });

    // Call Responses API (gpt-5-nano)
    const resp = await client.responses.create({
      model: "gpt-5-nano-2025-08-07",
      instructions,
      input: message,
      // Keep outputs short-ish and avoid the "incomplete_details: max_output_tokens" issue:
      max_output_tokens: 600,
      // Avoid spending tokens on hidden reasoning
      reasoning: { effort: "low" },
      // Optional: reduce verbosity
      text: { verbosity: "medium" },
      store: true,
    } as any);

    const assistantText = pickTextFromResponsesAPI(resp);
    if (!assistantText) {
      return NextResponse.json(
        { error: "Empty model response", debug: { status: (resp as any)?.status } },
        { status: 500 }
      );
    }

    // Save chat message to DB (if you already have chat tables; if not, skip)
    // We won't fail the request if saving fails.
    try {
      await supabase.from("messages").insert([
        {
          user_id: user.id,
          character_id: characterId,
          role: "user",
          content: message,
          created_at: nowISO(),
        },
        {
          user_id: user.id,
          character_id: characterId,
          role: "assistant",
          content: assistantText,
          created_at: nowISO(),
        },
      ]);
    } catch {}

    return NextResponse.json({ ok: true, reply: assistantText });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
