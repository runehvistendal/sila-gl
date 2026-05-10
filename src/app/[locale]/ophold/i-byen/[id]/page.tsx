import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { ChevronLeft, MapPin, Users, User, AlertTriangle } from "lucide-react"
import { addDays, format, parseISO } from "date-fns"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { AMENITY_META } from "@/lib/amenityMeta"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import { nightsFromBookings } from "@/lib/cabinBookingDates"
import Navbar from "@/components/layout/Navbar"
import { buildMetadata } from "@/lib/metadata"
import { JsonLd } from "@/components/seo/JsonLd"
import { oreToKr, formatKr, calcDisplayPrice } from "@/lib/money"
import ListingImageGallery from "@/components/cabins/ListingImageGallery"
import CabinReviews from "@/components/cabins/CabinReviews"
import CabinDetailLayout from "@/components/cabins/CabinDetailLayout"
import TransferRoutesDisplay from "@/components/cabins/TransferRoutesDisplay"
import { CabinViewTracker } from "@/components/analytics/CabinViewTracker"
import { getLocationName } from "@/lib/greenlandLocations"
import type { TransferRoute } from "@/types/transfer"

export type ResidenceDetailData = {
  id: string
  title: string
  description: string
  location_hub: string
  max_guests: number
  bedrooms: number
  bathrooms: number
  residence_subtype: string | null
  location_subtype: string | null
  price_per_night_ore: number
  cleaning_fee_ore: number
  amenities: string[]
  images: string[]
  instant_book: boolean
  offers_transport: boolean
  transport_price_per_person_ore: number | null
  access_type: string
  owner_id: string
  min_nights: number
  preparation_days: number
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
  const { id, locale } = await params
  const supabase = await createClient()
  const { data: cabin } = await supabase
    .from("cabins")
    .select("title, description, images, property_type")
    .eq("id", id)
    .eq("published", true)
    .eq("property_type", "residence")
    .is("deleted_at", null)
    .single()

  if (!cabin) return { title: "Sila.gl" }

  return buildMetadata({
    locale,
    title: cabin.title,
    description: cabin.description ?? "",
    path: `/ophold/i-byen/${id}`,
    image: (cabin.images as string[] | null)?.[0],
  })
}

export default async function ResidenceDetailPage({
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

  const { data: cabinRaw, error: cabinError } = await supabase
    .from("cabins")
    .select(
      `
      id, title, description, location_hub,
      max_guests, bedrooms, bathrooms,
      residence_subtype, location_subtype,
      price_per_night_ore, cleaning_fee_ore,
      amenities, images,
      instant_book, offers_transport, transport_price_per_person_ore,
      access_type, owner_id, min_nights, preparation_days,
      profiles!owner_id ( full_name, avatar_url )
    `,
    )
    .eq("id", id)
    .eq("published", true)
    .eq("property_type", "residence")
    .is("deleted_at", null)
    .single()

  if (cabinError || !cabinRaw) notFound()

  const cabin = cabinRaw as unknown as ResidenceDetailData

  const [{ data: occRows }, { data: blockRows }, { data: transferRouteRows }] = await Promise.all([
    supabase.rpc("get_cabin_occupancy", { p_cabin_id: id }),
    supabase
      .from("cabin_availability")
      .select("date")
      .eq("cabin_id", id)
      .eq("is_available", false)
      .is("deleted_at", null),
    supabase
      .from("transfer_routes")
      .select(
        "id, from_arrival_point, transport_type, price_one_way_ore, price_roundtrip_ore, max_guests, description, sort_order",
      )
      .eq("cabin_id", id)
      .order("sort_order", { ascending: true }),
  ])

  const transferRoutes: TransferRoute[] = (transferRouteRows ?? []).map((r) => ({
    id: r.id,
    from_arrival_point: r.from_arrival_point,
    transport_type: r.transport_type === "boat" ? "boat" : "car",
    price_one_way_ore: r.price_one_way_ore,
    price_roundtrip_ore: r.price_roundtrip_ore,
    max_guests: r.max_guests,
    description: r.description ?? "",
    sort_order: r.sort_order,
  }))

  const bookingRows = (occRows ?? []) as { check_in: string; check_out: string }[]
  const occupied = nightsFromBookings(bookingRows)

  const prepDays = cabin.preparation_days ?? 0
  if (prepDays > 0) {
    for (const b of bookingRows) {
      let cur = parseISO(b.check_out)
      for (let i = 0; i < prepDays; i++) {
        occupied.add(format(cur, "yyyy-MM-dd"))
        cur = addDays(cur, 1)
      }
    }
  }

  for (const r of blockRows ?? []) {
    const d = (r as { date: string }).date
    if (d) occupied.add(d.slice(0, 10))
  }
  const disabledYmd = Array.from(occupied).sort()

  const hostName = cabin.profiles?.full_name ?? null
  const hostAvatar = cabin.profiles?.avatar_url ?? null

  const lodgingSchema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: cabin.title,
    description: cabin.description,
    url: `https://sila.gl/${locale}/ophold/i-byen/${id}`,
    image: (cabin.images as string[])?.[0],
    address: {
      "@type": "PostalAddress",
      addressLocality: getLocationName(cabin.location_hub),
      addressCountry: "GL",
    },
    priceRange: `${oreToKr(calcDisplayPrice(cabin.price_per_night_ore))} DKK / nat (inkl. servicegebyr)`,
  }

  const tDetail = await getTranslations("residence.detail")

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <JsonLd data={lodgingSchema} />
      <Navbar user={navUser} />
      <CabinViewTracker
        cabinId={cabin.id}
        location={getLocationName(cabin.location_hub)}
        pricePerNightOre={cabin.price_per_night_ore}
        hasTransport={cabin.offers_transport}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <Link
          href="/ophold/i-byen"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {tDetail("back_to_list")}
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{cabin.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            {cabin.residence_subtype ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                {tDetail(`subtype_${cabin.residence_subtype}` as "subtype_house")}
              </span>
            ) : null}
            {cabin.location_subtype ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                {tDetail(`loc_${cabin.location_subtype}` as "loc_city")}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap mt-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {getLocationName(cabin.location_hub)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {tDetail("up_to_guests", { count: cabin.max_guests })}
            </span>
            <span className="text-muted-foreground">
              {cabin.bedrooms} {tDetail("bedrooms_short")} · {cabin.bathrooms} {tDetail("bathrooms_short")}
            </span>
            {cabin.instant_book && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Instant Book
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-lg font-bold text-foreground">
              {formatKr(calcDisplayPrice(cabin.price_per_night_ore))}
              <span className="text-sm font-normal text-muted-foreground">{tDetail("per_night")}</span>
            </p>
            <p className="text-xs text-muted-foreground">{tDetail("price_includes_service_fee")}</p>
          </div>
        </div>

        <ListingImageGallery images={cabin.images} title={cabin.title} cabinId={cabin.id} />

        <CabinDetailLayout
          bookingCabin={{
            id: cabin.id,
            max_guests: cabin.max_guests,
            price_per_night_ore: cabin.price_per_night_ore,
            offers_transport: cabin.offers_transport,
            transport_price_per_person_ore: cabin.transport_price_per_person_ore,
            min_nights: cabin.min_nights ?? 1,
            location_hub: cabin.location_hub,
            instant_book: cabin.instant_book,
            property_type: "residence",
          }}
          transportCabin={{
            id: cabin.id,
            location_hub: cabin.location_hub,
            offers_transport: false,
            transport_price_per_person_ore: null,
            profiles: cabin.profiles,
          }}
          transports={[]}
          transferRoutesContent={<TransferRoutesDisplay cabinId={cabin.id} />}
          transferRoutes={transferRoutes}
          isLoggedIn={!!user}
          loginNextPath={`/ophold/i-byen/${cabin.id}`}
          disabledYmd={disabledYmd}
          leftContent={
            <>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">{tDetail("about_title")}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {cabin.description || tDetail("no_description")}
                </p>
              </div>

              {cabin.amenities?.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-4">{tDetail("included_title")}</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {cabin.amenities.map((a, i) => {
                      const meta = AMENITY_META[a]
                      const Icon = meta?.icon ?? AlertTriangle
                      const label = meta?.label ?? a
                      return (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                          <Icon className="w-4 h-4 text-primary shrink-0" />
                          {label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {hostName && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-3">{tDetail("host_title")}</h2>
                  <Link
                    href={`/profil/${cabin.owner_id}`}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border hover:border-primary/30 hover:shadow-card transition-all"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {hostAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hostAvatar} alt={hostName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{hostName}</p>
                      <p className="text-sm text-primary">{tDetail("see_profile")}</p>
                    </div>
                  </Link>
                </div>
              )}

            </>
          }
          reviewsContent={
            <CabinReviews
              cabinId={cabin.id}
              ownerId={cabin.owner_id}
              currentUserId={user?.id ?? null}
            />
          }
        />
      </div>
    </main>
  )
}
