import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase-server"
import { buildMetadata } from "@/lib/metadata"
import { publishedCabinDetailPath } from "@/lib/cabinPublicPaths"

/**
 * Legacy URL /hytter/[id] → kanonisk detaljeside under /ophold/i-naturen eller /ophold/i-byen.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
  const { id, locale } = await params
  const supabase = await createClient()
  const { data: cabin } = await supabase
    .from("cabins")
    .select("title, description, images, property_type")
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .single()

  if (!cabin) return { title: "Sila.gl" }

  return buildMetadata({
    locale,
    title: cabin.title,
    description: cabin.description ?? "",
    path: publishedCabinDetailPath(cabin.property_type, id),
    image: (cabin.images as string[] | null)?.[0],
  })
}

export default async function LegacyHytterDetailRedirect({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("cabins")
    .select("property_type")
    .eq("id", id)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle()

  if (!data) notFound()

  redirect({ href: publishedCabinDetailPath(data.property_type, id), locale })
}
