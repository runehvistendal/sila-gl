"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"
import { isCloudinaryImageUrl } from "@/lib/cloudinaryUrl"
import { findLocationById } from "@/lib/greenlandLocations"

export type UpdateProfileResult =
  | { success: true }
  | { error: string }

const LANGS = new Set(["da", "en", "kl"])
const ROLES = new Set(["traveler", "provider", "both"])

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Du skal være logget ind" }
  }

  const fullName = String(formData.get("full_name") ?? "").trim()
  const locationIdRaw = String(formData.get("location_id") ?? "").trim()
  const language = String(formData.get("language") ?? "da").trim()
  const roleTypeRaw = String(formData.get("role_type") ?? "").trim()
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 500)
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30)

  if (!fullName || fullName.length > 120) {
    return { error: "Angiv et navn (maks. 120 tegn)" }
  }

  if (!LANGS.has(language)) {
    return { error: "Ugyldigt sprog" }
  }

  if (!ROLES.has(roleTypeRaw)) {
    return { error: "Ugyldig rolle" }
  }

  let locationId: string | null = locationIdRaw || null
  if (locationId) {
    const loc = findLocationById(locationId)
    if (!loc) {
      return { error: "Ugyldigt sted" }
    }
  }

  const locationLabel = locationId ? findLocationById(locationId)?.name_dk ?? null : null

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      location_id: locationId,
      language,
      languages: [language],
      location: locationLabel,
      role_type: roleTypeRaw,
      bio: bio || null,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { error: error.message || "Kunne ikke gemme profil" }
  }

  revalidatePath("/profil")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateAvatar(url: string): Promise<UpdateProfileResult> {
  if (!isCloudinaryImageUrl(url)) {
    return { error: "Ugyldig billed-URL" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Du skal være logget ind" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { error: error.message || "Kunne ikke gemme profilbillede" }
  }

  revalidatePath("/profil")
  revalidatePath("/dashboard")
  return { success: true }
}
