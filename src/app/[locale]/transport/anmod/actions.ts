"use server"

import { redirect } from "next/navigation"
import { requireSession } from "@/lib/requireSession"
import { getAllLocationsSorted, REGION_HUB_PREFIX } from "@/lib/greenlandLocations"

export type TripType = "one_way" | "round_trip"

export interface CreateTransportRequestInput {
  from_location:    string
  to_location:      string
  desired_date:     string
  num_passengers:   number
  trip_type:        TripType
  return_date?:     string
  description?:     string
}

export type CreateTransportRequestResult = { error: string } | { id: string }

export async function createTransportRequest(
  input: CreateTransportRequestInput,
): Promise<CreateTransportRequestResult> {
  const { supabase, user } = await requireSession()

  if (
    input.from_location.startsWith(REGION_HUB_PREFIX) ||
    input.to_location.startsWith(REGION_HUB_PREFIX)
  ) {
    return { error: "Vælg et konkret sted for fra og til." }
  }

  // Validate locations
  const allLocations = getAllLocationsSorted()
  const fromLoc = allLocations.find((l) => l.name_dk === input.from_location)
  const toLoc   = allLocations.find((l) => l.name_dk === input.to_location)

  if (!fromLoc) return { error: "Ukendt afsendelsessted" }
  if (!toLoc)   return { error: "Ukendt destination" }
  if (input.from_location === input.to_location) return { error: "Fra og til kan ikke være det samme" }

  // Validate date
  const today = new Date().toISOString().slice(0, 10)
  if (!input.desired_date || input.desired_date < today) {
    return { error: "Dato skal være i dag eller fremover" }
  }

  if (input.trip_type === "round_trip") {
    if (!input.return_date) return { error: "Vælg en returdato" }
    if (input.return_date <= input.desired_date) return { error: "Returdato skal være efter afgangsdato" }
  }

  const passengers = Math.floor(Number(input.num_passengers))
  if (!Number.isFinite(passengers) || passengers < 1 || passengers > 20) {
    return { error: "Antal passagerer skal være 1–20" }
  }

  const { data, error } = await supabase
    .from("transport_requests")
    .insert({
      guest_id:       user.id,
      from_location:  input.from_location,
      from_latitude:  fromLoc.latitude,
      from_longitude: fromLoc.longitude,
      to_location:    input.to_location,
      to_latitude:    toLoc.latitude,
      to_longitude:   toLoc.longitude,
      desired_date:   input.desired_date,
      num_passengers: passengers,
      trip_type:      input.trip_type,
      return_date:    input.return_date ?? null,
      description:    input.description?.trim() || null,
      status:         "open",
    })
    .select("id")
    .single()

  if (error || !data) {
    return { error: error?.message ?? "Kunne ikke oprette anmodning" }
  }

  redirect(
    `/dashboard?tab=requests&toast=transport-request-created&new_tr=${data.id}&tr_from=${encodeURIComponent(input.from_location)}&tr_to=${encodeURIComponent(input.to_location)}&tr_np=${passengers}`,
  )
}

