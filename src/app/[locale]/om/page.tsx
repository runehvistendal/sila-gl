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
  const content = await getPage("om-sila")
  const tStatic = await getTranslations({ locale, namespace: "staticPage" })
  const title =
    content?.[`seoTitle_${locale}`] ??
    content?.seoTitle_da ??
    content?.[`title_${locale}`] ??
    content?.title_da ??
    tStatic("fallback_title_om")
  const description =
    content?.[`seoDescription_${locale}`] ??
    content?.seoDescription_da ??
    tStatic("om_meta_description")
  return buildMetadata({ locale, title, description, path: "/om" })
}

export default async function OmPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const tStatic = await getTranslations({ locale, namespace: "staticPage" })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const content = await getPage("om-sila")
  const title =
    content?.[`title_${locale}`] ?? content?.title_da ?? tStatic("fallback_title_om")
  const body = content?.[`body_${locale}`] ?? content?.body_da ?? null

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <Navbar user={navUser} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">{title}</h1>
        {body ? (
          <PortableTextRenderer value={body} />
        ) : (
          <div className="space-y-6 text-left">
            <p className="text-muted-foreground leading-relaxed">{tStatic("om_fallback_intro")}</p>
            <p className="text-muted-foreground leading-relaxed">{tStatic("om_fallback_p1")}</p>
            <p className="text-muted-foreground leading-relaxed">{tStatic("om_fallback_p2")}</p>
            <p className="text-muted-foreground leading-relaxed">{tStatic("om_fallback_p3")}</p>
            <p className="text-muted-foreground leading-relaxed">{tStatic("om_fallback_p4")}</p>
            <div className="pt-4">
              <Link href="/faq" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                {tStatic("fallback_title_faq")} <ArrowRight className="w-4 h-4" />
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
