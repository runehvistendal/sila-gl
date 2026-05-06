import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import {
  ArrowRight,
  ClipboardCheck,
  Banknote,
  Home,
  Landmark,
  Megaphone,
  type LucideIcon,
  UserRound,
  Users,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import Navbar from "@/components/layout/Navbar"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"
import UdbyderguidePdfButton from "./UdbyderguidePdfButton"

export const metadata: Metadata = {
  title: "Udbyderguide — Sila.gl",
  description:
    "Kom i gang som udbyder på Sila. Udlej din hytte eller tilbyd samsejlads i Grønland.",
}

type Props = { params: Promise<{ locale: string }> }

const heroFlow: {
  icon: LucideIcon
  line: string
  hint: string
}[] = [
  {
    icon: Megaphone,
    line: "Du laver opslag",
    hint: "Hytte eller samsejlads — du sætter pris og vilkår.",
  },
  {
    icon: Users,
    line: "Folk booker",
    hint: "Gæster finder dit opslag og betaler gennem Sila.",
  },
  {
    icon: Banknote,
    line: "Du modtager pengene",
    hint: "Tryg udbetaling, når turen eller opholdet er gennemført.",
  },
]

export default async function UdbyderGuidePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const navUser = user ? await getNavUserForPage(supabase, user) : null

  const steps: { icon: LucideIcon; title: string; desc: string }[] = [
    {
      icon: UserRound,
      title: "Tilmeld dig",
      desc: "Opret en profil med navn og billede.",
    },
    {
      icon: Home,
      title: "Opret din hytte eller båd",
      desc: "Upload billeder, lav en beskrivelse og sæt din egen pris.",
    },
    {
      icon: Landmark,
      title: "Forbind din konto",
      desc: "Én registrering til sikker udbetaling. Det tager et par minutter.",
    },
    {
      icon: ClipboardCheck,
      title: "Modtag bookinger",
      desc: "De booker, og du bekræfter.",
    },
  ]

  return (
    <main className="min-h-screen bg-background" style={{ fontFamily: "var(--font-jakarta, system-ui)" }}>
      <div className="udbyderguide-no-print">
        <Navbar user={navUser} />
      </div>

      {/* Sektion 1 — Hero (mobile først → større skærme tilføjer luft og typografi) */}
      <section className="bg-primary text-primary-foreground py-12 sm:py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 lg:pt-14">
          <p className="text-xs font-bold tracking-widest text-primary-foreground/50 uppercase mb-3">
            UDBYDERGUIDE
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-balance">
            Udlej din hytte eller tilbyd transport
          </h1>
          <p className="text-primary-foreground/70 text-base sm:text-lg max-w-2xl mb-8 sm:mb-10 leading-relaxed">
            Udlej din hytte eller tag gæster med ombord. Du styrer selv prisen. Vi håndterer booking og betaling.
          </p>

          {/* Tre kort: én kolonne på mobil, tre fra sm */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {heroFlow.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.line}
                  className="min-w-0 bg-primary-foreground/10 rounded-2xl p-5 sm:p-6 lg:p-7 text-center sm:text-left shadow-sm border border-primary-foreground/10"
                >
                  <div className="flex justify-center sm:justify-start mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 flex items-center justify-center ring-1 ring-primary-foreground/20 text-primary-foreground">
                      <Icon className="size-7 shrink-0" strokeWidth={2} aria-hidden />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-primary-foreground/95 leading-snug">{s.line}</p>
                  <p className="text-sm text-primary-foreground/65 mt-2 leading-relaxed">{s.hint}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Sektion 2 — Fire trin */}
      <section className="bg-background py-12 sm:py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-bold tracking-widest text-primary mb-3">PROCESSEN</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6 sm:mb-8 md:mb-10">
            Sådan kommer du i gang
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.title}
                  className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Icon className="size-6" strokeWidth={2} aria-hidden />
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Sektion 3 — Økonomi */}
      <section className="bg-card py-12 sm:py-16 lg:py-20 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-bold tracking-widest text-primary mb-3">ØKONOMI</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            Gennemsigtig prissætning
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl leading-relaxed">
            Vi tager en fast kommission på opholdsprisen — ingen skjulte gebyrer for dig som udbyder.
          </p>
          <div className="rounded-2xl border border-border bg-background/50 overflow-hidden mb-6 sm:mb-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-start sm:gap-4 border-b border-border py-3 px-4 sm:px-6 text-sm">
              <span className="text-foreground font-medium shrink-0 sm:max-w-[60%]">Gæst betaler ved checkout</span>
              <span className="text-foreground tabular-nums sm:text-right shrink-0">
                Din aftalte pris + 3 % servicegebyr
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-start sm:gap-4 border-b border-border py-3 px-4 sm:px-6 text-sm">
              <span className="text-muted-foreground font-medium shrink-0 sm:max-w-[60%]">Silas kommission</span>
              <span className="text-muted-foreground tabular-nums sm:text-right shrink-0">
                15 % af din pris
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-start sm:gap-4 py-3 px-4 sm:px-6 text-sm">
              <span className="text-foreground font-medium shrink-0 sm:max-w-[60%]">Du modtager</span>
              <span className="font-bold text-primary tabular-nums sm:text-right shrink-0">
                85 % af din pris
              </span>
            </div>
          </div>

          {/* Priseksempel */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6 mb-6 sm:mb-8">
            <h3 className="font-semibold text-foreground mb-3">Eksempel i tal</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Din pris på ophold <span className="font-medium text-foreground">2.500 kr. pr. nat</span>,
              og gæsten booker{" "}
              <span className="font-medium text-foreground">3 nætter</span>:
            </p>
            <ul className="text-sm space-y-3 text-muted-foreground border-t border-primary/15 pt-4">
              <li className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:justify-between sm:items-baseline sm:gap-x-4">
                <span>Det tjener du på opholdet</span>
                <span className="tabular-nums font-medium text-foreground sm:text-right">7.500 kr.</span>
              </li>
              <li className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:justify-between sm:items-baseline sm:gap-x-4">
                <span>Gæstens checkout (din pris + 3 % til platform)</span>
                <span className="tabular-nums font-medium text-foreground sm:text-right">7.725 kr.</span>
              </li>
              <li className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:justify-between sm:items-baseline sm:gap-x-4 text-foreground pt-2 border-t border-primary/10">
                <span className="font-semibold">Tilbage til dig</span>
                <span className="tabular-nums font-bold text-primary sm:text-right">6.375 kr.</span>
              </li>
            </ul>
          </div>

          {/* CTA nederst i økonomi-sektionen */}
          <div
            id="kom-i-gang"
            className="udbyderguide-no-print mt-8 sm:mt-10 rounded-2xl bg-primary text-primary-foreground p-5 sm:p-6 lg:p-8 border border-primary-foreground/10 shadow-sm"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
              <p className="text-base sm:text-lg lg:text-xl font-semibold leading-snug text-balance">
                Klar til at begynde?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto min-w-0">
                <Link
                  href="/opret"
                  className="inline-flex items-center justify-center touch-manipulation min-h-12 rounded-2xl bg-primary-foreground text-primary px-6 sm:px-8 h-12 font-semibold shadow-sm hover:opacity-95 transition-opacity w-full sm:w-auto gap-2"
                >
                  Opret profil
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </Link>
                <div className="flex justify-center sm:justify-start sm:shrink-0">
                  <UdbyderguidePdfButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
