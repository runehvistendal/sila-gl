import { redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import ProfileForm, {
  type ProfileInitial,
  type ProfileReview,
} from "./ProfileForm"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "profile" })
  return { title: t("meta_title") }
}

export default async function ProfilPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=%2Fprofil")
  }

  const [{ data: profile, error: profileError }, { data: sensitiveRaw }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, role_type, location_id, language, location, avatar_url, bio")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("get_my_sensitive_profile"),
    ])

  const sensitive = sensitiveRaw as {
    phone?: string | null
    stripe_account_id?: string | null
    stripe_onboarding_complete?: boolean | null
  } | null

  if (profileError) {
    console.error("[profil]", profileError)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <p className="text-center text-red-600 text-sm max-w-md">
          Kunne ikke hente profil ({profileError.message}). Kør{" "}
          <code className="text-gray-800">supabase db push</code> hvis relevante
          migrationer mangler.
        </p>
      </main>
    )
  }

  if (!profile) {
    redirect("/login?next=%2Fprofil")
  }

  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, created_at, reviewer:profiles!reviewer_id(full_name)",
    )
    .eq("reviewee_id", user.id)
    .not("published_at", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10)

  const reviews: ProfileReview[] = (reviewsRaw ?? []).map((row) => {
    const r = row as {
      id: string
      rating: number
      comment: string | null
      created_at: string
      reviewer: { full_name: string } | { full_name: string }[] | null
    }
    const rev = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: rev ? { full_name: rev.full_name } : null,
    }
  })

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  const roleRaw = (profile as { role_type?: string }).role_type ?? "traveler"
  const roleType: ProfileInitial["role_type"] =
    roleRaw === "provider" || roleRaw === "both" || roleRaw === "traveler"
      ? roleRaw
      : "traveler"

  const langs = (profile as { languages?: string[] | null }).languages
  const langRaw = (profile as { language?: string | null }).language
  let language: ProfileInitial["language"] = "da"
  if (langRaw === "en" || langRaw === "kl" || langRaw === "da") {
    language = langRaw
  } else {
    const first = langs?.[0]
    if (first === "en" || first === "kl" || first === "da") language = first
  }

  const locId = (profile as { location_id?: string | null }).location_id ?? null

  const initial: ProfileInitial = {
    full_name: (profile as { full_name: string }).full_name ?? "Sila-bruger",
    location_id: locId,
    language,
    role_type: roleType,
    avatar_url: (profile as { avatar_url?: string | null }).avatar_url ?? null,
    bio: (profile as { bio?: string | null }).bio?.trim() ?? "",
    phone: sensitive?.phone?.trim() ?? "",
  }

  const navUser = await getNavUserForPage(supabase, user)

  const showStripeConnect =
    roleType === "provider" || roleType === "both"
  const stripeConnect = showStripeConnect
    ? {
        stripeAccountId: sensitive?.stripe_account_id ?? null,
        stripeOnboardingComplete: Boolean(
          sensitive?.stripe_onboarding_complete,
        ),
      }
    : null

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Navbar user={navUser} />
      <div className="flex-1 pt-20 pb-16">
        <ProfileForm
          initial={initial}
          reviews={reviews}
          avgRating={avgRating}
          email={user.email ?? ""}
          stripeConnect={stripeConnect}
        />
      </div>
    </main>
  )
}
