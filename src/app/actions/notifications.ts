"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"
import { markNotificationsReadByTypes } from "@/lib/notifications"
import type { NotificationType } from "@/types/notifications"

export async function markNotificationsByType(types: NotificationType[]): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await markNotificationsReadByTypes(supabase, user.id, types)
  revalidatePath("/", "layout")
}
