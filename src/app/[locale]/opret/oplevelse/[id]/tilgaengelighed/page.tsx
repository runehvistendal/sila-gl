import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import ExperienceAvailabilityCalendar from "./ExperienceAvailabilityCalendar"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return { title: "Tilgængelighed — oplevelse — Sila.gl" }
}

export default async function OplevelseTilgaengelighedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const { id: experienceId } = await params
  void searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const navUser = await getNavUserForPage(supabase, user)
  const t = await getTranslations("create")

  const { data: exp } = await supabase
    .from("experiences")
    .select(
      "id, title, published, max_participants, duration_minutes, preparation_days",
    )
    .eq("id", experienceId)
    .eq("provider_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!exp) {
    redirect("/dashboard")
  }

  const experienceRow = exp as {
    id: string
    title: string
    published: boolean
    max_participants: number
    duration_minutes: number | null
    preparation_days: number | null
  }

  const { data: availabilityRows } = await supabase
    .from("experience_availability")
    .select("date")
    .eq("experience_id", experienceId)
    .eq("is_available", false)

  const today = new Date().toISOString().split("T")[0]

  const { data: confirmedRows } = await supabase
    .from("experience_bookings")
    .select("date")
    .eq("experience_id", experienceId)
    .eq("status", "confirmed")
    .gte("date", today)

  const bookedDates = [...new Set((confirmedRows ?? []).map((r) => String(r.date).slice(0, 10)))]

  const initialBlocked = (availabilityRows ?? []).map((r) => String(r.date).slice(0, 10))

  const preparationDays = experienceRow.preparation_days ?? 0

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-2xl px-4 pt-20 pb-20">
        <div className="mb-8">
          {!experienceRow.published && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t("step_2_of_2")}
            </p>
          )}
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {t("manage_availability_title")}
          </h1>
          <p className="text-sm font-medium text-foreground mb-6">{experienceRow.title}</p>

          <div className="rounded-xl border border-[#4A9CC7]/30 bg-[#4A9CC7]/8 px-4 py-4 text-sm text-[#1a5f7a]">
            <p className="font-semibold mb-1">{t("availability_default_info")}</p>
            <p>{t("availability_click_info")}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <ExperienceAvailabilityCalendar
            experienceId={experienceId}
            initialBlocked={initialBlocked}
            bookedDates={bookedDates}
            initialMaxParticipants={experienceRow.max_participants}
            initialDurationMinutes={experienceRow.duration_minutes}
            initialPreparationDays={preparationDays}
            showPublishButton={!experienceRow.published}
          />
        </div>
      </div>
    </main>
  )
}
