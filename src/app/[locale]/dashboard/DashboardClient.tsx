"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Calendar, Clock, Inbox, Home, Briefcase,
  MapPin, Anchor, PlusCircle, Star, Ship, Eye,
  Check, X, User, ArrowRight,
} from "lucide-react"
import { format } from "date-fns"
import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { publishedCabinDetailPath, guestStayRequestHref } from "@/lib/cabinPublicPaths"
import { getLocationName } from "@/lib/greenlandLocations"
import BookingRow, { STATUS_COLORS, STATUS_LABELS, type CabinBookingData } from "./components/BookingRow"
import {
  acceptTransportRequest, declineTransportRequest,
  duplicateCabin, duplicateBoat, deleteCabin, deleteBoat,
  publishCabin, unpublishCabin,
} from "./actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import EmptyState from "./components/EmptyState"
import OpenRequestsList, { type TransportRequestData } from "./components/OpenRequestsList"
import ProviderOverviewTab from "./components/ProviderOverviewTab"
import { toast } from "sonner"
import { captureEvent, PH_STORE } from "@/lib/analytics/posthog-events"

interface ReviewData {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string | null } | null
}

interface CabinData {
  id: string
  title: string
  location_hub: string
  price_per_night_ore: number
  images: string[]
  published: boolean
  property_type: string | null
}

interface RideShareData {
  id: string
  from_location: string
  to_location: string
  departure_at: string
  seats_available: number
  status: string
}

interface BoatData {
  id: string
  name: string
  boat_type: string | null
  capacity: number
}

interface TransportRequestMine {
  id: string
  from_location: string
  to_location: string
  desired_date: string
  num_passengers: number
  status: string
  offer_count?: number
}

export interface CabinRequestData {
  id: string
  cabin_id?: string | null
  location: string
  desired_check_in: string
  desired_check_out: string
  num_guests: number
  max_price_ore?: number | null
  description?: string | null
  status: string
  created_at: string
  desired_property_type?: "cabin" | "residence"
  // udbyder-visning
  guest_id?: string | null
  guest_name?: string | null
  guest_avatar_url?: string | null
}

interface Props {
  displayName: string | null
  roleType: string
  isProvider: boolean
  isTraveler: boolean
  homeCity: string | null
  myBookings: CabinBookingData[]
  hostBookings: CabinBookingData[]
  myReviewedCabinBookingIds?: string[]
  myCabins: CabinData[]
  myRideShares: RideShareData[]
  myBoats: BoatData[]
  openTransportRequests: TransportRequestData[]
  myTransportRequests: TransportRequestMine[]
  myCabinRequests?: CabinRequestData[]
  guestCabinRequests?: CabinRequestData[]
  reviews: ReviewData[]
  unreadMessages: number
}


export default function DashboardClient({
  displayName,
  roleType,
  isProvider,
  isTraveler,
  homeCity,
  myBookings,
  hostBookings,
  myReviewedCabinBookingIds = [],
  myCabins,
  myRideShares,
  myBoats,
  openTransportRequests,
  myTransportRequests,
  myCabinRequests = [],
  guestCabinRequests = [],
  reviews,
  unreadMessages,
}: Props) {
  const tDash = useTranslations("dashboard")
  const tNav = useTranslations("nav")
  const tRequest = useTranslations("request")
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const rawTab = searchParams.get("tab") ?? "bookings"
  const urlTab = (() => {
    if (rawTab === "mine-opslag") return "listings"
    if (!isTraveler && rawTab === "requests") return "bookings"
    if (!isProvider && (rawTab === "listings" || rawTab === "open-requests")) return "bookings"
    return rawTab
  })()

  useEffect(() => {
    const t = searchParams.get("toast")
    if (!t) return

    const map: Record<string, { title: string; description?: string }> = {
      "hytte-saved": {
        title: "Hytte gemt",
        description:
          "Vælg 'Udlej en hytte' for at oprette et opslag.",
      },
      "cabin-updated": { title: "Ændringer gemt" },
      "baad-saved": {
        title: "Båd gemt",
        description: "Vælg 'Tilbyd transport' for at poste en tur.",
      },
      "boat-updated":                  { title: "Ændringer gemt" },
      "transport-request-created":  { title: "Transportanmodning sendt", description: "Sejlere vil svare med tilbud." },
      "cabin-request-created":      { title: tRequest("submitted"), description: tRequest("submitted_body") },
    }

    const msg = map[t]
    if (msg) {
      toast(msg.title, msg.description ? { description: msg.description } : undefined)
    }

    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("toast")
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [searchParams, pathname, router, tRequest])

  const phNewTr = useRef(false)
  useEffect(() => {
    if (phNewTr.current) return
    if (searchParams.get("new_tr") == null) return
    phNewTr.current = true
    captureEvent("transport_request_created", {
      from_location: searchParams.get("tr_from") ?? "",
      to_location: searchParams.get("tr_to") ?? "",
      num_guests: Math.max(0, Number(searchParams.get("tr_np") ?? 0) || 0),
    })
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("new_tr")
    sp.delete("tr_from")
    sp.delete("tr_to")
    sp.delete("tr_np")
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [searchParams, pathname, router])

  const phRs = useRef(false)
  useEffect(() => {
    if (phRs.current) return
    const id = searchParams.get("rs_created")
    if (!id) return
    phRs.current = true
    try {
      const raw = sessionStorage.getItem(PH_STORE.rideSharePending)
      sessionStorage.removeItem(PH_STORE.rideSharePending)
      const p = raw ? JSON.parse(raw) as {
        from_location: string
        to_location: string
        seats: number
        roundtrip: boolean
      } : { from_location: "", to_location: "", seats: 0, roundtrip: false }
      captureEvent("ride_share_created", {
        ride_share_id: id,
        from_location: p.from_location,
        to_location: p.to_location,
        seats: p.seats,
        roundtrip: p.roundtrip,
      })
    } catch {
      captureEvent("ride_share_created", {
        ride_share_id: id,
        from_location: "",
        to_location: "",
        seats: 0,
        roundtrip: false,
      })
    }
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("rs_created")
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [searchParams, pathname, router])

  const phCabinReq = useRef(false)
  useEffect(() => {
    if (phCabinReq.current) return
    if (searchParams.get("cabin_req") !== "1") return
    phCabinReq.current = true
    captureEvent("cabin_request_created", {
      location: searchParams.get("cabin_loc") ?? "",
      num_guests: Math.max(0, Number(searchParams.get("cabin_ng") ?? 0) || 0),
      has_max_price: searchParams.get("cabin_mp") === "1",
    })
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("cabin_req")
    sp.delete("cabin_loc")
    sp.delete("cabin_ng")
    sp.delete("cabin_mp")
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [searchParams, pathname, router])

  const [activeTab,     setActiveTab]     = useState(urlTab)
  const [bookingFilter, setBookingFilter] = useState<"active" | "history">("active")
  const [isDuplicating, startDuplicate]   = useTransition()

  // Booking splits
  const activeMyBookings  = myBookings.filter((b) => ["pending", "confirmed"].includes(b.status))
  const historyMyBookings = myBookings.filter((b) => ["completed", "cancelled"].includes(b.status))

  const pendingHostBookings = hostBookings.filter((b) => b.status === "pending").length
  const totalOpenRequests   = openTransportRequests.length

  // Reviews
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // Nearby vs others transport requests
  const nearbyTransport = openTransportRequests.filter(
    (r) => !homeCity || r.from_location === homeCity || r.to_location === homeCity
  )
  const otherTransport = openTransportRequests.filter(
    (r) => !!homeCity && r.from_location !== homeCity && r.to_location !== homeCity
  )

  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mit dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {displayName ? `Hej ${displayName}` : "Hej"}
            </p>
            {avgRating && (
              <div className="flex items-center gap-1 mt-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-foreground">{avgRating}</span>
                <span className="text-xs text-muted-foreground">({reviews.length} anmeldelse{reviews.length !== 1 ? "r" : ""})</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {isTraveler && (
              <Button variant="outline" asChild className="rounded-xl gap-2 text-sm">
                <Link href={guestStayRequestHref}><MapPin className="w-4 h-4" /> {tNav("requestCabin")}</Link>
              </Button>
            )}
            {isTraveler && (
              <Button variant="outline" asChild className="rounded-xl gap-2 text-sm">
                <Link href="/transport/anmod"><Anchor className="w-4 h-4" /> {tRequest("link_transport_request")}</Link>
              </Button>
            )}
            {isProvider && (
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2 text-sm">
                <Link href="/opret"><PlusCircle className="w-4 h-4" /> Nyt opslag</Link>
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="mb-8 bg-muted rounded-xl p-1 h-auto gap-1 inline-flex min-w-max">

              {/* Tab 1: Bookinger */}
              <TabsTrigger value="bookings" className="rounded-lg px-4 py-2 text-sm gap-2">
                <Calendar className="w-4 h-4" />
                Bookinger
                {pendingHostBookings > 0 && (
                  <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingHostBookings}
                  </span>
                )}
              </TabsTrigger>

              {/* Tab 2: Mine ønsker */}
              {isTraveler && (
                <TabsTrigger value="requests" className="rounded-lg px-4 py-2 text-sm gap-2">
                  <Clock className="w-4 h-4" />
                  Mine ønsker
                </TabsTrigger>
              )}

              {/* Tab 3: Gæsteønsker */}
              {isProvider && (
                <TabsTrigger value="open-requests" className="rounded-lg px-4 py-2 text-sm gap-2">
                  <Inbox className="w-4 h-4" />
                  Gæsteønsker
                  {totalOpenRequests > 0 && (
                    <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {totalOpenRequests}
                    </span>
                  )}
                </TabsTrigger>
              )}

              {/* Tab 4: Mine opslag */}
              {isProvider && (
                <TabsTrigger value="listings" className="rounded-lg px-4 py-2 text-sm gap-2">
                  <Home className="w-4 h-4" />
                  Mine opslag
                </TabsTrigger>
              )}

              {/* Tab 5: Indbakke — alle roller */}
              <TabsTrigger value="inbox" className="rounded-lg px-4 py-2 text-sm gap-2">
                <Briefcase className="w-4 h-4" />
                Indbakke
                {unreadMessages > 0 && (
                  <span className="bg-primary text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {roleType === "traveler" && (
            <div
              className="mb-6 rounded-xl border border-border bg-muted/50 px-4 py-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 -mt-2"
              aria-label="Bliv udbyder"
            >
              <div className="pr-0 sm:pr-4 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Har du en hytte eller båd?
                </p>
                <p className="text-sm text-muted-foreground">
                  Udlej din hytte eller tilbyd transport.
                </p>
              </div>
              <Button variant="default" asChild className="rounded-xl w-full sm:w-auto shrink-0 gap-0">
                <Link href="/opret">Opret nyt opslag →</Link>
              </Button>
            </div>
          )}

          {/* ── TAB 1: BOOKINGER ── */}
          <TabsContent value="bookings">
            <div className="space-y-4">
              {/* Sub-filter */}
              <div className="flex gap-2 bg-muted rounded-xl p-1 w-fit">
                <button
                  onClick={() => setBookingFilter("active")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    bookingFilter === "active"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Aktive
                  {activeMyBookings.length > 0 && (
                    <span className="ml-1.5 bg-primary/10 text-primary text-xs rounded-full px-1.5">
                      {activeMyBookings.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setBookingFilter("history")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    bookingFilter === "history"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Historik
                </button>
              </div>

              {/* Som gæst */}
              {isTraveler && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Mine bookinger</h3>
                  {bookingFilter === "active" ? (
                    activeMyBookings.length > 0 ? (
                      <div className="space-y-3">
                        {activeMyBookings.map((b) => (
                          <BookingRow key={b.id} booking={b} isHost={false} alreadyReviewed={myReviewedCabinBookingIds.includes(b.id)} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState icon={Calendar} message="Ingen aktive bookinger" cta="Udforsk hytter" ctaHref="/ophold/i-naturen" />
                    )
                  ) : historyMyBookings.length > 0 ? (
                    <div className="space-y-3">
                      {historyMyBookings.map((b) => (
                        <BookingRow key={b.id} booking={b} isHost={false} alreadyReviewed={myReviewedCabinBookingIds.includes(b.id)} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Clock} message="Ingen historik endnu" cta="Udforsk hytter" ctaHref="/ophold/i-naturen" />
                  )}
                </div>
              )}

              {/* Som udbyder */}
              {isProvider && (
                <div className={roleType === "both" && isTraveler ? "mt-10 pt-8 border-t border-border" : ""}>
                  <h3 className="font-semibold text-foreground mb-3">Indkomne bookinger</h3>
                  {hostBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
                      Ingen bookinger på dine opslag endnu.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {hostBookings
                        .filter((b) =>
                          bookingFilter === "active"
                            ? ["pending", "confirmed"].includes(b.status)
                            : ["completed", "cancelled"].includes(b.status)
                        )
                        .map((b) => (
                          <BookingRow key={b.id} booking={b} isHost={true} alreadyReviewed={myReviewedCabinBookingIds.includes(b.id)} />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB 2: MINE ØNSKER ── */}
          <TabsContent value="requests">
            <div className="space-y-10">
              {/* Transportanmodninger */}
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-primary" />
                  Transportanmodninger
                </h3>
                {myTransportRequests.length === 0 ? (
                  <EmptyState icon={Anchor} message="Ingen transportanmodninger endnu" cta="Anmod om transport" ctaHref="/transport/anmod" />
                ) : (
                  <div className="space-y-3">
                    {myTransportRequests.map((r) => (
                      <TransportRequestRow key={r.id} r={r} />
                    ))}
                  </div>
                )}
              </div>

              {/* Hytteanmodninger */}
              <div className="pt-6 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary" />
                  {tDash("stay_requests_title")}
                </h3>
                {myCabinRequests.length === 0 ? (
                  <EmptyState
                    icon={Home}
                    message={tDash("stay_requests_empty")}
                    cta={tDash("stay_requests_cta")}
                    ctaHref={guestStayRequestHref}
                  />
                ) : (
                  <div className="space-y-3">
                    {myCabinRequests.map((r) => (
                      <CabinRequestRow key={r.id} r={r} isHost={false} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── TAB 3: Gæsteønsker ── */}
          {isProvider && (
            <TabsContent value="open-requests">
              <div className="space-y-10">
                {/* Transportanmodninger */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Anchor className="w-4 h-4 text-primary" />
                    Transportanmodninger
                    {openTransportRequests.length > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs rounded-full px-2 py-0.5 font-semibold">
                        {openTransportRequests.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Gæster der søger transport — byd ind med et tilbud
                  </p>
                  <OpenRequestsList
                    nearby={nearbyTransport}
                    others={otherTransport}
                    userHomeCity={homeCity}
                    type="transport"
                  />
                </div>

                {/* Hytteanmodninger */}
                <div className="pt-6 border-t border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary" />
                    {tDash("guest_stay_requests_title")}
                    {guestCabinRequests.length > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs rounded-full px-2 py-0.5 font-semibold">
                        {guestCabinRequests.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {tDash("guest_stay_requests_subtitle")}
                  </p>
                  {guestCabinRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
                      {tDash("guest_stay_requests_none")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {guestCabinRequests.map((r) => (
                        <CabinRequestRow key={r.id} r={r} isHost={true} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {/* ── TAB 4: MINE OPSLAG ── */}
          {isProvider && (
            <TabsContent value="listings">
              <div className="space-y-10">

                {/* ── Mine hytter ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{tDash("my_cabins")}</h3>
                    <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1.5">
                      <Link href="/opret/hytte">
                        <PlusCircle className="w-3.5 h-3.5" /> Ny hytte
                      </Link>
                    </Button>
                  </div>

                  {myCabins.length === 0 ? (
                    <EmptyState icon={Home} message="Ingen hytter eller boliger endnu" cta="Opret hytte" ctaHref="/opret/hytte" />
                  ) : (
                    <div className="space-y-3">
                      {myCabins.map((c) => {
                        const isRes = c.property_type === "residence"
                        const publicPath = publishedCabinDetailPath(c.property_type, c.id)
                        const editPath = isRes
                          ? `/opret/bolig/${c.id}/rediger`
                          : `/opret/hytte/${c.id}/rediger`
                        const availPath = isRes
                          ? `/opret/bolig/${c.id}/tilgaengelighed`
                          : `/opret/hytte/${c.id}/tilgaengelighed`
                        return (
                        <div key={c.id} className="bg-white rounded-xl border border-border p-4 flex gap-4 items-center flex-wrap sm:flex-nowrap">
                          {/* Klikbart billede */}
                          <Link
                            href={c.published ? publicPath : editPath}
                            className="shrink-0 group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.images?.[0] ?? "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=100&h=80&fit=crop"}
                              alt=""
                              className="w-16 h-16 rounded-lg object-cover transition-opacity group-hover:opacity-80"
                            />
                          </Link>
                          {/* Klikbart navn + lokation */}
                          <Link
                            href={c.published ? publicPath : editPath}
                            className="flex-1 min-w-0 group"
                          >
                            <p className="font-semibold text-sm text-foreground truncate group-hover:underline">{c.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />{getLocationName(c.location_hub)}
                            </p>
                            <p className="text-xs font-medium text-primary mt-1">
                              {formatKr(c.price_per_night_ore)}/nat
                            </p>
                          </Link>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end w-full sm:w-auto">
                            <Badge variant="outline" className="border-0 bg-muted text-foreground text-xs">
                              {isRes ? tDash("listing_badge_residence") : tDash("listing_badge_cabin")}
                            </Badge>
                            <Badge className={c.published ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                              {c.published ? "Aktiv" : "Kladde"}
                            </Badge>
                            {/* Rediger */}
                            <Button size="sm" variant="outline" asChild className="rounded-lg">
                              <Link href={editPath}>Rediger</Link>
                            </Button>
                            {/* Tilgængelighed */}
                            <Button size="sm" variant="outline" asChild className="rounded-lg">
                              <Link href={availPath}>Tilgængelighed</Link>
                            </Button>
                            {!c.published ? (
                              /* Kladde → Publicér */
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isDuplicating}
                                onClick={async () => {
                                  const res = await publishCabin(c.id)
                                  if (res.error) toast.error(res.error)
                                  else {
                                    captureEvent("cabin_published", {
                                      cabin_id: c.id,
                                      location: c.location_hub,
                                    })
                                    toast.success("Hytte publiceret")
                                    router.refresh()
                                  }
                                }}
                                className="rounded-lg text-xs border-green-300 text-green-700 hover:bg-green-50"
                              >
                                Publicér
                              </Button>
                            ) : (
                              /* Aktiv → Afpublicér + Dupliker */
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isDuplicating}
                                      className="rounded-lg text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                    >
                                      Afpublicér
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Afpublicér hytte?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Hytten bliver usynlig for gæster og kan ikke bookes. Eksisterende bookinger påvirkes ikke.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuller</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={async () => {
                                          const res = await unpublishCabin(c.id)
                                          if (res.error) toast.error(res.error)
                                          else {
                                            captureEvent("cabin_unpublished", { cabin_id: c.id })
                                            toast.success("Hytte afpubliceret")
                                            router.refresh()
                                          }
                                        }}
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                      >
                                        Afpublicér
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isDuplicating}
                                  onClick={() =>
                                    startDuplicate(async () => {
                                      const res = await duplicateCabin(c.id)
                                      if (res.error) toast.error(res.error)
                                      else toast.success("Hytte duplikeret — rediger og publicér den nye")
                                    })
                                  }
                                  className="rounded-lg text-xs text-muted-foreground"
                                >
                                  Dupliker
                                </Button>
                              </>
                            )}
                            {/* Slet */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (!confirm("Slet hytten? Den fjernes permanent efter 30 dage.")) return
                                const res = await deleteCabin(c.id)
                                if (res.error) toast.error(res.error)
                                else { toast.success("Hytte slettet"); router.refresh() }
                              }}
                              className="rounded-lg text-xs text-destructive hover:bg-destructive/10"
                            >
                              Slet
                            </Button>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}
                </div>

                {/* ── Mine både ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">Mine både</h3>
                    <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1.5">
                      <Link href="/opret/baad">
                        <PlusCircle className="w-3.5 h-3.5" /> Ny båd
                      </Link>
                    </Button>
                  </div>

                  {myBoats.length === 0 ? (
                    <EmptyState icon={Ship} message="Ingen både endnu" cta="Opret båd" ctaHref="/opret/baad" />
                  ) : (
                    <div className="space-y-3">
                      {myBoats.map((b) => (
                        <div key={b.id} className="bg-white rounded-xl border border-border p-4 flex gap-4 items-center">
                          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <Ship className="w-7 h-7 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{b.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {b.boat_type ?? "Båd"} · {b.capacity} pladser
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            <Badge className="bg-green-100 text-green-700 border-0">Aktiv</Badge>
                            <Button size="sm" variant="outline" asChild className="text-primary border-primary/30 hover:bg-primary/5 rounded-lg">
                              <Link href={`/opret/opslag/sejlads/${b.id}`}>Post tur</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isDuplicating}
                              onClick={() =>
                                startDuplicate(async () => {
                                  const res = await duplicateBoat(b.id)
                                  if (res.error) {
                                    toast.error(res.error)
                                  } else {
                                    toast.success("Båd duplikeret")
                                  }
                                })
                              }
                              className="rounded-lg text-xs text-muted-foreground"
                            >
                              Dupliker
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (!confirm("Slet båden? Den fjernes permanent efter 30 dage.")) return
                                const res = await deleteBoat(b.id)
                                if (res.error) toast.error(res.error)
                                else { toast.success("Båd slettet"); router.refresh() }
                              }}
                              className="rounded-lg text-xs text-destructive hover:bg-destructive/10"
                            >
                              Slet
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Anmeldelser ── */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    Anmeldelser
                    {avgRating && (
                      <span className="text-sm font-normal text-muted-foreground">
                        — gennemsnit {avgRating} ★
                      </span>
                    )}
                  </h3>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4">
                      Ingen anmeldelser endnu.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="bg-white rounded-xl border border-border p-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Fra: {r.profiles?.full_name ?? "Anonym"}
                                {" · "}{format(new Date(r.created_at), "d. MMM yyyy")}
                              </p>
                              <div className="flex gap-0.5 mt-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                                ))}
                              </div>
                              {r.comment && (
                                <p className="text-sm text-muted-foreground mt-1.5 italic">&ldquo;{r.comment}&rdquo;</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {/* ── TAB 5: INDBAKKE ── */}
          <TabsContent value="inbox">
            <ProviderOverviewTab
              transportRequests={openTransportRequests}
              hostBookings={hostBookings}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/* ── Cabin request row ── */
const CABIN_REQ_STATUS: Record<string, string> = {
  open:      "Åben",
  matched:   "Matchet",
  cancelled: "Annulleret",
  expired:   "Udløbet",
}
const CABIN_REQ_COLORS: Record<string, string> = {
  open:      "bg-amber-100 text-amber-700",
  matched:   "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  expired:   "bg-gray-100 text-gray-400",
}

function CabinRequestRow({ r, isHost }: { r: CabinRequestData; isHost: boolean }) {
  const tReq = useTranslations("request")
  const nights = r.desired_check_in && r.desired_check_out
    ? Math.round((new Date(r.desired_check_out).getTime() - new Date(r.desired_check_in).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const stayKind = r.desired_property_type === "residence" ? "residence" : "cabin"

  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {isHost && r.guest_id ? (
            <Link href={`/profil/${r.guest_id}`} className="shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {r.guest_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.guest_avatar_url} alt={r.guest_name ?? "Gæst"} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
            </Link>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Home className="w-4 h-4 text-primary" />
            </div>
          )}
          <div>
            {isHost && r.guest_id && (
              <Link href={`/profil/${r.guest_id}`} className="text-xs text-primary hover:underline font-medium block">
                {r.guest_name ?? "Gæst"}
              </Link>
            )}
            <p className="font-semibold text-sm text-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              {r.location}
            </p>
            <Badge
              variant="secondary"
              className="mt-1.5 border-0 bg-muted text-foreground text-[10px] font-semibold uppercase tracking-wide"
            >
              {stayKind === "residence" ? tReq("badge_residence") : tReq("badge_cabin")}
            </Badge>
          </div>
        </div>
        <Badge className={`${CABIN_REQ_COLORS[r.status] ?? "bg-gray-100 text-gray-500"} border-0 text-xs`}>
          {CABIN_REQ_STATUS[r.status] ?? r.status}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {r.desired_check_in ? format(new Date(r.desired_check_in), "d. MMM") : "—"}
          {" – "}
          {r.desired_check_out ? format(new Date(r.desired_check_out), "d. MMM yyyy") : "—"}
          {nights != null && nights > 0 && ` (${nights} nætter)`}
        </span>
        <span className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          {r.num_guests} gæst{r.num_guests !== 1 ? "er" : ""}
        </span>
      </div>

      {r.description && (
        <p className="text-xs text-muted-foreground italic bg-muted/50 rounded-lg px-3 py-2">
          &ldquo;{r.description}&rdquo;
        </p>
      )}

      {isHost && r.guest_id && r.status === "open" && (
        <div className="pt-2 border-t border-border">
          <Button size="sm" asChild variant="outline" className="rounded-lg gap-1.5 text-primary border-primary/30 hover:bg-primary/5">
            <Link href={`/profil/${r.guest_id}`}>
              <ArrowRight className="w-3.5 h-3.5" /> Kontakt gæst
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

/* ── Transport request row with offer count and chat link ── */
function TransportRequestRow({ r }: { r: { id: string; from_location: string; to_location: string; desired_date: string; num_passengers: number; status: string; offer_count?: number } }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className={`bg-white rounded-xl border p-4 ${r.status === "matched" ? "border-green-200" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-sm text-foreground">
            {getLocationName(r.from_location)} → {getLocationName(r.to_location)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {r.desired_date ? format(new Date(r.desired_date), "d. MMM yyyy") : "—"}
            {" · "}
            {r.num_passengers} passager{r.num_passengers !== 1 ? "er" : ""}
            {r.offer_count !== undefined && r.offer_count > 0 && (
              <span className="ml-2 font-medium text-primary">· {r.offer_count} tilbud</span>
            )}
          </p>
        </div>
        <Badge className={`${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"} border-0 text-xs`}>
          {STATUS_LABELS[r.status] ?? r.status}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
        <Button size="sm" asChild variant="outline" className="rounded-lg gap-1.5 text-primary border-primary/30 hover:bg-primary/5">
          <Link href={`/transport/anmodninger/${r.id}`}>
            <Eye className="w-3.5 h-3.5" /> Se chat og tilbud
          </Link>
        </Button>

        {r.status === "matched" && (
          <>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => startTransition(async () => { await acceptTransportRequest(r.id) })}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Bekræft
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => startTransition(async () => { await declineTransportRequest(r.id) })}
              className="rounded-lg gap-1.5 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
            >
              <X className="w-3.5 h-3.5" /> Afvis
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
