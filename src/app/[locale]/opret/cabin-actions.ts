"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { krToOre } from "@/lib/money"

export type CreateHytteState = {
  errors?: Record<string, string[] | undefined>
  error?: string
} | null

const MAJOR_HUBS = GREENLAND_LOCATIONS.filter((l) => l.is_major_hub)

const schema = z.object({
  title: z
    .string()
    .min(1, "Titel er påkrævet")
    .max(80, "Titel må højst være 80 tegn"),
  beskrivelse: z
    .string()
    .min(50, "Beskrivelse skal være mindst 50 tegn"),
  location_hub: z.string().min(1, "Vælg en destination"),
  max_guests: z.coerce
    .number({ error: "Ugyldigt tal" })
    .int()
    .min(1, "Minimum 1 gæst")
    .max(30, "Maksimum 30 gæster"),
  bedrooms: z.coerce
    .number({ error: "Ugyldigt tal" })
    .int()
    .min(0, "Kan ikke være negativt")
    .max(20, "Maksimum 20 soverum"),
  price_per_night_kr: z.coerce
    .number({ error: "Ugyldigt tal" })
    .positive("Prisen skal være større end 0"),
  cleaning_fee_kr: z.coerce
    .number({ error: "Ugyldigt tal" })
    .min(0, "Kan ikke være negativt")
    .default(0),
  access_type: z.enum(["road", "boat", "helicopter", "other"] as const, {
    error: "Vælg adgangstype",
  }),
  amenities: z.array(z.string()).default([]),
  instant_book: z.boolean().default(false),
  offers_transport: z.boolean().default(false),
  transport_price_kr: z.coerce
    .number({ error: "Ugyldigt tal" })
    .min(0, "Kan ikke være negativt")
    .optional(),
})

export async function createHytte(
  prevState: CreateHytteState,
  formData: FormData
): Promise<CreateHytteState> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { error: "Du skal være logget ind for at oprette en hytte" }
  }
  const user = session.user

  const offersTransport = formData.get("offers_transport") === "on"

  const raw = {
    title: formData.get("title"),
    beskrivelse: formData.get("beskrivelse"),
    location_hub: formData.get("location_hub"),
    max_guests: formData.get("max_guests"),
    bedrooms: formData.get("bedrooms"),
    price_per_night_kr: formData.get("price_per_night_kr"),
    cleaning_fee_kr: formData.get("cleaning_fee_kr") || "0",
    access_type: formData.get("access_type"),
    amenities: formData.getAll("amenities") as string[],
    instant_book: formData.get("instant_book") === "on",
    offers_transport: offersTransport,
    transport_price_kr: offersTransport
      ? formData.get("transport_price_kr") || undefined
      : undefined,
  }

  const result = schema.safeParse(raw)

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const data = result.data

  const hub = MAJOR_HUBS.find((l) => l.name_dk === data.location_hub)
  if (!hub) {
    return { errors: { location_hub: ["Vælg en gyldig destination"] } }
  }

  // Money conversions — ONLY here, per CLAUDE.md
  const price_per_night_ore = krToOre(data.price_per_night_kr)
  const cleaning_fee_ore = krToOre(data.cleaning_fee_kr)
  const transport_price_per_person_ore =
    data.transport_price_kr != null ? krToOre(data.transport_price_kr) : null

  const { error: dbError } = await supabase.from("cabins").insert({
    owner_id: user.id,
    title: data.title,
    description: data.beskrivelse,
    location_hub: data.location_hub,
    latitude: hub.latitude,
    longitude: hub.longitude,
    max_guests: data.max_guests,
    bedrooms: data.bedrooms,
    price_per_night_ore,
    cleaning_fee_ore,
    amenities: data.amenities,
    images: [],
    access_type: data.access_type,
    instant_book: data.instant_book,
    offers_transport: data.offers_transport,
    transport_price_per_person_ore,
    published: false,
  })

  if (dbError) {
    console.error("[createHytte] DB error:", dbError)
    return { error: "Der opstod en fejl ved oprettelse. Prøv igen." }
  }

  redirect("/mine-hytter")
}
