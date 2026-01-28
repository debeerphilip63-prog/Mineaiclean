"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type Tab = "home" | "create" | "my" | "profile" | "admin" | "upgrade";

type Props = {
  active?: Tab;
  children: React.ReactNode;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function AppShell({ active = "home", children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false); // mobile drawer
  const [profileOpen, setProfileOpen] = useState(false); // dropdown
  const profileRef = useRef<HTMLDivElement | null>(null);

  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;
      const uid = data.user?.id ?? null;

      if (!mounted) return;
      setUserEmail(email);

      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", uid)
          .single();

        if (!mounted) return;
        setIsAdmin(Boolean(prof?.is_admin));
      } else {
        setIsAdmin(false);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserEmail(session?.user?.email ?? null);

      const uid = session?.user?.id ?? null;
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", uid)
          .single();
        setIsAdmin(Boolean(prof?.is_admin));
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileRef.current) return;
      if (profileRef.current.contains(e.target as Node)) return;
      setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const nav = [
    { key: "home" as const, label: "Home", href: "/" },
    { key: "create" as const, label: "Create", href: "/create" },
    { key: "my" as const, label: "My Characters", href: "/my-characters" },
    { key: "profile" as const, label: "Profile", href: "/profile" },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    setProfileOpen(false);
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/30 to-black/60">
              {logoOk ? (
                <Image
                  src="/brand/logo.png"
                  alt="MineAI"
                  fill
                  sizes="36px"
                  className="object-cover"
                  priority
                  onError={() => setLogoOk(false)}
                />
              ) : null}
            </div>
            <div className="text-sm font-semibold tracking-wide">MineAI</div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm transition",
                  active === item.key
                    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/20"
                    : "text-zinc-200/80 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}

            {isAdmin && (
              <Link
                href="/admin"
                className={cx(
                  "rounded-xl px-4 py-2 text-sm transition",
                  active === "admin"
                    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/20"
                    : "text-zinc-200/80 hover:bg-white/5 hover:text-white"
                )}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/upgrade"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
            >
              Upgrade
            </Link>

            {!userEmail ? (
              <>
                <Link
                  href="/signin"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200/80 hover:bg-white/10"
                >
                  <span className="max-w-[220px] truncate">{userEmail}</span>
                  <span className="text-white/60">▾</span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-xl">
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-3 text-sm text-white/80 hover:bg-white/5"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/profile?tab=settings"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-3 text-sm text-white/80 hover:bg-white/5"
                    >
                      Settings
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-3 text-sm text-amber-200 hover:bg-amber-500/10"
                      >
                        Admin Dashboard
                      </Link>
                    )}

                    <div className="h-px bg-white/10" />

                    <button
                      onClick={signOut}
                      className="block w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/5"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>

        {/* Mobile menu drawer */}
        {menuOpen && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <div className="fixed right-0 top-0 z-50 h-full w-[86%] max-w-sm border-l border-white/10 bg-[#090909] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Menu</div>
                <button
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {nav.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cx(
                      "block rounded-xl px-4 py-3 text-sm",
                      pathname === item.href || active === item.key
                        ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20"
                        : "border border-white/10 bg-white/5 text-zinc-200/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-400/20 hover:bg-amber-500/20"
                  >
                    Admin
                  </Link>
                )}

                <Link
                  href="/upgrade"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-black hover:bg-emerald-400"
                >
                  Upgrade
                </Link>

                {!userEmail ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/signin"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm hover:bg-white/10"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-medium text-black hover:bg-amber-400"
                    >
                      Sign up
                    </Link>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="truncate text-xs text-zinc-200/80">{userEmail}</div>
                    <button
                      onClick={signOut}
                      className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 text-xs text-zinc-500">
                MineAI • Chats auto-delete after 30 days
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">{children}</main>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
