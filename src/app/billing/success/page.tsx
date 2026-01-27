// src/app/billing/success/page.tsx
export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/20 p-8">
          <h1 className="text-2xl font-semibold">Payment received 🎉</h1>
          <p className="mt-2 text-zinc-300/90">
            If your Premium access doesn’t show immediately, give it a minute.
            (We confirm via PayFast notification.)
          </p>

          <a
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-300"
          >
            Go back home
          </a>
        </div>
      </main>
    </div>
  );
}
