import Image from "next/image"
import { Search, Anchor, Star, Heart, Users, Home as HomeIcon, ArrowRight } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import Navbar from "@/components/layout/Navbar"
import HeroContent from "./components/HeroContent"
import MapWrapper from "./components/MapWrapper"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"

const STEP_ICONS = [Search, Anchor, HomeIcon] as const
const FEATURE_ICONS = [Users, Anchor] as const
const STAT_ICONS = [HomeIcon, Anchor, Users, Search] as const

const CABINS = [
  { id: 1, titleKey: "cabinsSection.demo.cabin1", location: "Ilulissat", region: "Qeqertalik", price: 1200, rating: 4.9, host: "Niels A.",  badgeKey: "cabinBadges.superhytte" },
  { id: 2, titleKey: "cabinsSection.demo.cabin2", location: "Nuuk",      region: "Sermersooq", price: 950,  rating: 4.7, host: "Sara M." },
  { id: 3, titleKey: "cabinsSection.demo.cabin3", location: "Sisimiut",  region: "Qeqertalik", price: 1450, rating: 5.0, host: "Malik P.", badgeKey: "cabinBadges.topvurderet" },
  { id: 4, titleKey: "cabinsSection.demo.cabin4", location: "Qaqortoq",  region: "Kujalleq",   price: 800,  rating: 4.8, host: "Ane K." },
  { id: 5, titleKey: "cabinsSection.demo.cabin5", location: "Tasiilaq",  region: "Sermersooq", price: 1100, rating: 4.6, host: "Peter T." },
  { id: 6, titleKey: "cabinsSection.demo.cabin6", location: "Aasiaat",   region: "Qeqertalik", price: 750,  rating: 4.9, host: "Nuka Q." },
]

type Props = {
  params: Promise<{ locale: string }>
}

export default async function Home({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations("home")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const steps = ([0, 1, 2] as const).map((i) => ({
    title: t(`howItWorks.steps.${i}.title`),
    desc:  t(`howItWorks.steps.${i}.desc`),
  }))
  const features = ([0, 1] as const).map((i) => ({
    label: t(`sailSection.features.${i}.label`),
    desc:  t(`sailSection.features.${i}.desc`),
  }))
  const stats = ([0, 1, 2, 3] as const).map((i) => ({
    value: t(`cta.stats.${i}.value`),
    sub:   t(`cta.stats.${i}.sub`),
  }))

  return (
    <main>
      <Navbar user={navUser} />

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&h=1080&fit=crop&q=85"
          alt={t("heroImageAlt")}
          fill priority
          style={{ objectFit: "cover" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
        <div className="absolute top-0 inset-x-0 h-80 overflow-hidden pointer-events-none">
          <div className="aurora-band aurora-1" />
          <div className="aurora-band aurora-2" />
          <div className="aurora-band aurora-3" />
        </div>
        <div className="relative z-10 w-full"><HeroContent /></div>
      </section>

      {/* ── Sådan virker Sila ── */}
      <section className="bg-card py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {t("howItWorks.title")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              {t("howItWorks.subtitle")}
            </p>
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

      {/* ── Hytter i naturen ── */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-2">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                {t("cabinsSection.title")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("cabinsSection.subtitle")}
              </p>
            </div>
            <Link
              href="/hytter"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 group"
            >
              {t("cabinsSection.seeAll")} <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CABINS.map((c) => (
              <div
                key={c.id}
                className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow cursor-pointer border border-border"
              >
                <div className="relative h-48 bg-secondary">
                  {c.badgeKey && (
                    <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-card/90 text-foreground">
                      {t(c.badgeKey as Parameters<typeof t>[0])}
                    </span>
                  )}
                  <button className="absolute top-3 right-3 w-7 h-7 bg-card/80 rounded-full flex items-center justify-center hover:bg-card transition-colors">
                    <Heart size={13} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground leading-snug">{t(c.titleKey as Parameters<typeof t>[0])}</p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star size={11} fill="#FBBF24" className="text-amber-400" />
                      <span className="text-xs text-muted-foreground">{c.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{c.location}, {c.region}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {c.price.toLocaleString(locale === "en" ? "en-GB" : "da-DK")} kr
                      <span className="font-normal text-muted-foreground text-xs"> {t("cabinsSection.perNight")}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{c.host}</p>
                  </div>
                </div>
              </div>
            ))}
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

      {/* ── Lokale sejlture ── */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary/70 text-xs font-bold tracking-widest uppercase mb-5">
                <Anchor size={14} /> {t("sailSection.uniqueLabel")}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                {t("sailSection.title")}{" "}
                <em className="font-normal text-primary">{t("sailSection.titleHighlight")}</em>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                {t("sailSection.desc")}
              </p>

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

      {/* ── CTA + Stats ── */}
      <section className="py-20 bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
                {t("cta.title")}
              </h2>
              <p className="mb-8 text-primary-foreground/70 text-lg leading-relaxed">
                {t("cta.subtitle")}
              </p>
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
    </main>
  )
}
