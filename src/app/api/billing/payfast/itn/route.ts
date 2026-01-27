// src/app/api/billing/payfast/itn/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function md5(input: string) {
  return crypto.createHash("md5").update(input).digest("hex");
}

function urlEncodeUppercase(str: string) {
  return encodeURIComponent(str).replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}

function buildParamString(params: Record<string, string>, passphrase?: string) {
  const keys = Object.keys(params).sort();
  const pairs = keys
    .filter((k) => k !== "signature")
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map((k) => `${k}=${urlEncodeUppercase(String(params[k])).trim()}`);

  let s = pairs.join("&");
  if (passphrase && passphrase.trim().length > 0) {
    s += `&passphrase=${urlEncodeUppercase(passphrase.trim())}`;
  }
  return s;
}

function parseForm(body: string) {
  const params = new URLSearchParams(body);
  const obj: Record<string, string> = {};
  params.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const payload = parseForm(raw);

    const sandbox = (process.env.PAYFAST_SANDBOX || "true").toLowerCase() !== "false";
    const passphrase = process.env.PAYFAST_PASSPHRASE || "";

    // 1) Verify signature
    const expected = md5(buildParamString(payload, passphrase));
    const got = (payload.signature || "").trim();

    if (!got || expected !== got) {
      return new NextResponse("INVALID_SIGNATURE", { status: 400 });
    }

    // 2) Validate with PayFast (server-to-server)
    // PayFast expects you to POST the exact payload back to them; response should be "VALID"
    const validateUrl = sandbox
      ? "https://sandbox.payfast.co.za/eng/query/validate"
      : "https://www.payfast.co.za/eng/query/validate";

    const validateRes = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: raw,
      cache: "no-store",
    });

    const validateText = (await validateRes.text()).trim();
    if (validateText !== "VALID") {
      return new NextResponse("INVALID", { status: 400 });
    }

    // 3) Decide if this should grant premium
    // Common successful states are "COMPLETE" for payments
    const status = (payload.payment_status || "").toUpperCase();

    if (status !== "COMPLETE") {
      // For subscriptions you can receive other ITNs too; we ignore those safely.
      return new NextResponse("IGNORED", { status: 200 });
    }

    // 4) Identify user (we sent this from /api/billing/payfast)
    const userId = payload.custom_str1;
    if (!userId) {
      return new NextResponse("MISSING_USER", { status: 400 });
    }

    // 5) Upgrade user in Supabase using Service Role
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return new NextResponse("SERVER_MISCONFIG", { status: 500 });
    }

    const admin = createClient(url, serviceKey);

    const { error } = await admin
      .from("profiles")
      .update({
        plan: "premium",
        trial_until: null,
      })
      .eq("id", userId);

    if (error) {
      return new NextResponse("DB_ERROR", { status: 500 });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (e) {
    return new NextResponse("ERROR", { status: 500 });
  }
}
