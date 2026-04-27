import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase-server"

export type NavUser = {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

function metadataFullName(user: User): string | null {
  const m = user.user_metadata as Record<string, unknown> | undefined
  const a = m?.full_name
  const b = m?.name
  const s = (typeof a === "string" && a.trim() ? a : typeof b === "string" ? b : "")?.trim()
  return s || null
}

/** profiles.full_name, ellers auth user_metadata (server) — aldrig e-mail. */
export function resolveDisplayName(
  profile: { full_name: string | null } | null | undefined,
  user: User,
): string | null {
  const p = profile?.full_name && String(profile.full_name).trim()
  if (p) return p
  return metadataFullName(user)
}

/**
 * Henter visningsnavn fra profiles (server). Ved manglende felt: metadata-fallback.
 */
export async function getNavUserForPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
): Promise<NavUser> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role_type, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const fullName = resolveDisplayName(profile, user)
  const p = profile as { avatar_url?: string | null } | null | undefined
  const a = p?.avatar_url
  const avatarUrl = a && String(a).trim() ? String(a).trim() : null

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[getNavUserForPage]", {
      userId: user.id,
      fullName: fullName ?? null,
      avatarUrl: avatarUrl ?? null,
      profileError: error?.message ?? null,
      hadProfileRow: profile != null,
    })
  }

  return {
    id: user.id,
    fullName,
    avatarUrl,
  }
}
