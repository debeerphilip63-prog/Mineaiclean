import Link from "next/link";
import UserButton from "@/components/auth/UserButton";
import UpgradeButton from "@/components/billing/UpgradeButton";

type Tab = "home" | "create" | "my" | "profile";

export default function AppShell({
  active,
  children,
}: {
  active: Tab;
  children: React.ReactNode;
}) {
  const tabClass = (tab: Tab) =>
    `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
      active === tab
        ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/30"
        : "text-zinc-300 hover:bg-white/5"
    }`;

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      {/* rustic glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-200px] top-[-200px] h-[600px] w-[700px] rounded-full bg-amber-500/20 blur-[120px]" />
        <div className="absolute right-[-220px] top-[120px] h-[520px] w-[620px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute left-[30%] bottom-[-240px] h-[520px] w-[620px] rounded-full bg-amber-200/10 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/35 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/40 to-emerald-500/20 ring-1 ring-white/10" />
            <div className="text-sm font-semibold tracking-wide">MineAI</div>
          </div>

          <nav className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            <Link className={tabClass("home")} href="/">
              Home
            </Link>
            <Link className={tabClass("create")} href="/create">
              Create
            </Link>
            <Link className={tabClass("my")} href="/my-characters">
              My Characters
            </Link>
            <Link className={tabClass("profile")} href="/profile">
              Profile
            </Link>
          </nav>
<UpgradeButton />

          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="mt-10 border-t border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-4 text-xs text-zinc-500">
          © {new Date().getFullYear()} MineAI • Chats auto-delete after 30 days
        </div>
      </footer>
    </div>
  );
}
