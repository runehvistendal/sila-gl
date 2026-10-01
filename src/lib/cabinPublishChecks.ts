import type { SupabaseClient } from "@supabase/supabase-js"

export const CABIN_PHOTO_REQUIRED_MESSAGE =
  "Tilføj mindst ét billede, før du publicerer. Gæster booker ikke et sted, de ikke kan se."

/**
 * Et opslag må ikke publiceres uden egne billeder — ellers ville gæsten se et
 * pladsholderbillede, der ikke forestiller stedet.
 * Returnerer en fejltekst, eller null når opslaget kan publiceres.
 */
export async function cabinPublishBlocker(supabase: SupabaseClient, cabinId: string): Promise<string | null> {
  const { data } = await supabase.from("cabins").select("images").eq("id", cabinId).maybeSingle()
  const images = ((data as { images: string[] | null } | null)?.images ?? []).filter(
    (u) => typeof u === "string" && u.startsWith("http"),
  )
  return images.length > 0 ? null : CABIN_PHOTO_REQUIRED_MESSAGE
}
