"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"

export async function createCabinRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent("/anmod?type=stay")}`)

  // Rate limiting
  const { error: rlErr } = await supabase.rpc("consume_rate_limit", {
    p_user_id:        user.id,
    p_action:         "create_cabin_request",
    p_max_attempts:   5,
    p_window_seconds: 600,
  })
  if (rlErr) return { error: "For mange forsøg. Prøv igen om lidt." }

  const location      = formData.get("location") as string
  const checkIn       = formData.get("desired_check_in") as string
  const checkOut      = formData.get("desired_check_out") as string
  const numGuests     = Number(formData.get("num_guests"))
  const maxPriceKr    = formData.get("max_price_kr") ? Number(formData.get("max_price_kr")) : null
  const propertyType = (formData.get("desired_property_type") as string) || "cabin"
  const prefSleeping = (formData.get("pref_sleeping") as string | null)?.trim() || ""
  const prefMustHave = (formData.get("pref_must_have") as string | null)?.trim() || ""

  if (!["cabin", "residence"].includes(propertyType)) {
    return { error: "Vælg opholdstype." }
  }

  const freeDesc = ((formData.get("description") as string | null) || "").trim()
  const descParts: string[] = []
  if (prefSleeping) descParts.push(`Senge/sovepladser: ${prefSleeping}`)
  if (prefMustHave) descParts.push(`Vigtigst for os: ${prefMustHave}`)
  if (freeDesc) descParts.push(freeDesc)
  const description = descParts.length > 0 ? descParts.join("\n\n") : null

  if (!location || !checkIn || !checkOut || !numGuests) {
    return { error: "Udfyld venligst alle påkrævede felter." }
  }
  if (new Date(checkOut) <= new Date(checkIn)) {
    return { error: "Check-ud skal være efter check-ind." }
  }

  const { error } = await supabase.from("cabin_requests").insert({
    guest_id:               user.id,
    location,
    desired_check_in:       checkIn,
    desired_check_out:      checkOut,
    num_guests:             numGuests,
    max_price_ore:          maxPriceKr ? Math.round(maxPriceKr * 100) : null,
    description,
    desired_property_type:  propertyType as "cabin" | "residence",
  })

  if (error) return { error: "Noget gik galt. Prøv igen." }

  revalidatePath("/dashboard")
  redirect(
    `/dashboard?tab=requests&toast=cabin-request-created&cabin_req=1&cabin_loc=${encodeURIComponent(location)}&cabin_ng=${numGuests}&cabin_mp=${maxPriceKr != null ? "1" : "0"}`,
  )
}
