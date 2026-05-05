import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { ArrowRight, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import { getNavUserForPage } from "@/lib/getNavUser"
import CabinCard, { type CabinCardData } from "@/components/cabins/CabinCard"
import TransportCard, { type RideShareCardData } from "@/app/[locale]/transport/components/TransportCard"
import { buildMetadata } from "@/lib/metadata"
import { JsonLd } from "@/components/seo/JsonLd"
import { DESTINATIONS, DESTINATION_SLUGS } from "@/lib/destinations"
import { getDestination } from "@/lib/sanity.queries"
import { sanityImage } from "@/lib/sanity"
import Image from "next/image"

export const revalidate = 3600

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export function generateStaticParams() {
  return DESTINATION_SLUGS.flatMap((slug) =>
    (["da", "en"] as const).map((locale) => ({ locale, slug }))
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const [dest, sanityDest] = await Promise.all([
    Promise.resolve(DESTINATIONS[slug]),
    getDestination(slug),
  ])
  if (!dest) return { title: "Sila.gl" }

  const name =
    sanityDest?.[`seoTitle_${locale}`] ??
    sanityDest?.seoTitle_da ??
    (locale === "da" ? dest.name_da : dest.name_en)
  const description =
    sanityDest?.[`seoDescription_${locale}`] ??
    sanityDest?.seoDescription_da ??
    (locale === "da" ? dest.description_da : dest.description_en)
  const heroImgUrl = sanityDest?.heroImage
    ? sanityImage(sanityDest.heroImage).width(1200).height(630).url()
    : undefined

  return buildMetadata({ locale, title: name, description, path: `/destination/${slug}`, image: heroImgUrl })
}

export default async function DestinationPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const dest = DESTINATIONS[slug]
  if (!dest) notFound()

  const [t, sanityDest] = await Promise.all([
    getTranslations({ locale, namespace: "destination" }),
    getDestination(slug),
  ])

  // Sanity-beskrivelse overstyrer destinations.ts, men sider går aldrig ned ved fejl
  const name = locale === "da" ? dest.name_da : dest.name_en
  const description =
    sanityDest?.[`description_${locale}`] ??
    sanityDest?.description_da ??
    (locale === "da" ? dest.description_da : dest.description_en)
  const heroImgUrl = sanityDest?.heroImage
    ? sanityImage(sanityDest.heroImage).width(1200).height(600).url()
    : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const [cabinsRes, ridesRes] = await Promise.all([
    supabase
      .from("cabins")
      .select(
        "id, title, location_hub, price_per_night_ore, max_guests, instant_book, offers_transport, images, amenities, profiles!owner_id(full_name)"
      )
      .ilike("location_hub", `%${slug}%`)
      .eq("published", true)
      .is("deleted_at", null)
      .limit(6),
    supabase
      .from("ride_shares")
      .select(
        `id, sejler_id:skipper_id, from_location, to_location, departure_at,
         seats_available, total_seats, price_per_seat_ore,
         boat_description, description, status, return_ride_share_id,
         from_latitude, from_longitude, to_latitude, to_longitude,
         profiles!skipper_id(full_name, avatar_url)`
      )
      .or(`from_location.ilike.${slug},to_location.ilike.${slug}`)
      .in("status", ["active", "full"])
      .order("departure_at", { ascending: true })
      .limit(6),
  ])

  const cabins = (cabinsRes.data ?? []) as unknown as (Omit<CabinCardData, "host_name"> & {
    profiles: { full_name: string | null } | null
  })[]

  const rides = (ridesRes.data ?? []) as unknown as RideShareCardData[]

  const destinationSchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: dest.name_da,
    description: dest.description_da,
    url: `https://sila.gl/${locale}/destination/${slug}`,
    touristType: "Adventure",
  }

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <JsonLd data={destinationSchema} />
      <Navbar user={navUser} />

      {/* Hero */}
      {heroImgUrl && (
        <div className="relative w-full h-56 sm:h-72 overflow-hidden">
          <Image src={heroImgUrl} alt={name} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      <section className={`${heroImgUrl ? "pt-10" : "pt-28"} pb-12 px-4 sm:px-6 max-w-5xl mx-auto`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4" />
          <span>Grønland</span>
          <span>/</span>
          <span className="text-foreground font-medium">{name}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("explore", { name })}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">{description}</p>
      </section>

      {/* Hytter */}
      <section className="px-4 sm:px-6 pb-12 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-foreground mb-5">
          {t("cabins_title", { name })}
        </h2>
        {cabins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground mb-4">{t("no_cabins", { name })}</p>
            <Link
              href="/anmod"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t("request_cta", { name })} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cabins.map((cabin) => (
              <CabinCard
                key={cabin.id}
                cabin={{
                  ...cabin,
                  host_name: cabin.profiles?.full_name ?? null,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sejladsture */}
      <section className="px-4 sm:px-6 pb-16 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-foreground mb-5">
          {t("transport_title", { name })}
        </h2>
        {rides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground mb-4">{t("no_transport", { name })}</p>
            <Link
              href="/transport"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t("transport_title", { name })} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rides.map((ride) => (
              <TransportCard key={ride.id} rideShare={ride} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
