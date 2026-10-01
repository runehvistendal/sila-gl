import { ArrowRight, Ship } from "lucide-react"
import { getFormatter, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase-server"
import { getLocationName } from "@/lib/greenlandLocations"
import { calcDisplayPrice, formatKr } from "@/lib/money"
import { nuukInputToUtc } from "@/lib/nuukTime"

const NUUK_TZ = "America/Godthab"

interface Props {
  bookingId: string
  /** cabins.location_hub */
  locationHub: string
  checkIn: string
  checkOut: string
  guests: number
}

type Trip = {
  id: string
  from_location: string
  to_location: string
  departure_at: string
  seats_available: number
  price_per_seat_ore: number
}

function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * «Mangler du transport?» — vises når en hytte i naturen er booket uden transport.
 * Finder samsejladser der passer til ankomst og hjemrejse, og tilbyder ellers en
 * forudfyldt efterspørgsel knyttet til bookingen.
 */
export default async function BookingTransportPrompt({ bookingId, locationHub, checkIn, checkOut, guests }: Props) {
  const t = await getTranslations("bookingSuccess")
  const fmt = await getFormatter()
  const supabase = await createClient()
  const hubKey = locationHub.toLowerCase()
  const place = getLocationName(locationHub)

  const cols = "id, from_location, to_location, departure_at, seats_available, price_per_seat_ore"
  const [outRes, homeRes] = await Promise.all([
    // Ud: dagen før eller på ankomstdagen
    supabase
      .from("ride_shares")
      .select(cols)
      .eq("to_location", hubKey)
      .eq("status", "active")
      .is("deleted_at", null)
      .gte("seats_available", guests)
      .gte("departure_at", nuukInputToUtc(shiftYmd(checkIn, -1)))
      .lt("departure_at", nuukInputToUtc(shiftYmd(checkIn, 1)))
      .gt("departure_at", new Date().toISOString())
      .order("departure_at", { ascending: true })
      .limit(2),
    // Hjem: på afrejsedagen eller dagen efter
    supabase
      .from("ride_shares")
      .select(cols)
      .eq("from_location", hubKey)
      .eq("status", "active")
      .is("deleted_at", null)
      .gte("seats_available", guests)
      .gte("departure_at", nuukInputToUtc(checkOut))
      .lt("departure_at", nuukInputToUtc(shiftYmd(checkOut, 2)))
      .order("departure_at", { ascending: true })
      .limit(2),
  ])

  const out = (outRes.data ?? []) as Trip[]
  const home = (homeRes.data ?? []) as Trip[]

  const requestQs = new URLSearchParams({
    to: place,
    date: checkIn,
    return: checkOut,
    guests: String(guests),
    booking: bookingId,
  }).toString()

  const when = (iso: string) =>
    `${fmt.dateTime(new Date(iso), { timeZone: NUUK_TZ, weekday: "short", day: "numeric", month: "short" })} · ${fmt.dateTime(
      new Date(iso),
      { timeZone: NUUK_TZ, hour: "2-digit", minute: "2-digit" },
    )}`

  const list = (rows: Trip[], label: string) =>
    rows.length === 0 ? null : (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/transport/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-3 hover:border-[#114788] transition-colors"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground flex-wrap">
                    {getLocationName(r.from_location)}
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                    {getLocationName(r.to_location)}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5 first-letter:uppercase">
                    {when(r.departure_at)}
                  </span>
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
                  {formatKr(calcDisplayPrice(r.price_per_seat_ore))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )

  return (
    <section
      aria-labelledby="transport-prompt-title"
      className="rounded-2xl border border-[#114788]/25 bg-[#114788]/5 p-4 sm:p-5 text-left space-y-4"
    >
      <div className="flex gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#114788] text-white shrink-0">
          <Ship className="w-4 h-4" aria-hidden />
        </span>
        <div>
          <h2 id="transport-prompt-title" className="text-base font-bold text-foreground">
            {t("transport_title", { place })}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {out.length + home.length > 0 ? t("transport_body_matches") : t("transport_body_none")}
          </p>
        </div>
      </div>

      {list(out, t("transport_out", { place }))}
      {list(home, t("transport_home", { place }))}

      <Link
        href={`/transport/anmod?${requestQs}`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#114788] px-5 text-sm font-semibold text-white hover:bg-[#114788]/90 transition-colors"
      >
        {t("transport_request_cta")}
        <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
      <p className="text-xs text-muted-foreground">{t("transport_own_note")}</p>
    </section>
  )
}
