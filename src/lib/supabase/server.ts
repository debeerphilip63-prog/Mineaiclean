// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const anon =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !anon) {
    throw new Error(
      "Missing Supabase env vars (server). Set SUPABASE_URL + SUPABASE_ANON_KEY (or NEXT_PUBLIC_* equivalents)."
    );
  }

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        // ✅ Next 15/16 cookies() returns a store object; getAll exists on store
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((c) => {
          cookieStore.set(c.name, c.value, c.options);
        });
      },
    },
  });
}
