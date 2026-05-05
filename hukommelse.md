# Sila.gl — Hukommelse

## Status (5.5.2026)
- Footer ✅ — root layout, alle sider
- /hytter, /hytter/[id], /transport, /transport/[id] ✅
- /dashboard, /anmod, /opret, /profil ✅
- Stripe Connect, bookingflow, anmeldelser, Mapbox ✅
- cabin_requests tabel ✅
- /admin ✅ — dashboard, brugere, hytter, bookinger, anmodninger (`is_admin`; `proxy.ts` + service_role)
- /opret/baad ✅ — "Gem båd" + "Gem og opret tur →"
- /opret/samsejlads ✅ — bådvælger, fra/til, dato/tid, pladser, tur/retur pris (60% enkelttur), returtur, UTC
- /opret/hytte ✅ — billeder + alle felter på én side (Cloudinary pending upload)
- /opret/hytte/[id]/tilgaengelighed ✅ — kalender, blokér datoer (ledige som standard), legende

### Nye features 5.5.2026
- **min_nights + preparation_days** på cabins ✅ — migration pushet, validering i bookings.ts (server-side), UI i AvailabilityCalendar
- **AvailabilityCalendar** — rent klik-baseret (ingen drag): klik 1 = periodestart, klik 2 = fuldfør periode. Hover-preview. Annuller-banner ✅
- **CabinSettingsCard fjernet** — settings-felter (min_nights + preparation_days) er nu inde i AvailabilityCalendar med separat "Gem indstillinger"-knap ✅
- **saveAll action** — ét kombineret kald bag "Gem og publicér →": gemmer settings + tilgængelighed + publicering atomisk ✅
- **saveAvailability** — returnerer `{ redirectTo }` / `{ error }`, aldrig `redirect()` direkte ✅
- **Tilgængelighed-links** — "Tilgængelighed"-knap på /opret og /dashboard (Mine opslag) ✅
- **preparation_days** — datoer efter booking check_out blokeres i bookingkalenderen (/hytter/[id]) ✅
- **min_nights** — booking afvises server-side hvis nights < min_nights; CabinBookingWidget viser amber-advarsel ✅
- **Rediger-siden renset** — AvailabilityCalendar fjernet; kun HytteForm + "Administrer tilgængelighed →" link ✅
- **Publish/unpublish** — publishCabin + unpublishCabin server actions ✅
- **AlertDialog** (shadcn/ui) — installeret, bruges til Afpublicér-bekræftelse ✅
- **Knaplogik Mine hytter** — Kladde: Rediger · Tilgængelighed · Publicér · Slet. Aktiv: Rediger · Tilgængelighed · Afpublicér · Dupliker · Slet ✅
- **Udlej nu/denne fjernet** fra dashboard + /opret ✅
- **Klikbar billede + navn** — aktiv → /hytter/[id], kladde → /opret/hytte/[id]/rediger (hover: opacity på billede, underline på navn) ✅
- **Øje-symbol fjernet** fra hytte-rækker (navigation sker via klikbart billede/navn) ✅

## Projekt
- Lokalt: C:\Users\rune\sila-gl
- Repo: github.com/runehvistendal/sila-gl
- Supabase: pngpelcaodbwwggaeyue (West EU Ireland)
- Primær testkonto: rune.runesen@gmail.com

## Næste trin
1. ~~i18n — dansk + engelsk med next-intl~~ ✅ FÆRDIG — se nedenfor
2. ~~SEO grundlag~~ ✅ FÆRDIG — `src/lib/metadata.ts`, `sitemap.ts`, `robots.ts`, `/destination/[slug]`, JsonLd (forside, hytte, transport, destination); polering + indhold se **Påmindelser**
3. **Sanity:** Visual Editing + Page Builder (næste opgave)
4. Stripe live-test end-to-end — kritisk inden lancering
5. PostHog analytics — installer inden lancering
6. Lancering — første 20 udbydere

## Sanity CMS (5.5.2026)
- Sanity Studio kører på `/studio` — beskyttet af `is_admin` (prioritet **før** next-intl i `proxy.ts`, da Studio ikke må få `/da`-prefix)
- **Project ID:** `lu0y9jmk`, **dataset:** `production` (`sanity.config.ts`, `sanity.cli.ts`, `NEXT_PUBLIC_SANITY_PROJECT_ID` i env)
- **Schemas:** homePage, destination, page, post, globalSettings (`sanity/schemas/`)
- Lokalisering: `_da`, `_en`, **`_kl`** (Kalaallisut forberedt; `routing` har endnu ikke `kl` — fase 4)
- **Fallback:** `content?.[`felt_${locale}`] ?? content?.felt_da`; GROQ i `safeFetch`-wrapper så manglende dataset/API ikke crasher siden
- **GROQ:** `src/lib/sanity.queries.ts` · **Portable tekst:** `src/components/sanity/PortableTextRenderer.tsx`
- **Klient:** `src/lib/sanity.ts` (next-sanity + image-url) · **Root:** `sanity.cli.ts` til CLI (`cors add` m.m.)
- **CMS-sider (locale-prefix):** `/om`, `/faq`, `/vilkaar`, `/privatlivspolitik`, `/udbyderguide`, `/blog`, `/blog/[slug]` — `revalidate = 3600` hvor relevant
- Forside + destination + footer henter Sanity med fallback til `messages` / `destinations.ts`
- **Visual Editing + Page Builder** er næste opgave

## Påmindelser inden lancering
- Destinationssider poleres
- Indholdsmæssig SEO
- Lighthouse-test
- PostHog analytics
- MobilePay til Stripe
- Udbyderguide
- Stripe live-test end-to-end

## i18n — dansk + engelsk (færdig 5.5.2026)
- **next-intl** installeret og konfigureret
- **Routing:** `localePrefix: "always"` → /da/... og /en/...
- **Filer:** `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`
- **Messages:** `messages/da.json` + `messages/en.json` (comprehensive, alle namespaces)
- **`proxy.ts`:** Next.js 16 proxy — kombinerer next-intl + Supabase; `/studio` håndteres uden locale-prefix
- **`src/app/layout.tsx`:** `<html>` / `<body>` + font; **`[locale]/layout.tsx`:** providers + Footer (ingen dobbelt shell)
- **App-struktur:** Sider under `src/app/[locale]/`; `/studio` ved roden; api/, auth/, stripe/ på rodniveau
- **Oversat:** Landingpage, /hytter, /transport, Navbar, Footer, /opret, /admin, /profil, /anmod, mange delte komponenter
- **Navbar:** Locale-skifter + `profiles.language` via server action
- **Import-fix:** `@/app/[locale]/...` hvor relevant

## Sikkerhed
- Stripe end-to-end IKKE testet live — kritisk før lancering
- Testbrugerne (Malik, Sara, Hans, Aviaja) er fake uden auth

## Hurtig reference (ny chat — teknisk)
- **Proxy:** Kun `src/proxy.ts` — aldrig genopfind `middleware.ts` (Next.js 16 konflikt).
- **Locale-URLs:** `@/i18n/navigation` til `Link` / `useRouter` — ikke `next/navigation`.
- **Studio:** Kun `https://…/studio` (øverst i domænet, ikke `/da/studio`). Kræver login + `is_admin`.
- **Sanity-projekt:** `lu0y9jmk` + `production`; CORS `localhost:3000` med credentials hvis Studio fejler.
- **SEO-filer:** `src/lib/metadata.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/components/seo/JsonLd.tsx`.
- **Transport-stednavne:** `getLocationName()` i `greenlandLocations.ts`.
- Fuld agent-kontekst: **`CLAUDE.md`** (inkl. nye afsnit om i18n, SEO, Sanity-env, Next 16).
