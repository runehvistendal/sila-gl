"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"

const baseSchema = z.object({
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

const updateSchema = baseSchema.extend({
  boat_id: z.string().min(1),
})

type BaadFieldErrors = Partial<
  Record<keyof z.infer<typeof baseSchema> | "boat_id" | "_form", string[]>
>

export type BaadFormState = { errors?: BaadFieldErrors } | null

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
    equipment: formData.getAll("equipment") as string[],
    addon_services_json: formData.get("addon_services_json") ?? undefined,
    safety_confirmed: formData.get("safety_confirmed") === "on",
  }

  const parsed = baseSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as BaadFieldErrors }
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
    console.error("[createBaad]", error)
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  redirect("/dashboard?tab=mine-opslag&toast=baad-saved")
}

export async function updateBaad(
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
    boat_id: formData.get("boat_id"),
    name: formData.get("name"),
    boat_type: formData.get("boat_type") ?? undefined,
    capacity: formData.get("capacity"),
    description: formData.get("description") ?? undefined,
    equipment: formData.getAll("equipment") as string[],
    addon_services_json: formData.get("addon_services_json") ?? undefined,
    safety_confirmed: formData.get("safety_confirmed") === "on",
  }

  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as BaadFieldErrors }
  }

  const { boat_id, ...data } = parsed.data

  if (!data.safety_confirmed) {
    return {
      errors: { safety_confirmed: ["Du skal bekræfte sikkerhedsudstyr"] },
    }
  }

  const { data: existing } = await supabase
    .from("boats")
    .select("id, owner_id")
    .eq("id", boat_id)
    .is("deleted_at", null)
    .single()

  if (!existing || existing.owner_id !== user.id) {
    return { errors: { _form: ["Båd ikke fundet"] } }
  }

  let addonServices = []
  if (data.addon_services_json) {
    try {
      addonServices = JSON.parse(data.addon_services_json)
    } catch {
      // ignore
    }
  }

  const { error } = await supabase
    .from("boats")
    .update({
      name: data.name,
      boat_type: data.boat_type ?? null,
      capacity: data.capacity,
      description: data.description ?? null,
      equipment: data.equipment,
      addon_services: addonServices,
      safety_confirmed: true,
    })
    .eq("id", boat_id)
    .eq("owner_id", user.id)

  if (error) {
    console.error("[updateBaad]", error)
    return { errors: { _form: ["Der opstod en fejl. Prøv igen."] } }
  }

  redirect("/dashboard?tab=mine-opslag&toast=boat-updated")
}
