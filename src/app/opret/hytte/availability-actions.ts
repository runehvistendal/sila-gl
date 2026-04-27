"use server"

import { revalidatePath } from "next/cache"
import { requireCabinOwner } from "@/lib/requireCabinOwner"
import { requireSession } from "@/lib/requireSession"

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
 * RLS + eksplicit owner_id (requireCabinOwner)
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

  const { supabase, user } = await requireSession()
  await requireCabinOwner(supabase, cabinId, user.id)

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
