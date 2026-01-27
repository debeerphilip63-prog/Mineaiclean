import AppShell from "@/components/layout/AppShell";
import MyCharactersGrid from "@/components/characters/MyCharactersGrid";

export default function MyCharactersPage() {
  return (
    <AppShell active="my">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Characters</h1>
          <p className="mt-1 text-zinc-400">
            Your created characters (public + private). This will be real after Supabase.
          </p>
        </div>

        <button className="rounded-2xl bg-amber-500/20 px-4 py-2 font-semibold text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/25">
          + Create New
        </button>
      </div>

      <MyCharactersGrid />
    </AppShell>
  );
}
