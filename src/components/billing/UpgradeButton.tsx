"use client";

import Link from "next/link";

export default function UpgradeButton() {
  return (
    <Link
      href="/upgrade"
      className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-emerald-300"
    >
      Upgrade
    </Link>
  );
}
