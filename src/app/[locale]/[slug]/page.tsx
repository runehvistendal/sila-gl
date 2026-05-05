import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import Navbar from "@/components/layout/Navbar"
import SectionRenderer from "@/components/sanity/SectionRenderer"
import { buildMetadata } from "@/lib/metadata"
import { getNavUserForPage } from "@/lib/getNavUser"
import { createClient } from "@/lib/supabase-server"
import { getPageBySlug } from "@/lib/sanity.queries"
import type { Locale } from "@/i18n/routing"

export const revalidate = 3600

interface Props {
  params: Promise<{ locale: Locale; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) {
    return {}
  }

  const title =
    page[`seoTitle_${locale}`] ??
    page.seoTitle_da ??
    page[`title_${locale}`] ??
    page.title_da ??
    ""

  const description =
    page[`seoDescription_${locale}`] ??
    page.seoDescription_da ??
    "Grønlands platform for hytteudlejning og samsejlads"

  return buildMetadata({ title, description, locale, path: `/${slug}` })
}

export default async function DynamicSanityPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const page = await getPageBySlug(slug)
  if (!page) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <Navbar user={navUser} />
      <SectionRenderer sections={page.sections ?? []} locale={locale} />
    </main>
  )
}
