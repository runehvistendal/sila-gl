"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"
import { requireCabinOwner } from "@/lib/requireCabinOwner"

export async function deleteHytte(formData: FormData): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    return { error: "Ikke autoriseret" }
  }
  const user = session.user

  const id = formData.get("id")
  if (!id || typeof id !== "string") {
    return { error: "Ugyldigt ID" }
  }

  try {
    await requireCabinOwner(supabase, id, user.id)
  } catch {
    return { error: "Ikke autoriseret" }
  }

  // Soft delete — sæt deleted_at. RLS + eksplicit owner_id.
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
