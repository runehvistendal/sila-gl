import Link from "next/link"
import { Suspense } from "react"
import { CheckCircle2 } from "lucide-react"
import { BookingSuccessTracker } from "@/components/analytics/BookingSuccessTracker"

export const metadata = { title: "Booking bekræftet — Sila.gl" }

export default function BookingSuccessPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-background"
      style={{ fontFamily: "var(--font-jakarta, system-ui)" }}
    >
      <Suspense fallback={null}>
        <BookingSuccessTracker />
      </Suspense>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Booking bekræftet!</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Din betaling er gennemført. Du modtager en bekræftelse på e-mail. Tjek
          også spam hvis du ikke ser den med det samme.
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
