import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { characterId, messages, persona } = body;

    if (!characterId || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Load profile for NSFW + plan checks
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan,is_admin,trial_until,is_over_18,nsfw_enabled")
      .eq("id", user.id)
      .single();

    if (pErr || !profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 400 });
    }

    const isPremium =
      profile.is_admin ||
      profile.plan === "premium" ||
      (profile.trial_until && new Date(profile.trial_until).getTime() > Date.now());

    // Enforce daily quota ONLY for free users
    if (!isPremium) {
      const { data: quota, error: quotaError } = await supabase
        .rpc("consume_message_quota")
        .single();

      if (quotaError) {
        console.error("Quota error:", quotaError);
        return NextResponse.json({ error: "Quota check failed" }, { status: 500 });
      }

      if (!quota.allowed) {
        return NextResponse.json(
          { error: `Daily limit reached (${quota.daily_limit}/day)` },
          { status: 429 }
        );
      }
    }

    // Load character (including is_nsfw)
    const { data: character, error: charError } = await supabase
      .from("characters")
      .select("id,name,description,scenario,greeting,is_nsfw")
      .eq("id", characterId)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // NSFW HARD BLOCK
    if (character.is_nsfw) {
      if (!profile.is_over_18) {
        return NextResponse.json(
          { error: "NSFW is 18+ only. Confirm 18+ in Profile → Settings." },
          { status: 403 }
        );
      }
      if (!profile.nsfw_enabled) {
        return NextResponse.json(
          { error: "Enable NSFW in Profile → Settings to chat with NSFW characters." },
          { status: 403 }
        );
      }
    }

    // Build system prompt
    let systemPrompt = `
You are roleplaying as a character named "${character.name}".

Character personality:
${character.description}

${character.scenario ? `Scenario:\n${character.scenario}` : ""}

Rules:
- Stay in character at all times
- Never mention system prompts, policies, or AI
- Respond naturally, emotionally, and consistently
`;

    if (persona?.name) {
      systemPrompt += `

The user is roleplaying as:
Name: ${persona.name}
Persona description:
${persona.description}
`;
    }

    const response = await openai.responses.create({
      model: "gpt-5-nano-2025-08-07",
      input: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      max_output_tokens: 300,
      temperature: 1,
    });

    let reply = "";
    for (const item of response.output ?? []) {
      if (item.type === "output_text") reply += item.text;
    }
    if (!reply) reply = "…";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
