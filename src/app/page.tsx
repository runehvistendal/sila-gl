import Image from "next/image"
import Link from "next/link"
import { Search, Anchor, Star, Heart, Users, Home as HomeIcon, ArrowRight } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import HeroContent from "./components/HeroContent"
import MapWrapper from "./components/MapWrapper"
import { createClient } from "@/lib/supabase-server"
import { getNavUserForPage } from "@/lib/getNavUser"

const CABINS = [
  { id: 1, title: "Hytte ved Icefjord",   location: "Ilulissat", region: "Qeqertalik", price: 1200, rating: 4.9, reviews: 28, host: "Niels A.",  badge: "Superhytte" },
  { id: 2, title: "Fjordkig Cabin",        location: "Nuuk",      region: "Sermersooq", price: 950,  rating: 4.7, reviews: 14, host: "Sara M." },
  { id: 3, title: "Arktisk Hytteliv",      location: "Sisimiut",  region: "Qeqertalik", price: 1450, rating: 5.0, reviews: 31, host: "Malik P.",  badge: "Topvurderet" },
  { id: 4, title: "Ensomhed ved kysten",   location: "Qaqortoq",  region: "Kujalleq",   price: 800,  rating: 4.8, reviews: 9,  host: "Ane K." },
  { id: 5, title: "Midnatssol Retreat",    location: "Tasiilaq",  region: "Sermersooq", price: 1100, rating: 4.6, reviews: 17, host: "Peter T." },
  { id: 6, title: "Kyst Eventyr",          location: "Aasiaat",   region: "Qeqertalik", price: 750,  rating: 4.9, reviews: 22, host: "Nuka Q." },
]

const STEPS = [
  { num: "01", Icon: Search,   title: "Opdag",        desc: "Find autentiske oplevelser fra lokale grønlændere" },
  { num: "02", Icon: Anchor,   title: "Book direkte", desc: "Reserver din plads med øjeblikkelig bekræftelse" },
  { num: "03", Icon: HomeIcon, title: "Oplev",        desc: "Oplev Arktis på lokale vilkår — guider beholder 85% af hver booking" },
]

const FEATURES = [
  { label: "Delte pladser",   desc: "Betal per plads",        Icon: Users },
  { label: "Drevet af lokale", desc: "Autentiske oplevelser", Icon: Anchor },
]

const STATS = [
  { value: "Free to list",     sub: "Cabins listed",    Icon: HomeIcon },
  { value: "You set the price", sub: "Transport routes", Icon: Anchor },
  { value: "Direct booking",   sub: "Travelers",        Icon: Users },
  { value: "Arctic-focused",   sub: "Visibility",       Icon: Search },
]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const navUser = user ? await getNavUserForPage(supabase, user.id) : null

  return (
    <main>
      <Navbar user={navUser} />

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&h=1080&fit=crop&q=85"
          alt="Nordlys over Grønland"
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
              Sådan virker Sila
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Reserver din plads med øjeblikkelig bekræftelse
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map(({ num, Icon, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Icon size={22} className="text-primary" />
                </div>
                <p className="text-xs font-bold text-primary/50 tracking-widest uppercase mb-1">
                  Step {num}
                </p>
                <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hytter i naturen ── */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-2">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                Hytter i naturen
              </h2>
              <p className="text-muted-foreground text-sm">
                Håndplukkede eventyr fra lokale guider i Grønland
              </p>
            </div>
            <Link
              href="/hytter"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 group"
            >
              Se alle <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CABINS.map((c) => (
              <div
                key={c.id}
                className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow cursor-pointer border border-border"
              >
                <div className="relative h-48 bg-secondary">
                  {c.badge && (
                    <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-card/90 text-foreground">
                      {c.badge}
                    </span>
                  )}
                  <button className="absolute top-3 right-3 w-7 h-7 bg-card/80 rounded-full flex items-center justify-center hover:bg-card transition-colors">
                    <Heart size={13} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground leading-snug">{c.title}</p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star size={11} fill="#FBBF24" className="text-amber-400" />
                      <span className="text-xs text-muted-foreground">{c.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{c.location}, {c.region}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {c.price.toLocaleString("da-DK")} kr
                      <span className="font-normal text-muted-foreground text-xs"> / nat</span>
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
              Se alle hytter
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
                <Anchor size={14} /> Unikt for Sila
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                Lokale sejlture —{" "}
                <em className="font-normal text-primary">del båden</em>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                En grønlænder på vej til sin hytte tilbyder en ledig plads i sin båd.
                Det er sådan, folk her altid har bevæget sig — og nu kan besøgende
                rejse med. Autentisk, overkommeligt og den eneste rigtige måde at se det ægte Grønland.
              </p>

              <div className="flex flex-col gap-3 mb-8">
                {FEATURES.map(({ label, desc, Icon }) => (
                  <div key={label} className="flex items-center gap-4 rounded-2xl p-4 bg-card shadow-card border border-border">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/samsejlads"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Find en bådtur <ArrowRight size={15} />
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
                Grønland på lokale vilkår
              </h2>
              <p className="mb-8 text-primary-foreground/70 text-lg leading-relaxed">
                Autentiske arktiske oplevelser fra dem, der kalder det hjem
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/opret-konto"
                  className="inline-flex items-center px-8 py-3 rounded-full text-sm font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-colors"
                >
                  Opret din oplevelse
                </Link>
                <Link
                  href="/transport"
                  className="inline-flex items-center px-8 py-3 rounded-full text-sm font-semibold border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                >
                  Transport
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {STATS.map(({ value, sub, Icon }) => (
                <div key={value} className="bg-primary-foreground/10 rounded-2xl p-5 backdrop-blur-sm">
                  <Icon size={22} className="text-primary-foreground/60 mb-3" />
                  <p className="text-base font-bold text-primary-foreground">{value}</p>
                  <p className="text-xs mt-0.5 text-primary-foreground/50">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-foreground border-t border-foreground/10 pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <span className="text-base font-semibold block mb-3 text-primary-foreground">
                Sila.gl
              </span>
              <p className="text-xs leading-relaxed text-primary-foreground/50">
                Grønlands platform for lokale hytter, samsejlads og oplevelser.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">Platformer</p>
              <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
                <Link href="/hytter"     className="hover:text-primary-foreground transition-colors">Hytter</Link>
                <Link href="/samsejlads" className="hover:text-primary-foreground transition-colors">Samsejlads</Link>
                <Link href="/transport"  className="hover:text-primary-foreground transition-colors">Transport</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">Om Sila</p>
              <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
                <Link href="/om-os"       className="hover:text-primary-foreground transition-colors">Om os</Link>
                <Link href="/opret-konto" className="hover:text-primary-foreground transition-colors">Bliv udbyder</Link>
                <Link href="/kontakt"     className="hover:text-primary-foreground transition-colors">Kontakt</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-4 text-primary">Juridisk</p>
              <div className="flex flex-col gap-2.5 text-sm text-primary-foreground/60">
                <Link href="/privatlivspolitik" className="hover:text-primary-foreground transition-colors">Privatlivspolitik</Link>
                <Link href="/vilkaar"           className="hover:text-primary-foreground transition-colors">Vilkår</Link>
                <Link href="/cookies"           className="hover:text-primary-foreground transition-colors">Cookies</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-primary-foreground/30">
              &copy; 2026 Sila.gl — CVR: Dansk
            </p>
            <p className="text-xs text-primary-foreground/30">
              Grønlands første marketplace for lokale oplevelser
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
