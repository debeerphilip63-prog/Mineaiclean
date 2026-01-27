import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreateCharacterBody = {
  name: string;
  tagline?: string;
  description: string;
  scenario?: string;
  greeting?: string;
  is_nsfw?: boolean;
  visibility?: "public" | "private";
  image_url?: string | null;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = (await req.json()) as CreateCharacterBody;

    if (!body.name?.trim() || body.name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!body.description?.trim() || body.description.trim().length < 20) {
      return NextResponse.json(
        { error: "Description must be at least 20 characters." },
        { status: 400 }
      );
    }

    // Load profile (plan/admin)
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("plan,is_admin")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 400 });
    }

    const isAdmin = profile.is_admin === true;
    const plan = profile.plan; // free | premium

    // Enforce: free can create only 1 character
    if (!isAdmin && plan === "free") {
      const { count, error: countErr } = await supabase
        .from("characters")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);

      if (countErr) {
        return NextResponse.json({ error: "Could not check limits." }, { status: 500 });
      }

      if ((count ?? 0) >= 1) {
        return NextResponse.json(
          { error: "Free plan allows only 1 character. Upgrade to Premium for unlimited." },
          { status: 403 }
        );
      }
    }

    // Enforce: free must be public
    const requestedVisibility = body.visibility ?? "public";
    const finalVisibility =
      isAdmin || plan === "premium" ? requestedVisibility : "public";

    const insertRow = {
      owner_id: user.id,
      name: body.name.trim(),
      tagline: body.tagline?.trim() ?? null,
      description: body.description.trim(),
      scenario: body.scenario?.trim() ?? null,
      greeting: body.greeting?.trim() ?? null,
      is_nsfw: body.is_nsfw ?? false,
      visibility: finalVisibility,
      image_url: body.image_url ?? null,
    };

    const { data: created, error: insErr } = await supabase
      .from("characters")
      .insert(insertRow)
      .select("*")
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ character: created });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
