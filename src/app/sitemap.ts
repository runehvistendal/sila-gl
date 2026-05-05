import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"
import { DESTINATION_SLUGS } from "@/lib/destinations"
import { getAllPosts } from "@/lib/sanity.queries"

const BASE_URL = "https://sila.gl"
const LOCALES = ["da", "en"] as const

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Statiske sider
  const staticPaths = [
    "", "/hytter", "/transport", "/anmod",
    "/om", "/faq", "/vilkaar", "/privatlivspolitik", "/udbyderguide", "/blog",
  ]
  const staticUrls: MetadataRoute.Sitemap = staticPaths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: (path === "" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: path === "" ? 1 : path === "/hytter" || path === "/transport" ? 0.8 : 0.6,
    }))
  )

  // Publicerede hytter fra Supabase
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

  // Destinationer (statisk liste)
  const destinationUrls: MetadataRoute.Sitemap = DESTINATION_SLUGS.flatMap((slug) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/destination/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }))
  )

  // Blogindlæg fra Sanity
  let blogUrls: MetadataRoute.Sitemap = []
  try {
    const posts = (await getAllPosts()) ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blogUrls = posts.flatMap((post: any) =>
      LOCALES.map((locale) => ({
        url: `${BASE_URL}/${locale}/blog/${post.slug?.current ?? ""}`,
        lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }))
    )
  } catch {
    // Sanity er nede — sitemap fortsætter uden blogindlæg
  }

  return [...staticUrls, ...cabinUrls, ...destinationUrls, ...blogUrls]
}
