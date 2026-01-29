// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getAppUrl(requestUrl: string) {
  // Prefer explicit env var (best for Render + custom domain)
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL;

  if (envUrl && envUrl.startsWith("http")) return envUrl.replace(/\/$/, "");

  // Fallback: use request url origin
  return new URL(requestUrl).origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // If we ever support redirecting back to a page, use ?next=/somewhere
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") ? next : "/";

  const appUrl = getAppUrl(request.url);
  return NextResponse.redirect(`${appUrl}${safeNext}`);
}
