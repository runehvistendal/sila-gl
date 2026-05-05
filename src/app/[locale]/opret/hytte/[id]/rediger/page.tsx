import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import HytteForm from "@/app/[locale]/opret/hytte/HytteForm"

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
      images
    `)
    .eq("id", id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .single()

  if (error || !cabin) notFound()

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

        <div className="mt-10 pt-8 border-t border-border">
          <Link
            href={`/opret/hytte/${id}/tilgaengelighed`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Administrer tilgængelighed →
          </Link>
        </div>
      </div>
    </main>
  )
}
