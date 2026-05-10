import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { buildMetadata } from "@/lib/metadata"
import { ArrowLeft } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { StayOffersClient, type StayOfferRow } from "@/components/stays/StayOffersClient"

type PageProps = { params: Promise<{ locale: string; id: string }> }

function unwrapNested<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: "dashboard" })
  return buildMetadata({
    locale,
    title: t("stay_offers_page_title"),
    description: t("stay_offers_page_subtitle"),
    path: `/dashboard/mine-oensker/${id}`,
  })
}

export const dynamic = "force-dynamic"

export default async function MineOenskerDetailPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/mine-oensker/${id}`)}`,
    )
  }

  const navUser = await getNavUserForPage(supabase, user)
  const t = await getTranslations({ locale, namespace: "dashboard" })

  const { data: stay, error: stayErr } = await supabase
    .from("stay_requests")
    .select(
      "id, location, desired_check_in, desired_check_out, num_guests, max_price_ore, description, property_type, needs_transport, status, guest_id",
    )
    .eq("id", id)
    .maybeSingle()

  if (stayErr || !stay || stay.guest_id !== user.id) {
    notFound()
  }

  const { data: offerRows, error: offErr } = await supabase
    .from("stay_offers")
    .select(
      `
      id,
      offered_price_ore,
      transport_price_ore,
      message,
      status,
      created_at,
      decline_reason,
      cabins ( id, title, images, price_per_night_ore, location_hub, property_type ),
      profiles!provider_id ( id, full_name, avatar_url )
    `,
    )
    .eq("stay_request_id", id)
    .order("created_at", { ascending: false })

  if (offErr) {
    notFound()
  }

  const offers: StayOfferRow[] = (offerRows ?? []).map((raw: Record<string, unknown>) => {
    const cabinsRaw = raw.cabins
    const profilesRaw = raw.profiles
    return {
      id:                  raw.id as string,
      offered_price_ore:   raw.offered_price_ore as number,
      transport_price_ore: Math.max(0, Number(raw.transport_price_ore) || 0),
      message:             (raw.message as string | null) ?? null,
      status:              raw.status as string,
      created_at:          raw.created_at as string,
      decline_reason:      (raw.decline_reason as string | null) ?? null,
      cabins:            unwrapNested(cabinsRaw) as StayOfferRow["cabins"],
      profiles:          unwrapNested(profilesRaw) as StayOfferRow["profiles"],
    }
  })

  return (
    <>
      <Navbar user={navUser} />
      <main className="min-h-screen bg-gray-50 pb-16 pt-24">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <Link
            href="/dashboard?tab=requests"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("stay_offer_back")}
          </Link>
          <p className="text-sm text-muted-foreground mb-1">{t("stay_offers_page_subtitle")}</p>
          <h1 className="text-2xl font-bold text-foreground mb-8">{t("stay_offers_page_title")}</h1>
          <StayOffersClient
            stayRequest={{
              id:               stay.id,
              location:         stay.location,
              desired_check_in: stay.desired_check_in,
              desired_check_out: stay.desired_check_out,
              num_guests:       stay.num_guests,
              max_price_ore:    stay.max_price_ore,
              description:      stay.description,
              property_type:    String(stay.property_type ?? "any"),
              needs_transport:  Boolean(stay.needs_transport),
              status:           stay.status,
            }}
            offers={offers}
          />
        </div>
      </main>
    </>
  )
}
