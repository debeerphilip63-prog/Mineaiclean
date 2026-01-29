// src/lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";

  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !anon) {
    // Don't crash the whole app on the client; return a client that will error on use.
    console.warn("Missing Supabase env vars (browser). Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createBrowserClient(url, anon);
}
