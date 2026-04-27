import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Ekstra lag ud over RLS: verificer at brugeren ejer hytten.
 */
export async function requireCabinOwner(
  supabase: SupabaseClient,
  cabinId: string,
  userId: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("cabins")
    .select("id, owner_id")
    .eq("id", cabinId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error || !data) {
    throw new Error("Ikke autoriseret")
  }
  if ((data as { owner_id: string }).owner_id !== userId) {
    throw new Error("Ikke autoriseret")
  }
  return { id: (data as { id: string }).id }
}
