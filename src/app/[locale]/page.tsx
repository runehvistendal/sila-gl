import type { Metadata } from "next"
import Image from "next/image"
import { Search, Anchor, Users, Home as HomeIcon, ArrowRight } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import Navbar from "@/components/layout/Navbar"
import HeroContent from "./components/HeroContent"
import MapWrapper from "./components/MapWrapper"
import CabinCard, { type CabinCardData } from "@/components/cabins/CabinCard"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import { buildMetadata } from "@/lib/metadata"
import { JsonLd } from "@/components/seo/JsonLd"
import { getGlobalSettings, getHomePage } from "@/lib/sanity.queries"
import { sanityImage } from "@/lib/sanity"
import SectionRenderer from "@/components/sanity/SectionRenderer"
import type { Locale } from "@/i18n/routing"

export const revalidate = 3600

const FALLBACK_HERO_SRC =
  "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&h=1080&fit=crop&q=85"
const FALLBACK_OG_IMAGE =
  "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&h=630&fit=crop&q=85"

const STEP_ICONS = [Search, Anchor, HomeIcon] as const
const FEATURE_ICONS = [Users, Anchor] as const
const STAT_ICONS = [HomeIcon, Anchor, Users, Search] as const

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const tHome = await getTranslations({ locale, namespace: "home" })
  const tFooter = await getTranslations({ locale, namespace: "footer" })
  const settings = await getGlobalSettings().catch(() => null)
  const ogImage =
    settings?.heroImage != null
      ? sanityImage(settings.heroImage).width(1200).height(630).fit("crop").quality(85).url()
      : FALLBACK_OG_IMAGE
  return buildMetadata({
    locale,
    title: tFooter("brandName"),
    description: tHome("subheadline"),
    path: "",
    image: ogImage,
  })
}

export default async function Home({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [t, tCabins, sanityHome, globalSettings, cabinsResult] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "cabins" }),
    getHomePage(locale),
    getGlobalSettings().catch(() => null),
    supabase
      .from("cabins")
      .select(
        `
      id,
      title,
      location_hub,
      price_per_night_ore,
      max_guests,
      instant_book,
      offers_transport,
      images,
      amenities,
      owner_id,
      profiles!owner_id ( full_name )
    `,
      )
      .eq("published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
  ])

  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const featuredCabins: CabinCardData[] = (cabinsResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    location_hub: row.location_hub as string,
    price_per_night_ore: row.price_per_night_ore as number,
    max_guests: row.max_guests as number,
    instant_book: row.instant_book as boolean,
    offers_transport: row.offers_transport as boolean,
    images: (row.images as string[]) ?? [],
    amenities: (row.amenities as string[] | null) ?? null,
    host_name: (row.profiles as { full_name?: string } | null)?.full_name ?? null,
  }))

  const steps = ([0, 1, 2] as const).map((i) => ({
    title: t(`howItWorks.steps.${i}.title`),
    desc: t(`howItWorks.steps.${i}.desc`),
  }))
  const features = ([0, 1] as const).map((i) => ({
    label: t(`sailSection.features.${i}.label`),
    desc: t(`sailSection.features.${i}.desc`),
  }))
  const stats = ([0, 1, 2, 3] as const).map((i) => ({
    value: t(`cta.stats.${i}.value`),
    sub: t(`cta.stats.${i}.sub`),
  }))

  const tFooter = await getTranslations({ locale, namespace: "footer" })
  const heroBgSrc =
    globalSettings?.heroImage != null
      ? sanityImage(globalSettings.heroImage).width(1920).height(1080).fit("crop").quality(85).url()
      : FALLBACK_HERO_SRC

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: tFooter("brandName"),
    url: "https://sila.gl",
    description: t("subheadline"),
    potentialAction: {
      "@type": "SearchAction",
      target: `https://sila.gl/${locale}/hytter?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <main>
      <JsonLd data={websiteSchema} />
      <Navbar user={navUser} />

      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <Image
          src={heroBgSrc}
          alt={t("heroImageAlt")}
          fill
          priority
          style={{ objectFit: "cover" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
        <div className="absolute top-0 inset-x-0 h-80 overflow-hidden pointer-events-none">
          <div className="aurora-band aurora-1" />
          <div className="aurora-band aurora-2" />
          <div className="aurora-band aurora-3" />
        </div>
        <div className="relative z-10 w-full">
          <HeroContent />
        </div>
      </section>

      <section className="bg-card py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("howItWorks.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">{t("howItWorks.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i]
              const num = String(i + 1).padStart(2, "0")
              return (
                <div key={num} className="text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <p className="text-xs font-bold text-primary/50 tracking-widest uppercase mb-1">
                    {t("howItWorks.step")} {num}
                  </p>
                  <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-2">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{t("cabinsSection.title")}</h2>
              <p className="text-muted-foreground text-sm">{t("cabinsSection.subtitle")}</p>
            </div>
            <Link
              href="/hytter"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 group"
            >
              {t("cabinsSection.seeAll")}{" "}
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredCabins.length === 0 ? (
              <div className="col-span-full text-center py-16 text-muted-foreground text-sm">{tCabins("no_results")}</div>
            ) : (
              featuredCabins.map((cabin) => (
                <div key={cabin.id} className="min-w-0">
                  <CabinCard cabin={cabin} />
                </div>
              ))
            )}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/hytter"
              className="inline-flex items-center gap-1 px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {t("cabinsSection.seeAllCabins")}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary/70 text-xs font-bold tracking-widest uppercase mb-5">
                <Anchor size={14} /> {t("sailSection.uniqueLabel")}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                {t("sailSection.title")} <em className="font-normal text-primary">{t("sailSection.titleHighlight")}</em>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">{t("sailSection.desc")}</p>

              <div className="flex flex-col gap-3 mb-8">
                {features.map((f, i) => {
                  const Icon = FEATURE_ICONS[i]
                  return (
                    <div key={f.label} className="flex items-center gap-4 rounded-2xl p-4 bg-card shadow-card border border-border">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{f.label}</p>
                        <p className="text-xs text-muted-foreground">{f.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <Link
                href="/transport"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t("sailSection.findBoat")} <ArrowRight size={15} />
              </Link>
            </div>

            <div className="relative rounded-2xl overflow-hidden h-80 lg:h-96 shadow-card-hover">
              <MapWrapper />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">{t("cta.title")}</h2>
              <p className="mb-8 text-primary-foreground/70 text-lg leading-relaxed">{t("cta.subtitle")}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/opret-konto"
                  className="inline-flex items-center px-8 py-3 rounded-full text-sm font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-colors"
                >
                  {t("cta.createExperience")}
                </Link>
                <Link
                  href="/transport"
                  className="inline-flex items-center px-8 py-3 rounded-full text-sm font-semibold border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                >
                  {t("cta.transport")}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => {
                const Icon = STAT_ICONS[i]
                return (
                  <div key={i} className="bg-primary-foreground/10 rounded-2xl p-5 backdrop-blur-sm">
                    <Icon size={22} className="text-primary-foreground/60 mb-3" />
                    <p className="text-base font-bold text-primary-foreground">{stat.value}</p>
                    <p className="text-xs mt-0.5 text-primary-foreground/50">{stat.sub}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {(sanityHome?.sections?.length ?? 0) > 0 && (
        <SectionRenderer sections={sanityHome.sections} locale={locale as Locale} />
      )}
    </main>
  )
}
