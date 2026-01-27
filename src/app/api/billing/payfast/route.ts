// src/app/api/billing/payfast/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function md5(input: string) {
  return crypto.createHash("md5").update(input).digest("hex");
}

function urlEncodeUppercase(str: string) {
  return encodeURIComponent(str).replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}

function buildParamString(params: Record<string, string>, passphrase?: string) {
  const keys = Object.keys(params).sort();
  const pairs = keys
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map((k) => `${k}=${urlEncodeUppercase(String(params[k])).trim()}`);

  let s = pairs.join("&");
  if (passphrase && passphrase.trim().length > 0) {
    s += `&passphrase=${urlEncodeUppercase(passphrase.trim())}`;
  }
  return s;
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
    }

    const merchantId = process.env.PAYFAST_MERCHANT_ID || "";
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || "";
    const passphrase = process.env.PAYFAST_PASSPHRASE || "";
    const sandbox = (process.env.PAYFAST_SANDBOX || "true").toLowerCase() !== "false";

    if (!merchantId || !merchantKey) {
      return NextResponse.json(
        { ok: false, error: "Missing PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY in .env.local" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // PayFast redirects after payment
    const returnUrl = `${baseUrl}/billing/success`;
    const cancelUrl = `${baseUrl}/billing/cancel`;

    // PayFast ITN (webhook) endpoint
    const notifyUrl = `${baseUrl}/api/billing/payfast/itn`;

    // Premium plan details
    const amount = "10.00";
    const itemName = "MineAI Premium Subscription";
    const itemDesc = "Premium monthly subscription";

    // Subscription config
    // frequency=3 => monthly, cycles=0 => ongoing (monthly until cancelled)
    const subscription_type = "1";
    const frequency = "3";
    const cycles = "0";
    const recurring_amount = amount;

    // Track this payment
    const m_payment_id = `mineai_${Date.now()}`;

    // IMPORTANT: attach user id so ITN can upgrade the correct user
    // PayFast supports custom_str1..custom_str5 (free-form strings)
    const custom_str1 = userRes.user.id;

    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,

      m_payment_id,
      amount,
      item_name: itemName,
      item_description: itemDesc,

      // subscription fields
      subscription_type,
      recurring_amount,
      frequency,
      cycles,

      // our metadata
      custom_str1,
    };

    const paramString = buildParamString(fields, passphrase);
    fields.signature = md5(paramString);

    const actionUrl = sandbox
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process";

    return NextResponse.json({ ok: true, actionUrl, fields });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
