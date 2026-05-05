import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import HytteForm from "@/app/opret/hytte/HytteForm"
import AvailabilityCalendar from "@/app/opret/hytte/[id]/tilgaengelighed/AvailabilityCalendar"

export const metadata = {
  title: "Rediger hytte — Sila.gl",
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ toast?: string }>
}

export default async function RedigerHyttePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { toast: toastParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const navUser = await getNavUserForPage(supabase, user)

  const { data: cabin, error } = await supabase
    .from("cabins")
    .select(`
      id, title, description, location_hub,
      max_guests, bedrooms,
      facilities, amenities,
      addon_services,
      offers_transport, transport_from,
      transport_price_roundtrip_ore,
      images, min_nights, preparation_days
    `)
    .eq("id", id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single()

  if (error || !cabin) notFound()

  // Blocked dates
  const { data: blockedRows } = await supabase
    .from("cabin_availability")
    .select("date")
    .eq("cabin_id", id)
    .eq("is_available", false)

  const initialBlocked = (blockedRows ?? []).map((r) => r.date as string)

  // Booked dates (confirmed + pending)
  const today = new Date().toISOString().split("T")[0]
  const { data: bookedRows } = await supabase
    .from("cabin_bookings")
    .select("check_in, check_out")
    .eq("cabin_id", id)
    .in("status", ["confirmed", "pending"])
    .gte("check_out", today)
    .is("deleted_at", null)

  const bookedDates: string[] = []
  for (const b of bookedRows ?? []) {
    const cur = new Date(b.check_in)
    const end = new Date(b.check_out)
    while (cur < end) {
      bookedDates.push(cur.toISOString().split("T")[0])
      cur.setDate(cur.getDate() + 1)
    }
  }

  const isNewlySaved = toastParam === "hytte-saved"

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-16 pb-20">
        <Link
          href="/dashboard?tab=mine-opslag"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Mine opslag
        </Link>

        {isNewlySaved && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Hytten er gemt. Upload billeder herunder, og gå derefter til{" "}
            <Link href={`/opret/opslag/hytte/${id}`} className="font-semibold underline">
              Udlej nu
            </Link>{" "}
            for at publicere opslaget.
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Rediger hytte</h1>
          <p className="text-sm text-muted-foreground">
            Opdater oplysninger og billeder.
          </p>
        </div>

        <HytteForm
          mode="edit"
          initialCabin={{
            id: cabin.id,
            title: cabin.title ?? "",
            description: cabin.description ?? "",
            location_hub: cabin.location_hub ?? "",
            max_guests: cabin.max_guests ?? 4,
            bedrooms: cabin.bedrooms ?? 1,
            facilities: (cabin.facilities ?? cabin.amenities ?? []) as string[],
            addon_services: cabin.addon_services,
            offers_transport: cabin.offers_transport ?? false,
            transport_from: cabin.transport_from ?? null,
            transport_price_roundtrip_ore: cabin.transport_price_roundtrip_ore ?? null,
            images: (cabin.images ?? []) as string[],
          }}
        />

        <section className="mt-10 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold mb-4">Tilgængelighed</h2>
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <AvailabilityCalendar
              cabinId={id}
              initialBlocked={initialBlocked}
              bookedDates={bookedDates}
              initialMinNights={(cabin as { min_nights?: number }).min_nights ?? 1}
              initialPreparationDays={(cabin as { preparation_days?: number }).preparation_days ?? 0}
              showPublishButton={false}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Link
              href={`/opret/hytte/${id}/tilgaengelighed`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Gå til tilgængelighed (fuld side) →
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
