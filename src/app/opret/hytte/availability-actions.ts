"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"

function parseYmd(s: string): { ok: true; d: string } | { ok: false } {
  const t = s.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { ok: false }
  const [y, m, d] = t.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false }
  }
  return { ok: true, d: t }
}

export type ToggleCabinAvailabilityResult = { success: true } | { error: string }

/**
 * RLS: kun ejer skriver — verificeret via cabin.owner_id
 */
export async function toggleCabinAvailability(
  cabinId: string,
  date: string,
  blocked: boolean,
): Promise<ToggleCabinAvailabilityResult> {
  const p = parseYmd(date)
  if (!p.ok) {
    return { error: "Ugyldig dato" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du skal være logget ind" }
  }

  const { data: cabin, error: cabErr } = await supabase
    .from("cabins")
    .select("id, owner_id")
    .eq("id", cabinId)
    .is("deleted_at", null)
    .maybeSingle()

  if (cabErr || !cabin) {
    return { error: "Hytte findes ikke" }
  }
  if ((cabin as { owner_id: string }).owner_id !== user.id) {
    return { error: "Ingen adgang" }
  }

  if (blocked) {
    const { error: upErr } = await supabase.from("cabin_availability").upsert(
      {
        cabin_id: cabinId,
        date: p.d,
        is_available: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cabin_id,date" },
    )
    if (upErr) {
      console.error("[toggleCabinAvailability] upsert", upErr)
      return { error: upErr.message }
    }
  } else {
    const { error: delErr } = await supabase
      .from("cabin_availability")
      .delete()
      .eq("cabin_id", cabinId)
      .eq("date", p.d)
    if (delErr) {
      console.error("[toggleCabinAvailability] delete", delErr)
      return { error: delErr.message }
    }
  }

  revalidatePath(`/opret/hytte/${cabinId}/rediger`)
  revalidatePath(`/hytter/${cabinId}`)
  revalidatePath("/dashboard")
  return { success: true }
}
