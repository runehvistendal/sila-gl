"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"
import { krToOre } from "@/lib/money"

const schema = z.object({
  title: z.string().min(1, "Titel er påkrævet").max(80, "Titel må maks. være 80 tegn"),
  description: z.string().min(50, "Beskrivelse skal være mindst 50 tegn"),
  location_hub: z.string().min(1, "Vælg en destination"),
  max_guests: z.coerce.number().int().min(1, "Minimum 1 gæst").max(30, "Maks. 30 gæster"),
  bedrooms: z.coerce.number().int().min(0, "Minimum 0 soverum").max(20, "Maks. 20 soverum"),
  access_type: z.enum(["road", "boat", "helicopter", "other"], {
    errorMap: () => ({ message: "Vælg en adgangstype" }),
  }),
  facilities: z.array(z.string()).default([]),
  addon_services_json: z.string().optional(),
  offers_transport: z.boolean().default(false),
  transport_from: z.string().optional(),
  transport_price_roundtrip_kr: z.coerce.number().min(0).optional(),
})

export type HytteFormState = {
  errors?: Partial<Record<keyof z.infer<typeof schema> | "_form", string[]>>
} | null

export async function createHytte(
  prevState: HytteFormState,
  formData: FormData,
): Promise<HytteFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { errors: { _form: ["Du skal være logget ind"] } }
  }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    location_hub: formData.get("location_hub"),
    max_guests: formData.get("max_guests"),
    bedrooms: formData.get("bedrooms"),
    access_type: formData.get("access_type"),
    facilities: formData.getAll("facilities"),
    addon_services_json: formData.get("addon_services_json") ?? undefined,
    offers_transport: formData.get("offers_transport") === "on",
    transport_from: formData.get("transport_from") ?? undefined,
    transport_price_roundtrip_kr: formData.get("transport_price_roundtrip_kr") ?? undefined,
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as HytteFormState["errors"] }
  }

  const data = parsed.data

  let addonServices = []
  if (data.addon_services_json) {
    try {
      addonServices = JSON.parse(data.addon_services_json)
    } catch {
      // ignore malformed JSON
    }
  }

  let transportPriceRoundtripOre: number | null = null
  let transportPricePerPersonOre: number | null = null

  if (
    data.offers_transport &&
    data.transport_price_roundtrip_kr !== undefined &&
    data.transport_price_roundtrip_kr > 0
  ) {
    transportPriceRoundtripOre = krToOre(data.transport_price_roundtrip_kr)
    transportPricePerPersonOre = Math.round(transportPriceRoundtripOre * 0.6)
  }

  const { error } = await supabase.from("cabins").insert({
    owner_id: user.id,
    title: data.title,
    description: data.description,
    location_hub: data.location_hub,
    max_guests: data.max_guests,
    bedrooms: data.bedrooms,
    access_type: data.access_type,
    facilities: data.facilities,
    addon_services: addonServices,
    offers_transport: data.offers_transport,
    transport_from: data.transport_from ?? null,
    transport_price_roundtrip_ore: transportPriceRoundtripOre,
    transport_price_per_person_ore: transportPricePerPersonOre,
    published: false,
    images: [],
  })

  if (error) {
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  redirect("/dashboard?tab=mine-opslag")
}
