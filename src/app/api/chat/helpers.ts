import { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  characterId: string
) {
  // find existing conversation (one per user+character for now)
  const { data: existing, error: findErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("character_id", characterId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (findErr) throw new Error(findErr.message);

  if (existing && existing.length > 0) return existing[0].id as string;

  const { data: created, error: createErr } = await supabase
    .from("conversations")
    .insert({ user_id: userId, character_id: characterId, persona_id: null })
    .select("id")
    .single();

  if (createErr) throw new Error(createErr.message);
  return created.id as string;
}
