import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import { getAllPosts } from "@/lib/sanity.queries"
import { buildMetadata } from "@/lib/metadata"
import { sanityImage } from "@/lib/sanity"
import Navbar from "@/components/layout/Navbar"
import { getNavUserForPage } from "@/lib/getNavUser"
import { createClient } from "@/lib/supabase-server"
import { Link } from "@/i18n/navigation"
import { ArrowRight, Calendar } from "lucide-react"
import Image from "next/image"

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    locale,
    title: locale === "da" ? "Blog" : "Blog",
    description:
      locale === "da"
        ? "Nyheder, guides og historier fra Grønland"
        : "News, guides and stories from Greenland",
    path: "/blog",
  })
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const posts = (await getAllPosts()) ?? []

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <Navbar user={navUser} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
          {locale === "da" ? "Blog" : "Blog"}
        </h1>
        <p className="text-muted-foreground mb-10">
          {locale === "da"
            ? "Nyheder, guides og historier fra Grønland"
            : "News, guides and stories from Greenland"}
        </p>

        {posts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground mb-6">
              {locale === "da" ? "Ingen indlæg endnu." : "No posts yet."}
            </p>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              {locale === "da" ? "Tilbage til forsiden" : "Back to home"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {posts.map((post: any) => {
              const title = post[`title_${locale}`] ?? post.title_da ?? ""
              const excerpt = post[`excerpt_${locale}`] ?? post.excerpt_da ?? ""
              const slug = post.slug?.current ?? ""
              const imgUrl = post.coverImage
                ? sanityImage(post.coverImage).width(600).height(340).url()
                : null

              return (
                <Link
                  key={slug}
                  href={`/blog/${slug}`}
                  className="group rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                >
                  {imgUrl && (
                    <div className="relative aspect-[16/9] bg-muted">
                      <Image src={imgUrl} alt={title} fill className="object-cover group-hover:opacity-95 transition-opacity" />
                    </div>
                  )}
                  <div className="p-5">
                    {post.publishedAt && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(post.publishedAt).toLocaleDateString(
                          locale === "da" ? "da-DK" : "en-GB",
                          { day: "numeric", month: "long", year: "numeric" }
                        )}
                      </div>
                    )}
                    <h2 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {title}
                    </h2>
                    {excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
