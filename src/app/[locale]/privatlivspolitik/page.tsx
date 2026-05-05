import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import { getPage } from "@/lib/sanity.queries"
import { buildMetadata } from "@/lib/metadata"
import { PortableTextRenderer } from "@/components/sanity/PortableTextRenderer"
import Navbar from "@/components/layout/Navbar"
import { getNavUserForPage } from "@/lib/getNavUser"
import { createClient } from "@/lib/supabase-server"
import { Link } from "@/i18n/navigation"
import { ArrowRight } from "lucide-react"

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const content = await getPage("privatlivspolitik")
  const title =
    content?.[`seoTitle_${locale}`] ??
    content?.seoTitle_da ??
    content?.[`title_${locale}`] ??
    content?.title_da ??
    "Privatlivspolitik"
  const description =
    content?.[`seoDescription_${locale}`] ??
    content?.seoDescription_da ??
    "Sila.gl's privatlivspolitik og behandling af persondata"
  return buildMetadata({ locale, title, description, path: "/privatlivspolitik" })
}

export default async function PrivatlivspolitikPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const content = await getPage("privatlivspolitik")
  const title = content?.[`title_${locale}`] ?? content?.title_da ?? "Privatlivspolitik"
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
            <p className="text-muted-foreground mb-6">Indhold kommer snart.</p>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Tilbage til forsiden <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
