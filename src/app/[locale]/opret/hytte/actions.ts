"use server"

import { revalidatePath } from "next/cache"
import { revalidatePublishedCabinPaths } from "@/lib/revalidateCabinPublic"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"
import { requireCabinOwner } from "@/lib/requireCabinOwner"
import { requireSession } from "@/lib/requireSession"
import { isCloudinaryImageUrl } from "@/lib/cloudinaryUrl"

const MAX_CABIN_IMAGES = 8
import { krToOre } from "@/lib/money"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import {
  parseTransferRoutesJson,
  syncCabinTransferRoutes,
} from "@/lib/syncCabinTransferRoutes"
const PLACEHOLDER_NIGHT_KR = 100

// Validates that an image_url is a trusted Cloudinary URL (cabin or pending folder)
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

const baseSchema = z.object({
  title: z.string().min(1, "Titel er påkrævet").max(80, "Titel må maks. være 80 tegn"),
  description: z.string().min(50, "Beskrivelse skal være mindst 50 tegn"),
  location_hub: z.string().min(1, "Vælg en destination"),
  max_guests: z.coerce.number().int().min(1, "Minimum 1 gæst").max(30, "Maks. 30 gæster"),
  bedrooms: z.coerce.number().int().min(0, "Minimum 0 soverum").max(20, "Maks. 20 soverum"),
  facilities: z.array(z.string()).default([]),
  addon_services_json: z.string().optional(),
  offers_transport: z.boolean().default(false),
  transport_from: z.string().optional(),
  transport_price_roundtrip_kr: z.coerce.number().min(0).optional(),
})

type HytteFieldErrors = Partial<Record<string | "_form", string[]>>

export type HytteFormState = { errors?: HytteFieldErrors } | null

export async function createHytte(
  prevState: HytteFormState,
  formData: FormData,
): Promise<HytteFormState> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { errors: { _form: ["Du skal være logget ind"] } }
  }
  const user = session.user

  const rawImageUrls = (formData.getAll("image_urls") as string[])
    .filter((u) => isTrustedCabinImageUrl(u))
    .slice(0, MAX_CABIN_IMAGES)

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    location_hub: formData.get("location_hub"),
    max_guests: formData.get("max_guests"),
    bedrooms: formData.get("bedrooms"),
    facilities: formData.getAll("facilities") as string[],
    addon_services_json: formData.get("addon_services_json") ?? undefined,
    offers_transport: formData.get("offers_transport") === "on",
    transport_from: (formData.get("transport_from") as string) ?? undefined,
    transport_price_roundtrip_kr: formData.get("transport_price_roundtrip_kr") ?? undefined,
  }

  const parsed = baseSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as HytteFieldErrors }
  }

  const data = parsed.data

  if (data.offers_transport) {
    if (!data.transport_from?.trim()) {
      return { errors: { transport_from: ["Angiv transport fra (by/havn)"] } }
    }
    if (data.transport_price_roundtrip_kr == null || data.transport_price_roundtrip_kr <= 0) {
      return { errors: { transport_price_roundtrip_kr: ["Angiv tur/retur pris (kr)"] } }
    }
  }

  const hub = GREENLAND_LOCATIONS.find((l) => l.name_dk === data.location_hub)
  if (!hub) {
    return { errors: { location_hub: ["Ukendt destination"] } }
  }

  const allFacilities = data.facilities

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

  const price_per_night_ore = krToOre(PLACEHOLDER_NIGHT_KR)

  const { data: inserted, error } = await supabase.from("cabins").insert({
    owner_id: user.id,
    title: data.title,
    description: data.description,
    location_hub: data.location_hub,
    latitude: hub.latitude,
    longitude: hub.longitude,
    max_guests: data.max_guests,
    bedrooms: data.bedrooms,
    property_type: "cabin",
    residence_subtype: null,
    location_subtype: null,
    price_per_night_ore,
    cleaning_fee_ore: 0,
    amenities: allFacilities,
    facilities: allFacilities,
    images: rawImageUrls,
    instant_book: false,
    offers_transport: data.offers_transport,
    transport_from: data.offers_transport ? (data.transport_from?.trim() ?? null) : null,
    transport_price_roundtrip_ore: transportPriceRoundtripOre,
    transport_price_per_person_ore: transportPricePerPersonOre,
    access_type: "boat",
    addon_services: addonServices,
    published: false,
  }).select("id").single()

  if (error || !inserted) {
    console.error("[createHytte]", error)
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  const cabinId = inserted.id

  const transferRoutesEnabled = formData.get("offers_transfer_routes") === "on"
  const routesParsed = parseTransferRoutesJson(
    (formData.get("transfer_routes_json") as string | null) ?? undefined,
  )
  if (routesParsed === null) {
    return { errors: { _form: ["Ugyldig data for transferruter"] } }
  }
  const { error: trErr } = await syncCabinTransferRoutes(
    supabase,
    cabinId,
    transferRoutesEnabled,
    routesParsed,
  )
  if (trErr) {
    console.error("[createHytte transfer_routes]", trErr)
    return { errors: { _form: ["Kunne ikke gemme transferruter"] } }
  }

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role_type")
    .eq("id", user.id)
    .maybeSingle()

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[createHytte/role] before", prof?.role_type, profErr?.message)
  }

  if (prof?.role_type === "traveler") {
    const { data: after, error: upErr } = await supabase
      .from("profiles")
      .update({ role_type: "both" })
      .eq("id", user.id)
      .select("role_type")
      .single()

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[createHytte/role] after", after?.role_type, upErr?.message)
    }
  }

  redirect(`/opret/hytte/${cabinId}/tilgaengelighed?created=1`)
}

const updateSchema = baseSchema.extend({
  cabin_id: z.string().min(1),
})

export async function updateHytte(
  prevState: HytteFormState,
  formData: FormData,
): Promise<HytteFormState> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { errors: { _form: ["Du skal være logget ind"] } }
  }
  const user = session.user

  const raw = {
    cabin_id: formData.get("cabin_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    location_hub: formData.get("location_hub"),
    max_guests: formData.get("max_guests"),
    bedrooms: formData.get("bedrooms"),
    facilities: formData.getAll("facilities") as string[],
    addon_services_json: formData.get("addon_services_json") ?? undefined,
    offers_transport: formData.get("offers_transport") === "on",
    transport_from: (formData.get("transport_from") as string) ?? undefined,
    transport_price_roundtrip_kr: formData.get("transport_price_roundtrip_kr") ?? undefined,
  }

  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as HytteFieldErrors }
  }

  const data = parsed.data
  const { cabin_id, ...rest } = data
  const dataForInsert = { ...rest }

  if (dataForInsert.offers_transport) {
    if (!dataForInsert.transport_from?.trim()) {
      return { errors: { transport_from: ["Angiv transport fra (by/havn)"] } }
    }
    if (
      dataForInsert.transport_price_roundtrip_kr == null ||
      dataForInsert.transport_price_roundtrip_kr <= 0
    ) {
      return { errors: { transport_price_roundtrip_kr: ["Angiv tur/retur pris (kr)"] } }
    }
  }

  const hub = GREENLAND_LOCATIONS.find((l) => l.name_dk === dataForInsert.location_hub)
  if (!hub) {
    return { errors: { location_hub: ["Ukendt destination"] } }
  }

  const allFacilities = data.facilities

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

  if (dataForInsert.offers_transport) {
    if (
      dataForInsert.transport_price_roundtrip_kr != null &&
      dataForInsert.transport_price_roundtrip_kr > 0
    ) {
      transportPriceRoundtripOre = krToOre(dataForInsert.transport_price_roundtrip_kr)
      transportPricePerPersonOre = Math.round(transportPriceRoundtripOre * 0.6)
    }
    transportFromOut = dataForInsert.transport_from?.trim() ?? null
  }

  try {
    await requireCabinOwner(supabase, cabin_id, user.id)
  } catch {
    return { errors: { _form: ["Ikke autoriseret"] } }
  }

  const { error } = await supabase
    .from("cabins")
    .update({
      title: dataForInsert.title,
      description: dataForInsert.description,
      location_hub: dataForInsert.location_hub,
      latitude: hub.latitude,
      longitude: hub.longitude,
      max_guests: dataForInsert.max_guests,
      bedrooms: dataForInsert.bedrooms,
      amenities: allFacilities,
      facilities: allFacilities,
      offers_transport: dataForInsert.offers_transport,
      transport_from: transportFromOut,
      transport_price_roundtrip_ore: transportPriceRoundtripOre,
      transport_price_per_person_ore: transportPricePerPersonOre,
      access_type: "boat",
      addon_services: addonServices,
    })
    .eq("id", cabin_id)
    .eq("owner_id", user.id)

  if (error) {
    console.error("[updateHytte]", error)
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  const transferRoutesEnabled = formData.get("offers_transfer_routes") === "on"
  const routesParsed = parseTransferRoutesJson(
    (formData.get("transfer_routes_json") as string | null) ?? undefined,
  )
  if (routesParsed === null) {
    return { errors: { _form: ["Ugyldig data for transferruter"] } }
  }
  const { error: trErr } = await syncCabinTransferRoutes(
    supabase,
    cabin_id,
    transferRoutesEnabled,
    routesParsed,
  )
  if (trErr) {
    console.error("[updateHytte transfer_routes]", trErr)
    return { errors: { _form: ["Kunne ikke gemme transferruter"] } }
  }

  redirect("/dashboard?tab=mine-opslag&toast=cabin-updated")
}

export type UpdateCabinImagesResult =
  | { success: true }
  | { error: string }

export async function updateCabinImages(
  cabinId: string,
  urls: string[],
): Promise<UpdateCabinImagesResult> {
  if (urls.length > MAX_CABIN_IMAGES) {
    return { error: `Højest ${MAX_CABIN_IMAGES} billeder` }
  }
  for (const u of urls) {
    if (!isCloudinaryImageUrl(u)) {
      return { error: "Ugyldig billed-URL" }
    }
  }

  const { supabase, user } = await requireSession()
  await requireCabinOwner(supabase, cabinId, user.id)

  const { data: updated, error } = await supabase
    .from("cabins")
    .update({ images: urls })
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .select("property_type")
    .maybeSingle()

  if (error) {
    return { error: error.message || "Kunne ikke gemme billeder" }
  }

  revalidatePath("/opret/hytte/" + cabinId + "/rediger")
  revalidatePath("/opret/bolig/" + cabinId + "/rediger")
  revalidatePath("/dashboard")
  if (updated) {
    revalidatePublishedCabinPaths(cabinId, updated.property_type)
  }
  return { success: true }
}
