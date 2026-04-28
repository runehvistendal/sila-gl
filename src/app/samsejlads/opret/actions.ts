"use server"

import { redirect } from "next/navigation"
import { requireSession } from "@/lib/requireSession"
import { krToOre } from "@/lib/money"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"

export type OpretSamsejladsResult = { error: string } | never

function findLocation(name: string) {
  return GREENLAND_LOCATIONS.find(
    (l) => l.name_dk === name || l.name_gl === name
  ) ?? null
}

export async function opretSamsejlads(formData: FormData): Promise<{ error: string } | void> {
  const { supabase, user } = await requireSession()

  const fromLocation  = String(formData.get("from_location") ?? "").trim()
  const toLocation    = String(formData.get("to_location") ?? "").trim()
  const departureDate = String(formData.get("departure_date") ?? "").trim()
  const departureTime = String(formData.get("departure_time") ?? "").trim()
  const totalSeatsRaw = Number(formData.get("total_seats"))
  const priceKrRaw    = parseFloat(String(formData.get("price_per_seat_kr") ?? ""))
  const boatDesc      = String(formData.get("boat_description") ?? "").trim()
  const description   = String(formData.get("description") ?? "").trim()

  if (!fromLocation) return { error: "Vælg afgangssted" }
  if (!toLocation) return { error: "Vælg destination" }
  if (fromLocation === toLocation) return { error: "Afgangssted og destination må ikke være ens" }
  if (!departureDate || !departureTime) return { error: "Angiv dato og tid for afgang" }

  const today = new Date().toISOString().slice(0, 10)
  if (departureDate < today) return { error: "Afgangsdato kan ikke være i fortiden" }

  const totalSeats = Math.floor(totalSeatsRaw)
  if (!Number.isFinite(totalSeats) || totalSeats < 1 || totalSeats > 20) {
    return { error: "Antal pladser skal være 1–20" }
  }

  if (!Number.isFinite(priceKrRaw) || priceKrRaw < 0) {
    return { error: "Angiv en gyldig pris" }
  }

  const from = findLocation(fromLocation)
  const to   = findLocation(toLocation)
  if (!from) return { error: `Kender ikke lokationen: ${fromLocation}` }
  if (!to)   return { error: `Kender ikke lokationen: ${toLocation}` }

  // Compose timestamptz
  const departureAt = `${departureDate}T${departureTime}:00+00:00`

  const priceOre = krToOre(priceKrRaw)

  const { error: insErr } = await supabase.from("ride_shares").insert({
    skipper_id:          user.id,
    from_location:       from.name_dk,
    from_latitude:       from.latitude,
    from_longitude:      from.longitude,
    to_location:         to.name_dk,
    to_latitude:         to.latitude,
    to_longitude:        to.longitude,
    departure_at:        departureAt,
    total_seats:         totalSeats,
    seats_available:     totalSeats,
    price_per_seat_ore:  priceOre,
    boat_description:    boatDesc || null,
    description:         description || null,
    status:              "active",
  })

  if (insErr) return { error: insErr.message || "Kunne ikke oprette tur" }

  redirect("/dashboard")
}
