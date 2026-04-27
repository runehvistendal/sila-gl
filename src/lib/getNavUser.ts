import { createClient } from "@/lib/supabase-server"

export type NavUser = {
  id: string
  fullName: string | null
}

/** full_name fra profiles (server-only). Ingen e-mail. */
export async function getNavUserForPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<NavUser> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single()

  return {
    id: userId,
    fullName: profile?.full_name ?? null,
  }
}
