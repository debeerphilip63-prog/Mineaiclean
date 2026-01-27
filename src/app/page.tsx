import AppShell from "@/components/layout/AppShell";
import HomeExplore from "@/components/home/HomeExplore";

export default function HomePage() {
  return (
    <AppShell active="home">
      <h1 className="text-4xl font-bold">
        Create <span className="text-amber-200">Anyone</span>. Chat{" "}
        <span className="text-amber-200">Anything</span>.
      </h1>

      <p className="mt-3 max-w-2xl text-zinc-300">
        Discover public characters, build your own, choose a persona, and roleplay. Free tier has
        limits. Premium unlocks unlimited + private characters + AI images.
      </p>

      <HomeExplore />
    </AppShell>
  );
}
