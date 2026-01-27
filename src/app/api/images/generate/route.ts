import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function isPremiumLike(profile: any) {
  const trialOk = profile?.trial_until && new Date(profile.trial_until).getTime() > Date.now();
  return !!profile?.is_admin || profile?.plan === "premium" || !!trialOk;
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }

    // check premium/admin/trial
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan,is_admin,trial_until")
      .eq("id", userRes.user.id)
      .single();

    if (pErr) {
      return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
    }
    if (!isPremiumLike(profile)) {
      return NextResponse.json(
        { ok: false, error: "Premium feature. Please upgrade to generate images." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const prompt = String(body?.prompt || "").trim();
    if (!prompt) {
      return NextResponse.json({ ok: false, error: "Missing prompt." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY." }, { status: 500 });
    }

    // Generate image (Image API with GPT Image model) :contentReference[oaicite:1]{index=1}
    const img = await openai.images.generate({
      model: "gpt-image-1-mini",
      prompt,
      size: "1024x1024",
    });

    const b64 = img.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ ok: false, error: "No image returned." }, { status: 500 });
    }

    const bytes = Buffer.from(b64, "base64");

    // Upload to Supabase Storage using service role
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey);

    const bucketCandidates = ["characters", "character-images", "character_images"];
    const path = `${userRes.user.id}/ai_${crypto.randomUUID()}.png`;

    let publicUrl: string | null = null;
    let lastErr: any = null;

    for (const bucket of bucketCandidates) {
      const up = await admin.storage.from(bucket).upload(path, bytes, {
        contentType: "image/png",
        upsert: true,
      });

      if (up.error) {
        lastErr = up.error;
        continue;
      }

      const pub = admin.storage.from(bucket).getPublicUrl(path);
      publicUrl = pub.data.publicUrl;
      break;
    }

    if (!publicUrl) {
      return NextResponse.json(
        { ok: false, error: lastErr?.message ?? "Upload failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
