# Sila.gl — CLAUDE.md

> **Claude Code & udviklerkontekst** — dette dokument er autoritativt for agent og mennesker. Kort agent-hukommelse: se `hukommelse.md` i roden.

## Status (7.5.2026)

- **Dato-bevidst søgning ✅** — Server-side filtrering på check-in/check-out (`/hytter`) og afrejsedato (`/transport`).
  - **`src/app/[locale]/hytter/page.tsx`** læser `checkIn` + `checkOut` (YYYY-MM-DD), validerer rækkefølge, og udelukker cabins med ikke-ledige rækker i `cabin_availability` (`is_available=false`, dato i `[checkIn, checkOut)`) eller bekræftede `cabin_bookings` (`status='confirmed'`, `check_in < checkOut AND check_out > checkIn`). Implementeret som `.not("id", "in", "(...)")` på cabins-querien.
  - **`src/app/[locale]/transport/page.tsx`** læser `date` (YYYY-MM-DD) og filtrerer ride_shares med `.gte("departure_at", nuukDateToUtcIso(date))` (Nuuk-midnat → UTC).
  - **`HeroContent`** har nu tabs (Hytter | Samsejlads). Hytter-tab: hub + indtjek + udtjek; Samsejlads-tab: afrejsedato. Native `<input type="date">`. Mobile-first stack, desktop side-by-side.
  - **CabinFilters**: indtjek/udtjek-input i popover + chips med X-knap under søgefeltet. `FilterValues` udvidet med `checkIn` + `checkOut`.
  - **TransportFilters**: afrejsedato-input i popover + aktiv-chip under filterrækken. `TransportFilterValues` udvidet med `date`. URL er sandhed for `date`; `TransportClient` deriver merged filters via `useMemo` og pusher URL via `@/i18n/navigation`.
  - **Bundlet:** `home.searchTabs.{aria,cabins,transport}`, `home.searchDates.{checkIn,checkOut,departure}`.

## Projekt
Grønlands marketplace for hytteudlejning og samsejlads. 
"Grønland på lokale vilkår"

- Repo: github.com/runehvistendal/sila-gl
- Lokalt: `C:\Users\rune\sila-gl`
- Base44-ref: github.com/runehvistendal/sila-2 (lokalt: `C:\Users\rune\sila-2-ref\src\`)
- Supabase: pngpelcaodbwwggaeyue (West EU Ireland)

## Produktstrategi — besluttet 7.5.2026

### Navigation (to primære kategorier i navbar)
- **Ophold** — korttidsudlejning af hytter og boliger
- **Samsejlads** — selvstændig kategori for sejlads med lokale

Oplevelser kommer i fase 4 som tredje navigationspunkt — ikke i MVP.

### Ophold — to underkategorier i UI
- **I naturen** — hytter, fjordboliger, fåreavlersteder (primært adgang med båd)
- **I byen** — boliger i byer og bygder (filtrerbart på by vs. bygd bagved i DB)

Kategorien handler om oplevelsen — ikke adgangsformen.  
En bygd er altid "I byen" uanset om man ankommer med båd eller fly.

### Transportmodel — tilvalg på alle opholdstyper
Transport er et tilvalg udbyderen aktiverer på sit opslag — uanset om det er "I naturen" eller "I byen". Udbyderen definerer selv sine ruter og priser.

**To transporttyper:**

1. **Transfer** — organiseret afhentning/aflevering ved ankomstpunkt
   - Udbyderen opretter én eller flere transferruter pr. opslag
   - Hver rute indeholder:
     - Fra: ankomstpunkt (dropdown fra GREENLAND_LOCATIONS — lufthavn, havn, helipad)
     - Til: boligens lokation (auto-udfyldt fra opslaget)
     - Transportform: båd, bil, ATV, andet (valgfrit)
     - Pris enkelttur (øre)
     - Pris tur/retur (øre) — auto-forslag 1,8x enkelttur
     - Maks. antal gæster
     - Fri tekst — udbyderen beskriver præcist hvad gæsten kan forvente
   - Gæsten vælger hvilken rute der passer til deres ankomst — eller fravælger
   - UI: ikon (🚤 🚗) + kort beskrivelse synlig på opslaget
   - Teknisk: genbruger AddOnServicesEditor-mønsteret — flere ruter pr. opslag
   - Ny DB-kolonne: from_location_id på transport_offers

2. **Samsejlads** — sejlads med lokal der alligevel tager ud
   - Knyttet til hytteopslag (transport til/fra hytte) ELLER fri (uafhængig tur)
   - Samme tabel og flow — forskellig kontekst
   - Forbliver under Samsejlads-kategorien i navbar

**Eksempel på transferruter for én udbyder:**
- Rute 1: Sisimiut havn → Sarfannguit | Båd | 350 kr / 600 kr t/r
- Rute 2: Sisimiut lufthavn → Sarfannguit | Båd | 400 kr / 700 kr t/r

### SEO-strategi (udestår — påmind Rune inden lancering)
- UI-kategorier: «I naturen» og «I byen»
- Metadata + sidetitler bruger: hytte, cabin, sommerhus, bygd, bolig, Grønland
- AI SEO (Gemini, ChatGPT, Perplexity) prioriteres parallelt med Google SEO

### Påmindelser inden lancering
- AI SEO-strategi skal udarbejdes
- PostHog verificeres sat op korrekt
- Transfer-flow bygges og testes end-to-end
- Stripe live-test inkl. transfer-linjer

### Hvad Sila.gl IKKE er (endnu)
- Ingen oplevelseskategori i MVP
- Ingen langvarig boligudlejning — hører til separat Boligportal-platform
- Ingen helikoptertransfer — ingen private udbydere kan tilbyde det

### UX-regel — lokationsvalg ved oprettelse
- Hytter bør have naturlokation som `location_hub` — guides i opret-flow (ikke teknisk håndhævet endnu)
- Boliger bør have by eller bygd som `location_hub` — `LocationAutocomplete` skal filtrere på `isInByenCategory` = true
- Samsejlads: `from_location` og `to_location` gemmes lowercase i DB — vises via `getLocationName()`

## Stack
Next.js 16 (App Router, `proxy.ts` request proxy) + TypeScript + Tailwind + **shadcn/ui** + Supabase + Vercel + **Sanity** (CMS)
**Font:** Plus Jakarta Sans

## Udvikler- og testkonti (DB)
- **Primær (brug altid denne i udvikling):** rune.runesen@gmail.com 
 `id: 313713bd-614d-46f7-b64e-16f525f98309` 
- **Test (kun reference, ikke primær adfærd):** rune.runesen.test@gmail.com 
 `id: 8c29ab7f-fe44-43ef-a1af-64eda151b2f7`

## Bygget og komplet (5.5.–9.5.2026)
- Landingpage (/)
- Auth (email + Google, httpOnly cookies via @supabase/ssr)
- Datamodel (12 tabeller inkl. boats + rate_limits, RLS, triggers)
- /opret — **2 kort:** «Udlej en hytte» / «Tilbyd transport»
- /opret/hytte (registrér hytte-aktiv, chip-UI faciliteter, transport-switch)
- /opret/baad (registrér båd-aktiv, sikkerhedsbekræftelse, chips)
- /opret/opslag/hytte/[cabinId] (publicér udlejningsopslag fra hytte)
- /opret/opslag/sejlads/[boatId] (post samsejladstur fra båd)
- /opret/hytte/[id]/rediger, /opret/baad/[id]/rediger
- /mine-hytter → redirect /dashboard?tab=mine-opslag
- /hytter (søgeside, server-side filtrering, HytterClient.tsx, facilitetsfiltre i Filtrer-popover via AMENITY_FILTER_KEYS)
- /hytter/[id] (to-kolonne layout lg:grid-cols-[1fr_384px], sticky booking-widget, galleri, CabinDetailLayout.tsx, CabinTransportSection, reviews, bookingkort. Sektionsrækkefølge: Om hytten → Inkluderet → Din vært → Kom dertil → Anmeldelser)
- /dashboard (rollebaserede tabs — se **Rollemodel**. BookingRow accordion med profil-links. Mine ønsker: transportanmodninger + hytteanmodninger. Gæsteønsker: begge typer)
- /transport (søgeside, TransportCard, Filtrer-knap med popover: bådtype, kabine, ledige pladser. TransportFilters.tsx omskrevet)
- /transport/[id] (info-kort, bookingkort, t/r-toggle, anmodningsformular, reviews, TransportDrawer for returture fra andre sejlere)
- /anmod (ny side til hytteanmodninger — server action + rate limit)
- /profil (avatar, roller, anmeldelser, telefon med landekode, email-skift via Supabase Auth, bio, sprog synkroniseret med navbar)
- Cloudinary (avatar + hyttebilleder)
- Navbar (transparent/scroll, plus-dropdown → /opret)
- NavUser: { id, fullName, avatarUrl, language } — navbar viser profilbillede og sprog dynamisk fra DB via revalidatePath
- src/lib/cabinFacilities.ts (CABIN_FACILITIES)
- src/lib/amenityMeta.ts (AMENITY_META + AMENITY_FILTER_KEYS — 18 DB-nøgler)
- src/components/shared/AddOnServicesEditor.tsx (DEL G)
- **Stripe Connect** onboarding (15 % kommission på udbyderpris — gæsten betaler tillige **3 % servicegebyr** oven i den aftalte pris; platformens **`application_fee_amount`** = kommission **+** servicegebyr) ✅
- **Hyttebooking** med Stripe Checkout + webhook (status: confirmed verificeret) — `total_price_ore` er udbyders subtotal til Connect; **`service_fee_ore`** på `cabin_bookings`; sekundær Checkout-linje «Servicegebyr (3%)» hvor afrunding > 0 ✅
- **Sikkerhedsaudit** gennemført — kritiske RLS-fejl rettet, kolonneniveau-sikkerhed på profiles ✅
- **Kalender UX:** grå strikethrough på optagede datoer (Airbnb-stil) ✅
- **Cancel-flow:** pending booking annulleres + Stripe session expires ved tilbagetryk ✅
- **pg_cron cleanup:** pending bookinger udløber automatisk efter 15 min ✅
- **Rate limiting:** `rate_limits`-tabel + `consume_rate_limit` RPC (5 forsøg / 10 min) ✅
- **Transportanmodninger:** /transport/anmod (tur-type, returdato, passagerer), /transport/anmodninger/[id] (Realtime chat, tilbudskort, accept → Stripe Checkout med servicegebyr-linje + `transport_offers.service_fee_ore`, webhook) ✅
- **Anmeldelsessystem:** dobbelt-blind (trigger), 30-dages vindue (pg_cron), alle 3 booking-typer, ReviewForm + ReviewDialog, dashboard review-knap, /profil/[id] offentlig ✅
- **Samsejlads bookingflow:** fusioneret ind i /transport (`/api/transport/checkout`) — **`ride_share_bookings.service_fee_ore`**; samme 3 %-logik — /samsejlads eksisterer ikke længere ✅
- **Mapbox kortvisning:** `TransportMap.tsx` (streets-v12; **detail** `/transport/[id]`: buet linje + HTML-markører ⚓/🏁 med blå toner; **overview** (forside, /transport, /hytter-kort): destinations-prik, ikke rute-midtpunkt; capitalize i popups; blå prik + lys hvid stroke; `isolation:isolate` på kort-wrapper) ✅
- **Returture:** `return_ride_share_id` på ride_shares, badge på listekort, alternative ture fra andre sejlere på /transport/[id] ✅
- **Timezone:** `src/lib/nuukTime.ts` — America/Godthab (UTC-3), alle departure_at vises i Nuuk-tid ✅
- **Testdata:** 4 profiler (Malik, Sara, Hans, Aviaja), 3 hytter, 8 transportture ✅
- **src/lib/notifications.ts** — placeholder funktioner (notify*) ✅
- **/profil/[id]** — offentlig profilside med anmeldelser og gennemsnitsscore ✅
- **DB: cabin_requests tabel** — guest_id, cabin_id (nullable), location, desired_check_in, desired_check_out, num_guests, max_price_ore, description, status (open|matched|cancelled|expired), RLS ✅
- **Footer** — `src/components/layout/Footer.tsx`, root layout, vises på alle sider ✅
- **/admin** — dashboard (nøgletal), /brugere, /hytter, /bookinger, /anmodninger. `is_admin` på profiles. **`proxy.ts`** + admin-layout bruger service_role til is_admin-tjek ✅
- **/opret/baad** — to knapper: "Gem båd" (→ /opret) + "Gem og opret tur →" (→ /opret/samsejlads?baadId=X) ✅
- **/opret/samsejlads** — ny side: bådvælger, fra/til (GREENLAND_LOCATIONS), dato/tid (lokal tid → UTC server-side), pladser, tur/retur-pris (primær) + enkelttur (60% auto-forslag, kan overskrives), returtur checkbox med linked ride_shares ✅
- **/opret/hytte** — billeder + alle felter på én side (PendingCabinImageUpload, Cloudinary `sila/cabins/pending`), redirect → /opret/hytte/[id]/tilgaengelighed ✅
- **/opret/hytte/[id]/tilgaengelighed** — kalender (to måneder, klik-baseret periodevalg), blokér datoer (grøn=ledig standard, grå=blokeret, blå=booket), hover-preview, infobox, legende, "Gem tilgængelighed" + "Gem indstillinger" + "Gem og publicér hytte →" ✅
- **cabin_availability semantik vendt** — gemmer nu BLOKEREDE datoer (is_available=false). Alle fremtidige datoer er ledige som standard ✅
- **Æ-fix i mappenavn** — `tilgaengelighed` (ASCII-safe, undgår Windows-fejl) ✅
- **Request proxy:** `src/proxy.ts` (Next.js 16) — next-intl + Supabase; `/studio` før intl (intet `/da`-prefix). Eksporterer `proxy` + `matcher` ✅
- **AvailabilityCalendar** — rent klik-baseret (ingen drag): klik 1 = periodestart (mørk markering), klik 2 = fuldfør periode. Hover-preview viser påvirkede datoer. Annuller-banner. Farver via inline style ✅
- **saveAvailability / saveAll** — returnerer `{ redirectTo }` / `{ error }`, aldrig `redirect()` direkte. `saveAll` gemmer settings + tilgængelighed + publicering i ét kald ✅
- **min_nights + preparation_days** — migration `20260505120000_min_nights_preparation.sql` pushet. UI i AvailabilityCalendar (settings-sektion øverst med separat "Gem indstillinger"). Server-side validering i bookings.ts. CabinBookingWidget viser amber-advarsel ved for få nætter ✅
- **preparation_days** — datoer efter booking check_out blokeres automatisk i bookingkalender på /hytter/[id] ✅
- **Slet hytte + båd** — soft delete (`deleted_at`) via `deleteCabin` / `deleteBoat` server actions ✅
- **Publish/unpublish** — `publishCabin` + `unpublishCabin` server actions i `dashboard/actions.ts` ✅
- **Knaplogik Mine hytter** (dashboard + /opret) — Kladde: Rediger · Tilgængelighed · Publicér (grøn) · Slet. Aktiv: Rediger · Tilgængelighed · Afpublicér (amber, AlertDialog) · Dupliker · Slet ✅
- **AlertDialog** (shadcn/ui) — installeret (`src/components/ui/alert-dialog.tsx`), bruges til Afpublicér-bekræftelse ✅
- **Udlej nu/denne fjernet** fra dashboard + /opret ✅
- **Klikbar billede + navn** på hytte-rækker — aktiv → /hytter/[id], kladde → /opret/hytte/[id]/rediger. Hover: opacity på billede, underline på navn ✅
- **Øje-symbol fjernet** — navigation via klikbart billede/navn ✅
- **Rediger-siden renset** — kun HytteForm (inkl. AddOnServicesEditor) + "Administrer tilgængelighed →" link. Ingen kalender-queries ✅
- **PostHog analytics** ✅ — `posthog-js` installeret; `PostHogProvider.tsx` initialiserer kun hvis **`NEXT_PUBLIC_POSTHOG_KEY`** og **`NEXT_PUBLIC_POSTHOG_HOST`** er sat. Provider wrappes i **`src/app/[locale]/layout.tsx`**. Events via **`src/lib/analytics/posthog-events.ts`** (booking, transport, login, kort m.fl.). Kræver env-variabler i **`.env.local`** + **Vercel** inden lancering.
- **Grønlands lokationsdata** — `greenlandLocations.ts`: udvidet med byer, bygder, hytte-/naturområder, fåreholdersteder; **`aliases`**, **`region_label`**, typer inkl. hyttested/naturområde/fåreholdersted; **`getLocationsByRegion`**, **`getAllRegionLabels`**, **`representativeHubForRegion`** (region-chips + hub). Tidligere dublet-nøgler (fx postnummer+navn) er indarbejdet i den samlede liste ✅
- **Fusionsøgning lokationer** — `fuse.js`; **`src/lib/locationSearch.ts`** → **`searchLocations()`** (threshold **0.4**, boost **`is_major_hub`**, sortering: hubs → typeorden → population) ✅
- **`LocationAutocomplete.tsx`** — `variant` **default|hero**, **`showOptionMeta`**, portal (`createPortal`), keyboard; **`HeroContent`** bruger **hero** + fuzzy + `?hub=`; **`HeroSearch.tsx` fjernet** ✅
- **CabinFilters + TransportFilters** — `LocationAutocomplete` erstatter rå selects på destination; **`showOptionMeta={false}`** i filterrækker (kun bynavn i listen) ✅
- **Region-chips** på **`/hytter`** (Vestgrønland, Diskobugten, …) via **`representativeHubForRegion`** ✅
- **`Navbar`** **`z-40`** + kort `isolation:isolate` — stacking mod Mapbox-lag ✅
- **`SailSection.tsx` (forsiden)** — toggle **Samsejlads|Hytter**; live **`ride_shares`** + **cabins** fra Supabase til `TransportMap` overview; **`cabinMapRoutes.ts`** (**`CabinMapPin` → ruter**, `from=to` for hytteprikker) ✅
- **`/hytter`** — liste/**kort** (samme ikon-segment som **`/transport`**: Grid/Map, kun ikoner); **`TransportMap`** overview + klik → **`/hytter/[id]`** ✅
- **MapWrapper.tsx slettet** — erstattet af SailSection + TransportMap ✅
- **Korttidsboligudlejning (7.5.2026)** ✅ — `property_type` (cabin/residence) + `residence_subtype` + `location_subtype` på cabins · migration `20260507000000_add_residences.sql` · `/ophold/i-naturen` + `/ophold/i-byen` · `/opret/bolig` · `RESIDENCE_FACILITIES` i `amenityMeta.ts` · `revalidateCabinPublic.ts` · i18n `ophold.*` / `residence.*` · sitemap opdateret
- **greenlandLocations.ts udvidet (7.5.2026)** ✅ — `location_type` (city/village/nature) + `arrival_points` (airport/helipad/harbour) på alle lokationer · `inferLocationType` + `deriveArrivalPoints` · hjælpefunktioner: `getLocationsByType`, `getArrivalPoints`, `isInByenCategory` · `getLocationName` capitalize-guard
- **Hero-søgning opdateret (7.5.2026)** ✅ — Hytter/Transport-tabs erstattet med Ophold/Samsejlads · Samsejlads-tab har nu Hvem?/antal gæster-felt · sender `guests` til `/transport?guests=X`
- **Testdata lokationer rettet (7.5.2026)** ✅ — migration `20260507120000_test_cabin_nature_hubs.sql` · Malik→Qooqqut, Sara→Eqip Sermia, Hans→Kangerluarsunnguaq · Maliks hytte publiceret via `20260507140000_publish_malik_demo_cabin.sql`

- **Transfer-flow (8.5.2026)** ✅
  - `transfer_routes` tabel med RLS (SELECT anon+auth, INSERT/UPDATE/DELETE kun ejer)
  - `transport_type`: `'boat' | 'car'` (atv + other fjernet i migrations `20260508010000` + `20260508020000`)
  - `cabin_bookings`: `transfer_route_id`, `transfer_price_ore`, `transfer_is_roundtrip`
  - `src/types/transfer.ts`: `TransferRoute` + `TransferTransportType`
  - `src/components/cabins/TransferRouteEditor.tsx`: udbyder opretter/redigerer ruter (🚤 Båd / 🚗 Bil)
  - `src/lib/syncCabinTransferRoutes.ts`: DELETE + INSERT ved gem
  - HytteForm + BoligForm: Switch «Tilbyd transfer» + TransferRouteEditor
  - Rediger-sider: henter og viser eksisterende `transfer_routes`
  - `src/components/cabins/TransferRoutesDisplay.tsx`: server component, vises i «Kom dertil»
  - CabinBookingWidget: transfervalg (radio + enkelttur/tur-retur-toggle), prisberegning inkl. servicegebyr
  - `createCabinBooking`: Stripe-linjer (ophold + transfer + servicegebyr), `application_fee_amount` = 15 % af (ophold+transfer) + servicegebyr, DB-snapshot
  - Søgefilter `?transport=true`: bruger nu EXISTS på `transfer_routes` (ikke `offers_transport`) — `src/app/[locale]/ophold/i-naturen/page.tsx` + `i-byen/page.tsx`
- **Stay offers flow (8.5.2026)** ✅
  - `stay_requests` (tidligere `cabin_requests`): `property_type` (`'cabin' \| 'residence' \| 'any'`) + `needs_transport` boolean
  - `stay_offers` tabel med RLS (id, stay_request_id, provider_id, cabin_id, offered_price_ore, message, status, stripe_session_id, stripe_payment_intent_id)
  - Udbyder-flow: `/dashboard/oensker/[id]` + `StayOfferForm`
  - Gæst-flow: `/dashboard/mine-oensker/[id]` + `StayOffersClient`
  - `acceptStayOffer` → Stripe Checkout med 15 % kommission + 3 % servicegebyr
  - Webhook: `meta.type === "stay_offer"` gren i `/api/stripe/webhook`
  - Success-side: `/booking/stay-offer-success`
  - Notifikationer: `notifyStayOfferBookingConfirmed` (email via Resend + push-placeholders)
  - Dashboard: badge «X tilbud» + «Se tilbud» på Mine ønsker
  - `formatStayRequestLocationDisplay()` i `greenlandLocations.ts`
- **Stripe onboarding obligatorisk ved publicering (8.5.2026)** ✅
  - `requireStripeForPublish()` i `stripe.ts` (`RequireStripeForPublishResult` — `'use server'`-filer bruger lokal streng `stripe_required`, ikke import af shared konstant)
  - `StripeOnboardingRequiredModal` (primær CTA åbner Stripe Account Link i **ny fane**: `window.open(…, '_blank', 'noopener,noreferrer')`)
  - Alle tre publicér-stier tjekker Stripe før publicering: `publishCabin` (dashboard), `saveAll` (tilgængelighed), `publishCabinListing` (opret/opslag)
  - Klient: `STRIPE_PUBLISH_REQUIRED_ERROR` i `@/lib/stripePublishConstants` — kun importeret i klientkomponenter (fx `DashboardClient`, `OpretPageClient`, `AvailabilityCalendar`, `HytteOpslagForm`); `checkStripeBeforePublish` før Publicér i UI hvor relevant
- **Opholdsanmodning udvidet (9.5.2026)** ✅ — `desired_property_type` (`cabin` \| `residence`) på `stay_requests` (tidligere `cabin_requests`) · kalender interval-mode · opholdstype-valg · hurtige felter · `guestStayRequestHref` i `cabinPublicPaths.ts` · `/anmod?type=stay` kanonisk · `/anmod?type=transport` → redirect `/transport/anmod` — se også **Stay offers flow (8.5.2026)** for tilbuds- og betalingsflow

## Nye filer (6.5.2026)

- `supabase/migrations/20260506000000_service_fee.sql` — `service_fee_ore` på `cabin_bookings`, `ride_share_bookings`, `transport_offers`; udvider `cabin_bookings_guard_update` med immutable `service_fee_ore`
- **`src/lib/locationSearch.ts`** (+ afhængighed **`fuse.js`**)
- **`src/lib/cabinMapRoutes.ts`**
- **`src/app/[locale]/components/SailSection.tsx`**
- **Fjernet:** `src/app/[locale]/components/MapWrapper.tsx`, `HeroSearch.tsx`

## Nye filer (5.5.2026)
- `supabase/migrations/20260505120000_min_nights_preparation.sql` — min_nights (default 1) + preparation_days (default 0, IN 0-3) på cabins
- `src/components/ui/alert-dialog.tsx` — shadcn/ui AlertDialog (installeret via npx shadcn)

## Nye filer (30.4.2026)
- `src/app/admin/` — layout.tsx, page.tsx, actions.ts, AdminSidebar.tsx, brugere/, hytter/, bookinger/, anmodninger/
- `src/app/opret/samsejlads/` — page.tsx, SamsejladsForm.tsx, actions.ts
- `src/app/opret/hytte/[id]/tilgaengelighed/` — page.tsx, AvailabilityCalendar.tsx, actions.ts
- `src/components/cabins/PendingCabinImageUpload.tsx` — Cloudinary upload uden forudgående cabin_id
- `supabase/migrations/20260430000000_is_admin.sql` — is_admin kolonne + SECURITY DEFINER funktion
- `supabase/migrations/20260430110000_cabin_availability_blocked.sql` — ryd eksisterende availability-rækker

## Nye filer (29.4.2026)
- `src/lib/amenityMeta.ts` — AMENITY_META + AMENITY_FILTER_KEYS
- `src/app/hytter/HytterClient.tsx` — klientkomponent med facilitetsfiltreringstate
- `src/components/cabins/CabinDetailLayout.tsx` — klientside layout for /hytter/[id], deler `guests`-state
- `src/components/cabins/CabinPageClient.tsx` — wrapper-komponent
- `src/components/transport/TransportDrawer.tsx` — sidepanel (shadcn Sheet) til returture; props: `id` (ride_share_id), `seats`, `onClose`
- `src/app/anmod/page.tsx` + `src/app/anmod/actions.ts` — hytteanmodnings-formular
- `src/app/dashboard/components/CabinRequestRow.tsx` (inline i DashboardClient)

## /opret flow (præcist)
- **/opret:** 2 kort (Udlej en hytte / Tilbyd transport)
- Ingen hytter → typisk /opret/hytte (direkte)
- Har hytter → inline liste med knaplogik pr. status:
  - **Kladde:** Rediger · Tilgængelighed · Publicér (grøn outline) · Slet
  - **Aktiv:** Rediger · Tilgængelighed · Afpublicér (amber, AlertDialog) · Dupliker · Slet
  - Billede/navn klikbart: aktiv → /hytter/[id], kladde → /opret/hytte/[id]/rediger
- /opret/hytte → cabin registreres med `published: false`
- /opret/hytte/[id]/tilgaengelighed → kalender + settings (min_nights, preparation_days) + publicér
- /opret/baad → aktiv registreret
- /opret/opslag/sejlads/[id] → samsejladstur
- **OBS:** "Udlej nu/denne" findes ikke længere — publicering sker via Publicér-knappen direkte

## Næste trin i prioriteret rækkefølge
1. **Stripe live-test end-to-end** — kritisk; inkl. transfer-linje + 3 %-servicegebyr
2. **from_arrival_point → dropdown** — `LocationAutocomplete` + `arrival_points`
3. **offers_transport ryddes op** — DB + formularer
4. **Admin /admin/hytter path-fix**
5. **ESLint-fixes** — `BoligForm.tsx`, `CreateForm.tsx`, `BaadForm.tsx`
6. **Sanity `request.title` → «Anmod om ophold»**
7. **AI SEO-strategi** — udestår; påmind Rune inden lancering
8. **MobilePay til Stripe** — fase 3
9. **Lancering** — første 20 udbydere

## Sanity CMS (5.5.2026)
- Sanity Studio kører på `/studio` — beskyttet af `is_admin` (`proxy.ts`: studio **før** next-intl, ellers `/da/studio`-404)
- **Project ID:** `lu0y9jmk`, **dataset:** `production` (`sanity.config.ts`, `sanity.cli.ts`, `.env`: `NEXT_PUBLIC_SANITY_PROJECT_ID`)
- **Schemas:** homePage, destination, **page**, post, globalSettings (`sanity/schemas/`) · **Page Builder-sektioner:** `heroSection`, `textImageSection`, `faqSection`, `ctaSection`, `imageGallerySection` (`sanity/schemas/sections/` + `Presentation`/`defineLocations` i `sanity.config.ts`)
- Alle relevante felter har `_da`, `_en`, **`_kl`** (Kalaallisut forberedt; `src/i18n/routing.ts` har endnu ikke `kl` — fase 4)
- **Fallback:** `content?.[`felt_${locale}`] ?? content?.felt_da`; queries i `src/lib/sanity.queries.ts` bruger fejlsikker `fetch` (null ved API/dataset-fejl)
- **Portable tekst:** `src/components/sanity/PortableTextRenderer.tsx`, **`sanityHref.tsx`** (interne links: `@/i18n/navigation`, eksterne: `<a>`) · **`SectionRenderer.tsx`** henter blokke fra CMS
- **Klient:** `src/lib/sanity.ts` (`getSanityPublicClient()`, `sanityFetchClient()`, **`getSanityDraftStegaClient()`**, `getSanityBareTokenClient()` — se **Sanity Visual Editing**)
- **Globale strenge:** `globalSettings` (navngivne `_da/_en`-felter + `stringOverrides`); merges ind i beskeder via `src/lib/i18n/mergeSanityIntoMessages.ts`. **Seed fra bundlet JSON:** `scripts/seed-sanity-content.ts` → `npm run seed:sanity` (kræver **Editor**-token, se Miljøvariabler)
- **Sider:** Eksplicitte mapper under `src/app/[locale]/` har **forrang**; **`src/app/[locale]/[slug]/page.tsx`** er dynamiske CMS-sider (`page`-dokumenter i Sanity).
- Lokale tekst-/CMS-sider: `/om`, `/faq`, `/vilkaar`, `/privatlivspolitik`, **`/udbyderguide`** (`src/app/[locale]/udbyderguide/page.tsx` — fast dansk onboarding-indhold · **mobile-first** layout 6.5; ikke Sanity-styret pt.), `/blog`, `/blog/[slug]` (+ destination `/destination/[slug]` med Sanity-overlay)
- **CORS:** Tilføj `http://localhost:3000` (og production-URL) med **Allow credentials** i Sanity dashboard for embedded Studio

### Sanity Visual Editing
- **Stega** aktiveret via **`@sanity/client/stega`**: Ved aktiv **draft mode** bruges **`getSanityDraftStegaClient()`** til fetch (encoding til click-to-edit); ellers CDN + **`getSanityPublicClient()`** uden stega (`sanityFetchClient()` i `src/lib/sanity.ts`).
- **Click-to-edit:** Blyant-ikon i Sanity **Presentation** vises kun på tekst der **kommer fra Sanity API** og med stega (preview/draft-flow). Alle publik-facing tekster der skal have blyanten skal være udfyldt i Sanity (fx `globalSettings` + felter dokumenter/sektioner — seed script udfylder `globalSettings` fra bundlet kopi).
- **Kilde til sandhed:** Faktisk indhold og globale UI-labels skal bo i **Sanity** (ikke kun i repo-JSON), hvis Presentation/stega-redigering er målet — **`messages/da.json` / `messages/en.json`** samt **`src/i18n/bundled/*.json`** er **infra + fallback** ved tomme Studio-felter (next-intl + `mergeSanityIntoMessages`).
- **Seed-script:** `scripts/seed-sanity-content.ts` — kopierer al bundlet DA/EN ind i Sanity `globalSettings`; kræver **`SANITY_API_TOKEN` med Editor-rolle** (see Miljøvariabler).
- **Page Builder på siden:** `SectionRenderer.tsx` · fem blokkomponenter under **`src/components/sanity/sections/`**.
- **Dynamisk CMS:** **`src/app/[locale]/[slug]/page.tsx`** — route-slug må ikke overlappe eksplicitte sibling-mapper på samme niveau (disse har forrang).

## Miljøvariabler (Sanity — ikke secrets i repo)
- `NEXT_PUBLIC_SANITY_PROJECT_ID` (= `lu0y9jmk`)
- `NEXT_PUBLIC_SANITY_DATASET` (typisk `production`)

### Sanity-tokens (.env.local / Vercel — må ikke commits)
- **`SANITY_API_TOKEN`** — skal have **Editor-rolle** (ikke read-only Viewer/Reader). Bruges til **seed-script**, draft-mode fetch med skriv-relaterede workflows og andre mutationer der kræver fuld CMS-adgang. Fejl **403/create** ved seed ⇒ opgrader til Editor eller opret `globalSettings` i Studio først og gentag **patch**.
- **`SANITY_API_READ_TOKEN`** (valgfri) — **read-only**; egnet til **offentlig/forhåndsvisning** hvor kun læsning er påkrævet. **Må ikke** forveksles med Editor-token til seed · **ikke** krævet til normal CDN-sidegengivelse (`getSanityPublicClient()` er typisk tokenløst).

## i18n, navigation og formatering
- **Locales:** `da`, `en` i `src/i18n/routing.ts` (`localePrefix: "always"`). **`kl` kommer senere** — Sanity-felter `_kl` findes allerede.
- **Navigation:** Brug **`Link`, `redirect`, `useRouter`, `usePathname`** fra `@/i18n/navigation` — ikke `next/navigation` — så URLs får korrekt `/da/` eller `/en/`-prefix.
- **Sprog i DB:** `profiles.language` som `'da' | 'en'`; Navbar kalder **`updateLanguage`** (`src/app/actions/language.ts`).
- **Efter OAuth:** `src/app/auth/callback/route.ts` omdirigerer til brugerens foretrukne locale (`profiles.language`) og stripper evt. forkert prefixed `next`-URL.
- **Oversættelser / next-intl:** `messages/da.json` + `messages/en.json` (kan være tomme eller minimale til init); **kanonisk bundlet fallback-struktur:** `src/i18n/bundled/da.json` + `src/i18n/bundled/en.json` · Runtime: `mergeSanityIntoMessages` lægger **Sanity `globalSettings`** ovenpå før **`getTranslations`** / **`useTranslations`**. Ved nye strenge til redaktør- og global UI-copy: tilføj som **Sanity-felt** eller `stringOverrides` — se **Sanity Visual Editing** + **Sikkerhedsregler** (indhold fra Sanity). **Ny (6.5, kort/UI):** bl.a. `home.sailMapTabs`, `home.cabinMapSection` (titleLead/titleHighlight), `cabins.view_on_map` / `view_list`.
- **Dato/pris:** Klient: **`useFormatter()`** fra `next-intl` og **`useFormatPrice()`** (`src/hooks/useFormatPrice.ts`). Server: `getFormatter()` hvor relevant. Penge i DB forbliver **øre** (`src/lib/money.ts`).
- **Lokationsnavne (transport):** `getLocationName()` i `src/lib/greenlandLocations.ts` — DB gemmer lowercase nøgle; vis **`name_dk`**.

## SEO og metadata (implementeret grundlag)
- **`buildMetadata`** — `src/lib/metadata.ts` (canonical, hreflang DA/EN, Open Graph, Twitter).
- **Structured data:** `src/components/seo/JsonLd.tsx` med `cleanSchema()` (ingen `undefined` i JSON-LD).
- **Sitemap / robots:** `src/app/sitemap.ts`, `src/app/robots.ts` (rod under `src/app/`).
- **Destination:** `src/app/[locale]/destination/[slug]/page.tsx`, statisk liste i `src/lib/destinations.ts`; Sanity **`getDestination`** kan overskrive beskrivelse/hero/metadata med fallback til `DESTINATIONS`.
- **`next-intl` plugin:** `next.config.ts` via `createNextIntlPlugin("./src/i18n/request.ts")`.

## Next.js 16 — vigtige filer
- **`src/proxy.ts`** — eneste request-proxy (uden `middleware.ts`). **`export async function proxy`** + **`export const config.matcher`**. Kombinerer next-intl og Supabase; **`/studio` afkortet før intl**.
- **`src/app/layout.tsx`** — global `<html>` / `<body>`, font, **`getLocale()`** til `lang`. **`src/app/[locale]/layout.tsx`** — `NextIntlClientProvider`, Footer, Toaster (ingen anden dokument-shell).
- **Next.js dokumentation:** Læs `node_modules/next/dist/docs/` før antagelser om API (se `AGENTS.md`).

## Kendte huller / teknisk gæld
- **Sanity `request.title`** — hvis «Anmod om hytte» stadig vises i overskriften, skal feltet opdateres i Studio til «Anmod om ophold» eller overlay fjernes for den nøgle
- **Placeholder-migrationer** — `20260507124840` og `20260507130619` eksisterer kun som no-op placeholders lokalt (remote kørte dem på en anden maskine). Erstat med de rigtige scripts før nye miljøer sættes op.
- **cookies-side:** Footer linker ikke længere til `/cookies`; hvis politikken skal frem — tilføj side (evt. Sanity `page` slug `cookies`) eller link fra footer.
- **offers_transport forældet (delvist)** — kolonnen eksisterer stadig i DB, HytteForm + BoligForm. Legacy Stripe-gren (`transportTotalOre`) bevaret for gamle hytter. Kan droppes når `offers_transport`-data er migreret til `transfer_routes`.
- **from_arrival_point er fri tekst** — i næste sprint erstattes med dropdown fra `arrival_points` i `greenlandLocations.ts` (`LocationAutocomplete` med ankomstpunkter).
- **Ankomstpunkt-valg i /opret/bolig** — udbyderen kan kun skrive fri tekst; skal guides til `arrival_points` fra `greenlandLocations.ts`.
- **Admin `/admin/hytter`** — bolig-rækker bruger stadig `/hytter/{id}` — skal bruge `publishedCabinDetailPath`
- **ESLint `react-hooks/set-state-in-effect`** i `BoligForm.tsx`, `CreateForm.tsx`, `BaadForm.tsx` — rettes inden CI skal være grøn

## Påmindelser inden lancering
- Destinationssider poleres
- Indholdsmæssig SEO
- Lighthouse-test
- MobilePay til Stripe
- ~~Udbyderguide~~ → opdateret 6.5 (evt. Sanity-overlay / flersprog senere)
- Stripe live-test end-to-end (**3 %-servicegebyr + transfer-linjer**)
- AI SEO-strategi skal udarbejdes
- PostHog verificeres sat op korrekt
- Aktiver: cabins (hytte) + boats (båd) — gemmes med `published=false` indtil opslag
- Opslag: opret/opslag/hytte/[id] publicerer hytte, opret/opslag/sejlads/[id] poster tur
- skipper_id alias: brug `sejler_id:skipper_id` i SQL-select — sejler_id i TypeScript

## Designregel
Kopiér design 1:1 fra sila-2-ref inden en ny side bygges. 
Læs altid den tilsvarende Base44-fil **FØR** du skriver kode.

## Rollemodel (`profiles.role_type`)
Værdier: `'traveler' | 'provider' | 'both'`

- Default: **traveler**
- Opretter hytte/båd og var **traveler** → **both**
- **Dashboard tabs**
 - **traveler:** Bookinger, Mine ønsker, Indbakke 
 - **provider:** Bookinger, Gæsteønsker, Mine opslag, Indbakke 
 - **both:** alle tabs
- **Fast sektion (traveler):** «Har du en hytte eller båd?» / «Udlej din hytte eller tilbyd transport.»

Rolle-**UPDATE** (reconcile, server): `src/lib/supabase-service.ts` med **`SUPABASE_SERVICE_ROLE_KEY`** (`.env.local` + Vercel) — se **Sikkerhed** nedenfor.

## Prismodel — transport
- Udbyder angiver tur/retur-pris i **øre**
- Enkeltbillet: `Math.round(roundtrip_ore * 0.6)` automatisk
- I DB: bl.a. `price_per_seat_roundtrip_ore` + `price_per_seat_ore` (bekræft præcise kolonnenavne i schema; se også **cabins** nedenfor)

## Sikkerhedsregler — må ALDRIG brydes
- **Redaktør- og CMS-indhold fra Sanity:** Globale tekster og UI-labels (**`globalSettings`** + øvrige Sanity-dokumenter / sektionstyper) er **sandhed til visning**. **Ikke hardkodet** synlig tekst i JSX eller **kun** som **eneste** kopieringskilde i **`messages/*.json`** / **`src/i18n/bundled/*.json`** — disse er **fallback/infra** til next-intl; indhold der skal kunne redigeres i Presentation skal bo i **Sanity**. **Ny tekst på nye sider** skal tilføjes som **Sanity-schemafelt** eller **`stringOverrides`**, ikke som hardkodet streng i repo.
- Roller server-side via Supabase RLS — **ALDRIG** localStorage
- Stripe-pris **ALTID** server-side (API route / server action) — **aldrig** fra frontend
- JWT i **httpOnly** cookies via @supabase/ssr — **ALDRIG** localStorage
- **service_role** (`createServiceClient` i `supabase-service.ts`): bruges **KUN** til UPDATE af `profiles.role_type` (reconcile) + cancel-operationer der passerer update-guard-trigger — **aldrig** som generel dataklient. Øvrige queries: almindelig **anon + session** (`createClient` server).
- `host_id` / `owner_id` sættes via `auth.uid()` server-side
- Reviews kræver completed booking (RLS)
- Admin-ruter: `proxy.ts` + RLS
- Filtrering **ALTID** i Supabase query — aldrig «hemmelig» forretningslogik kun client-side
- **profiles følsomme felter** (`stripe_account_id`, `phone`, `stripe_onboarding_complete`): læses **ALDRIG** direkte via `.from("profiles").select(...)` fra klientkode eller server actions — brug udelukkende:
 - `get_my_sensitive_profile()` — egne data
 - `get_owner_stripe_info(cabin_id)` — ejerens Stripe-info i bookingflow
- **cabin_bookings immutable felter** (`total_price_ore`, `platform_fee_ore`, **`service_fee_ore`**, `stripe_session_id`, `stripe_payment_intent_id`, `guest_id`, `cabin_id`, `check_in`, `check_out`, `num_guests`): beskyttet af BEFORE UPDATE trigger `cabin_bookings_guard_update` — service_role passerer (auth.uid() IS NULL)
- **handle_new_user trigger**: fallback `full_name = 'Sila-bruger'` — aldrig email som fallback
- **Ingen console.log** af service role key eller andre secrets — ikke engang prefix
- **Rate limiting**: alle server actions der skriver kritiske data bruger `consume_rate_limit` RPC
- **ride_shares lokationer**: `from_location` og `to_location` gemmes som **lowercase** i DB — visning altid via `getLocationName()` fra `GREENLAND_LOCATIONS` (name_dk)
- **departure_at**: gemmes som UTC i DB — vises KUN via `src/lib/nuukTime.ts` (America/Godthab, UTC-3)
- **/samsejlads eksisterer ikke** — al funktionalitet (søgeside, detaljeside, opret, bekræftelse) er på **/transport**
- `TransportMap.tsx` erstatter de slettede `SejlruteMap.tsx` og `SamsejladsOversigt.tsx`
- **Alternative returture query**: `WHERE from_location = [to_location] AND skipper_id != [denne turs skipper_id]` — vises kun når `return_ride_share_id IS NULL`
- **cabin_availability** gemmer BLOKEREDE datoer (`is_available=false`). Alle fremtidige datoer er ledige som standard — gem kun undtagelserne
- **Admin-middleware** bruger `createClient` fra `@supabase/supabase-js` med `SUPABASE_SERVICE_ROLE_KEY` til is_admin-tjek (RLS blokerer anon-key)
- **Mappenavne i Next.js**: brug aldrig æ/ø/å i route-mapper på Windows — brug ae/oe/aa (fx `tilgaengelighed`, ikke `tilgængelighed`)
- **/opret/samsejlads pris-logik**: tur/retur er primær (påkrævet). Enkelttur = 60% af tur/retur som auto-forslag — sejleren kan overskrive frit. Gem begge i DB: `price_per_seat_roundtrip_ore` + `price_per_seat_ore`

## Privatlivs- og kommunikationsregel — må ALDRIG brydes
- Vis **ALDRIG** bruger-e-mails i UI — brug `full_name` (fallback: «Sila-sejler» / «Sila-udbyder»)
- Ingen direkte kontaktinfo (e-mail, telefon, sociale medier) på sider
- Platformen er **eneste** kommunikationskanal; beskeder: diskret at aftaler indgås på platformen
- SELECT til frontend-komponenter: **aldrig** e-mail-kolonner

## Pengebeløb — KRITISK
- ALLE beløb i databasen = **øre** (integer), **aldrig** float/decimal til penge
- Konvertering og **gæste-servicegebyr (3 % af udbyder-subtotal i øre)** **KUN** i `src/lib/money.ts`: `oreToKr()`, `krToOre()`, **`calcServiceFee(total_price_ore)`** → `Math.round(total_price_ore * 0.03)` (server-side sandhed i checkout; UI må vise samme formlen som estimat)
- Aldrig rå øre vilkårligt i UI — kør gennem `money.ts` / `useFormatPrice`
- **Stripe:** forventer typisk heltals-øre i flows — hold server-side, send direkte i øre hvor det er defineret sådan
- **Betaling gæst:** Checkout-summen = `total_price_ore` (til connected account som subtotal fratrukket 15 % platform) + **service_fee_ore**; `application_fee_amount` = **15 %-andel + service_fee_ore** (platform beholder begge)

## ride_shares — korrekte kolonner
| Kolonne | Type | Bemærkning |
|------------------|-------------|---------------------------------------------|
| departure_at | timestamptz | IKKE departure_date + departure_time separat |
| status | enum | IKKE `active` boolean. Aktive: f.eks. `active` |
| boat_description | text | IKKE `boat_type` |
| description | text | IKKE `notes` |
| from_latitude | numeric | NOT NULL |
| from_longitude | numeric | NOT NULL |
| to_latitude | numeric | NOT NULL |
| to_longitude | numeric | NOT NULL |

Findes **IKKE:** `images`, `boat_type`, `departure_date`, `active` (semantisk fejl hvis forvekslet)

## cabins — vigtige kolonner
- `owner_id` (IKKE `host_id`)
- `transport_price_per_person_ore` (IKKE `transport_price_ore`)

## cabin_requests — kolonner
| Kolonne | Type | Bemærkning |
|----------------------|-------------|-------------------------------|
| id | uuid | PK |
| guest_id | uuid | NOT NULL, FK → profiles |
| cabin_id | uuid | nullable — NULL = generelt ønske |
| location | text | ønsket destination |
| desired_check_in | date | NOT NULL |
| desired_check_out | date | NOT NULL |
| num_guests | integer | NOT NULL, min 1 |
| max_price_ore | integer | nullable budget |
| description | text | nullable |
| status | text | open \| matched \| cancelled \| expired |
| created_at | timestamptz | |
| deleted_at | timestamptz | nullable (soft delete) |

## profiles
- `role_type`: 'traveler' | 'provider' | 'both'

## Faciliteter — hytte
Basis: Sengelinned, Håndklæder, Toilet indendørs, Udendørs toilet, Rindende vand, Varmt vand, Opvarmning, Elektricitet, Køkken, Køleskab 
Udendørs: Terrasse, Grill, Bålplads, Kajak, Fiskegrej 
Komfort: Wifi, TV, Vaskemaskine, Opvaskemaskine, Kaffemaskine, Fryseboks 
Sikkerhed: Røgalarm, Brandslukning, Førstehjælpskasse, Låsbar dør 
+ fri tekst «Andet»-sektion

## Faciliteter — båd
Sikkerhed (bekræftelse, obligatorisk): Redningsveste, Flare-sæt, VHF-radio, Førstehjælpskasse, GPS 
Komfort: Kabine, Toilet, Køkken, Varmeapparat, Gummibåd 
Ekstraudstyr: Fiskegrej, Kikkert + fri tekst

## amenityMeta.ts — nøgler
`AMENITY_FILTER_KEYS` (18 DB-nøgler brugt i filterpanel på /hytter):
`running_water, hot_water, indoor_toilet, outdoor_toilet, electricity, heating, kitchen, refrigerator, wifi, tv, terrace, campfire, grill, sauna, kayak, fishing_gear, bed_linen, towels`

`AMENITY_META` indeholder derudover compat-nøgler fra HytteForm (fridge, fireplace m.fl.) til visning i /hytter/[id] Inkluderet-sektion.

## Terminologi — aldrig fravige
- **sejler** (ikke «skipper» i UI) — `skipper_id` OK i DB
- **gæst** (ikke «bruger»)
- **hytte** (ikke «cabin» i dansk UI)
- **samsejlads** (ikke «ridesharing»)
- **udbyder** (hytteejer / sejler)
- **opslag** (ikke «annonce»)
- **Mine ønsker** (gæstens anmodninger) / **Gæsteønsker** (udbyderens fane)
- `sejler_id` i TypeScript (SQL: `sejler_id:skipper_id` eller tilsvarende)

## Workflow (Claude Code / Cursor)
- **Start session:** læs denne `CLAUDE.md` (kort læs `hukommelse.md` ved behov)
- **Supabase MCP** (Cursor): brug til inspektion og SQL, når det hjælper
- **Server actions** / **server components** til autoritativ DB — ikke klient-only som eneste sandhed
- **Mobile first** — Tailwind `sm` / `md` / `lg`
- **shadcn/ui** som udgangspunkt for UI
- **Cursor-prompts** kopieres i chat; de erstatter **aldrig** `CLAUDE.md` permanent
- **Afslut:** `git add .` && `git commit -m "..."` && `git push` (når det giver mening)
- **DB-ændringer:** ny fil under `supabase/migrations/` → `supabase db push`
