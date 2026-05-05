import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"
import { DESTINATION_SLUGS } from "@/lib/destinations"

const BASE_URL = "https://sila.gl"
const LOCALES = ["da", "en"] as const

// Public read-only client — no cookies needed for sitemap
function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["", "/hytter", "/transport", "/anmod"]
  const staticUrls: MetadataRoute.Sitemap = staticPaths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    }))
  )

  const supabase = createPublicClient()
  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, updated_at")
    .eq("published", true)
    .is("deleted_at", null)

  const cabinUrls: MetadataRoute.Sitemap = (cabins ?? []).flatMap((cabin) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/hytter/${cabin.id}`,
      lastModified: new Date(cabin.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  )

  const destinationUrls: MetadataRoute.Sitemap = DESTINATION_SLUGS.flatMap((slug) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/destination/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }))
  )

  return [...staticUrls, ...cabinUrls, ...destinationUrls]
}
