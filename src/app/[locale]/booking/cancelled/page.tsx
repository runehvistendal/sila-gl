import { redirect } from "next/navigation"
import Link from "next/link"
import { XCircle } from "lucide-react"
import { cancelPendingBooking } from "@/app/actions/bookings"
import { BookingCancelledTracker } from "@/components/analytics/BookingCancelledTracker"

export const metadata = { title: "Booking annulleret — Sila.gl" }

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{
    booking_id?: string
    cabin_id?: string
    check_in?: string
    check_out?: string
  }>
}

export default async function BookingCancelledPage({ searchParams }: Props) {
  const sp = await searchParams
  const bookingId = sp.booking_id?.trim() ?? ""
  const cabinId = sp.cabin_id?.trim() ?? ""
  const checkIn = sp.check_in?.trim() ?? ""
  const checkOut = sp.check_out?.trim() ?? ""

  let redirectTo = "/hytter"

  if (bookingId) {
    const result = await cancelPendingBooking(bookingId)
    if ("error" in result) {
      /* Booking allerede annulleret eller ukendt — bliv på siden */
    } else {
      const cid = result.cabin_id ?? cabinId
      if (cid) {
        const ci = result.check_in || checkIn
        const co = result.check_out || checkOut
        const qs = new URLSearchParams()
        if (ci) qs.set("check_in", ci)
        if (co) qs.set("check_out", co)
        const q = qs.toString()
        redirect(`/hytter/${cid}${q ? `?${q}` : ""}`)
      }
    }
  } else if (cabinId) {
    const qs = new URLSearchParams()
    if (checkIn) qs.set("check_in", checkIn)
    if (checkOut) qs.set("check_out", checkOut)
    const q = qs.toString()
    redirectTo = `/hytter/${cabinId}${q ? `?${q}` : ""}`
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-background"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <BookingCancelledTracker cabinId={cabinId || undefined} />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="w-9 h-9 text-muted-foreground" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Booking annulleret</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Du lukkede betalingsvinduet. Ingen betaling er gennemført, og din
          reservation er frigivet.
        </p>
        <Link
          href={redirectTo}
          className="inline-flex w-full sm:w-auto justify-center h-12 items-center rounded-xl px-6 font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
        >
          Vælg nye datoer
        </Link>
      </div>
    </main>
  )
}
