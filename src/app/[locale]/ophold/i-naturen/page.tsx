import type { Metadata } from "next"
import { Suspense } from "react"
import { ArrowRight } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { buildMetadata } from "@/lib/metadata"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import HytterClient from "@/app/[locale]/hytter/HytterClient"
import type { FilterValues } from "@/components/cabins/CabinFilters"
import type { CabinCardData } from "@/components/cabins/CabinCard"
import type { CabinMapPin } from "@/lib/cabinMapRoutes"

interface SearchParams {
  hub?: string
  guests?: string
  transport?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  search?: string
  checkIn?: string
  checkOut?: string
}

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidYmd(s?: string): s is string {
  return !!s && YMD_RE.test(s)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "ophold" })
  return buildMetadata({
    locale,
    title: t("nature.metaTitle"),
    description: t("nature.metaDescription"),
    path: "/ophold/i-naturen",
  })
}

export default async function OpholdNaturePage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const sp = await searchParams
  const { hub, guests, transport, minPrice, maxPrice, sort, search } = sp

  const checkIn = isValidYmd(sp.checkIn) ? sp.checkIn : undefined
  const checkOutRaw = isValidYmd(sp.checkOut) ? sp.checkOut : undefined
  const checkOut = checkIn && checkOutRaw && checkOutRaw > checkIn ? checkOutRaw : undefined

  let excludedCabinIds: string[] = []
  if (checkIn && checkOut) {
    const [{ data: blockedRows }, { data: bookedRows }] = await Promise.all([
      supabase
        .from("cabin_availability")
        .select("cabin_id")
        .eq("is_available", false)
        .is("deleted_at", null)
        .gte("date", checkIn)
        .lt("date", checkOut),
      supabase
        .from("cabin_bookings")
        .select("cabin_id")
        .eq("status", "confirmed")
        .is("deleted_at", null)
        .lt("check_in", checkOut)
        .gt("check_out", checkIn),
    ])

    const ids = new Set<string>()
    for (const r of blockedRows ?? []) {
      if (r.cabin_id) ids.add(r.cabin_id as string)
    }
    for (const r of bookedRows ?? []) {
      if (r.cabin_id) ids.add(r.cabin_id as string)
    }
    excludedCabinIds = Array.from(ids)
  }

  let query = supabase
    .from("cabins")
    .select(
      `
      id,
      title,
      location_hub,
      price_per_night_ore,
      max_guests,
      instant_book,
      offers_transport,
      images,
      amenities,
      owner_id,
      profiles!owner_id ( full_name )
    `,
    )
    .eq("property_type", "cabin")
    .eq("published", true)
    .is("deleted_at", null)

  if (hub) query = query.eq("location_hub", hub)
  if (guests) query = query.gte("max_guests", Number(guests))
  if (transport === "true") query = query.eq("offers_transport", true)
  if (minPrice) query = query.gte("price_per_night_ore", Math.round(Number(minPrice) * 100))
  if (maxPrice) query = query.lte("price_per_night_ore", Math.round(Number(maxPrice) * 100))
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }
  if (excludedCabinIds.length > 0) {
    query = query.not("id", "in", `(${excludedCabinIds.join(",")})`)
  }

  if (sort === "price_asc") {
    query = query.order("price_per_night_ore", { ascending: true })
  } else if (sort === "price_desc") {
    query = query.order("price_per_night_ore", { ascending: false })
  } else {
    query = query
      .order("instant_book", { ascending: false })
      .order("created_at", { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.error("[ophold/i-naturen] Supabase error:", error)
  }

  const cabins: CabinCardData[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    location_hub: row.location_hub as string,
    price_per_night_ore: row.price_per_night_ore as number,
    max_guests: row.max_guests as number,
    instant_book: row.instant_book as boolean,
    offers_transport: row.offers_transport as boolean,
    images: (row.images as string[]) ?? [],
    amenities: (row.amenities as string[] | null) ?? null,
    host_name:
      (row.profiles as { full_name?: string } | null)?.full_name ?? null,
  }))

  const initialFilters: FilterValues = {
    hub: hub ?? "",
    guests: guests ?? "",
    transport: transport === "true",
    minPrice: minPrice ?? "",
    maxPrice: maxPrice ?? "",
    sort: sort ?? "newest",
    search: search ?? "",
    checkIn: checkIn ?? "",
    checkOut: checkOut ?? "",
    residenceSubtype: "",
    locationSubtype: "",
  }

  const cabinMapPins: CabinMapPin[] = cabins.map((c) => ({
    id: c.id,
    title: c.title,
    location_hub: c.location_hub,
  }))

  const t = await getTranslations("ophold")

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <Suspense fallback={null}>
        <HytterClient
          cabins={cabins}
          cabinMapPins={cabinMapPins}
          initialFilters={initialFilters}
          filterBasePath="/ophold/i-naturen"
          listingKind="cabin"
          detailHrefForId={(id) => `/hytter/${id}`}
          translationScope="ophold.nature"
        />
      </Suspense>

      <section className="py-16 bg-primary/5 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {t("nature.ctaTitle")}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md">
                {t("nature.ctaSubtitle")}
              </p>
            </div>
            <Link
              href="/opret/hytte"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              {t("nature.ctaButton")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
