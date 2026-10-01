"use server"

import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/requireSession"
import { getAllLocationsSorted } from "@/lib/greenlandLocations"
import { nuukTodayYmd } from "@/lib/nuukTime"

/**
 * "Anmod om returtur" fra en turside. Tidligere indsatte denne action kolonner
 * der ikke findes (requester_id, departure_date, num_guests, notes) og fejlede
 * altid. Bruger nu samme skema som /transport/anmod.
 */
export async function createTransportRequest(input: {
  from_location: string
  to_location: string
  departure_date: string
  num_guests: number
  notes?: string
}): Promise<{ ok: true; id: string } | { error: string }> {
  const { supabase, user } = await requireSession()

  const all = getAllLocationsSorted()
  const fromLoc = all.find((l) => l.name_dk.toLowerCase() === input.from_location.toLowerCase())
  const toLoc = all.find((l) => l.name_dk.toLowerCase() === input.to_location.toLowerCase())
  if (!fromLoc || !toLoc) return { error: "Vælg gyldige steder" }
  if (fromLoc.name_dk === toLoc.name_dk) return { error: "Fra og til kan ikke være det samme" }
  if (!input.departure_date || input.departure_date < nuukTodayYmd()) {
    return { error: "Dato skal være i dag eller fremover" }
  }
  const passengers = Math.floor(Number(input.num_guests))
  if (!Number.isFinite(passengers) || passengers < 1 || passengers > 12) {
    return { error: "Antal passagerer skal være 1–12" }
  }

  const { data, error } = await supabase
    .from("transport_requests")
    .insert({
      guest_id: user.id,
      from_location: fromLoc.name_dk,
      from_latitude: fromLoc.latitude,
      from_longitude: fromLoc.longitude,
      to_location: toLoc.name_dk,
      to_latitude: toLoc.latitude,
      to_longitude: toLoc.longitude,
      desired_date: input.departure_date,
      num_passengers: passengers,
      trip_type: "one_way",
      description: input.notes?.trim() || null,
      status: "open",
    })
    .select("id")
    .single()

  if (error || !data) return { error: "Anmodningen kunne ikke oprettes. Prøv igen." }

  revalidatePath("/dashboard")
  revalidatePath("/transport")
  return { ok: true, id: (data as { id: string }).id }
}
