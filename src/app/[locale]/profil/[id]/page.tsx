import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { StarBar } from "@/components/cabins/CabinReviews"
import { Star, User } from "lucide-react"
import { format } from "date-fns"
import { da } from "date-fns/locale"

export const dynamic = "force-dynamic"

interface ReviewRow {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string | null } | null
}

export default async function PublicProfilPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "profile" })

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  // Fetch public profile info (sensitive fields excluded)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, bio, avatar_url, role_type, location, created_at")
    .eq("id", id)
    .maybeSingle()

  if (!profile) notFound()

  // Fetch published reviews where this user is the reviewee
  const { data: reviewsRaw } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, profiles!reviewer_id(full_name)")
    .eq("reviewee_id", id)
    .not("published_at", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50)

  const reviews = (reviewsRaw as unknown as ReviewRow[]) ?? []
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null

  const roleLabel =
    profile.role_type === "provider"
      ? t("role_provider")
      : profile.role_type === "both"
      ? t("role_guest_provider")
      : t("role_guest")

  const memberSince = format(
    new Date((profile as { created_at?: string }).created_at ?? Date.now()),
    "MMMM yyyy",
    { locale: da }
  )

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 space-y-8">
        {/* Profile header */}
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {(profile as { avatar_url?: string | null }).avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(profile as { avatar_url: string }).avatar_url}
                alt={profile.full_name ?? t("title")}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-primary/50" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">
              {profile.full_name ?? "Sila-bruger"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{roleLabel}</p>
            {(profile as { location?: string | null }).location && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {(profile as { location: string }).location}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t("member_since")} {memberSince}
            </p>
          </div>

          {avgRating !== null && (
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-foreground">{avgRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("reviews_count", { count: reviews.length })}
              </p>
            </div>
          )}
        </div>

        {/* Bio */}
        {(profile as { bio?: string | null }).bio && (
          <div className="bg-muted/40 rounded-2xl p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {(profile as { bio: string }).bio}
            </p>
          </div>
        )}

        {/* Reviews */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-foreground">{t("reviews")}</h2>
            {avgRating !== null && (
              <StarBar stars={avgRating} count={reviews.length} />
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-xl p-5 text-center">
              {t("no_reviews")}
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {r.profiles?.full_name ?? "Sila-gæst"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "d. MMM yyyy", { locale: da })}
                        </p>
                      </div>
                      <StarBar stars={r.rating} />
                      {r.comment && (
                        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
