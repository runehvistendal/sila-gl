import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { getPost, getAllPosts } from "@/lib/sanity.queries"
import { buildMetadata } from "@/lib/metadata"
import { sanityImage } from "@/lib/sanity"
import { PortableTextRenderer } from "@/components/sanity/PortableTextRenderer"
import SectionRenderer from "@/components/sanity/SectionRenderer"
import Navbar from "@/components/layout/Navbar"
import type { Locale } from "@/i18n/routing"
import { getNavUserForPage } from "@/lib/getNavUser"
import { createClient } from "@/lib/supabase-server"
import { Link } from "@/i18n/navigation"
import { ChevronLeft, Calendar } from "lucide-react"
import Image from "next/image"

export const revalidate = 3600

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const posts = (await getAllPosts()) ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return posts.flatMap((post: any) =>
    (["da", "en"] as const).map((locale) => ({
      locale,
      slug: post.slug?.current ?? "",
    }))
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const tStatic = await getTranslations({ locale, namespace: "staticPage" })
  const post = await getPost(slug)
  if (!post) {
    return { title: `${tStatic("meta_fallback_title")}` }
  }

  const title =
    post[`seoTitle_${locale}`] ??
    post.seoTitle_da ??
    post[`title_${locale}`] ??
    post.title_da ??
    ""
  const description = post[`seoDescription_${locale}`] ?? post.seoDescription_da ?? post[`excerpt_${locale}`] ?? ""
  const image = post.coverImage ? sanityImage(post.coverImage).width(1200).height(630).url() : undefined

  return buildMetadata({ locale, title, description, path: `/blog/${slug}`, image })
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const tStatic = await getTranslations({ locale, namespace: "staticPage" })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const post = await getPost(slug)
  if (!post) notFound()

  const title = post[`title_${locale}`] ?? post.title_da ?? ""
  const body = post[`body_${locale}`] ?? post.body_da ?? null
  const imgUrl = post.coverImage ? sanityImage(post.coverImage).width(1200).height(630).url() : null

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <Navbar user={navUser} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {tStatic("blog_all_posts")}
        </Link>

        {imgUrl && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-muted">
            <Image src={imgUrl} alt={title} fill className="object-cover" />
          </div>
        )}

        {post.publishedAt && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <Calendar className="w-4 h-4" />
            {new Date(post.publishedAt).toLocaleDateString(
              locale === "da" ? "da-DK" : "en-GB",
              { day: "numeric", month: "long", year: "numeric" }
            )}
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">{title}</h1>

        {body ? (
          <PortableTextRenderer value={body} />
        ) : (
          <p className="text-muted-foreground">{tStatic("blog_content_missing")}</p>
        )}
      </div>

      {(post?.sections?.length ?? 0) > 0 && (
        <SectionRenderer sections={post.sections} locale={locale as Locale} />
      )}
    </main>
  )
}
