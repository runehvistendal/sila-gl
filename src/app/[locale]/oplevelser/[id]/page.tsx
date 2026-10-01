import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { MapPin, Users } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { buildMetadata } from "@/lib/metadata"
import ListingImageGallery from "@/components/cabins/ListingImageGallery"
import { calcDisplayPrice, formatKr } from "@/lib/money"
import { getLocationName } from "@/lib/greenlandLocations"
import ExperienceDetailClient, {
  type ExperienceCategoryRow,
  type ExperiencePublicDetail,
} from "./ExperienceDetailClient"

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00.000Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function parseCategories(raw: unknown): ExperienceCategoryRow[] {
  if (!Array.isArray(raw)) return []
  const out: ExperienceCategoryRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const key = typeof rec.key === "string" ? rec.key.trim() : ""
    const description = typeof rec.description === "string" ? rec.description : ""
    if (!key) continue
    out.push({ key, description })
  }
  return out
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
  const { id, locale } = await params
  const supabase = await createClient()
  const { data: row } = await supabase
    .from("experiences")
    .select("title, description, images")
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle()

  if (!row) return { title: "Sila.gl" }

  const imgs = row.images as string[] | null

  return buildMetadata({
    locale,
    title: row.title,
    description: row.description ?? "",
    path: `/oplevelser/${id}`,
    image: imgs?.[0],
  })
}

export default async function OplevelseDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const tExp = await getTranslations({ locale, namespace: "experienceDetail" })

  const { data: raw, error } = await supabase
    .from("experiences")
    .select(
      `
      id, title, description, images, location_hub,
      price_per_person_ore, max_participants, duration_minutes,
      preparation_days, categories, provider_id, published, deleted_at
    `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !raw) notFound()

  const row = raw as {
    id: string
    title: string
    description: string | null
    images: string[] | null
    location_hub: string
    price_per_person_ore: number
    max_participants: number
    duration_minutes: number | null
    preparation_days: number | null
    categories: unknown
    provider_id: string
    published: boolean
    deleted_at: string | null
  }

  if (!row.published || row.deleted_at) notFound()

  const { data: hostProf } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", row.provider_id)
    .maybeSingle()

  const host = hostProf as { full_name: string | null; avatar_url: string | null } | null

  const experience: ExperiencePublicDetail = {
    id: row.id,
    title: row.title,
    description: row.description,
    images: row.images ?? [],
    location_hub: row.location_hub,
    price_per_person_ore: row.price_per_person_ore,
    max_participants: row.max_participants,
    duration_minutes: row.duration_minutes,
    categories: parseCategories(row.categories),
    provider_id: row.provider_id,
    host_name: host?.full_name ?? null,
    host_avatar_url: host?.avatar_url ?? null,
  }

  const today = new Date().toISOString().slice(0, 10)
  const prepDays = row.preparation_days ?? 0

  const [{ data: blockRows }, { data: bookRows }] = await Promise.all([
    supabase
      .from("experience_availability")
      .select("date")
      .eq("experience_id", id)
      .eq("is_available", false),
    supabase
      .from("experience_bookings")
      .select("date, num_participants")
      .eq("experience_id", id)
      .in("status", ["pending", "confirmed"])
      .gte("date", today),
  ])

  const disabled = new Set<string>()
  for (const r of blockRows ?? []) {
    disabled.add(String((r as { date: string }).date).slice(0, 10))
  }

  const capacityByDate: Record<string, number> = {}

  for (const r of bookRows ?? []) {
    const d = String((r as { date: string }).date).slice(0, 10)
    const n = Math.max(0, Math.floor(Number((r as { num_participants: number }).num_participants)))
    capacityByDate[d] = (capacityByDate[d] ?? 0) + n

    if (prepDays > 0) {
      for (let i = 1; i <= prepDays; i++) {
        disabled.add(addDaysYmd(d, i))
      }
    }
  }

  for (const [d, sum] of Object.entries(capacityByDate)) {
    if (sum >= row.max_participants) {
      disabled.add(d)
    }
  }

  const disabledYmd = [...disabled].sort()

  const loginNextPath = `/oplevelser/${id}`

  const guestPrice = formatKr(calcDisplayPrice(row.price_per_person_ore))

  return (
    <main
      className="min-h-screen bg-background"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <Navbar user={navUser} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{experience.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {getLocationName(experience.location_hub)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {tExp("max_participants_hint", { count: experience.max_participants })}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-lg font-bold text-foreground">{guestPrice}</p>
            <p className="text-xs text-muted-foreground">{tExp("price_includes_service_fee_short")}</p>
          </div>
        </div>

        <ListingImageGallery images={experience.images} title={experience.title} />

        <ExperienceDetailClient
          experience={experience}
          isLoggedIn={!!user}
          loginNextPath={loginNextPath}
          disabledYmd={disabledYmd}
          capacityByDate={capacityByDate}
        />
      </div>
    </main>
  )
}
