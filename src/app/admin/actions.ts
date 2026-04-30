"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"
import { createServiceClient } from "@/lib/supabase-service"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke logget ind")

  const svc = createServiceClient()
  const { data: profile } = await svc
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.is_admin) throw new Error("Ingen admin-adgang")
  return svc
}

export async function setIsAdmin(targetUserId: string, value: boolean) {
  const svc = await assertAdmin()
  const { error } = await svc
    .from("profiles")
    .update({ is_admin: value })
    .eq("id", targetUserId)

  if (error) throw new Error(error.message)
  revalidatePath("/admin/brugere")
}

export async function setCabinPublished(cabinId: string, published: boolean) {
  const svc = await assertAdmin()
  const { error } = await svc
    .from("cabins")
    .update({ published })
    .eq("id", cabinId)

  if (error) throw new Error(error.message)
  revalidatePath("/admin/hytter")
}
