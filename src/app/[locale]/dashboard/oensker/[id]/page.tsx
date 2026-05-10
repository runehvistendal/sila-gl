import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { buildMetadata } from "@/lib/metadata"
import { getLocationName, formatStayRequestLocationDisplay } from "@/lib/greenlandLocations"
import { StayOfferForm } from "@/components/stays/StayOfferForm"

function stayOfferNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T12:00:00.000Z").getTime()
  const b = new Date(checkOut + "T12:00:00.000Z").getTime()
  const n = Math.round((b - a) / 86_400_000)
  return Math.max(1, n)
}

type PageProps = { params: Promise<{ locale: string; id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: "dashboard" })
  return buildMetadata({
    locale,
    title: t("stay_offer_page_title"),
    description: t("stay_offer_page_subtitle"),
    path: `/dashboard/oensker/${id}`,
  })
}

export const dynamic = "force-dynamic"

export default async function StayOfferPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/oensker/${id}`)}`)
  }

  const navUser = await getNavUserForPage(supabase, user)

  const { data: stay } = await supabase
    .from("stay_requests")
    .select(
      "id, location, desired_check_in, desired_check_out, num_guests, max_price_ore, description, property_type, status, needs_transport",
    )
    .eq("id", id)
    .maybeSingle()

  if (!stay || stay.status !== "open") {
    notFound()
  }

  let cabinQuery = supabase
    .from("cabins")
    .select("id, title, location_hub, price_per_night_ore, property_type")
    .eq("owner_id", user.id)
    .eq("published", true)
    .is("deleted_at", null)
    .order("title", { ascending: true })

  if (stay.property_type === "cabin") {
    cabinQuery = cabinQuery.eq("property_type", "cabin")
  } else if (stay.property_type === "residence") {
    cabinQuery = cabinQuery.eq("property_type", "residence")
  }

  const { data: cabinRows } = await cabinQuery

  const nights = stayOfferNights(stay.desired_check_in, stay.desired_check_out)

  const cabins = (cabinRows ?? []).map((c) => ({
    id:                  c.id,
    title:               c.title,
    locationLabel:       getLocationName(c.location_hub),
    price_per_night_ore: c.price_per_night_ore as number,
  }))

  const t = await getTranslations({ locale, namespace: "dashboard" })

  return (
    <>
      <Navbar user={navUser} />
      <main className="min-h-screen bg-gray-50 pb-16 pt-24">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <p className="text-sm text-muted-foreground mb-2">{t("stay_offer_page_subtitle")}</p>
          <h1 className="text-2xl font-bold text-foreground mb-8">{t("stay_offer_page_title")}</h1>

          <StayOfferForm
            stayRequestId={stay.id}
            stayLocation={formatStayRequestLocationDisplay(stay.location)}
            checkIn={stay.desired_check_in}
            checkOut={stay.desired_check_out}
            numGuests={stay.num_guests}
            maxPriceOre={stay.max_price_ore}
            description={stay.description}
            propertyType={String(stay.property_type ?? "any")}
            nights={nights}
            cabins={cabins}
            needsTransport={Boolean(stay.needs_transport)}
          />
        </div>
      </main>
    </>
  )
}
