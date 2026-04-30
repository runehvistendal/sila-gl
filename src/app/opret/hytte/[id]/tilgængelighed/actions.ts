"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { requireCabinOwner } from "@/lib/requireCabinOwner"

export async function saveAvailability(
  cabinId: string,
  availableDates: string[], // ["YYYY-MM-DD", ...]
  publish: boolean,
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) redirect("/")

  // Verify ownership
  try {
    await requireCabinOwner(supabase, cabinId, session.user.id)
  } catch {
    redirect("/")
  }

  // Delete all existing non-booked availability rows for this cabin
  await supabase
    .from("cabin_availability")
    .delete()
    .eq("cabin_id", cabinId)

  // Insert new available dates
  if (availableDates.length > 0) {
    const rows = availableDates.map((date) => ({
      cabin_id: cabinId,
      date,
      is_available: true,
    }))
    const { error } = await supabase.from("cabin_availability").insert(rows)
    if (error) throw new Error(error.message)
  }

  // Optionally publish
  if (publish) {
    await supabase
      .from("cabins")
      .update({ published: true })
      .eq("id", cabinId)
      .eq("owner_id", session.user.id)
  }

  redirect("/opret")
}
