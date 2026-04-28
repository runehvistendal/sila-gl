"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"
import { krToOre } from "@/lib/money"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import type { AddOnService } from "@/components/shared/AddOnServicesEditor"

const schema = z
  .object({
    boat_id: z.string().min(1),
    from_location: z.string().min(1, "Vælg afgangssted"),
    to_location: z.string().min(1, "Vælg destination"),
    departure_date: z.string().min(1, "Vælg afgangsdato"),
    departure_time: z.string().optional(),
    total_seats: z.coerce.number().int().min(1).max(50),
    price_per_seat_roundtrip_kr: z.coerce.number().positive("Pris skal være positiv"),
    return_date: z.string().optional(),
    return_time: z.string().optional(),
    return_seats: z.coerce.number().int().min(1).optional().or(z.literal("")),
    addon_services_json: z.string().optional(),
  })
  .refine((d) => d.from_location !== d.to_location, {
    message: "Afgangssted og destination må ikke være ens",
    path: ["to_location"],
  })

export type CreateSejladsState = {
  errors?: Record<string, string[]>
  message?: string
} | null

export async function createSejladsOpslag(
  _prevState: CreateSejladsState,
  formData: FormData
): Promise<CreateSejladsState> {
  const returnSeatsRaw = formData.get("return_seats") as string
  const raw = {
    boat_id: formData.get("boat_id") as string,
    from_location: formData.get("from_location") as string,
    to_location: formData.get("to_location") as string,
    departure_date: formData.get("departure_date") as string,
    departure_time: (formData.get("departure_time") as string) || undefined,
    total_seats: formData.get("total_seats") as string,
    price_per_seat_roundtrip_kr: formData.get("price_per_seat_roundtrip_kr") as string,
    return_date: (formData.get("return_date") as string) || undefined,
    return_time: (formData.get("return_time") as string) || undefined,
    return_seats: returnSeatsRaw || "",
    addon_services_json: (formData.get("addon_services_json") as string) ?? "[]",
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const {
    boat_id,
    from_location,
    to_location,
    departure_date,
    departure_time,
    total_seats,
    price_per_seat_roundtrip_kr,
    return_date,
    return_time,
    return_seats,
    addon_services_json,
  } = parsed.data

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { message: "Ikke logget ind" }
  const user = session.user

  // Verify boat ownership
  const { data: boat } = await supabase
    .from("boats")
    .select("id, owner_id, name")
    .eq("id", boat_id)
    .single()

  if (!boat || boat.owner_id !== user.id) {
    return { message: "Du har ikke adgang til denne båd" }
  }

  // Reject past departure dates
  const today = new Date().toISOString().slice(0, 10)
  if (departure_date < today) {
    return { errors: { departure_date: ["Afgangsdato kan ikke være i fortiden"] } }
  }

  // Lookup lat/lng for from/to
  const fromLoc = GREENLAND_LOCATIONS.find(
    (l) => l.name_dk === from_location || l.name_gl === from_location
  )
  const toLoc = GREENLAND_LOCATIONS.find(
    (l) => l.name_dk === to_location || l.name_gl === to_location
  )

  if (!fromLoc) return { errors: { from_location: ["Ukendt afgangssted"] } }
  if (!toLoc) return { errors: { to_location: ["Ukendt destination"] } }

  // Build departure_at timestamptz
  const departure_at = departure_time
    ? `${departure_date}T${departure_time}:00`
    : `${departure_date}T00:00:00`

  // Price calculation
  const price_per_seat_roundtrip_ore = krToOre(price_per_seat_roundtrip_kr)
  const price_per_seat_ore = Math.round(price_per_seat_roundtrip_ore * 0.6)

  // Parse addon services
  let addonServices: AddOnService[] = []
  try {
    addonServices = JSON.parse(addon_services_json ?? "[]")
  } catch {
    addonServices = []
  }

  const returnSeatsNum =
    return_seats !== "" && return_seats !== undefined ? Number(return_seats) : null

  const { data: inserted, error } = await supabase
    .from("ride_shares")
    .insert({
      skipper_id: user.id,
      boat_id,
      from_location,
      from_latitude: fromLoc.latitude,
      from_longitude: fromLoc.longitude,
      to_location,
      to_latitude: toLoc.latitude,
      to_longitude: toLoc.longitude,
      departure_at,
      total_seats,
      seats_available: total_seats,
      price_per_seat_ore,
      price_per_seat_roundtrip_ore,
      boat_description: boat.name,
      description: null,
      status: "active",
      return_date: return_date ?? null,
      return_time: return_time ?? null,
      return_seats: returnSeatsNum,
      addon_services: addonServices,
    })
    .select("id")
    .single()

  if (error || !inserted) {
    return { message: "Noget gik galt. Prøv igen." }
  }

  redirect(`/transport/${inserted.id}`)
}
