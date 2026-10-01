"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"
import { requireStripeForPublish } from "@/app/actions/stripe"

const STRIPE_REQUIRED = "stripe_required"

async function requireExperienceOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  experienceId: string,
  userId: string,
) {
  const { data: row, error } = await supabase
    .from("experiences")
    .select("id")
    .eq("id", experienceId)
    .eq("provider_id", userId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error || !row) throw new Error("forbidden")
}

function revalidateExperienceCalendarPaths(experienceId: string) {
  revalidatePath(`/opret/oplevelse/${experienceId}/tilgaengelighed`)
  revalidatePath(`/oplevelser/${experienceId}`)
  revalidatePath("/oplevelser")
  revalidatePath("/dashboard")
  revalidatePath("/opret")
}

export async function saveExperienceAvailability(
  experienceId: string,
  blockedDates: string[],
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }

  try {
    await requireExperienceOwner(supabase, experienceId, session.user.id)
  } catch {
    return { error: "Ingen adgang" }
  }

  await supabase.from("experience_availability").delete().eq("experience_id", experienceId)

  if (blockedDates.length > 0) {
    const rows = blockedDates.map((date) => ({
      experience_id: experienceId,
      date,
      is_available: false,
    }))
    const { error } = await supabase.from("experience_availability").insert(rows)
    if (error) return { error: error.message }
  }

  revalidateExperienceCalendarPaths(experienceId)
  return { ok: true }
}

export async function saveExperienceSettings(
  experienceId: string,
  params: { maxParticipants: number; durationMinutes: number | null; preparationDays: number },
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }

  const maxP = Math.floor(Number(params.maxParticipants))
  const prep = Math.floor(Number(params.preparationDays))
  let durationMinutes: number | null = null
  if (
    params.durationMinutes != null &&
    Number.isFinite(params.durationMinutes) &&
    params.durationMinutes > 0
  ) {
    durationMinutes = Math.floor(params.durationMinutes)
  }

  if (!Number.isFinite(maxP) || maxP < 1 || maxP > 500) {
    return { error: "Maks. deltagere skal være mellem 1 og 500" }
  }
  if (![0, 1, 2, 3].includes(prep)) {
    return { error: "Forberedelsestid skal være 0, 1, 2 eller 3 dage" }
  }

  try {
    await requireExperienceOwner(supabase, experienceId, session.user.id)
  } catch {
    return { error: "Ingen adgang" }
  }

  const { error } = await supabase
    .from("experiences")
    .update({
      max_participants: maxP,
      duration_minutes: durationMinutes,
      preparation_days: prep,
    })
    .eq("id", experienceId)
    .eq("provider_id", session.user.id)

  if (error) return { error: error.message }
  revalidateExperienceCalendarPaths(experienceId)
  return { ok: true }
}

export async function publishExperience(
  experienceId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }

  try {
    await requireExperienceOwner(supabase, experienceId, session.user.id)
  } catch {
    return { error: "Ingen adgang" }
  }

  const gate = await requireStripeForPublish()
  if (!gate.ok) {
    if (gate.error === STRIPE_REQUIRED) return { error: STRIPE_REQUIRED }
    return { error: gate.error }
  }

  const { error } = await supabase
    .from("experiences")
    .update({ published: true })
    .eq("id", experienceId)
    .eq("provider_id", session.user.id)

  if (error) return { error: error.message }
  revalidateExperienceCalendarPaths(experienceId)
  return { ok: true }
}

export async function unpublishExperience(
  experienceId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }

  try {
    await requireExperienceOwner(supabase, experienceId, session.user.id)
  } catch {
    return { error: "Ingen adgang" }
  }

  const { error } = await supabase
    .from("experiences")
    .update({ published: false })
    .eq("id", experienceId)
    .eq("provider_id", session.user.id)

  if (error) return { error: error.message }
  revalidateExperienceCalendarPaths(experienceId)
  return { ok: true }
}

export async function deleteExperience(
  experienceId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }

  try {
    await requireExperienceOwner(supabase, experienceId, session.user.id)
  } catch {
    return { error: "Ingen adgang" }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("experiences")
    .update({ deleted_at: now })
    .eq("id", experienceId)
    .eq("provider_id", session.user.id)
    .is("deleted_at", null)

  if (error) return { error: error.message }
  revalidateExperienceCalendarPaths(experienceId)
  return { ok: true }
}
