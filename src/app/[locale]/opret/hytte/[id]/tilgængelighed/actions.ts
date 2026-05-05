"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { requireCabinOwner } from "@/lib/requireCabinOwner"

export async function saveAvailability(
  cabinId: string,
  blockedDates: string[],
  publish: boolean,
): Promise<{ redirectTo: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) redirect("/")

  try {
    await requireCabinOwner(supabase, cabinId, session.user.id)
  } catch {
    redirect("/")
  }

  // Delete all existing availability rows for this cabin
  await supabase
    .from("cabin_availability")
    .delete()
    .eq("cabin_id", cabinId)

  // Insert blocked dates as is_available: false
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
    return { redirectTo: "/dashboard?tab=mine-opslag" }
  }

  return { redirectTo: "/opret" }
}
