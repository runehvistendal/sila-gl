# Sila.gl — Hukommelse

## Projekt

Grønlands marketplace for hytteudlejning og samsejlads. «Grønland på lokale vilkår» — fuld teknisk kontekst: **[CLAUDE.md](CLAUDE.md)**.

## Produktstrategi — besluttet 7.5.2026

**Kanonisk fuld tekst:** [CLAUDE.md](CLAUDE.md) — afsnit **Produktstrategi — besluttet 7.5.2026**.

### Kort reference
- **Navbar:** **Ophold** (korttidsudlejning) · **Samsejlads** (sejlads med lokale). **Oplevelser** = fase 4, tredje navigationspunkt — ikke MVP.
- **Ophold UI:** **I naturen** / **I byen** — kategorien er oplevelse, ikke adgangsform; **bygd = altid «I byen»** (båd/fly underordnet).
- **Transportmodel:** tilvalg på alle opholdstyper. **Transfer** (ankomst-ruter, mønster som AddOnServicesEditor; planlagt bl.a. `from_location_id` på `transport_offers`) vs **Samsejlads** (til hytte eller fri; samme tabel/flow, navbar under Samsejlads).
- **SEO (udestår — påmind Rune):** UI som ovenfor; metadata: hytte, cabin, sommerhus, bygd, bolig, Grønland; AI SEO parallelt med Google.
- **Ikke endnu:** oplevelseskategori i MVP; langvarig udlejning (Boligportal); helikoptertransfer (private udbydere).

### Påmindelser inden lancering (fra produktstrategi)
- AI SEO-strategi skal udarbejdes
- PostHog verificeres sat op korrekt
- Stripe live-test end-to-end inkl. transfer-linjer og **ny gebyrmodel (5 % vært / 12 % gæst)**

## Status (10.5.2026)

### Nyt 10.5.2026 — åbne ønsker (dashboard), tilbud, notifikationer, gebyr, transport uden chat
- **Åbne opholdsanmodninger:** sektion fjernet fra `/ophold/i-naturen`, `/ophold/i-byen` og `/transport` — kun **dashboard** (udbyder synlighed)
- **`stay_offers.transport_price_ore`** — migration `20260510000000` (kun når anmodning har `needs_transport`)
- **Send tilbud:** transport-sektion + fuld anmodningsinfo øverst (beskrivelse, budget, badge)
- **Gæst** — `/dashboard/mine-oensker/[id]:` read-only anmodning øverst + opdelt pris pr. tilbud
- **Afslå tilbud:** `declineStayOffer`, valgfri kommentar, Dialog, status `declined` — migration `20260510020000`
- **`notifications`** + RLS — migration `20260510010000`: `createNotification`, `getUnreadCount`, `markNotificationsByType` / `markNotificationsReadByTypes`
- **Navbar:** rød prik på avatar ved ulæst; dashboard-faner: markér læst ved tab + `router.refresh()`
- **Transport-notifikationer** (`transport_offer_received` / `transport_offer_accepted`) koblet til korrekte faner
- **Chat fjernet** fra `/transport/anmodninger/[id]` — kommer efter betaling
- **Gebyrmodel** — migration `20260510030000`: 5 % platform (`platform_fee_ore`) + 12 % service (`service_fee_ore`); `money.ts`: `calcServiceFee`, `calcPlatformFee`, `calcDisplayPrice` (×1.12 på lister)
- **Kort:** gæsten ser pris inkl. 12 %; ingen ekstra «Inkl. 12 % …»-linje under pris på **CabinCard** / **TransportCard**
- **Udbyderguide økonomi:** 5 % / 95 % til vært; 12 % fra gæst via i18n (`udbyderguide.economics_guest_checkout_price`)
- **Teknisk gæld:** i18n-nøgle `booking_service_fee_3` bør omdøbes til `booking_service_fee_12` (se CLAUDE.md)
- **Fuld teknisk liste:** [CLAUDE.md](CLAUDE.md) — **Bygget og komplet** · **10.5.2026**

## Status (9.5.2026)

### Nyt 9.5.2026 — småfixes batch
- **FAQ `/faq`:** Engelsk fallback komplet (intro + 5 Q&A + 3 knapper: I naturen, I byen, Transport)
- **Navbar:** SilaLogoMark erstatter tekst-anker (desktop + mobil); Ophold-dropdown hover/focus lig bruger-menu
- **Bolig-detalje:** Dobbelt transfer-boks fjernet — kun ét «Kom dertil»-afsnit
- **ServiceFeeHelpIcon:** Tooltip konsistent i CabinBookingWidget, TransportDrawer, TransportDetailClient
- **Forside:** Hytter + boliger i én `<section>` (boliger med `mt-14 pt-14 border-t`)
- **CTA «Opret profil»:** `homeCtaCreateExperience` fjernet fra mergeSanityIntoMessages — tekst fra bundlet `home.cta.createExperience`
- **`/opret`:** Begge kort (hytte + transport) pusher altid til fast URL — ingen konditionel logik
- **Footer:** `footer.platformTransport` = «Transport»; FAQ-link bruger `footer.faq`
- **`/om`:** Fallback-tekst (4 afsnit + intro + FAQ-link) når Sanity-body er tom
- **`/anmod`:** Navbar + `pt-24` padding; kanonisk URL `?type=stay` via `guestStayRequestHref` i `cabinPublicPaths.ts`; `?type=transport` redirecter til `/transport/anmod`
- **Opholdsanmodning:** Kalender interval-mode (DatePickerButton), opholdstype-valg (cabin|residence), hurtige felter (senge + vigtigst), beskrivelse flettes server-side
- **DB-migration:** `20260507130000_cabin_requests_desired_property_type.sql` pushet med `--include-all`
- **Nav:** `nav.requestCabin` = «Anmod om ophold»; plus-dropdown har separate links til `/anmod?type=stay` og `/transport/anmod`
- **PowerShell-note:** Brug `;` ikke `&&` til kommandokæder i Cursor-terminal

## Status (8.5.2026)

### Nyt 8.5.2026 — transfer-flow ✅
- **`transfer_routes`** + RLS, `transport_type` boat|car, booking-snapshot på `cabin_bookings`
- **Udbyder:** TransferRouteEditor i HytteForm/BoligForm, `syncCabinTransferRoutes`, TransferRoutesDisplay i «Kom dertil»
- **Gæst:** CabinBookingWidget + `createCabinBooking` (Stripe-linjer: ophold, transfer, 3 %-servicegebyr; `application_fee_amount` som i CLAUDE.md)
- **Søgning:** `?transport=true` på `/ophold/i-naturen` og `/ophold/i-byen` filtrerer via `transfer_routes` (ikke `offers_transport`)
- **Detaljer:** se CLAUDE.md — **Bygget og komplet** · **Transfer-flow (8.5.2026)**

### Nyt 8.5.2026 — stay offers (opholdsønsker + tilbud) ✅
- **`stay_requests`** (rename fra `cabin_requests`) + `property_type` (`cabin` \| `residence` \| `any`) + `needs_transport` boolean
- **`stay_offers`** med RLS (id, stay_request_id, provider_id, cabin_id, offered_price_ore, message, status, stripe_session_id, stripe_payment_intent_id)
- **Udbyder:** `/dashboard/oensker/[id]` + `StayOfferForm`
- **Gæst:** `/dashboard/mine-oensker/[id]` + `StayOffersClient` — badge «X tilbud», «Se tilbud»
- **`acceptStayOffer`** → Stripe Checkout (15 % + 3 % servicegebyr); webhook `meta.type === "stay_offer"`; success `/booking/stay-offer-success`
- **Notifikationer:** `notifyStayOfferBookingConfirmed` (Resend-email + push-placeholders)
- **`formatStayRequestLocationDisplay()`** i `greenlandLocations.ts`
- **Detaljer:** CLAUDE.md — **Stay offers flow (8.5.2026)** (stay_offers)

### Nyt 8.5.2026 — Stripe onboarding ved publicering ✅
- **`requireStripeForPublish()`** i `stripe.ts`; **`StripeOnboardingRequiredModal`** (Stripe i ny fane)
- **Publicér-gates:** `publishCabin`, `saveAll` (tilgængelighed), `publishCabinListing`; klient: `checkStripeBeforePublish` + `STRIPE_PUBLISH_REQUIRED_ERROR` fra `stripePublishConstants` (kun klientfiler importerer konstanten)
- **Detaljer:** CLAUDE.md — **Stripe onboarding obligatorisk ved publicering (8.5.2026)**

## Status (7.5.2026)

### Nyt 7.5.2026

- Produktstrategi besluttet — se CLAUDE.md ## Produktstrategi
- Korttidsboligudlejning bygget: /ophold/i-naturen + /ophold/i-byen + /opret/bolig
- greenlandLocations.ts: location_type + arrival_points + hjælpefunktioner
- Hero: Ophold/Samsejlads tabs, Hvem?-felt i samsejlads
- Testdata: lokationer rettet, Maliks hytte publiceret
- Migrationer: 20260507000000, 20260507120000, 20260507140000
- **Dato-bevidst søgning** ✅ — `/hytter?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` filtrerer cabins server-side via `cabin_availability` (is_available=false-overlap) + `cabin_bookings` (status='confirmed', overlap) i `src/app/[locale]/hytter/page.tsx`. `/transport?date=YYYY-MM-DD` filtrerer ride_shares server-side med `.gte("departure_at", nuukDateToUtcIso(date))` (Nuuk-midnat → UTC) i `src/app/[locale]/transport/page.tsx`. **HeroContent** / filtre: hub + datoer; **CabinFilters**: dato-inputs i popover + chips (med X). **TransportFilters**: afrejsedato i popover + chip. Bundlet keys: `home.searchTabs.*`, `home.searchDates.*`, `hero.tab_*`. Native `<input type="date">`. Mobile-first.

## Status (6.5.2026)

### Nyt 6.5.2026

- **Servicegebyr gæst (3 %):** `service_fee_ore` (øre, NOT NULL default 0) på `cabin_bookings`, `ride_share_bookings`, `transport_offers` — migration `supabase/migrations/20260506000000_service_fee.sql` · `calcServiceFee()` i `src/lib/money.ts` · `cabin_bookings_guard_update` forbyder ændring af `service_fee_ore` (service_role/webhook undtaget som ved øvrige betalingsfelter).
- **Checkout (server autoritativ):** Hytte `createCabinBooking` (`src/app/actions/bookings.ts`) — Stripe-linjer: hytte-subtotal (+ evt. beskrivelse ved transport) + «Servicegebyr (3%)» hvor fee > 0 · `payment_intent_data.application_fee_amount` = `platform_fee_ore + service_fee_ore`. Samme mønster: `src/app/api/transport/checkout/route.ts` · transporttilbud `acceptTransportOffer` i `src/app/[locale]/transport/anmodninger/[id]/actions.ts` (`transport_offers.service_fee_ore` ved session).
- **Booking-UI:** `CabinBookingWidget.tsx`, `TransportDetailClient.tsx`, `TransportDrawer.tsx` — prisopdeling + tooltip (bundlet DA/EN: `cabins.booking_service_fee_*`, `transport.booking_service_fee_*`); klient matcher `calcServiceFee` kun til estimat/display.
- **/udbyderguide** (`src/app/[locale]/udbyderguide/page.tsx`): tekst/process/økonomi kort oprullet; hero med tre ikon-flow (Megaphone, Users, Banknote), separate betaling-sektion fjernet; CTA **«Klar til at begynde?»** + Opret profil + PDF-print nederst i økonomi-sektionen; **mobile-first** typografi/spacing/tabeller/stackede rækker på small screens.
- **Lokation & kort (sen 6.5):** Se **CLAUDE.md** «Bygget og komplet» — kort: udvidet **`greenlandLocations.ts`** (`aliases`, `region_label`, typer inkl. **hyttested / naturområde / fåreholdersted**, region-utils), **`fuse.js` + `locationSearch.ts`**, **`LocationAutocomplete`** (hero/default, portal, keyboard), **HeroContent** (HeroSearch fjernet), filtre med **`showOptionMeta={false}`**, **region-chips /hytter**, **Navbar z-40** + kort **`isolation:isolate`**, **SailSection** + live data, **`cabinMapRoutes`**, **/hytter** kort/liste (Grid/Map som transport), **MapWrapper** fjernet, **TransportMap** overview (destinations-prik, blå toner, smal hvid stroke, capitalize).

## Bygget og komplet

- **Ovenstående lokation/kort-funktionalitet** ✅ (detaljer i CLAUDE.md)
- **PostHog analytics** ✅ — `posthog-js` installeret; `PostHogProvider.tsx` initialiserer kun hvis **`NEXT_PUBLIC_POSTHOG_KEY`** og **`NEXT_PUBLIC_POSTHOG_HOST`** er sat. Provider wrappes i **`src/app/[locale]/layout.tsx`**. Events via **`src/lib/analytics/posthog-events.ts`** (booking, transport, login, kort m.fl.). Kræver env-variabler i **`.env.local`** + **Vercel** inden lancering.

---

## Status (5.5.2026 — historik under denne linje)

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

1. **Stripe live-test end-to-end** — inkl. **5 % / 12 %-model**, **stay_offers**, transfer-linjer
2. **Chat efter betaling** — `messages` kobles til booking
3. **Kontaktinfo efter betaling** + automatisk sletning (fx pg_cron)
4. **Åbne opholdsønsker på dashboard for udbydere** — allerede bygget; verificér/udbyg
5. **AI SEO-strategi**
6. **MobilePay til Stripe**
7. **Lancering** — første 20 udbydere

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

- **`RESEND_API_KEY`** + **`RESEND_FROM_EMAIL`** i Vercel environment variables (stay-offer bekræftelser m.m.)
- Destinationssider poleres
- Indholdsmæssig SEO
- Lighthouse-test
- MobilePay til Stripe
- Udbyderguide — indhold/UX opdateret 6.5; eventuel Sanity-overlay senere · se Status 6.5
- Stripe live-test end-to-end (**5 % / 12 %-gebyrmodel + stay_offers + transfer-linjer**)
- AI SEO-strategi skal udarbejdes
- PostHog verificeres sat op korrekt

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

- Stripe end-to-end IKKE testet live — kritisk før lancering (se **Næste trin** pkt. 1)
- Testbrugerne (Malik, Sara, Hans, Aviaja) er fake uden auth
- **`SANITY_API_TOKEN` må ikke commits** — behold kun i `.env.local` / Vercel

## Hurtig reference (ny chat — teknisk)

- **Proxy:** Kun `src/proxy.ts` — aldrig genopfind `middleware.ts` (Next.js 16 konflikt).
- **Locale-URLs:** `@/i18n/navigation` til `Link` / `useRouter` — ikke `next/navigation`.
- **Studio:** Kun `https://…/studio` (øverst i domænet, ikke `/da/studio`). Kræver login + `is_admin`.
- **Sanity-projekt:** `lu0y9jmk` + `production`; seed: `npm run seed:sanity` · Editor-token
- **SEO-filer:** `src/lib/metadata.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/components/seo/JsonLd.tsx`.
- **Transport-stednavne:** `getLocationName()` + **`searchLocations()`** (`locationSearch.ts`, fuse) + **`LocationAutocomplete`**
- **Historisk (6.5):** `service_fee_ore` + `calcServiceFee` introduceret som 3 % — **pr. 10.5.2026:** **12 %** service + **5 %** platform (`money.ts`, migration `20260510030000`; se Status 10.5)
- **PostHog:** se **Bygget og komplet**
