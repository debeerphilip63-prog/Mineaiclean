import AppShell from "@/components/layout/AppShell";
import HeroSlider from "@/components/home/HeroSlider";
import HomeExplore from "@/components/home/HomeExplore";

export default function HomePage() {
  return (
    <AppShell active="home">
      <HeroSlider
        title={
          <>
            Create <span className="text-amber-300">Anyone</span>. Chat{" "}
            <span className="text-amber-400">Anything</span>.
          </>
        }
        subtitle={
          <>
            Discover public characters, build your own, choose a persona, and roleplay.
            Free tier has limits. Premium unlocks unlimited + private characters + AI images.
          </>
        }
      />

      <div className="mt-10">
        <HomeExplore />
      </div>
    </AppShell>
  );
}
