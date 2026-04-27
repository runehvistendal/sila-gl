import Link from "next/link"
import { XCircle } from "lucide-react"

export const metadata = { title: "Booking annulleret — Sila.gl" }

export default function BookingCancelledPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-background"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="w-9 h-9 text-muted-foreground" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Booking annulleret</h1>
        <p className="text-muted-foreground text-sm">
          Du blev sendt retur uden gennemført betaling. Du kan prøve igen når som
          helst.
        </p>
        <Link
          href="/hytter"
          className="inline-flex w-full sm:w-auto justify-center h-12 items-center rounded-xl px-6 font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
        >
          Tilbage til hytter
        </Link>
      </div>
    </main>
  )
}
