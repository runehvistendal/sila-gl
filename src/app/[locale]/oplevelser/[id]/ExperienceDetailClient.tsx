"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { User } from "lucide-react"
import { EXPERIENCE_CATEGORIES } from "@/lib/experienceCategories"
import ExperienceBookingWidget from "./ExperienceBookingWidget"

export type ExperienceCategoryRow = {
  key: string
  description: string
}

export type ExperiencePublicDetail = {
  id: string
  title: string
  description: string | null
  images: string[]
  location_hub: string
  price_per_person_ore: number
  max_participants: number
  duration_minutes: number | null
  categories: ExperienceCategoryRow[]
  provider_id: string
  host_name: string | null
  host_avatar_url: string | null
}

type Props = {
  experience: ExperiencePublicDetail
  isLoggedIn: boolean
  loginNextPath: string
  disabledYmd: string[]
  capacityByDate: Record<string, number>
}

function categoryDisplayLabel(key: string): string {
  const hit = EXPERIENCE_CATEGORIES.find((c) => c.key === key)
  return hit?.label ?? key
}

export default function ExperienceDetailClient({
  experience,
  isLoggedIn,
  loginNextPath,
  disabledYmd,
  capacityByDate,
}: Props) {
  const tCab = useTranslations("cabinDetail")
  const tExp = useTranslations("experienceDetail")

  const bookingWidget = (
    <ExperienceBookingWidget
      experienceId={experience.id}
      pricePerPersonOre={experience.price_per_person_ore}
      maxParticipants={experience.max_participants}
      durationMinutes={experience.duration_minutes}
      isLoggedIn={isLoggedIn}
      loginNextPath={loginNextPath}
      disabledYmd={disabledYmd}
      capacityByDate={capacityByDate}
    />
  )

  const categoriesResolved = useMemo(() => {
    return experience.categories.filter((c) => c.key.trim() !== "")
  }, [experience.categories])

  const leftInner = (
    <>
      <div>
        <h2 className="text-xl font-bold text-foreground mb-3">{tExp("about")}</h2>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
          {experience.description?.trim() || tCab("no_description")}
        </p>
      </div>

      {categoriesResolved.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-foreground">{tExp("categories_heading")}</h2>
          <div className="space-y-5">
            {categoriesResolved.map((c, idx) => (
              <div key={`${c.key}-${idx}`} className="space-y-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-[#114788]/30 bg-[#114788]/10 text-[#114788]">
                  {categoryDisplayLabel(c.key)}
                </span>
                {c.description.trim() !== "" ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {c.description.trim()}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {experience.host_name ? (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">{tCab("host")}</h2>
          <Link
            href={`/profil/${experience.provider_id}`}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border hover:border-primary/30 hover:shadow-card transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {experience.host_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={experience.host_avatar_url}
                  alt={experience.host_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{experience.host_name}</p>
              <p className="text-sm text-primary">{tCab("see_profile")}</p>
            </div>
          </Link>
        </div>
      ) : null}
    </>
  )

  return (
    <div className="mt-6 lg:mt-10">
      {/* ── DESKTOP ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_384px] lg:gap-12 lg:items-start">
        <div className="space-y-8">{leftInner}</div>
        <div className="sticky top-24">{bookingWidget}</div>
      </div>

      {/* ── MOBILE: widget først ── */}
      <div className="lg:hidden space-y-8">
        {bookingWidget}
        <div className="space-y-8">{leftInner}</div>
      </div>
    </div>
  )
}
