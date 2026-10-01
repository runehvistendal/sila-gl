import { redirect } from "@/i18n/navigation"
import { getAllLocationsSorted } from "@/lib/greenlandLocations"
import { nuukTodayYmd } from "@/lib/nuukTime"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import { buildMetadata } from "@/lib/metadata"
import Navbar from "@/components/layout/Navbar"
import AnmodForm, { type AnmodInitial } from "./AnmodForm"
import TransportAnmodShell from "./TransportAnmodShell"

type Search = { from?: string; to?: string; date?: string; return?: string; guests?: string; booking?: string }
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Search> }

const YMD = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Finder det kanoniske stednavn (name_dk) uanset store/små bogstaver. */
function resolvePlace(raw: string | undefined): string | undefined {
  const q = raw?.trim().toLowerCase()
  if (!q) return undefined
  return getAllLocationsSorted().find((l) => l.name_dk.toLowerCase() === q)?.name_dk
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "request" })
  return buildMetadata({
    locale,
    title: t("transport_title"),
    description: t("transport_subtitle"),
    path: "/transport/anmod",
  })
}

export default async function AnmodPage({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const qs = new URLSearchParams(
      Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"),
    ).toString()
    redirect({
      href: `/login?next=${encodeURIComponent(`/transport/anmod${qs ? `?${qs}` : ""}`)}`,
      locale,
    })
    return null
  }

  const today = nuukTodayYmd()
  const date = sp.date && YMD.test(sp.date) && sp.date >= today ? sp.date : undefined
  const returnDate = date && sp.return && YMD.test(sp.return) && sp.return > date ? sp.return : undefined
  const guests = Math.floor(Number(sp.guests))
  const initial: AnmodInitial = {
    from: resolvePlace(sp.from),
    to: resolvePlace(sp.to),
    date,
    returnDate,
    passengers: Number.isFinite(guests) && guests >= 1 ? Math.min(guests, 12) : undefined,
    bookingId: sp.booking && UUID.test(sp.booking) ? sp.booking : undefined,
  }

  const navUser = await getNavUserForPage(supabase, user)

  return (
    <>
      <Navbar user={navUser} />
      <TransportAnmodShell>
        <AnmodForm initial={initial} />
      </TransportAnmodShell>
    </>
  )
}
