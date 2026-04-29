import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import HytterClient from "./HytterClient"
import type { FilterValues } from "@/components/cabins/CabinFilters"
import type { CabinCardData } from "@/components/cabins/CabinCard"

export const metadata = {
  title: "Hytter i Grønland — Sila.gl",
  description:
    "Find autentiske arktiske hytter til leje i Grønland. Filtrer på destination, gæster og transport.",
}

interface SearchParams {
  hub?: string
  guests?: string
  transport?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  search?: string
}

export default async function HytterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const params = await searchParams
  const { hub, guests, transport, minPrice, maxPrice, sort, search } = params

  // Build Supabase query — ALL filtering happens here, never client-side
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
    `
    )
    .eq("published", true)
    .is("deleted_at", null)

  // Filters from URL search params
  if (hub)           query = query.eq("location_hub", hub)
  if (guests)        query = query.gte("max_guests", Number(guests))
  if (transport === "true") query = query.eq("offers_transport", true)

  // Price filters: URL params in kr → convert to øre for DB comparison
  if (minPrice)      query = query.gte("price_per_night_ore", Math.round(Number(minPrice) * 100))
  if (maxPrice)      query = query.lte("price_per_night_ore", Math.round(Number(maxPrice) * 100))

  // Text search — server-side via Supabase ilike
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Sort
  if (sort === "price_asc") {
    query = query.order("price_per_night_ore", { ascending: true })
  } else if (sort === "price_desc") {
    query = query.order("price_per_night_ore", { ascending: false })
  } else {
    // Default: Instant Book first, then newest
    query = query
      .order("instant_book", { ascending: false })
      .order("created_at", { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.error("[hytter] Supabase error:", error)
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
    hub:       hub       ?? "",
    guests:    guests    ?? "",
    transport: transport === "true",
    minPrice:  minPrice  ?? "",
    maxPrice:  maxPrice  ?? "",
    sort:      sort      ?? "newest",
    search:    search    ?? "",
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <HytterClient cabins={cabins} initialFilters={initialFilters} />

      {/* ── CTA ── */}
      <section className="py-16 bg-primary/5 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Kan du ikke finde den rigtige hytte?
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md">
                Opret din egen hytte og del den med rejsende i Grønland.
              </p>
            </div>
            <Link
              href="/opret?type=cabin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Opret hytte <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
