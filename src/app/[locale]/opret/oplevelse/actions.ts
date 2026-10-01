"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { GREENLAND_LOCATIONS } from "@/lib/greenlandLocations"
import { krToOre } from "@/lib/money"
import { EXPERIENCE_FORM_CATEGORIES } from "./experienceFormCategories"

const schema = z.object({
  title: z.string().trim().min(1, "Titel er påkrævet").max(80, "Titel må maks. være 80 tegn"),
  description: z
    .string()
    .trim()
    .min(50, "Beskrivelse skal være mindst 50 tegn"),
  location_hub: z.string().trim().min(1, "Vælg en lokation"),
  category: z.enum(EXPERIENCE_FORM_CATEGORIES),
  duration_hours: z.coerce
    .number({ error: "Angiv varighed i timer" })
    .min(0.5, "Mindst ½ time"),
  max_participants: z.coerce
    .number({ error: "Ugyldigt antal" })
    .int()
    .min(1, "Mindst 1 deltager")
    .max(50, "Maks. 50 deltagere"),
  price_per_person_kr: z.coerce
    .number({ error: "Angiv pris i kr." })
    .positive("Prisen skal være større end 0"),
})

type FieldKeys = keyof z.infer<typeof schema>

type FieldErrors = Partial<Record<FieldKeys | "_form", string[]>>

export type OplevelseFormState =
  | {
      errors?: FieldErrors
      error?: string
    }
  | null

export async function createOplevelse(
  prevState: OplevelseFormState,
  formData: FormData,
): Promise<OplevelseFormState> {
  void prevState
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { error: "Du skal være logget ind" }
  }
  const user = session.user

  const raw = {
    title: formData.get("title"),
    description: formData.get("description"),
    location_hub: formData.get("location_hub"),
    category: formData.get("category"),
    duration_hours: formData.get("duration_hours"),
    max_participants: formData.get("max_participants"),
    price_per_person_kr: formData.get("price_per_person_kr"),
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as FieldErrors,
    }
  }

  const d = parsed.data

  const hub = GREENLAND_LOCATIONS.find(
    (l) => l.name_dk.trim().toLowerCase() === d.location_hub.trim().toLowerCase(),
  )
  const hubKey = hub?.name_dk ?? null
  if (!hubKey) {
    return { errors: { location_hub: ["Ukendt destination"] } }
  }

  const duration_minutes = Math.max(1, Math.round(d.duration_hours * 60))

  const price_per_person_ore = krToOre(d.price_per_person_kr)

  const categoriesPayload = [{ key: d.category, description: d.description.trim() }]

  const { error } = await supabase.from("experiences").insert({
    provider_id: user.id,
    title: d.title.trim(),
    description: d.description.trim(),
    location_hub: hubKey,
    price_per_person_ore,
    max_participants: d.max_participants,
    duration_minutes,
    categories: categoriesPayload,
    images: [],
    published: false,
  })

  if (error) {
    console.error("[createOplevelse]", error)
    return { error: "Der opstod en fejl. Prøv igen." }
  }

  redirect("/dashboard")
}
