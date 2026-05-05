"use server"

import { createClient } from "@/lib/supabase-server"
import { requireCabinOwner } from "@/lib/requireCabinOwner"

export async function saveAvailability(
  cabinId: string,
  blockedDates: string[], // ["YYYY-MM-DD", ...] — datoer udlejeren IKKE vil udleje
  publish: boolean,
): Promise<{ redirectTo: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }

  try {
    await requireCabinOwner(supabase, cabinId, session.user.id)
  } catch {
    return { error: "Ingen adgang" }
  }

  await supabase.from("cabin_availability").delete().eq("cabin_id", cabinId)

  if (blockedDates.length > 0) {
    const rows = blockedDates.map((date) => ({
      cabin_id: cabinId,
      date,
      is_available: false,
    }))
    const { error } = await supabase.from("cabin_availability").insert(rows)
    if (error) return { error: error.message }
  }

  if (publish) {
    const { error } = await supabase
      .from("cabins")
      .update({ published: true })
      .eq("id", cabinId)
      .eq("owner_id", session.user.id)
    if (error) return { error: error.message }
  }

  return { redirectTo: "/opret" }
}

export async function saveCabinSettings(
  cabinId: string,
  minNights: number,
  preparationDays: number,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }

  const mn = Math.floor(Number(minNights))
  const pd = Math.floor(Number(preparationDays))

  if (!Number.isFinite(mn) || mn < 1 || mn > 30)
    return { error: "Minimum nætter skal være mellem 1 og 30" }
  if (![0, 1, 2, 3].includes(pd))
    return { error: "Forberedelsestid skal være 0, 1, 2 eller 3 dage" }

  try {
    await requireCabinOwner(supabase, cabinId, session.user.id)
  } catch {
    return { error: "Ingen adgang" }
  }

  const { error } = await supabase
    .from("cabins")
    .update({ min_nights: mn, preparation_days: pd })
    .eq("id", cabinId)
    .eq("owner_id", session.user.id)

  if (error) return { error: error.message }
  return { ok: true }
}

/** Gemmer indstillinger + tilgængelighed i ét kald. Bruges af "Gem og publicér →". */
export async function saveAll(
  cabinId: string,
  blockedDates: string[],
  minNights: number,
  preparationDays: number,
  publish: boolean,
): Promise<{ redirectTo: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }

  const mn = Math.floor(Number(minNights))
  const pd = Math.floor(Number(preparationDays))

  if (!Number.isFinite(mn) || mn < 1 || mn > 30)
    return { error: "Minimum nætter skal være mellem 1 og 30" }
  if (![0, 1, 2, 3].includes(pd))
    return { error: "Forberedelsestid skal være 0, 1, 2 eller 3 dage" }

  try {
    await requireCabinOwner(supabase, cabinId, session.user.id)
  } catch {
    return { error: "Ingen adgang" }
  }

  // 1. Gem indstillinger
  const { error: settingsErr } = await supabase
    .from("cabins")
    .update({ min_nights: mn, preparation_days: pd })
    .eq("id", cabinId)
    .eq("owner_id", session.user.id)
  if (settingsErr) return { error: settingsErr.message }

  // 2. Gem tilgængelighed
  await supabase.from("cabin_availability").delete().eq("cabin_id", cabinId)
  if (blockedDates.length > 0) {
    const rows = blockedDates.map((date) => ({
      cabin_id: cabinId,
      date,
      is_available: false,
    }))
    const { error } = await supabase.from("cabin_availability").insert(rows)
    if (error) return { error: error.message }
  }

  // 3. Publicér hvis ønsket
  if (publish) {
    const { error } = await supabase
      .from("cabins")
      .update({ published: true })
      .eq("id", cabinId)
      .eq("owner_id", session.user.id)
    if (error) return { error: error.message }
  }

  return { redirectTo: "/opret" }
}
