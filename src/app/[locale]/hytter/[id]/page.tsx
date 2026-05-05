import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft, MapPin, Users, Anchor, User,
  AlertTriangle,
} from "lucide-react"
import { addDays, format, parseISO } from "date-fns"
import { AMENITY_META } from "@/lib/amenityMeta"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import { nightsFromBookings } from "@/lib/cabinBookingDates"
import Navbar from "@/components/layout/Navbar"
import ListingImageGallery from "@/components/cabins/ListingImageGallery"
import CabinReviews from "@/components/cabins/CabinReviews"
import CabinDetailLayout from "@/components/cabins/CabinDetailLayout"

export type CabinDetailData = {
  id: string
  title: string
  description: string
  location_hub: string
  max_guests: number
  bedrooms: number
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


export default async function CabinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const { data: cabinRaw, error: cabinError } = await supabase
    .from("cabins")
    .select(
      `
      id, title, description, location_hub,
      max_guests, bedrooms,
      price_per_night_ore, cleaning_fee_ore,
      amenities, images,
      instant_book, offers_transport, transport_price_per_person_ore,
      access_type, owner_id, min_nights, preparation_days,
      profiles!owner_id ( full_name, avatar_url )
    `,
    )
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .single()

  if (cabinError || !cabinRaw) notFound()

  const cabin = cabinRaw as unknown as CabinDetailData

  const [{ data: occRows }, { data: blockRows }, { data: transportRows }] =
    await Promise.all([
      supabase.rpc("get_cabin_occupancy", { p_cabin_id: id }),
      supabase
        .from("cabin_availability")
        .select("date")
        .eq("cabin_id", id)
        .eq("is_available", false)
        .is("deleted_at", null),
      supabase
        .from("ride_shares")
        .select(
          `id, from_location, to_location, departure_at,
           seats_available, total_seats, price_per_seat_ore,
           profiles!skipper_id ( full_name )`,
        )
        .eq("to_location", cabin.location_hub.toLowerCase())
        .in("status", ["active", "full"])
        .gt("departure_at", new Date().toISOString())
        .order("departure_at", { ascending: true })
        .limit(5),
    ])

  const bookingRows = (occRows ?? []) as { check_in: string; check_out: string }[]
  const occupied = nightsFromBookings(bookingRows)

  // Forberedelsestid: blokér preparation_days dage efter hvert booking check_out
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

  const hostName   = cabin.profiles?.full_name ?? null
  const hostAvatar = cabin.profiles?.avatar_url ?? null

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <Navbar user={navUser} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <Link
          href="/hytter"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Tilbage til hytter
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{cabin.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {cabin.location_hub}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Op til {cabin.max_guests} gæster
            </span>
            {cabin.offers_transport && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border-0">
                <Anchor className="w-3 h-3" />
                Transport tilbydes
              </span>
            )}
            {cabin.instant_book && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Instant Book
              </span>
            )}
          </div>
        </div>

        <ListingImageGallery images={cabin.images} title={cabin.title} />

        <CabinDetailLayout
          bookingCabin={{
            id: cabin.id,
            max_guests: cabin.max_guests,
            price_per_night_ore: cabin.price_per_night_ore,
            offers_transport: cabin.offers_transport,
            transport_price_per_person_ore: cabin.transport_price_per_person_ore,
            min_nights: cabin.min_nights ?? 1,
          }}
          transportCabin={{
            id: cabin.id,
            location_hub: cabin.location_hub,
            offers_transport: cabin.offers_transport,
            transport_price_per_person_ore: cabin.transport_price_per_person_ore,
            profiles: cabin.profiles,
          }}
          transports={(transportRows ?? []) as unknown as import("@/components/cabins/CabinTransportSection").RideShareData[]}
          isLoggedIn={!!user}
          loginNextPath={`/hytter/${cabin.id}`}
          disabledYmd={disabledYmd}
          leftContent={
            <>
              {/* Om hytten */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Om hytten</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {cabin.description || "Ingen beskrivelse endnu."}
                </p>
              </div>

              {/* Inkluderet */}
              {cabin.amenities?.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-4">Inkluderet</h2>
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

              {/* Din vært */}
              {hostName && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-3">Din vært</h2>
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
                      <p className="text-sm text-primary">Se profil →</p>
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
