// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function supabaseAuthed() {
  const cookieStore = cookies();
  const url = need("SUPABASE_URL");
  const anon = need("SUPABASE_ANON_KEY");

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((c) => cookieStore.set(c.name, c.value, c.options));
      },
    },
  });
}

function supabaseAdmin() {
  const url = need("SUPABASE_URL");
  const service = need("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    // Verify session
    const sb = supabaseAuthed();
    const { data: userRes } = await sb.auth.getUser();
    const user = userRes.user;
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }

    // Verify admin from profiles
    const { data: prof } = await sb
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!prof?.is_admin) {
      return NextResponse.json({ ok: false, error: "Admin only." }, { status: 403 });
    }

    // Fetch users (service role)
    const admin = supabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 200, page: 1 });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const users = (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
