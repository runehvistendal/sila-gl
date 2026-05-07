import type { Metadata } from "next"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { getPage } from "@/lib/sanity.queries"
import { buildMetadata } from "@/lib/metadata"
import { PortableTextRenderer } from "@/components/sanity/PortableTextRenderer"
import SectionRenderer from "@/components/sanity/SectionRenderer"
import Navbar from "@/components/layout/Navbar"
import type { Locale } from "@/i18n/routing"
import { getNavUserForPage } from "@/lib/getNavUser"
import { createClient } from "@/lib/supabase-server"
import { Link } from "@/i18n/navigation"
import { ArrowRight } from "lucide-react"

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const content = await getPage("faq")
  const tStatic = await getTranslations({ locale, namespace: "staticPage" })
  const title =
    content?.[`seoTitle_${locale}`] ??
    content?.seoTitle_da ??
    content?.[`title_${locale}`] ??
    content?.title_da ??
    tStatic("fallback_title_faq")
  const description =
    content?.[`seoDescription_${locale}`] ?? content?.seoDescription_da ?? tStatic("faq_meta_description")
  return buildMetadata({ locale, title, description, path: "/faq" })
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const tStatic = await getTranslations({ locale, namespace: "staticPage" })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const content = await getPage("faq")
  const title =
    content?.[`title_${locale}`] ?? content?.title_da ?? tStatic("fallback_title_faq")
  const body = content?.[`body_${locale}`] ?? content?.body_da ?? null

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <Navbar user={navUser} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">{title}</h1>
        {body ? (
          <PortableTextRenderer value={body} />
        ) : (
          <div className="space-y-10 py-4 text-left">
            <p className="text-muted-foreground leading-relaxed">{tStatic("faq_fallback_intro")}</p>
            <dl className="space-y-8">
              {(
                [
                  { q: "faq_fallback_q1", a: "faq_fallback_a1" },
                  { q: "faq_fallback_q2", a: "faq_fallback_a2" },
                  { q: "faq_fallback_q3", a: "faq_fallback_a3" },
                  { q: "faq_fallback_q4", a: "faq_fallback_a4" },
                  { q: "faq_fallback_q5", a: "faq_fallback_a5" },
                ] as const
              ).map(({ q, a }) => (
                <div key={q} className="border-b border-border pb-8 last:border-0 last:pb-0">
                  <dt className="text-base font-semibold text-foreground mb-2">{tStatic(q)}</dt>
                  <dd className="text-sm text-muted-foreground leading-relaxed">{tStatic(a)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
              <Link
                href="/ophold/i-naturen"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
              >
                {tStatic("faq_explore_nature")}
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                href="/ophold/i-byen"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
              >
                {tStatic("faq_explore_city")}
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                href="/transport"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
              >
                {tStatic("faq_explore_transport")}
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {(content?.sections?.length ?? 0) > 0 && (
        <SectionRenderer sections={content.sections} locale={locale as Locale} />
      )}
    </main>
  )
}
