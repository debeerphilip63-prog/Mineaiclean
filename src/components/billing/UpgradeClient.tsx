"use client";

import { useMemo, useState } from "react";

type CheckoutResponse =
  | { ok: true; actionUrl: string; fields: Record<string, string> }
  | { ok: false; error: string };

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-zinc-200/90">
      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
      <div>{children}</div>
    </div>
  );
}

export default function UpgradeClient() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const price = useMemo(() => ({ usd: "10.00", label: "$10 / month" }), []);

  async function startCheckout() {
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/billing/payfast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // We keep the body simple for now; server sets the important PayFast fields.
        body: JSON.stringify({ plan: "premium_monthly" }),
      });

      const data = (await res.json()) as CheckoutResponse;

      if (!data.ok) {
        setErr(data.error || "Checkout failed.");
        setLoading(false);
        return;
      }

      // Build a form and auto-submit to PayFast
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.actionUrl;

      Object.entries(data.fields).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/20 p-6 shadow-xl">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-zinc-400">MineAI</div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Upgrade to Premium
            </h1>
            <p className="text-zinc-300/90">
              Unlimited roleplay, unlimited characters, private characters, and
              built-in AI images.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/20 p-6">
              <div className="text-sm text-zinc-400">Free</div>
              <div className="mt-1 text-2xl font-semibold">$0</div>
              <div className="mt-4 flex flex-col gap-3">
                <Feature>30 messages per day</Feature>
                <Feature>1 public character</Feature>
                <Feature>1 persona</Feature>
                <Feature>Upload your own character image</Feature>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-800/60 bg-black/20 p-4 text-sm text-zinc-300/90">
                You can always upgrade later.
              </div>
            </div>

            {/* Premium */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6">
              <div className="absolute inset-x-0 top-0 h-1 bg-emerald-400/80" />
              <div className="text-sm text-emerald-200/90">Premium</div>
              <div className="mt-1 text-2xl font-semibold">{price.label}</div>
              <div className="mt-4 flex flex-col gap-3">
                <Feature>Unlimited messages</Feature>
                <Feature>Unlimited characters</Feature>
                <Feature>Private or public characters</Feature>
                <Feature>Unlimited personas</Feature>
                <Feature>Built-in AI image generator</Feature>
              </div>

              <button
                onClick={startCheckout}
                disabled={loading}
                className="mt-6 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-emerald-300 disabled:opacity-60"
              >
                {loading ? "Redirecting to PayFast..." : "Upgrade with PayFast"}
              </button>

              {err ? (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {err}
                </div>
              ) : null}

              <div className="mt-4 text-xs text-zinc-300/80">
                Secure checkout handled by PayFast.
              </div>
            </div>
          </div>

          <div className="mt-10 text-sm text-zinc-400">
            After payment, you’ll return here automatically.
          </div>
        </div>
      </main>
    </div>
  );
}
