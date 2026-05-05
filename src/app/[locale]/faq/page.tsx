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
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-6">{tStatic("coming_soon")}</p>
            <Link href="/hytter" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              {tStatic("explore_cabins")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {(content?.sections?.length ?? 0) > 0 && (
        <SectionRenderer sections={content.sections} locale={locale as Locale} />
      )}
    </main>
  )
}
