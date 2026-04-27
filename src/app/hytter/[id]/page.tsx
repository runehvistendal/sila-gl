import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, MapPin, Users, Anchor, Check, User } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import Navbar from "@/components/layout/Navbar"
import ListingImageGallery from "@/components/cabins/ListingImageGallery"
import CabinReviews from "@/components/cabins/CabinReviews"
import BookingCard from "./BookingCard"
import type { RideShareData } from "@/components/cabins/CabinTransportSection"

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
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

const AMENITY_LABELS: Record<string, string> = {
  electricity:    "El",
  water:          "Rindende vand",
  wood_stove:     "Brændeovn",
  toilet:         "Toilet",
  sauna:          "Sauna",
  boat_included:  "Båd inkluderet",
}

export default async function CabinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  /* ── Auth ── */
  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user
    ? {
        id: user.id,
        email: user.email ?? null,
        name:
          (user.user_metadata?.full_name as string) ??
          (user.user_metadata?.name as string) ??
          null,
      }
    : null

  /* ── Cabin ── */
  const { data: cabinRaw, error: cabinError } = await supabase
    .from("cabins")
    .select(`
      id, title, description, location_hub,
      max_guests, bedrooms,
      price_per_night_ore, cleaning_fee_ore,
      amenities, images,
      instant_book, offers_transport, transport_price_per_person_ore,
      access_type, owner_id,
      profiles!owner_id ( full_name, avatar_url )
    `)
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .single()

  if (cabinError || !cabinRaw) notFound()

  const cabin = cabinRaw as unknown as CabinDetailData

  /* ── Ride shares to this location ── */
  const { data: transportsRaw } = await supabase
    .from("ride_shares")
    .select(`
      id, from_location, to_location, departure_at,
      seats_available, total_seats, price_per_seat_ore,
      profiles!skipper_id ( full_name )
    `)
    .eq("status", "active")
    .eq("to_location", cabin.location_hub)
    .gt("seats_available", 0)
    .order("departure_at", { ascending: true })
    .limit(5)

  const transports = (transportsRaw ?? []) as unknown as RideShareData[]

  const hostName   = cabin.profiles?.full_name ?? null
  const hostAvatar = cabin.profiles?.avatar_url ?? null

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* ── Back ── */}
        <Link
          href="/hytter"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Tilbage til hytter
        </Link>

        {/* ── Title row ── */}
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

        {/* ── Gallery ── */}
        <ListingImageGallery images={cabin.images} title={cabin.title} />

        {/* ── Two column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-3">Om hytten</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {cabin.description || "Ingen beskrivelse endnu."}
              </p>
            </div>

            {/* Amenities */}
            {cabin.amenities?.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Faciliteter</h2>
                <div className="grid grid-cols-2 gap-3">
                  {cabin.amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {AMENITY_LABELS[a] ?? a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host profile */}
            {hostName && (
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">Din vært</h2>
                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border hover:border-primary/30 hover:shadow-card transition-all w-full text-left">
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
                </div>
              </div>
            )}

            {/* Reviews */}
            <CabinReviews cabinId={cabin.id} currentUserId={user?.id ?? null} />
          </div>

          {/* ── Right column — booking card + transport ── */}
          <div className="lg:col-span-1">
            <BookingCard
              cabin={cabin}
              transports={transports}
              isLoggedIn={!!user}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
