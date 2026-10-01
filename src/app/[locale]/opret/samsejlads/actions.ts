"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { nuukTodayYmd } from "@/lib/nuukTime"
import { krToOre } from "@/lib/money"
import { nuukInputToUtc } from "@/lib/nuukTime"

const schema = z.object({
  boat_id: z.string().uuid("Vælg en båd"),
  from_location: z.string().min(1, "Vælg afgangsby"),
  to_location: z.string().min(1, "Vælg ankomstby"),
  afgang_dato: z.string().min(1, "Vælg afgangsdato"),
  afgang_tid: z.string().min(1, "Vælg afgangstidspunkt"),
  total_pladser: z.coerce.number().int().min(1, "Min. 1 plads").max(12, "Maks. 12 passagerer"),
  pris_roundtrip_kr: z.coerce.number().min(0, "Angiv tur/retur-pris"),
  pris_oneway_kr: z.coerce.number().min(0).optional(),
  beskrivelse: z.string().optional(),
  returtur: z.boolean().default(false),
  retur_dato: z.string().optional(),
  retur_tid: z.string().optional(),
  estimated_duration_minutes: z.coerce.number().int().min(10).max(1440).optional(),
  flexibility_minutes: z.coerce.number().int().min(0).max(720).optional(),
  meeting_point: z.string().trim().max(140).optional(),
  luggage_allowance: z.enum(["small", "medium", "large"]).optional(),
  safety_confirmed: z.literal(true, { message: "Bekræft sikkerhedspunkterne for at oprette turen" }),
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
    pris_oneway_kr: (formData.get("pris_oneway_kr") as string) || undefined,
    beskrivelse: (formData.get("beskrivelse") as string) || undefined,
    returtur: formData.get("returtur") === "on",
    retur_dato: (formData.get("retur_dato") as string) || undefined,
    retur_tid: (formData.get("retur_tid") as string) || undefined,
    estimated_duration_minutes: (formData.get("estimated_duration_minutes") as string) || undefined,
    flexibility_minutes: (formData.get("flexibility_minutes") as string) || undefined,
    meeting_point: (formData.get("meeting_point") as string) || undefined,
    luggage_allowance: (formData.get("luggage_allowance") as string) || undefined,
    safety_confirmed: formData.get("safety_confirmed") === "on",
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
  const today = nuukTodayYmd()
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
    .select("id, name, boat_type, capacity, compliance_confirmed_at")
    .eq("id", d.boat_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!boat) return { errors: { boat_id: ["Båd ikke fundet"] } }

  // Aldrig flere passagerer end båden er registreret til — og aldrig over 12
  // (flere end 12 gør fartøjet til et passagerskib, jf. Søfartsstyrelsen).
  const maxSeats = Math.min(12, Math.max(1, Number(boat.capacity) || 1))
  if (d.total_pladser > maxSeats) {
    return { errors: { total_pladser: [`Maks. ${maxSeats} passagerer på denne båd`] } }
  }

  // Validate enkelttur-pris ≤ tur/retur-pris
  if (d.pris_oneway_kr != null && d.pris_oneway_kr > d.pris_roundtrip_kr) {
    return { errors: { pris_oneway_kr: ["Enkeltturpris må ikke overstige tur/retur-prisen"] } }
  }

  // Resolve coordinates
  const fromLoc = GREENLAND_LOCATIONS.find(
    (l) => l.name_dk.toLowerCase() === d.from_location.toLowerCase(),
  )
  const toLoc = GREENLAND_LOCATIONS.find(
    (l) => l.name_dk.toLowerCase() === d.to_location.toLowerCase(),
  )

  if (!fromLoc) return { errors: { from_location: ["Ukendt by"] } }
  if (!toLoc) return { errors: { to_location: ["Ukendt by"] } }

  // Convert prices to øre; one-way falls back to 60% of roundtrip if not set
  const priceRoundtripOre = krToOre(d.pris_roundtrip_kr)
  const priceOneWayOre =
    d.pris_oneway_kr != null
      ? krToOre(d.pris_oneway_kr)
      : Math.round(priceRoundtripOre * 0.6)

  // Build departure_at — stored as UTC
  const departureAt = nuukInputToUtc(d.afgang_dato, d.afgang_tid)

  const extraFields = {
    estimated_duration_minutes: d.estimated_duration_minutes ?? null,
    flexibility_minutes: d.flexibility_minutes ?? null,
    meeting_point: d.meeting_point || null,
    luggage_allowance: d.luggage_allowance ?? null,
  }

  // Registrér sejlerens sikkerhedsbekræftelse på båden (første gang)
  if (!boat.compliance_confirmed_at) {
    await supabase
      .from("boats")
      .update({ compliance_confirmed_at: new Date().toISOString() })
      .eq("id", boat.id)
      .eq("owner_id", user.id)
  }

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
      ...extraFields,
    })
    .select("id")
    .single()

  if (mainErr || !mainRide) {
    console.error("[createSamsejlads] mainRide:", mainErr)
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  // If return trip selected: insert reversed ride and link both
  if (d.returtur && d.retur_dato && d.retur_tid) {
    const returnAt = nuukInputToUtc(d.retur_dato, d.retur_tid)

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
        ...extraFields,
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

  redirect(`/dashboard?tab=mine-opslag&rs_created=${mainRide.id}`)
}
