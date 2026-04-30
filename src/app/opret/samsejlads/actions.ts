"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { krToOre } from "@/lib/money"

const schema = z.object({
  boat_id: z.string().uuid("Vælg en båd"),
  from_location: z.string().min(1, "Vælg afgangsby"),
  to_location: z.string().min(1, "Vælg ankomstby"),
  afgang_dato: z.string().min(1, "Vælg afgangsdato"),
  afgang_tid: z.string().min(1, "Vælg afgangstidspunkt"),
  total_pladser: z.coerce.number().int().min(1, "Min. 1 plads").max(20, "Maks. 20 pladser"),
  pris_roundtrip_kr: z.coerce.number().min(0, "Angiv pris"),
  beskrivelse: z.string().optional(),
  returtur: z.boolean().default(false),
  retur_dato: z.string().optional(),
  retur_tid: z.string().optional(),
})

type FieldErrors = Partial<Record<keyof z.infer<typeof schema> | "_form", string[]>>
export type SamsejladsFormState = { errors?: FieldErrors } | null

export async function createSamsejlads(
  prevState: SamsejladsFormState,
  formData: FormData,
): Promise<SamsejladsFormState> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { errors: { _form: ["Du skal være logget ind"] } }
  const user = session.user

  const raw = {
    boat_id: formData.get("boat_id"),
    from_location: formData.get("from_location"),
    to_location: formData.get("to_location"),
    afgang_dato: formData.get("afgang_dato"),
    afgang_tid: formData.get("afgang_tid"),
    total_pladser: formData.get("total_pladser"),
    pris_roundtrip_kr: formData.get("pris_roundtrip_kr"),
    beskrivelse: (formData.get("beskrivelse") as string) || undefined,
    returtur: formData.get("returtur") === "on",
    retur_dato: (formData.get("retur_dato") as string) || undefined,
    retur_tid: (formData.get("retur_tid") as string) || undefined,
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as FieldErrors }
  }

  const d = parsed.data

  if (d.from_location === d.to_location) {
    return { errors: { to_location: ["Afgangsby og ankomstby må ikke være ens"] } }
  }

  // Validate date is not in the past
  const today = new Date().toISOString().split("T")[0]
  if (d.afgang_dato < today) {
    return { errors: { afgang_dato: ["Afgangsdatoen kan ikke ligge i fortiden"] } }
  }

  if (d.returtur) {
    if (!d.retur_dato) return { errors: { retur_dato: ["Angiv returdato"] } }
    if (!d.retur_tid) return { errors: { retur_tid: ["Angiv returtidspunkt"] } }
    if (d.retur_dato < d.afgang_dato) {
      return { errors: { retur_dato: ["Returdato skal være efter afgangsdato"] } }
    }
  }

  // Verify boat ownership
  const { data: boat } = await supabase
    .from("boats")
    .select("id, name, boat_type, capacity")
    .eq("id", d.boat_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!boat) return { errors: { boat_id: ["Båd ikke fundet"] } }

  // Resolve coordinates
  const fromLoc = GREENLAND_LOCATIONS.find(
    (l) => l.name_dk.toLowerCase() === d.from_location.toLowerCase(),
  )
  const toLoc = GREENLAND_LOCATIONS.find(
    (l) => l.name_dk.toLowerCase() === d.to_location.toLowerCase(),
  )

  if (!fromLoc) return { errors: { from_location: ["Ukendt by"] } }
  if (!toLoc) return { errors: { to_location: ["Ukendt by"] } }

  // Convert prices: roundtrip → one-way = 60%
  const priceRoundtripOre = krToOre(d.pris_roundtrip_kr)
  const priceOneWayOre = Math.round(priceRoundtripOre * 0.6)

  // Build departure_at in UTC (user picks in Nuuk time = UTC-3)
  const departureAt = new Date(
    `${d.afgang_dato}T${d.afgang_tid}:00-03:00`,
  ).toISOString()

  // Insert main outbound ride
  const { data: mainRide, error: mainErr } = await supabase
    .from("ride_shares")
    .insert({
      skipper_id: user.id,
      boat_id: d.boat_id,
      from_location: d.from_location.toLowerCase(),
      from_latitude: fromLoc.latitude,
      from_longitude: fromLoc.longitude,
      to_location: d.to_location.toLowerCase(),
      to_latitude: toLoc.latitude,
      to_longitude: toLoc.longitude,
      departure_at: departureAt,
      total_seats: d.total_pladser,
      seats_available: d.total_pladser,
      price_per_seat_ore: priceOneWayOre,
      price_per_seat_roundtrip_ore: priceRoundtripOre,
      boat_description: boat.boat_type ?? null,
      description: d.beskrivelse ?? null,
      status: "active",
    })
    .select("id")
    .single()

  if (mainErr || !mainRide) {
    console.error("[createSamsejlads] mainRide:", mainErr)
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  // If return trip selected: insert reversed ride and link both
  if (d.returtur && d.retur_dato && d.retur_tid) {
    const returnAt = new Date(
      `${d.retur_dato}T${d.retur_tid}:00-03:00`,
    ).toISOString()

    const { data: returnRide, error: returnErr } = await supabase
      .from("ride_shares")
      .insert({
        skipper_id: user.id,
        boat_id: d.boat_id,
        from_location: d.to_location.toLowerCase(),
        from_latitude: toLoc.latitude,
        from_longitude: toLoc.longitude,
        to_location: d.from_location.toLowerCase(),
        to_latitude: fromLoc.latitude,
        to_longitude: fromLoc.longitude,
        departure_at: returnAt,
        total_seats: d.total_pladser,
        seats_available: d.total_pladser,
        price_per_seat_ore: priceOneWayOre,
        price_per_seat_roundtrip_ore: priceRoundtripOre,
        boat_description: boat.boat_type ?? null,
        description: d.beskrivelse ?? null,
        status: "active",
        return_ride_share_id: mainRide.id,
      })
      .select("id")
      .single()

    if (!returnErr && returnRide) {
      // Link outbound → return
      await supabase
        .from("ride_shares")
        .update({ return_ride_share_id: returnRide.id })
        .eq("id", mainRide.id)
    }
  }

  redirect("/dashboard?tab=mine-opslag")
}
