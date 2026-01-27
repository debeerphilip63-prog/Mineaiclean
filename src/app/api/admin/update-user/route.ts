import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // Check admin (user-scoped)
    const { data: me } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userRes.user.id)
      .single();

    if (!me?.is_admin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json();
    const id = body.id as string;
    const patch = body.patch as any;

    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    // Only allow safe fields
    const allowed: any = {};
    if (patch?.plan === "free" || patch?.plan === "premium") allowed.plan = patch.plan;
    if (patch?.trial_until === null || typeof patch?.trial_until === "string") {
      allowed.trial_until = patch.trial_until;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local" },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey);

    const { error } = await admin.from("profiles").update(allowed).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed." }, { status: 500 });
  }
}
