// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function GET() {
  try {
    // ✅ cookies() IS ASYNC IN NEXT 15/16
    const cookieStore = await cookies();

    // Authenticated Supabase client (user session)
    const supabase = createServerClient(
      env("SUPABASE_URL"),
      env("SUPABASE_ANON_KEY"),
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach((c) =>
              cookieStore.set(c.name, c.value, c.options)
            );
          },
        },
      }
    );

    // 1️⃣ Verify user session
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2️⃣ Verify admin flag
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { ok: false, error: "Admin only" },
        { status: 403 }
      );
    }

    // 3️⃣ Service-role client to list users
    const admin = createClient(
      env("SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      users: data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
