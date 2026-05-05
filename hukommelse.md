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

### Sanity — Visual Editing, Page Builder, globale tekster (5.5.2026)

- **Visual Editing + Page Builder:** 5 sektionstyper (`heroSection`, `textImageSection`, `faqSection`, `ctaSection`, `imageGallerySection`) · `SectionRenderer.tsx` + 5 blok-komponenter under `src/components/sanity/sections/`
- **Dynamiske CMS-sider:** `src/app/[locale]/[slug]/page.tsx` (Sanity-dokumenter af typen `page`)
- **Stega / click-to-edit:** blyant-ikon i Sanity Presentation ved hover på redaktørtekst der kommer fra Sanity API (draft mode + `@sanity/client/stega`); `VisualEditing` i `[locale]/layout.tsx`
- **Klienter i `src/lib/sanity.ts`:** `getSanityPublicClient()` (CDN), `getSanityDraftStegaClient()` (preview + stega til click-to-edit), `getSanityBareTokenClient()` · `sanityFetchClient()` vælger via `draftMode()`
- **`globalSettings`:** alt hardkodet redaktørindhold + UI-labels kan styres fra Studio; **`GLOBAL_SETTINGS_SEMANTIC_FIELDS`** i `mergeSanityIntoMessages.ts` mapper `_da/_en`-felter → next-intl/dot-stier; øvrige nøgler via **`stringOverrides`** (sti + da + en). Efter seed: **63 navngivne felter + ~707 `stringOverrides`** (kan variere ved re-seed fra bundlet JSON)
- **Seed:** `scripts/seed-sanity-content.ts` (+ `npm run seed:sanity`) — udfylder `globalSettings` fra `src/i18n/bundled/da.json` + `en.json`. Kræver **Editor-rolle** på **`SANITY_API_TOKEN`** (ikke read-only); første kørsel: evt. opret ét `globalSettings`-dokument i Studio eller brug Editor-token til `create`, derefter `patch`
- **`sanityHref.tsx`:** Portable Text-links — interne via `@/i18n/navigation`, eksterne via `<a>`
- **Presentation** (`sanity.config.ts`): `defineDocuments` + `defineLocations` for **forside** (`globalSettings` + `homePage`), **destination**, **page** (`/[slug]`), **post** (blog)
- **Forsiden:** ingen mock-hytteliste — henter **3 nyeste publicerede hytter** fra Supabase (`published`, `deleted_at` null)

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
3. ~~Sanity: Visual Editing + Page Builder + globalSettings~~ ✅ FÆRDIG — se blokken ovenfor
4. **Stripe live-test end-to-end** — næste opgave · kritisk inden lancering
5. PostHog analytics — installer inden lancering
6. Lancering — første 20 udbydere

## Sanity CMS (5.5.2026 — reference)

- Sanity Studio kører på `/studio` — beskyttet af `is_admin` (prioritet **før** next-intl i `proxy.ts`, da Studio ikke må få `/da`-prefix)
- **Project ID:** `lu0y9jmk`, **dataset:** `production` (`sanity.config.ts`, `sanity.cli.ts`, `NEXT_PUBLIC_SANITY_*` i env)
- **Skema:** `homePage`, `destination`, `page`, `post`, **`globalSettings`**, samt sektionerne `heroSection`, `textImageSection`, `faqSection`, `ctaSection`, `imageGallerySection` (`sanity/schemas/` + `sections/`)
- **Rendering:** `PortableTextRenderer`, `SectionRenderer`, `sanityHref.tsx`, GROQ i `src/lib/sanity.queries.ts` (+ `getGlobalSettings` cached)
- Lokalisering: `_da`, `_en`, **`_kl`** (Kalaallisut forberedt; `routing` har endnu ikke `kl` — fase 4)
- **`request.ts` + `mergeSanityIntoMessages`:** bundlet `src/i18n/bundled/da.json` / `en.json` som struktur-/fallback‑lag; Sanity `globalSettings` overstyrer (stega ved draft)
- **CMS-sider (locale-prefix):** `/om`, `/faq`, `/vilkaar`, `/privatlivspolitik`, `/udbyderguide`, `/blog`, `/blog/[slug]`, `/[slug]` — `revalidate = 3600` hvor relevant
- **SANITY_API_TOKEN:** skal kunne **mutere** dokumenter (mindst til seed); **Editor** (ikke read-only Viewer) til `scripts/seed-sanity-content.ts` ved første `create`

## Påmindelser inden lancering

- Destinationssider poleres
- Indholdsmæssig SEO
- Lighthouse-test
- PostHog analytics
- MobilePay til Stripe
- Udbyderguide
- Stripe live-test end-to-end (**næste opgave**)

## i18n — dansk + engelsk (færdig 5.5.2026)

- **next-intl** installeret og konfigureret
- **Routing:** `localePrefix: "always"` → /da/... og /en/...
- **Filer:** `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`
- **Messages:** `messages/da.json` + `messages/en.json` (kan være tomme/minimal — init); **kanonisk tekstgrundlag til seed:** `src/i18n/bundled/da.json` · `src/i18n/bundled/en.json` · **`mergeSanityIntoMessages`** fletter `globalSettings` ind pr. locale
- **`proxy.ts`:** Next.js 16 proxy — kombinerer next-intl + Supabase; `/studio` håndteres uden locale-prefix
- **`src/app/layout.tsx`:** `<html>` / `<body>` + font; **`[locale]/layout.tsx`:** providers + Footer (ingen dobbelt shell)
- **App-struktur:** Sider under `src/app/[locale]/`; `/studio` ved roden; api/, auth/, stripe/ på rodniveau
- **Navbar:** Locale-skifter + `profiles.language` via server action
- **Locale-URLs:** `@/i18n/navigation` til `Link` / `useRouter`

## Sikkerhed

- Stripe end-to-end IKKE testet live — kritisk før lancering (**næste opgave**)
- Testbrugerne (Malik, Sara, Hans, Aviaja) er fake uden auth
- **`SANITY_API_TOKEN` må ikke commits** — behold kun i `.env.local` / Vercel

## Hurtig reference (ny chat — teknisk)

- **Proxy:** Kun `src/proxy.ts` — aldrig genopfind `middleware.ts` (Next.js 16 konflikt).
- **Locale-URLs:** `@/i18n/navigation` til `Link` / `useRouter` — ikke `next/navigation`.
- **Studio:** Kun `https://…/studio` (øverst i domænet, ikke `/da/studio`). Kræver login + `is_admin`.
- **Sanity-projekt:** `lu0y9jmk` + `production`; seed: `npm run seed:sanity` · Editor-token
- **SEO-filer:** `src/lib/metadata.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/components/seo/JsonLd.tsx`.
- **Transport-stednavne:** `getLocationName()` i `greenlandLocations.ts`.
- Fuld agent-kontekst: **`CLAUDE.md`** (inkl. nye afsnit om i18n, SEO, Sanity-env, Next 16).
