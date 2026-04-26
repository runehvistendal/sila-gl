import Image from "next/image"
import Link from "next/link"
import { Search, Anchor, Star, Heart, Users, Home as HomeIcon, ArrowRight } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import HeroContent from "./components/HeroContent"
import MapWrapper from "./components/MapWrapper"

const CABINS = [
  { id: 1, title: "Hytte ved Icefjord",   location: "Ilulissat", region: "Qeqertalik", price: 1200, rating: 4.9, reviews: 28, host: "Niels A.",  bg: "#c8d8e4", badge: "Superhytte" },
  { id: 2, title: "Fjordkig Cabin",        location: "Nuuk",      region: "Sermersooq", price: 950,  rating: 4.7, reviews: 14, host: "Sara M.",   bg: "#b8ccd8" },
  { id: 3, title: "Arktisk Hytteliv",      location: "Sisimiut",  region: "Qeqertalik", price: 1450, rating: 5.0, reviews: 31, host: "Malik P.",  bg: "#b8d4d8", badge: "Topvurderet" },
  { id: 4, title: "Ensomhed ved kysten",   location: "Qaqortoq",  region: "Kujalleq",   price: 800,  rating: 4.8, reviews: 9,  host: "Ane K.",    bg: "#c0ccd4" },
  { id: 5, title: "Midnatssol Retreat",    location: "Tasiilaq",  region: "Sermersooq", price: 1100, rating: 4.6, reviews: 17, host: "Peter T.",  bg: "#b4c8d8" },
  { id: 6, title: "Kyst Eventyr",          location: "Aasiaat",   region: "Qeqertalik", price: 750,  rating: 4.9, reviews: 22, host: "Nuka Q.",   bg: "#c4d0dc" },
]

const STEPS = [
  { num: "01", Icon: Search,   title: "Opdag",        desc: "Find autentiske oplevelser fra lokale grønlændere" },
  { num: "02", Icon: Anchor,   title: "Book direkte", desc: "Reserver din plads med øjeblikkelig bekræftelse" },
  { num: "03", Icon: HomeIcon, title: "Oplev",        desc: "Oplev Arktis på lokale vilkår %EMDASH% guider beholder 85% af hver booking" },
]

const FEATURES = [
  { label: "Delte pladser",   desc: "Betal per plads",         Icon: Users },
  { label: "Drevet af lokale", desc: "Autentiske oplevelser",  Icon: Anchor },
]

const STATS = [
  { value: "Free to list",    sub: "Cabins listed",     Icon: HomeIcon },
  { value: "You set the price", sub: "Transport routes", Icon: Anchor },
  { value: "Direct booking",  sub: "Travelers",         Icon: Users },
  { value: "Arctic-focused",  sub: "Visibility",        Icon: Search },
]

export default function Home() {
  return (
    <main>
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center">
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
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-2"
            style={{ color: "#09192A" }}>
            Sådan virker Sila
          </h2>
          <p className="text-center text-gray-400 mb-16 text-sm">
            Reserver din plads med øjeblikkelig bekræftelse
          </p>
          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map(({ num, Icon, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: "#EBF5FB" }}>
                  <Icon size={22} style={{ color: "#4A9CC7" }} />
                </div>
                <p className="text-xs font-semibold tracking-widest text-gray-400 mb-1">Step {num}</p>
                <h3 className="font-semibold text-gray-900 mb-2 text-base">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hytter i naturen ── */}
      <section className="py-20" style={{ backgroundColor: "#F5F7FA" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-1">
            <h2 className="text-2xl md:text-3xl font-semibold"
              style={{ color: "#09192A" }}>
              Hytter i naturen
            </h2>
            <Link href="/hytter" className="text-sm font-medium hover:underline flex items-center gap-1"
              style={{ color: "#4A9CC7" }}>
              Se detaljer →
            </Link>
          </div>
          <p className="text-sm text-gray-400 mb-10">
            Håndplukkede eventyr fra lokale guider i Grønland
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CABINS.map((c) => (
              <div key={c.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="relative h-48" style={{ backgroundColor: c.bg }}>
                  {c.badge && (
                    <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-700">
                      {c.badge}
                    </span>
                  )}
                  <button className="absolute top-3 right-3 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                    <Heart size={13} className="text-gray-400" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{c.title}</p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Star size={11} fill="#FBBF24" className="text-amber-400" />
                      <span className="text-xs text-gray-600">{c.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{c.location}, {c.region}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {c.price.toLocaleString("da-DK")} kr
                      <span className="font-normal text-gray-400 text-xs"> / nat</span>
                    </p>
                    <p className="text-xs text-gray-400">{c.host}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lokale sejlture ── */}
      <section className="py-20" style={{ backgroundColor: "#F5F7FA" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            <div>
              <span className="text-xs font-bold tracking-widest uppercase mb-4 block"
                style={{ color: "#124788" }}>
                Unikt for Sila
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 leading-tight"
                style={{ color: "#09192A" }}>
                Lokale sejlture{" "}
                <em className="not-italic" style={{ color: "#124788" }}>— del båden</em>
              </h2>
              <p className="text-sm leading-relaxed mb-6 text-gray-600">
                En grønlænder på vej til sin hytte tilbyder en ledig plads i sin båd.
                Det er sådan, folk her altid har bevæget sig — og nu kan besøgende
                rejse med. Autentisk, overkommeligt og den eneste rigtige måde at se det ægte Grønland.
              </p>

              <div className="flex flex-col gap-3 mb-8">
                {FEATURES.map(({ label, desc, Icon }) => (
                  <div key={label} className="flex items-center gap-4 rounded-xl p-4 bg-white shadow-sm border border-gray-100">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#EBF5FB" }}>
                      <Icon size={18} style={{ color: "#4A9CC7" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/samsejlads"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#124788", color: "#ffffff" }}>
                Find en bådtur <ArrowRight size={15} />
              </Link>
            </div>

            {/* Leaflet-kort */}
            <div className="relative rounded-2xl overflow-hidden h-80 lg:h-96 shadow-xl">
              <MapWrapper />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA + Stats ── */}
      <section className="py-20" style={{ backgroundColor: "#1e3a7a" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">

            <div>
              <h2 className="text-3xl md:text-4xl font-semibold mb-4"
                style={{ color: "#ffffff" }}>
                Grønland på lokale vilkår
              </h2>
              <p className="mb-8 text-sm leading-relaxed" style={{ color: "rgba(232,244,248,0.7)" }}>
                Autentiske arktiske oplevelser fra dem, der kalder det hjem
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/opret-konto"
                  className="inline-flex items-center px-6 py-2.5 rounded-full text-sm font-semibold bg-white hover:bg-gray-100 transition-colors"
                  style={{ color: "#124788" }}>
                  Opret din oplevelse
                </Link>
                <Link href="/transport"
                  className="inline-flex items-center px-6 py-2.5 rounded-full text-sm font-semibold border hover:bg-white/10 transition-colors"
                  style={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}>
                  Transport
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {STATS.map(({ value, sub, Icon }) => (
                <div key={value} className="rounded-2xl p-5" style={{ backgroundColor: "#2d5a94" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                    <Icon size={16} style={{ color: "rgba(255,255,255,0.85)" }} />
                  </div>
                  <p className="text-base font-semibold text-white">{value}</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t pt-12 pb-8" style={{ backgroundColor: "#060f1a", borderColor: "rgba(74,156,199,0.1)" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <span className="text-base font-semibold block mb-3" style={{ color: "#E8F4F8" }}>
                Sila.gl
              </span>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(168,216,234,0.6)" }}>
                Grønlands platform for lokale hytter, samsejlads og oplevelser.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#4A9CC7" }}>Platformer</p>
              <div className="flex flex-col gap-2.5 text-sm" style={{ color: "rgba(168,216,234,0.65)" }}>
                <Link href="/hytter"     className="hover:text-white transition-colors">Hytter</Link>
                <Link href="/samsejlads" className="hover:text-white transition-colors">Samsejlads</Link>
                <Link href="/transport"  className="hover:text-white transition-colors">Transport</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#4A9CC7" }}>Om Sila</p>
              <div className="flex flex-col gap-2.5 text-sm" style={{ color: "rgba(168,216,234,0.65)" }}>
                <Link href="/om-os"       className="hover:text-white transition-colors">Om os</Link>
                <Link href="/opret-konto" className="hover:text-white transition-colors">Bliv udbyder</Link>
                <Link href="/kontakt"     className="hover:text-white transition-colors">Kontakt</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#4A9CC7" }}>Juridisk</p>
              <div className="flex flex-col gap-2.5 text-sm" style={{ color: "rgba(168,216,234,0.65)" }}>
                <Link href="/privatlivspolitik" className="hover:text-white transition-colors">Privatlivspolitik</Link>
                <Link href="/vilkaar"           className="hover:text-white transition-colors">Vilkår</Link>
                <Link href="/cookies"           className="hover:text-white transition-colors">Cookies</Link>
              </div>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderColor: "rgba(74,156,199,0.1)" }}>
            <p className="text-xs" style={{ color: "rgba(168,216,234,0.3)" }}>
              &copy; 2026 Sila.gl — CVR: Dansk
            </p>
            <p className="text-xs" style={{ color: "rgba(168,216,234,0.3)" }}>
              Grønlands første marketplace for lokale oplevelser
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}