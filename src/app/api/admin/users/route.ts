import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
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

    // Service-role client (bypasses RLS for listing users)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local" },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey);

    const { data: users, error } = await admin
      .from("profiles")
      .select("id,email,display_name,plan,is_admin,trial_until")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ users: users ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed." }, { status: 500 });
  }
}
