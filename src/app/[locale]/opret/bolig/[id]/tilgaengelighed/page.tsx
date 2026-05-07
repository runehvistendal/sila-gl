import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import AvailabilityCalendar from "../../../hytte/[id]/tilgaengelighed/AvailabilityCalendar"
import { CabinCreatedTracker } from "@/components/analytics/CabinCreatedTracker"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return { title: "Tilgængelighed — Sila.gl" }
}

export default async function BoligTilgaengelighedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const { id: cabinId } = await params
  const { created } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const navUser = await getNavUserForPage(supabase, user)
  const t = await getTranslations("create")

  const { data: cabin } = await supabase
    .from("cabins")
    .select(
      "id, title, published, min_nights, preparation_days, location_hub, price_per_night_ore, offers_transport, property_type",
    )
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!cabin || cabin.property_type !== "residence") notFound()

  const { data: availabilityRows } = await supabase
    .from("cabin_availability")
    .select("date")
    .eq("cabin_id", cabinId)
    .eq("is_available", false)

  const today = new Date().toISOString().split("T")[0]
  const { data: bookingRows } = await supabase
    .from("cabin_bookings")
    .select("check_in, check_out")
    .eq("cabin_id", cabinId)
    .in("status", ["confirmed", "pending"])
    .gte("check_out", today)
    .is("deleted_at", null)

  const bookedDates: string[] = []
  for (const b of bookingRows ?? []) {
    const cur = new Date(b.check_in)
    const end = new Date(b.check_out)
    while (cur < end) {
      bookedDates.push(cur.toISOString().split("T")[0])
      cur.setDate(cur.getDate() + 1)
    }
  }

  const initialBlocked = (availabilityRows ?? []).map((r) => r.date as string)

  const cabinRow = cabin as {
    title: string
    published: boolean
    min_nights: number
    preparation_days: number
    location_hub: string
    price_per_night_ore: number
    offers_transport: boolean
  }

  const isPublished = cabinRow.published
  const minNights = cabinRow.min_nights ?? 1
  const preparationDays = cabinRow.preparation_days ?? 0

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />
      {created === "1" ? (
        <CabinCreatedTracker
          cabinId={cabinId}
          location={cabinRow.location_hub}
          pricePerNightOre={cabinRow.price_per_night_ore}
          hasTransport={cabinRow.offers_transport}
        />
      ) : null}

      <div className="mx-auto max-w-2xl px-4 pt-20 pb-20">
        <div className="mb-8">
          {!isPublished && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t("step_2_of_2")}
            </p>
          )}
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {t("manage_availability_title")}
          </h1>
          <p className="text-sm font-medium text-foreground mb-6">{cabinRow.title}</p>

          <div className="rounded-xl border border-[#4A9CC7]/30 bg-[#4A9CC7]/8 px-4 py-4 text-sm text-[#1a5f7a]">
            <p className="font-semibold mb-1">{t("availability_default_info")}</p>
            <p>{t("availability_click_info")}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <AvailabilityCalendar
            cabinId={cabinId}
            initialBlocked={initialBlocked}
            bookedDates={bookedDates}
            initialMinNights={minNights}
            initialPreparationDays={preparationDays}
            showPublishButton={!isPublished}
          />
        </div>
      </div>
    </main>
  )
}
