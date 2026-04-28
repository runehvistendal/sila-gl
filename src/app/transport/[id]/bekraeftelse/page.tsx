import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { stripe } from "@/lib/stripe"
import { CheckCircle, Anchor, ArrowRight, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { da } from "date-fns/locale"
import { formatKr } from "@/lib/money"

export const dynamic = "force-dynamic"
export const metadata = { title: "Booking bekræftet — Sila.gl" }

export default async function BekraeftelsePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { id: rideShareId } = await params
  const { session_id } = await searchParams

  if (!session_id) redirect(`/transport/${rideShareId}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  let sessionData: {
    from: string
    to: string
    departure: string
    numSeats: number
    totalOre: number
  } | null = null

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)
    if (session.metadata?.type === "ride_share") {
      const { data: rs } = await supabase
        .from("ride_shares")
        .select("from_location, to_location, departure_at")
        .eq("id", rideShareId)
        .maybeSingle()

      if (rs) {
        const r = rs as { from_location: string; to_location: string; departure_at: string }
        sessionData = {
          from:      r.from_location,
          to:        r.to_location,
          departure: r.departure_at,
          numSeats:  parseInt(session.metadata.seats_booked ?? "1", 10),
          totalOre:  session.amount_total ?? 0,
        }
      }
    }
  } catch {
    // Stripe session not found or expired — show generic success
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="max-w-lg mx-auto px-4 pt-24 pb-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Tak for din booking!
        </h1>

        {sessionData ? (
          <>
            <p className="text-muted-foreground mb-6">
              Du sejler fra{" "}
              <strong className="text-foreground">{sessionData.from}</strong>
              {" "}til{" "}
              <strong className="text-foreground">{sessionData.to}</strong>
              {" "}den{" "}
              <strong className="text-foreground">
                {format(new Date(sessionData.departure), "d. MMMM yyyy", { locale: da })}
              </strong>
              .
            </p>

            <div className="bg-white rounded-2xl border border-border p-6 mb-8 text-left">
              <div className="flex items-center gap-3 mb-4">
                <Anchor className="w-5 h-5 text-primary shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{sessionData.from}</span>
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">{sessionData.to}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Afgang</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(sessionData.departure), "d. MMM yyyy 'kl.' HH:mm", { locale: da })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Pladser</p>
                  <p className="font-medium text-foreground">{sessionData.numSeats}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Betalt</p>
                  <p className="font-medium text-foreground">{formatKr(sessionData.totalOre)}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground mb-8">
            Din booking er registreret. Du kan se status i dit dashboard.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Gå til dashboard
            </Button>
          </Link>
          <Link href="/transport">
            <Button variant="outline" className="w-full sm:w-auto rounded-xl">
              Find flere ture
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
