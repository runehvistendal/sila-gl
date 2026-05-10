import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import TransportRequestOffers from "@/components/transport/TransportRequestOffers"
import { getLocationName } from "@/lib/greenlandLocations"

const TRIP_TYPE_LABELS: Record<string, string> = {
  one_way:    "Enkelttur",
  round_trip: "Tur-retur",
  return:     "Kun retur",
}

const STATUS_LABELS: Record<string, string> = {
  open:      "Åben",
  matched:   "Tilbud modtaget",
  closed:    "Bekræftet",
  cancelled: "Annulleret",
}

const STATUS_COLORS: Record<string, string> = {
  open:      "bg-amber-100 text-amber-700",
  matched:   "bg-blue-100 text-blue-700",
  closed:    "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
}

export default async function TransportRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const { id }      = await params
  const { success } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/transport/anmodninger/${id}`)

  const navUser = await getNavUserForPage(supabase, user)

  // Fetch the request (open/matched visible to all via RLS, cancelled/closed to owner)
  const { data: reqRaw } = await supabase
    .from("transport_requests")
    .select(`
      id, guest_id, from_location, to_location, desired_date, num_passengers,
      trip_type, return_date, description, status,
      profiles!guest_id ( full_name )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!reqRaw) notFound()

  const req = reqRaw as unknown as {
    id: string
    guest_id: string
    from_location: string
    to_location: string
    desired_date: string
    num_passengers: number
    trip_type: string
    return_date: string | null
    description: string | null
    status: string
    profiles: { full_name: string | null } | null
  }

  const isRequester = req.guest_id === user.id

  // Fetch offers (RLS: guest and skippers with offers can see)
  const { data: offersRaw } = await supabase
    .from("transport_offers")
    .select(`
      id, skipper_id, price_ore, num_seats, message, status, created_at,
      profiles!skipper_id ( full_name )
    `)
    .eq("request_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })

  const offers = (offersRaw ?? []) as unknown as Array<{
    id: string
    skipper_id: string
    price_ore: number
    num_seats: number | null
    message: string | null
    status: string
    created_at: string
    profiles: { full_name: string | null } | null
  }>

  const requesterName = req.profiles?.full_name ?? "Rejsende"

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        <Link
          href="/transport"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Tilbage til transport
        </Link>

        {/* ── Request card ── */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-6 shadow-card">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {getLocationName(req.from_location)} → {getLocationName(req.to_location)}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Anmodning af {requesterName}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABELS[req.status] ?? req.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Dato</p>
              <p className="font-medium">
                {format(new Date(req.desired_date), "d. MMM yyyy", { locale: da })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Tur-type</p>
              <p className="font-medium">{TRIP_TYPE_LABELS[req.trip_type] ?? req.trip_type}</p>
            </div>
            {req.return_date && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Returdato</p>
                <p className="font-medium">
                  {format(new Date(req.return_date), "d. MMM yyyy", { locale: da })}
                </p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Passagerer</p>
              <p className="font-medium">{req.num_passengers}</p>
            </div>
          </div>

          {req.description && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Besked fra anmoder</p>
              <p className="text-sm text-foreground leading-relaxed">{req.description}</p>
            </div>
          )}

          {/* Offer summary */}
          {offers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {offers.filter((o) => o.status === "pending").length} tilbud modtaget
              </p>
            </div>
          )}
        </div>

        {/* ── Success banner ── */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-sm text-green-700 font-medium">
            Betaling bekræftet — transporten er booket!
          </div>
        )}

        {/* ── Tilbud (chat først efter betaling) ── */}
        <TransportRequestOffers
          requestId={id}
          requestStatus={req.status}
          isRequester={isRequester}
          currentUserId={user.id}
          initialOffers={offers}
        />
      </div>
    </main>
  )
}
