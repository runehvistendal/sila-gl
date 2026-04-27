"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"

const schema = z.object({
  name: z.string().min(1, "Navn er påkrævet").max(80, "Navn må maks. være 80 tegn"),
  boat_type: z.string().optional(),
  capacity: z.coerce
    .number()
    .int()
    .min(1, "Minimum 1 passager")
    .max(50, "Maks. 50 passagerer"),
  description: z.string().optional(),
  equipment: z.array(z.string()).default([]),
  addon_services_json: z.string().optional(),
  safety_confirmed: z.boolean().default(false),
})

export type BaadFormState = {
  errors?: Partial<Record<keyof z.infer<typeof schema> | "_form", string[]>>
} | null

export async function createBaad(
  prevState: BaadFormState,
  formData: FormData,
): Promise<BaadFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { errors: { _form: ["Du skal være logget ind"] } }
  }

  const raw = {
    name: formData.get("name"),
    boat_type: formData.get("boat_type") ?? undefined,
    capacity: formData.get("capacity"),
    description: formData.get("description") ?? undefined,
    equipment: formData.getAll("equipment"),
    addon_services_json: formData.get("addon_services_json") ?? undefined,
    safety_confirmed: formData.get("safety_confirmed") === "on",
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as BaadFormState["errors"] }
  }

  const data = parsed.data

  if (!data.safety_confirmed) {
    return {
      errors: { safety_confirmed: ["Du skal bekræfte sikkerhedsudstyr"] },
    }
  }

  let addonServices = []
  if (data.addon_services_json) {
    try {
      addonServices = JSON.parse(data.addon_services_json)
    } catch {
      // ignore malformed JSON
    }
  }

  const { error } = await supabase.from("boats").insert({
    owner_id: user.id,
    name: data.name,
    boat_type: data.boat_type ?? null,
    capacity: data.capacity,
    description: data.description ?? null,
    equipment: data.equipment,
    addon_services: addonServices,
    safety_confirmed: true,
    images: [],
  })

  if (error) {
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  redirect("/dashboard?tab=mine-opslag")
}
