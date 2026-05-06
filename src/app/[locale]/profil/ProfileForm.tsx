"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState, useTransition, useRef } from "react"
import { isValidPhoneNumber } from "libphonenumber-js/min"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { toast } from "sonner"
import { MapPin, User, Home, Users, Star, Loader2 } from "lucide-react"
import { useTranslations, useFormatter } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  GREENLAND_LOCATIONS,
  findLocationById,
  locationToId,
  type GreenlandLocation,
} from "@/lib/greenlandLocations"
import { changeEmail, updateProfile } from "./actions"
import AvatarUpload from "@/components/profile/AvatarUpload"
import StripeConnectSection from "@/components/profile/StripeConnectSection"
import { captureEvent } from "@/lib/analytics/posthog-events"

export type ProfileInitial = {
  full_name: string
  location_id: string | null
  language: "da" | "en" | "kl"
  role_type: "traveler" | "provider" | "both"
  avatar_url: string | null
  bio: string
  phone: string
}

export type ProfileReview = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: { full_name: string } | null
}

const LANG_OPTIONS: { value: ProfileInitial["language"]; label: string }[] = [
  { value: "da", label: "Dansk" },
  { value: "en", label: "English" },
  { value: "kl", label: "Kalaallisut" },
]

const inputClass =
  "bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-lg focus-visible:ring-[#4A9CC7]"

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-gray-700">
      {children} <span className="text-red-500">*</span>
    </span>
  )
}

const MAJOR_HUBS: GreenlandLocation[] = [...GREENLAND_LOCATIONS]
  .filter((l) => l.is_major_hub)
  .sort((a, b) => a.name_dk.localeCompare(b.name_dk, "da"))

const OTHER_PLACES: GreenlandLocation[] = [...GREENLAND_LOCATIONS]
  .filter((l) => !l.is_major_hub)
  .sort((a, b) => a.name_dk.localeCompare(b.name_dk, "da"))

function StarRow({ rating, ariaLabel }: { rating: number; ariaLabel: string }) {
  return (
    <div className="flex gap-0.5" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "w-4 h-4",
            n <= rating ? "text-yellow-400" : "text-gray-200",
          )}
          fill={n <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  )
}

function LocationSelectItems({ locations }: { locations: GreenlandLocation[] }) {
  return (
    <>
      {locations.map((loc) => {
        const id = locationToId(loc)
        return (
          <SelectItem key={id} value={id}>
            {loc.name_dk} ({loc.postal_code})
          </SelectItem>
        )
      })}
    </>
  )
}

type Props = {
  initial: ProfileInitial
  reviews: ProfileReview[]
  avgRating: number | null
  /** Nuværende auth-e-mail — redigering sker via changeEmail, ikke updateProfile */
  email: string
  /** Kun for udbyder/begge — fra DB; null = vis ikke Stripe */
  stripeConnect: {
    stripeAccountId: string | null
    stripeOnboardingComplete: boolean
  } | null
}

export default function ProfileForm({
  initial,
  reviews,
  avgRating,
  email,
  stripeConnect,
}: Props) {
  const t = useTranslations("profile")
  const formatter = useFormatter()
  const [isPending, startTransition] = useTransition()
  const [isEmailPending, startEmailTransition] = useTransition()
  const [locationId, setLocationId] = useState(
    initial.location_id ?? "__none__",
  )
  const [language, setLanguage] = useState<ProfileInitial["language"]>(
    initial.language,
  )
  const [fullName, setFullName] = useState(initial.full_name)
  const [bio, setBio] = useState(initial.bio)
  const [phone, setPhone] = useState(initial.phone)
  const [roleType, setRoleType] = useState<ProfileInitial["role_type"]>(
    initial.role_type,
  )
  const [emailEdit, setEmailEdit] = useState(email)

  const fieldSnapshot = useRef({
    fullName: initial.full_name,
    locationId: initial.location_id ?? "__none__",
    language: initial.language as string,
    bio: initial.bio,
    phone: initial.phone,
    roleType: initial.role_type as string,
  })

  useEffect(() => {
    setEmailEdit(email)
  }, [email])

  const locationLine = useMemo(() => {
    if (locationId === "__none__") return null
    const loc = findLocationById(locationId)
    if (!loc) return null
    return `${loc.name_dk} (${loc.postal_code})`
  }, [locationId])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (locationId === "__none__") {
      toast.error(t("select_location_error"))
      return
    }
    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error(t("invalid_phone"))
      return
    }
    const fd = new FormData()
    fd.set("full_name", fullName.trim())
    fd.set("location_id", locationId)
    fd.set("language", language)
    fd.set("role_type", roleType)
    fd.set("bio", bio)
    fd.set("phone", phone)
    startTransition(async () => {
      const r = await updateProfile(fd)
      if ("error" in r) {
        toast.error(r.error)
        return
      }
      const changed: string[] = []
      const snap = fieldSnapshot.current
      if (fullName.trim() !== snap.fullName) changed.push("full_name")
      if (locationId !== snap.locationId) changed.push("location_id")
      if (language !== snap.language) changed.push("language")
      if (bio !== snap.bio) changed.push("bio")
      if (phone !== snap.phone) changed.push("phone")
      if (roleType !== snap.roleType) changed.push("role_type")
      fieldSnapshot.current = {
        fullName: fullName.trim(),
        locationId,
        language,
        bio,
        phone,
        roleType,
      }
      if (changed.length > 0) {
        captureEvent("profile_updated", { fields_changed: changed })
      }
      toast.success(t("save_success"))
    })
  }

  function handleChangeEmail() {
    startEmailTransition(async () => {
      const r = await changeEmail(emailEdit)
      if ("error" in r) {
        toast.error(r.error)
        return
      }
      toast.success(t("email_change_sent_inbox"))
    })
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 pb-12">
      <h1
        className="text-2xl font-bold text-center text-gray-900 mb-6"
        style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
      >
        {t("my_profile")}
      </h1>

      {/* Profilhoved */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-row gap-4 sm:gap-6">
          <div className="flex flex-col items-center shrink-0">
            <AvatarUpload
              fullName={fullName}
              initialAvatarUrl={initial.avatar_url}
              sizePx={80}
              showHelpText={false}
            />
            <p className="text-xs text-gray-500 mt-2 text-center">{t("change_avatar")}</p>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xl font-semibold text-gray-900 truncate">
              {fullName.trim() || "—"}
            </p>
            {locationLine && (
              <p className="text-sm text-gray-500 flex items-start gap-1.5">
                <MapPin
                  className="w-4 h-4 shrink-0 mt-0.5 text-gray-400"
                  aria-hidden
                />
                <span>{locationLine}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {roleType === "traveler" && (
                <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                  {t("role_traveler")}
                </span>
              )}
              {roleType === "provider" && (
                <span
                  className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: "#4A9CC7" }}
                >
                  {t("role_provider")}
                </span>
              )}
              {roleType === "both" && (
                <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
                  {t("role_both_badge")}
                </span>
              )}

              {avgRating != null && reviews.length > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                  <span aria-hidden>⭐</span>
                  <span className="font-medium tabular-nums">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-gray-500">
                    ({t("ratings_count", { count: reviews.length })})
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="full_name" className="block">
                <RequiredLabel>{t("full_name")}</RequiredLabel>
              </label>
              <Input
                id="full_name"
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={120}
                autoComplete="name"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <div>
                <RequiredLabel>{t("location")}</RequiredLabel>
              </div>
              <Select value={locationId} onValueChange={setLocationId} required>
                <SelectTrigger
                  className={`w-full h-11 ${inputClass} data-[placeholder]:text-gray-400`}
                >
                  <SelectValue placeholder={t("select_location")} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none__">{t("no_location")}</SelectItem>
                  <SelectGroup>
                    <SelectLabel className="text-xs font-normal text-gray-500">
                      {t("major_cities")}
                    </SelectLabel>
                    <LocationSelectItems locations={MAJOR_HUBS} />
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="text-xs font-normal text-gray-500">
                      {t("other_places")}
                    </SelectLabel>
                    <LocationSelectItems locations={OTHER_PLACES} />
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-0">
              <label htmlFor="phone" className="block">
                <RequiredLabel>{t("phone")}</RequiredLabel>
              </label>
              <PhoneInput
                defaultCountry="GL"
                value={phone || undefined}
                onChange={(val) => setPhone(val ?? "")}
                international
                countryCallingCodeEditable={false}
                className="w-full"
                numberInputProps={{
                  id: "phone",
                  name: "phone",
                  autoComplete: "tel",
                  "aria-required": true,
                }}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="profile_email" className="block">
                <RequiredLabel>{t("email")}</RequiredLabel>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                <Input
                  id="profile_email"
                  type="email"
                  value={emailEdit}
                  onChange={(e) => setEmailEdit(e.target.value)}
                  autoComplete="email"
                  required
                  className={cn(inputClass, "min-w-0 flex-1 h-10")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-10 sm:px-3 w-full sm:w-auto"
                  disabled={isEmailPending}
                  onClick={handleChangeEmail}
                >
                  {isEmailPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" aria-hidden />
                      {t("saving_profile")}
                    </>
                  ) : (
                    t("change_email")
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {t("email_change_hint")}
              </p>
            </div>

            <div className="space-y-1.5 sm:max-w-md">
              <span className="text-sm font-medium text-gray-800">{t("display_language")}</span>
              <Select
                value={language}
                onValueChange={(v) =>
                  setLanguage(v as ProfileInitial["language"])
                }
              >
                <SelectTrigger className={`h-11 ${inputClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANG_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="bio" className="text-sm font-medium text-gray-800">
                {t("about_me")}
              </label>
              <textarea
                id="bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={t("bio_placeholder")}
                className={`w-full min-h-[4.5rem] px-3 py-2 text-sm ${inputClass} resize-y`}
              />
            </div>
          </div>

          <hr className="w-full border-0 border-t border-gray-100 my-2" />

          <h2 className="font-semibold text-gray-900">{t("i_am")}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t("role_select_hint")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <button
              type="button"
              onClick={() => setRoleType("traveler")}
              className={cn(
                "text-left rounded-xl p-4 cursor-pointer transition-colors",
                roleType === "traveler"
                  ? "border-2 border-[#4A9CC7] bg-blue-50/50"
                  : "border border-gray-200 hover:border-gray-300",
              )}
            >
              <User
                className="w-6 h-6 mb-2 text-gray-700"
                strokeWidth={1.75}
              />
              <p className="font-semibold text-gray-900">{t("role_traveler")}</p>
              <p className="text-sm text-gray-500 mt-1">
                {t("role_traveler_desc")}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRoleType("provider")}
              className={cn(
                "text-left rounded-xl p-4 cursor-pointer transition-colors",
                roleType === "provider"
                  ? "border-2 border-[#4A9CC7] bg-blue-50/50"
                  : "border border-gray-200 hover:border-gray-300",
              )}
            >
              <Home
                className="w-6 h-6 mb-2 text-gray-700"
                strokeWidth={1.75}
              />
              <p className="font-semibold text-gray-900">{t("role_provider")}</p>
              <p className="text-sm text-gray-500 mt-1">
                {t("role_provider_desc")}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRoleType("both")}
              className={cn(
                "text-left rounded-xl p-4 cursor-pointer transition-colors",
                roleType === "both"
                  ? "border-2 border-[#4A9CC7] bg-blue-50/50"
                  : "border border-gray-200 hover:border-gray-300",
              )}
            >
              <Users
                className="w-6 h-6 mb-2 text-gray-700"
                strokeWidth={1.75}
              />
              <p className="font-semibold text-gray-900">{t("role_both_short")}</p>
              <p className="text-sm text-gray-500 mt-1">
                {t("role_both_desc")}
              </p>
            </button>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full mt-6 h-12 rounded-lg font-semibold text-white border-0 hover:opacity-95"
            style={{ backgroundColor: "#4A9CC7" }}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                {t("saving_profile")}
              </>
            ) : (
              `✓ ${t("save_profile")}`
            )}
          </Button>
        </div>
      </form>

      {stripeConnect && (
        <StripeConnectSection
          stripeAccountId={stripeConnect.stripeAccountId}
          stripeOnboardingComplete={stripeConnect.stripeOnboardingComplete}
        />
      )}

      {/* Anmeldelser */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-4">
        <div className="flex flex-row flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-gray-900">{t("reviews")}</h2>
          {avgRating != null && reviews.length > 0 && (
            <p className="text-sm text-gray-500">
              <span aria-hidden>⭐</span>{" "}
              <span className="tabular-nums font-medium text-gray-700">
                {avgRating.toFixed(1)}
              </span>{" "}
              {t("average_rating")}
            </p>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-gray-400 text-sm mt-3">
            {t("no_reviews_own")}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 mt-2">
            {reviews.map((rev) => (
              <li key={rev.id} className="py-3 first:pt-0">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRow
                      rating={rev.rating}
                      ariaLabel={t("stars_aria", { rating: rev.rating })}
                    />
                    <time
                      className="text-xs text-gray-400 tabular-nums"
                      dateTime={rev.created_at}
                    >
                      {formatter.dateTime(new Date(rev.created_at), {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {rev.reviewer?.full_name?.trim() || t("role_guest")}
                  </p>
                  {rev.comment && (
                    <p className="text-sm text-gray-600 mt-1">{rev.comment}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
