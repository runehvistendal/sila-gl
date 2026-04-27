"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase-server"
import type { AddOnService } from "@/components/shared/AddOnServicesEditor"

const schema = z
  .object({
    cabin_id: z.string().min(1),
    check_in: z.string().min(1, "Vælg check-in dato"),
    check_out: z.string().min(1, "Vælg check-out dato"),
    addon_services_json: z.string().optional(),
  })
  .refine((d) => d.check_in < d.check_out, {
    message: "Check-out skal være efter check-in",
    path: ["check_out"],
  })

export type PublishCabinState = {
  errors?: Record<string, string[]>
  message?: string
} | null

export async function publishCabinListing(
  _prevState: PublishCabinState,
  formData: FormData
): Promise<PublishCabinState> {
  const raw = {
    cabin_id: formData.get("cabin_id") as string,
    check_in: formData.get("check_in") as string,
    check_out: formData.get("check_out") as string,
    addon_services_json: (formData.get("addon_services_json") as string) ?? "[]",
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { cabin_id, check_in, check_out, addon_services_json } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { message: "Ikke logget ind" }

  const { data: cabin } = await supabase
    .from("cabins")
    .select("id, owner_id")
    .eq("id", cabin_id)
    .single()

  if (!cabin || cabin.owner_id !== user.id) {
    return { message: "Du har ikke adgang til denne hytte" }
  }

  let addonServices: AddOnService[] = []
  try {
    addonServices = JSON.parse(addon_services_json ?? "[]")
  } catch {
    addonServices = []
  }

  const { error } = await supabase
    .from("cabins")
    .update({
      available_from: check_in,
      available_to: check_out,
      addon_services: addonServices,
      published: true,
    })
    .eq("id", cabin_id)

  if (error) {
    return { message: "Noget gik galt. Prøv igen." }
  }

  redirect(`/hytter/${cabin_id}`)
}
