import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import BoligForm, { type InitialBolig } from "../../BoligForm"

export const metadata = {
  title: "Rediger bolig — Sila.gl",
}

export default async function RedigerBoligPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const navUser = await getNavUserForPage(supabase, user)
  const t = await getTranslations("residence")

  const { data: row, error } = await supabase
    .from("cabins")
    .select(
      `
      id, title, description, location_hub, max_guests, bedrooms, bathrooms,
      residence_subtype, location_subtype, price_per_night_ore, instant_book,
      amenities, addon_services, offers_transport, transport_from,
      transport_price_roundtrip_ore, images, property_type
    `,
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (error || !row || row.property_type !== "residence") notFound()

  const initialBolig: InitialBolig = {
    id: row.id,
    title: row.title,
    description: row.description,
    location_hub: row.location_hub,
    max_guests: row.max_guests,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    residence_subtype: row.residence_subtype ?? "other",
    location_subtype: row.location_subtype ?? "city",
    price_per_night_ore: row.price_per_night_ore,
    instant_book: row.instant_book,
    facilities: (row.amenities as string[] | null) ?? [],
    addon_services: row.addon_services,
    offers_transport: row.offers_transport,
    transport_from: row.transport_from,
    transport_price_roundtrip_ore: row.transport_price_roundtrip_ore,
    images: (row.images as string[] | null) ?? [],
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar user={navUser} />

      <div className="mx-auto max-w-xl px-4 pt-20 pb-20 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("edit_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("edit_subtitle")}</p>
        </div>

        <BoligForm mode="edit" initialBolig={initialBolig} />
      </div>
    </main>
  )
}
