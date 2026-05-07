"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"
import { requireCabinOwner } from "@/lib/requireCabinOwner"
import { krToOre } from "@/lib/money"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { getResidenceFacilityValueSet } from "@/lib/amenityMeta"
import { revalidatePublishedCabinPaths } from "@/lib/revalidateCabinPublic"

const MAX_CABIN_IMAGES = 8

function isTrustedCabinImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      (u.hostname === "res.cloudinary.com" || u.hostname.endsWith(".cloudinary.com")) &&
      u.pathname.includes("/sila/cabins/")
    )
  } catch {
    return false
  }
}

const RESIDENCE_SUB = z.enum(["house", "apartment", "room", "other"])
const LOCATION_SUB = z.enum(["city", "village"])

const baseSchema = z.object({
  title: z.string().min(1, "Titel er påkrævet").max(80, "Titel må maks. være 80 tegn"),
  description: z.string().min(50, "Beskrivelse skal være mindst 50 tegn"),
  location_hub: z.string().min(1, "Vælg en destination"),
  max_guests: z.coerce.number().int().min(1, "Minimum 1 gæst").max(30, "Maks. 30 gæster"),
  bedrooms: z.coerce.number().int().min(0, "Minimum 0 soverum").max(20, "Maks. 20 soverum"),
  bathrooms: z.coerce.number().int().min(0, "Minimum 0 badeværelser").max(20, "Maks. 20 badeværelser"),
  residence_subtype: RESIDENCE_SUB,
  location_subtype: LOCATION_SUB,
  facilities: z.array(z.string()).default([]),
  addon_services_json: z.string().optional(),
  offers_transport: z.boolean().default(false),
  transport_from: z.string().optional(),
  transport_price_roundtrip_kr: z.coerce.number().min(0).optional(),
  price_per_night_kr: z.coerce.number().positive("Angiv pris pr. nat (kr)"),
  instant_book: z.boolean().default(false),
})

type BoligFieldErrors = Partial<Record<string | "_form", string[]>>

export type BoligFormState = { errors?: BoligFieldErrors } | null

function sanitizeFacilities(raw: string[], fixed: Set<string>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const f of raw) {
    const t = f.trim()
    if (!t || seen.has(t)) continue
    if (fixed.has(t) || t.length <= 80) {
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

export async function createBolig(
  _prevState: BoligFormState,
  formData: FormData,
): Promise<BoligFormState> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { errors: { _form: ["Du skal være logget ind"] } }
  }
  const user = session.user
  const fixed = getResidenceFacilityValueSet()

  const rawImageUrls = (formData.getAll("image_urls") as string[])
    .filter((u) => isTrustedCabinImageUrl(u))
    .slice(0, MAX_CABIN_IMAGES)

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    location_hub: formData.get("location_hub"),
    max_guests: formData.get("max_guests"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    residence_subtype: formData.get("residence_subtype"),
    location_subtype: formData.get("location_subtype"),
    facilities: formData.getAll("facilities") as string[],
    addon_services_json: formData.get("addon_services_json") ?? undefined,
    offers_transport: formData.get("offers_transport") === "on",
    transport_from: (formData.get("transport_from") as string) ?? undefined,
    transport_price_roundtrip_kr: formData.get("transport_price_roundtrip_kr") ?? undefined,
    price_per_night_kr: formData.get("price_per_night_kr"),
    instant_book: formData.get("instant_book") === "on",
  }

  const parsed = baseSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as BoligFieldErrors }
  }

  const data = parsed.data
  const allFacilities = sanitizeFacilities(data.facilities, fixed)

  if (data.offers_transport) {
    if (!data.transport_from?.trim()) {
      return { errors: { transport_from: ["Angiv transport fra (sted)"] } }
    }
    if (data.transport_price_roundtrip_kr == null || data.transport_price_roundtrip_kr <= 0) {
      return { errors: { transport_price_roundtrip_kr: ["Angiv tur/retur pris (kr)"] } }
    }
  }

  const hub = GREENLAND_LOCATIONS.find((l) => l.name_dk === data.location_hub)
  if (!hub) {
    return { errors: { location_hub: ["Ukendt destination"] } }
  }

  let addonServices: unknown[] = []
  if (data.addon_services_json) {
    try {
      addonServices = JSON.parse(data.addon_services_json)
    } catch {
      // ignore
    }
  }

  let transportPriceRoundtripOre: number | null = null
  let transportPricePerPersonOre: number | null = null

  if (data.offers_transport && data.transport_price_roundtrip_kr != null && data.transport_price_roundtrip_kr > 0) {
    transportPriceRoundtripOre = krToOre(data.transport_price_roundtrip_kr)
    transportPricePerPersonOre = Math.round(transportPriceRoundtripOre * 0.6)
  }

  const price_per_night_ore = krToOre(data.price_per_night_kr)

  const { data: inserted, error } = await supabase
    .from("cabins")
    .insert({
      owner_id: user.id,
      title: data.title,
      description: data.description,
      location_hub: data.location_hub,
      latitude: hub.latitude,
      longitude: hub.longitude,
      max_guests: data.max_guests,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      property_type: "residence",
      residence_subtype: data.residence_subtype,
      location_subtype: data.location_subtype,
      price_per_night_ore,
      cleaning_fee_ore: 0,
      amenities: allFacilities,
      facilities: allFacilities,
      images: rawImageUrls,
      instant_book: data.instant_book,
      offers_transport: data.offers_transport,
      transport_from: data.offers_transport ? (data.transport_from?.trim() ?? null) : null,
      transport_price_roundtrip_ore: transportPriceRoundtripOre,
      transport_price_per_person_ore: transportPricePerPersonOre,
      access_type: "road",
      addon_services: addonServices,
      published: false,
    })
    .select("id")
    .single()

  if (error || !inserted) {
    console.error("[createBolig]", error)
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  const cabinId = inserted.id

  const { data: prof } = await supabase
    .from("profiles")
    .select("role_type")
    .eq("id", user.id)
    .maybeSingle()

  if (prof?.role_type === "traveler") {
    await supabase.from("profiles").update({ role_type: "both" }).eq("id", user.id)
  }

  revalidatePath("/opret")
  revalidatePath("/dashboard")

  redirect(`/opret/bolig/${cabinId}/tilgaengelighed?created=1`)
}

const updateSchema = baseSchema.extend({
  cabin_id: z.string().min(1),
})

export async function updateBolig(
  _prevState: BoligFormState,
  formData: FormData,
): Promise<BoligFormState> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { errors: { _form: ["Du skal være logget ind"] } }
  }
  const user = session.user
  const fixed = getResidenceFacilityValueSet()

  const raw = {
    cabin_id: formData.get("cabin_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    location_hub: formData.get("location_hub"),
    max_guests: formData.get("max_guests"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    residence_subtype: formData.get("residence_subtype"),
    location_subtype: formData.get("location_subtype"),
    facilities: formData.getAll("facilities") as string[],
    addon_services_json: formData.get("addon_services_json") ?? undefined,
    offers_transport: formData.get("offers_transport") === "on",
    transport_from: (formData.get("transport_from") as string) ?? undefined,
    transport_price_roundtrip_kr: formData.get("transport_price_roundtrip_kr") ?? undefined,
    price_per_night_kr: formData.get("price_per_night_kr"),
    instant_book: formData.get("instant_book") === "on",
  }

  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as BoligFieldErrors }
  }

  const data = parsed.data
  const { cabin_id, ...rest } = data
  const allFacilities = sanitizeFacilities(data.facilities, fixed)

  if (rest.offers_transport) {
    if (!rest.transport_from?.trim()) {
      return { errors: { transport_from: ["Angiv transport fra (sted)"] } }
    }
    if (rest.transport_price_roundtrip_kr == null || rest.transport_price_roundtrip_kr <= 0) {
      return { errors: { transport_price_roundtrip_kr: ["Angiv tur/retur pris (kr)"] } }
    }
  }

  const hub = GREENLAND_LOCATIONS.find((l) => l.name_dk === rest.location_hub)
  if (!hub) {
    return { errors: { location_hub: ["Ukendt destination"] } }
  }

  let addonServices: unknown[] = []
  if (data.addon_services_json) {
    try {
      addonServices = JSON.parse(data.addon_services_json)
    } catch {
      // ignore
    }
  }

  let transportPriceRoundtripOre: number | null = null
  let transportPricePerPersonOre: number | null = null
  let transportFromOut: string | null = null

  if (rest.offers_transport) {
    if (
      rest.transport_price_roundtrip_kr != null &&
      rest.transport_price_roundtrip_kr > 0
    ) {
      transportPriceRoundtripOre = krToOre(rest.transport_price_roundtrip_kr)
      transportPricePerPersonOre = Math.round(transportPriceRoundtripOre * 0.6)
    }
    transportFromOut = rest.transport_from?.trim() ?? null
  }

  try {
    await requireCabinOwner(supabase, cabin_id, user.id)
  } catch {
    return { errors: { _form: ["Ikke autoriseret"] } }
  }

  const { data: existing } = await supabase
    .from("cabins")
    .select("property_type")
    .eq("id", cabin_id)
    .eq("owner_id", user.id)
    .maybeSingle()

  if (existing?.property_type !== "residence") {
    return { errors: { _form: ["Ikke en bolig"] } }
  }

  const price_per_night_ore = krToOre(rest.price_per_night_kr)

  const { error } = await supabase
    .from("cabins")
    .update({
      title: rest.title,
      description: rest.description,
      location_hub: rest.location_hub,
      latitude: hub.latitude,
      longitude: hub.longitude,
      max_guests: rest.max_guests,
      bedrooms: rest.bedrooms,
      bathrooms: rest.bathrooms,
      residence_subtype: rest.residence_subtype,
      location_subtype: rest.location_subtype,
      price_per_night_ore,
      amenities: allFacilities,
      facilities: allFacilities,
      offers_transport: rest.offers_transport,
      transport_from: rest.offers_transport ? transportFromOut : null,
      transport_price_roundtrip_ore: rest.offers_transport ? transportPriceRoundtripOre : null,
      transport_price_per_person_ore: rest.offers_transport ? transportPricePerPersonOre : null,
      instant_book: rest.instant_book,
      access_type: "road",
      addon_services: addonServices,
    })
    .eq("id", cabin_id)
    .eq("owner_id", user.id)
    .eq("property_type", "residence")

  if (error) {
    console.error("[updateBolig]", error)
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  revalidatePath("/dashboard")
  revalidatePath("/opret")
  revalidatePath(`/opret/bolig/${cabin_id}/rediger`)
  revalidatePath(`/opret/bolig/${cabin_id}/tilgaengelighed`)
  revalidatePublishedCabinPaths(cabin_id, "residence")

  redirect("/dashboard?tab=mine-opslag&toast=cabin-updated")
}
