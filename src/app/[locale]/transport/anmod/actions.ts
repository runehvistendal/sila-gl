"use server"

import { redirect } from "next/navigation"
import { requireSession } from "@/lib/requireSession"
import { getAllLocationsSorted, REGION_HUB_PREFIX } from "@/lib/greenlandLocations"
import { nuukTodayYmd } from "@/lib/nuukTime"

export type TripType = "one_way" | "round_trip"

export interface CreateTransportRequestInput {
  from_location:    string
  to_location:      string
  desired_date:     string
  num_passengers:   number
  trip_type:        TripType
  return_date?:     string
  description?:     string
  /** Foretrukket afgangsvindue, "HH:MM" (Nuuk-tid). Begge eller ingen. */
  preferred_time_from?: string
  preferred_time_to?:   string
  /** Knyt efterspørgslen til en af gæstens egne hyttebookinger */
  linked_cabin_booking_id?: string
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export type CreateTransportRequestResult = { error: string } | { id: string }

export async function createTransportRequest(
  input: CreateTransportRequestInput,
): Promise<CreateTransportRequestResult> {
  const { supabase, user } = await requireSession()

  const { error: rlErr } = await supabase.rpc("consume_rate_limit", {
    p_user_id:        user.id,
    p_action:         "create_transport_request",
    p_max_attempts:   5,
    p_window_seconds: 600,
  })
  if (rlErr) return { error: "For mange forsøg. Prøv igen om lidt." }

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
  const today = nuukTodayYmd()
  if (!input.desired_date || input.desired_date < today) {
    return { error: "Dato skal være i dag eller fremover" }
  }

  if (input.trip_type === "round_trip") {
    if (!input.return_date) return { error: "Vælg en returdato" }
    if (input.return_date <= input.desired_date) return { error: "Returdato skal være efter afgangsdato" }
  }

  const passengers = Math.floor(Number(input.num_passengers))
  if (!Number.isFinite(passengers) || passengers < 1 || passengers > 12) {
    return { error: "Antal passagerer skal være 1–12" }
  }

  const timeFrom = input.preferred_time_from?.trim() || null
  const timeTo = input.preferred_time_to?.trim() || null
  if ((timeFrom && !HHMM.test(timeFrom)) || (timeTo && !HHMM.test(timeTo))) {
    return { error: "Ugyldigt tidspunkt" }
  }
  if (timeFrom && timeTo && timeTo <= timeFrom) {
    return { error: "Seneste afgang skal være efter tidligste afgang" }
  }

  const description = input.description?.trim() || null
  if (description && description.length > 500) {
    return { error: "Beskeden må højst være 500 tegn" }
  }

  // Kobling til hyttebooking: kun gæstens egen booking (RLS + eksplicit tjek)
  let linkedBookingId: string | null = null
  if (input.linked_cabin_booking_id) {
    const { data: booking } = await supabase
      .from("cabin_bookings")
      .select("id")
      .eq("id", input.linked_cabin_booking_id)
      .eq("guest_id", user.id)
      .maybeSingle()
    linkedBookingId = (booking as { id: string } | null)?.id ?? null
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
      description,
      preferred_time_from: timeFrom,
      preferred_time_to:   timeTo,
      linked_cabin_booking_id: linkedBookingId,
      status:         "open",
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("[createTransportRequest]", error?.code)
    return { error: "Anmodningen kunne ikke oprettes. Prøv igen." }
  }

  redirect(
    `/dashboard?tab=requests&toast=transport-request-created&new_tr=${data.id}&tr_from=${encodeURIComponent(input.from_location)}&tr_to=${encodeURIComponent(input.to_location)}&tr_np=${passengers}`,
  )
}

