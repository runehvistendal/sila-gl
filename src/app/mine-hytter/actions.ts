"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"

export async function deleteHytte(formData: FormData): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Ikke autoriseret" }
  }

  const id = formData.get("id")
  if (!id || typeof id !== "string") {
    return { error: "Ugyldigt ID" }
  }

  // Soft delete — sæt deleted_at. owner_id-tjek er sikkerhedsgaranti.
  const { error } = await supabase
    .from("cabins")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id)

  if (error) {
    console.error("[deleteHytte] DB error:", error.message)
    return { error: "Fejl ved sletning — prøv igen" }
  }

  revalidatePath("/mine-hytter")
}
