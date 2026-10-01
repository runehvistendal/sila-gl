import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import Navbar from "@/components/layout/Navbar"
import { buildMetadata } from "@/lib/metadata"
import { getLocationName } from "@/lib/greenlandLocations"
import ExperiencesClient from "./ExperiencesClient"
import type { ExperienceListingItem } from "./components/ExperienceCard"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const title = locale === "en" ? "Experiences" : "Oplevelser"
  const description =
    locale === "en"
      ? "Find local experiences in Greenland"
      : "Find lokale oplevelser i Grønland"
  return buildMetadata({
    locale,
    title,
    description,
    path: "/oplevelser",
  })
}

export default async function OplevelserPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  let experiences: ExperienceListingItem[] = []

  const result = await supabase
    .from("experiences")
    .select("id, title, description, images, location_hub, price_per_person_ore")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (!result.error && Array.isArray(result.data)) {
    experiences = result.data.map((row) => {
      const imgs = Array.isArray(row.images)
        ? row.images.filter((x): x is string => typeof x === "string" && x.length > 0)
        : []

      const descRaw = row.description
      const description = typeof descRaw === "string" ? descRaw.trim() : ""

      return {
        id: row.id,
        title: row.title,
        description,
        price_per_person_ore: row.price_per_person_ore,
        location: getLocationName(row.location_hub),
        images: imgs,
      }
    })
  }

  return (
    <main>
      <Navbar user={navUser} />
      <ExperiencesClient experiences={experiences} />
    </main>
  )
}
