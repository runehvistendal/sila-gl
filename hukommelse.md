# Sila.gl — Hukommelse

## Projekt

Grønlands marketplace for hytteudlejning og samsejlads. «Grønland på lokale vilkår» — fuld teknisk kontekst: **[CLAUDE.md](CLAUDE.md)**.

## Produktstrategi — besluttet 7.5.2026

**Kanonisk fuld tekst:** [CLAUDE.md](CLAUDE.md) — afsnit **Produktstrategi — besluttet 7.5.2026**.

### Kort reference
- **Navbar:** **Ophold** · **Samsejlads** (`/transport`) · **Oplevelser** (`/oplevelser`) — tre punkter **pr. 13.5.2026**. Ønskes link skjult uden deploy: wrap navbar-link i env-check (feature flag).
- **Ophold UI:** **I naturen** / **I byen** — kategorien er oplevelse, ikke adgangsform; **bygd = altid «I byen»** (båd/fly underordnet).
- **Transfer vs. Samsejlads:** Transfer = kommercielt tilvalg ved hyttebooking (udbyder sætter fast pris/rute). Samsejlads = fri seats på konkrete ture. Begge i samme tabel/flow men distinkte use cases. (Teknisk tilvalg på ophold: ankoms-transfer som AddOn-lignende mønster; planlagt bl.a. `from_location_id` på `transport_offers`.)
- **Transportanmodning — hytte (cabin_transport_*):** Bygget 11.5.2026 (session 2) — anmodning → bud → accept → booking m. Stripe-linje; se **CLAUDE.md** **Status (11.5.2026 — session 2)**. Fri/samsejlads-anmodning **`/transport/anmod`** er fortsat separat flow.
- **Oplevelser:** Komplet modul **13.5.2026** — se **[CLAUDE.md](CLAUDE.md)** · **Status (13.5.2026)** (DB inkl. `experience_listings` + RLS; guard på `experience_bookings`; Stripe/webhook/success; RPC `get_experience_provider_stripe`; **mangler:** rediger-side + UI til `experience_listings`-koblinger).
- **Fiskeri/jagtindberetning:** Fravalgt permanent. Løst af GFLK og sullissivik.gl.
- **Professionelle virksomheder** (fx Nuuk Watertaxi): Abonnement eller forhøjet provision introduceres tidligst år 2 når platformen har beviselig trafik.
- **SEO (udestår — påmind Rune):** UI som ovenfor; metadata: hytte, cabin, sommerhus, bygd, bolig, Grønland; AI SEO parallelt med Google.
- **Ikke endnu:** langvarig udlejning (Boligportal); helikoptertransfer (private udbydere); **UI** til at vedligeholde **`experience_listings`** fra opslag (tabel findes — se **Status (13.5.2026)**).

### Påmindelser inden lancering (fra produktstrategi)
- AI SEO-strategi skal udarbejdes
- PostHog verificeres sat op korrekt
- Stripe live-test end-to-end inkl. transfer-linjer, **cabin_transport / transport_offer_id**, **oplevelses-bookinger** og **ny gebyrmodel (5 % vært / 12 % gæst)**

---

## Status (17.5.2026)

### Nyt 17.5.2026 — oplevelser + opret-forbedringer

**Oplevelser**
- `/oplevelser` listeside bygget (`ExperiencesClient`, `ExperienceCard`) — henter `experiences` med `provider_id`, `published=true`
- `/opret/oplevelse` bygget: `OplevelsesForm`, `actions.ts`, `experienceFormCategories.ts` (neutral fil uden "use server" — konstanter der bruges i både client og server skal ALDRIG eksporteres fra "use server"-filer)
- Oplevelse oprettes med `published: false` — publicér-flow mangler
- Oplevelser vises ikke på `/oplevelser` endnu (mangler publicér-flow)
- Billeder kan ikke tilføjes til oplevelser endnu (mangler Cloudinary upload)
- `experiences`-tabellen bruger `provider_id` (ikke `owner_id`)

**`/opret`-siden**
- Routing rettet: hytte → `/opret/hytte`, bolig → `/opret/bolig` direkte
- Oplevelse-kort tilføjet (Sparkles-ikon, link til `/opret/oplevelse`)
- Kortgrid: `grid-cols-2` (2×2 layout)
- Oplevelse-sektion under kortene (liste over brugerens oplevelser)

**Samsejlads**
- Lokationsliste: `LocationAutocomplete` med `isInByenCategory`-filter
- Returtur-felt flyttet ind i Afgang-boksen
- Submit-knap: `#114788`

**Teknisk**
- `EXPERIENCE_FORM_CATEGORIES` i egen fil `experienceFormCategories.ts` — ikke i `actions.ts`

### Udestående til næste session
1. Publicér-flow for oplevelser (så de vises på `/oplevelser`)
2. Cloudinary billede-upload på `/opret/oplevelse`
3. `/oplevelser/[id]` detaljeside

---

## Status (13.5.2026)

### Oplevelser — komplet modul ✅
- **DB:** `experiences`, `experience_availability`, `experience_bookings` (RLS + UPDATE guard på immutable felter), `experience_listings` (RLS; junction cabin \| samsejlads). **`get_experience_provider_stripe`** (SECURITY DEFINER). **`preparation_days`** på experiences.
- **Udbyder:** `/opret/oplevelse` → `/opret/oplevelse/[id]/tilgaengelighed` (kalender, settings, Stripe-gate ved publicering).
- **Gæst:** `/oplevelser` (hub/dato/kategori); `/oplevelser/[id]` to-kolonne, `ExperienceBookingWidget`, `CalendarDropdown` enkelt-dato; Stripe Checkout 5%/12%; webhook `meta.type === "experience_booking"`; **`/booking/oplevelse-success`** + ContactInfoCard.
- **Dashboard:** Mine oplevelser (provider/both) · **Navbar:** tredje punkt · **Kategorier:** JSONB med **`key` + `description`** pr. valgt kategori (tilladte nøgler/`labels` i `src/lib/experienceCategories.ts`).
- **Migrationer:** `20260513000000`, `20260513010000`, `20260513160000` — fuld teknisk liste: **[CLAUDE.md](CLAUDE.md)** · **Status (13.5.2026)**.

### Kendte huller
- **`/opret/oplevelse/[id]/rediger`** ikke bygget (dashboard linker).
- **`experience_listings`:** ingen app-UI til kobling fra hytte-/tur-opslag endnu (persistens + RLS findes).

## Status (11.5.2026)

### Nyt 11.5.2026 — chat, kontaktinfo, drawer UX
- **`messages`:** RLS (sender/recipient), **`stay_offer_id`** FK; modpart via JOIN i `src/app/actions/chat.ts` (`getBookingConversations`, `getMessages`, `sendMessage`, `getUnreadMessageCount`)
- **`contact_info_visible_until`** på cabin_bookings, ride_share_bookings, transport_offers, stay_offers — migration **`20260511010000`**; webhook sætter udløb (ophold: check_out+3d; samsejlads: departure_at+3d m.f.; transporttilbud: now+3d; stay offer via cabin_bookings check_out+3d)
- **`get_contact_info_for_booking` RPC** (SECURITY DEFINER) + **`getContactInfo`** i `src/app/actions/contactInfo.ts`; **ContactInfoCard** på success-sider + dashboard; **contactSlot**-pattern i dashboard
- **ChatBubble** (z-50, ulæst-prik), **ChatDrawer** — to collapsible sektioner (Bookinger / Hjælp & FAQ), default lukket; **ChatHelpSection** (statisk FAQ, `support@sila.gl`)
- **Sila AI fjernet** — genaktiveres med ANTHROPIC_API_KEY i Vercel (se **Næste trin**)
- **Fuld teknisk liste:** [CLAUDE.md](CLAUDE.md) — **Bygget og komplet** · **Chat og kontaktinfo (11.5.2026)** · **Cabin transport + dashboard UI (11.5.2026 — session 2)**

### Session 2 (11.5.2026) — cabin transport requests + dashboard UI

**Cabin transport requests — komplet flow**
- Tabel: `cabin_transport_requests` + `cabin_transport_offers` (migration `20260511020000`)
- RPC: `accept_cabin_transport_offer` (migration `20260511030000`) — SECURITY DEFINER
- Server actions i `src/app/actions/cabinTransportRequests.ts`: `createCabinTransportRequest`, `getOpenCabinTransportRequestsForProvider`, `getMyCabinTransportRequests`, `createCabinTransportOffer`, `acceptCabinTransportOffer` (returnerer `{ success, cabinId, offerId }` ved succes)
- Widget: «Anmod om transport» i `CabinBookingWidget` — kun på `/ophold/i-naturen/[id]` når `transferRoutes` er tom; inline formular (ankomstpunkt, dato, personer, besked)
- Dashboard udbyder (Gæsteønsker): én «Transportanmodninger»-sektion med `CabinTransportRequestRow` (inline bud + mini Mapbox-kort)
- Dashboard gæst (Mine ønsker): `MyCabinTransportRequestRow` med badge + «Se bud»-link
- Detaljeside: `/dashboard/transport-anmodninger/[id]` — gæst ser og accepterer bud
- Notifikationer: `cabin_transport_offer_received` (in-app + e-mail via Resend)
- E-mail i18n: notify-funktioner på modtagerens sprog (`profiles.language`) via `getUserLanguage` + `getLocaleUrl`
- **Scenarie C:** ved accept redirect til `/ophold/i-naturen/[cabinId]?transport_offer=…` — widget viser «Transport inkluderet»; `createCabinBooking` håndterer `transport_offer_id` som Stripe-linje (metadata; ingen DB-kolonne på `cabin_bookings` i dette trin)

**Dashboard UI-forbedringer**
- Transportanmodninger (udbyder + gæst): sektioner flettet til én hvor relevant
- `RequestCard` (`OpenRequestsList`): inline bud-formular + «Se fuld anmodning →» + mini Mapbox-kort
- `TransportMiniStaticMap`: kvadratisk, interaktivt, NavigationControl, scrollZoom fra
- «Åben»-badge → «Aktiv» på transportanmodninger (i18n)
- Opholdsønsker: eksplicit «Se anmodning»-knap (filled #114788); «→» fjernet fra knaptekst

## Udestående — til næste session (efter 13.5.2026)

1. **`profiles!guest_id` FK-hint** — verificeret via API; ikke fuldt e2e-testet visuelt.
2. **Stripe live-test end-to-end** — kritisk før lancering (5%/12%, stay_offers, transfer-linjer, cabin_transport-flow, **oplevelses-bookinger**).

## Status (12.5.2026)

### Nyt 12.5.2026

- **`arrival_points` rettet** i `src/lib/greenlandLocations.ts`: `CITY_ARRIVAL_POINTS` opdateret med korrekte lufthavne (14 inkl. Qaqortoq 2026), `VILLAGE_HELIPAD_LIST` tilføjet med bekræftede helistops, `deriveArrivalPoints` returnerer nu `["harbour"]` for natursteder og bruger `VILLAGE_HELIPAD_LIST` for bygder.
- **Returdato-felt** tilføjet på `cabin_transport_requests`-formularen i `CabinBookingWidget` — migration `20260512010000_cabin_transport_request_return_date.sql` pushet.
- **To transportanmodnings-sektioner** under "Mine ønsker" (gæst) samlet til én i `DashboardClient.tsx`.
- **"Aktiv"-badge** på gamle `transport_requests` — `TransportRequestRow` bruger nu `tDash("guest_wishes_transport_status_active")` for `status === "open"`.
- **Advarselsboks** i `CabinBookingWidget` når gæst har åben transportanmodning (`hasOpenTransportRequest`-prop, sendt fra `/ophold/i-naturen/[id]/page.tsx` via `CabinDetailLayout`).
- **"Ingen transport"-knap** tilføjet til legacy transport-valg i `CabinBookingWidget`.
- **Prisblok forenklet** — servicegebyr, ligning og platformgebyr-noter fjernet; kun ophold + evt. transport + I alt vises.
- **Produktstrategi — bookingtyper:** Tier 1 (marketplace + provision) er aktiv model. Tier 1B (abonnement til professionelle virksomheder) introduceres når konkret udbyder efterspørger det — kræver `profiles.tier`-kolonne og Stripe Billing. Tier 2-4 fra år 2+.

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
- **Fuld teknisk liste:** [CLAUDE.md](CLAUDE.md) — **Bygget og komplet** · **10.5.2026** · **Chat og kontaktinfo (11.5.2026)**

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

- **Oplevelser (13.5.2026)** ✅ — komplet modul: DB (`experiences`, `experience_availability`, `experience_bookings` + guard, `experience_listings` + RLS), Stripe/webhook/`oplevelse-success`, RPC `get_experience_provider_stripe`, dashboard + navbar — detaljer **[CLAUDE.md](CLAUDE.md)** · **Status (13.5.2026)**; **mangler:** rediger-route + UI til `experience_listings`.
- **Ovenstående lokation/kort-funktionalitet** ✅ (detaljer i CLAUDE.md)
- **PostHog analytics** ✅ — `posthog-js` installeret; `PostHogProvider.tsx` initialiserer kun hvis **`NEXT_PUBLIC_POSTHOG_KEY`** og **`NEXT_PUBLIC_POSTHOG_HOST`** er sat. Provider wrappes i **`src/app/[locale]/layout.tsx`**. Events via **`src/lib/analytics/posthog-events.ts`** (booking, transport, login, kort m.fl.). Kræver env-variabler i **`.env.local`** + **Vercel** inden lancering.
- **Chat og kontaktinfo (11.5.2026)** ✅ — beskeder + kontaktinfo efter betaling (`contact_info_visible_until`, RPC, ContactInfoCard, ChatBubble/Drawer/FAQ); detaljer i **CLAUDE.md** under **Bygget og komplet**
- **Cabin transport requests + Scenarie C + dashboard UI (11.5.2026 — session 2)** ✅ — se **CLAUDE.md** **Status (11.5.2026 — session 2)** og **Bygget og komplet**; **udestående:** se **hukommelse.md** · **Udestående — til næste session**

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

1. **Sæt ANTHROPIC_API_KEY i Vercel når klar** (Sila AI kan genaktiveres)
2. **Stripe live-test end-to-end** (5 %/12 %, stay_offers, transfer-linjer, **cabin_transport / transport_offer_id**)
3. **AI SEO-strategi**
4. **MobilePay til Stripe**
5. **Lancering** — første 20 udbydere

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
- Stripe live-test end-to-end (**5 % / 12 %-gebyrmodel + stay_offers + transfer-linjer + cabin_transport**)
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

- Stripe end-to-end IKKE testet live — kritisk før lancering (se **Næste trin** pkt. 2)
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
