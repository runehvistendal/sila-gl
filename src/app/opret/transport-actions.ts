"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { krToOre } from "@/lib/money"

export type CreateSamsejladsState = {
  errors?: Record<string, string[] | undefined>
  error?: string
} | null

const schema = z.object({
  from_location: z.string().min(1, "Vælg afgangsby"),
  to_location: z.string().min(1, "Vælg ankomstby"),
  departure_date: z.string().min(1, "Vælg afgangsdato"),
  departure_time: z.string().optional(),
  total_seats: z.coerce
    .number({ error: "Ugyldigt tal" })
    .int()
    .min(1, "Mindst 1 plads")
    .max(50, "Maks 50 pladser"),
  price_per_seat_kr: z.coerce
    .number({ error: "Ugyldigt tal" })
    .positive("Prisen skal være større end 0"),
  boat_description: z.string().optional(),
  notes: z.string().optional(),
})

export async function createSamsejlads(
  prevState: CreateSamsejladsState,
  formData: FormData
): Promise<CreateSamsejladsState> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { error: "Du skal være logget ind for at oprette samsejlads" }
  }
  const user = session.user

  const raw = {
    from_location: formData.get("from_location"),
    to_location: formData.get("to_location"),
    departure_date: formData.get("departure_date"),
    departure_time: formData.get("departure_time") || undefined,
    total_seats: formData.get("total_seats"),
    price_per_seat_kr: formData.get("price_per_seat_kr"),
    boat_description: formData.get("boat_description") || undefined,
    notes: formData.get("notes") || undefined,
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const data = result.data

  const fromHub = GREENLAND_LOCATIONS.find((l) => l.name_dk === data.from_location)
  const toHub = GREENLAND_LOCATIONS.find((l) => l.name_dk === data.to_location)

  if (!fromHub) return { errors: { from_location: ["Vælg en gyldig afgangsby"] } }
  if (!toHub) return { errors: { to_location: ["Vælg en gyldig ankomstby"] } }

  if (data.from_location === data.to_location) {
    return { errors: { to_location: ["Afgangs- og ankomstby må ikke være ens"] } }
  }

  // Brugerens input er Nuuk-lokal tid (UTC-3) — gem som korrekt UTC
  const departureAt = data.departure_time
    ? new Date(`${data.departure_date}T${data.departure_time}:00-03:00`).toISOString()
    : new Date(`${data.departure_date}T00:00:00-03:00`).toISOString()

  // Money conversion — ONLY here, per CLAUDE.md
  const price_per_seat_ore = krToOre(data.price_per_seat_kr)

  const { error: dbError } = await supabase.from("ride_shares").insert({
    skipper_id: user.id,
    from_location: data.from_location,
    from_latitude: fromHub.latitude,
    from_longitude: fromHub.longitude,
    to_location: data.to_location,
    to_latitude: toHub.latitude,
    to_longitude: toHub.longitude,
    departure_at: departureAt,
    total_seats: data.total_seats,
    seats_available: data.total_seats,
    price_per_seat_ore,
    boat_description: data.boat_description ?? null,
    description: data.notes ?? null,
    status: "active",
  })

  if (dbError) {
    console.error("[createSamsejlads] DB error:", dbError)
    return { error: "Der opstod en fejl ved oprettelse. Prøv igen." }
  }

  redirect("/mine-hytter")
}
