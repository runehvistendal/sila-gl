# Sila.gl — CLAUDE.md

> **Claude Code & udviklerkontekst** — dette dokument er autoritativt for agent og mennesker. Kort agent-hukommelse: se `hukommelse.md` i roden.

## Projekt
Grønlands marketplace for hytteudlejning og samsejlads. 
"Grønland på lokale vilkår"

- Repo: github.com/runehvistendal/sila-gl
- Lokalt: `C:\Users\rune\sila-gl`
- Base44-ref: github.com/runehvistendal/sila-2 (lokalt: `C:\Users\rune\sila-2-ref\src\`)
- Supabase: pngpelcaodbwwggaeyue (West EU Ireland)

## Stack
Next.js 14 (App Router) + TypeScript + Tailwind + **shadcn/ui** + Supabase + Vercel 
**Font:** Plus Jakarta Sans

## Udvikler- og testkonti (DB)
- **Primær (brug altid denne i udvikling):** rune.runesen@gmail.com 
 `id: 313713bd-614d-46f7-b64e-16f525f98309` 
- **Test (kun reference, ikke primær adfærd):** rune.runesen.test@gmail.com 
 `id: 8c29ab7f-fe44-43ef-a1af-64eda151b2f7`

## Bygget og komplet (5.5.2026)
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
- **Stripe Connect** onboarding (15 % kommission, server-side) ✅
- **Hyttebooking** med Stripe Checkout + webhook (status: confirmed verificeret) ✅
- **Sikkerhedsaudit** gennemført — kritiske RLS-fejl rettet, kolonneniveau-sikkerhed på profiles ✅
- **Kalender UX:** grå strikethrough på optagede datoer (Airbnb-stil) ✅
- **Cancel-flow:** pending booking annulleres + Stripe session expires ved tilbagetryk ✅
- **pg_cron cleanup:** pending bookinger udløber automatisk efter 15 min ✅
- **Rate limiting:** `rate_limits`-tabel + `consume_rate_limit` RPC (5 forsøg / 10 min) ✅
- **Transportanmodninger:** /transport/anmod (tur-type, returdato, passagerer), /transport/anmodninger/[id] (Realtime chat, tilbudskort, accept → Stripe Checkout, webhook) ✅
- **Anmeldelsessystem:** dobbelt-blind (trigger), 30-dages vindue (pg_cron), alle 3 booking-typer, ReviewForm + ReviewDialog, dashboard review-knap, /profil/[id] offentlig ✅
- **Samsejlads bookingflow:** fusioneret ind i /transport — /samsejlads eksisterer ikke længere ✅
- **Mapbox kortvisning:** `TransportMap.tsx` (streets-v12, buet linje via createArc, ⚓/🏁 HTML-markorer, fitBounds, flyTo, lazy load overview / direct load detail) på /transport og /transport/[id] ✅
- **Returture:** `return_ride_share_id` på ride_shares, badge på listekort, alternative ture fra andre sejlere på /transport/[id] ✅
- **Timezone:** `src/lib/nuukTime.ts` — America/Godthab (UTC-3), alle departure_at vises i Nuuk-tid ✅
- **Testdata:** 4 profiler (Malik, Sara, Hans, Aviaja), 3 hytter, 8 transportture ✅
- **src/lib/notifications.ts** — placeholder funktioner (notify*) ✅
- **/profil/[id]** — offentlig profilside med anmeldelser og gennemsnitsscore ✅
- **DB: cabin_requests tabel** — guest_id, cabin_id (nullable), location, desired_check_in, desired_check_out, num_guests, max_price_ore, description, status (open|matched|cancelled|expired), RLS ✅
- **Footer** — `src/components/layout/Footer.tsx`, root layout, vises på alle sider ✅
- **/admin** — dashboard (nøgletal), /brugere, /hytter, /bookinger, /anmodninger. `is_admin` boolean på profiles. Middleware + layout bruger service_role til is_admin-tjek ✅
- **/opret/baad** — to knapper: "Gem båd" (→ /opret) + "Gem og opret tur →" (→ /opret/samsejlads?baadId=X) ✅
- **/opret/samsejlads** — ny side: bådvælger, fra/til (GREENLAND_LOCATIONS), dato/tid (lokal tid → UTC server-side), pladser, tur/retur-pris (primær) + enkelttur (60% auto-forslag, kan overskrives), returtur checkbox med linked ride_shares ✅
- **/opret/hytte** — billeder + alle felter på én side (PendingCabinImageUpload, Cloudinary `sila/cabins/pending`), redirect → /opret/hytte/[id]/tilgaengelighed ✅
- **/opret/hytte/[id]/tilgaengelighed** — kalender (to måneder, klik+drag), blokér datoer (grøn=ledig standard, grå=blokeret, blå=booket), infobox til udlejer, legende, "Gem tilgængelighed" + "Gem og publicér hytte →" ✅
- **cabin_availability semantik vendt** — gemmer nu BLOKEREDE datoer (is_available=false). Alle fremtidige datoer er ledige som standard ✅
- **Æ-fix i mappenavn** — `tilgaengelighed` (ASCII-safe, undgår Windows-fejl) ✅
- **Duplicate location keys** — 7 dubletter slettet fra `greenlandLocations.ts` (Qeqertarsuaq ×3, Tasiilaq ×2, Uummannaq ×4, Sisimiut ×2 → én by pr. navn). React-keys opdateret til `postal_code-name_dk` i alle 4 dropdown-filer ✅
- **middleware.ts beholdt** — proxy.ts-rename reverteret; Next.js kræver præcist dette filnavn for auth-middleware ✅
- **AvailabilityCalendar** — simpelt klik-toggle + periodevalg (klik startdato → klik slutdato → hele perioden blokeres/afblokeres). Farver via inline style (ingen Tailwind-override). `select-none` fjernet fra forælde-div ✅
- **saveAvailability** — returnerer `{ redirectTo }` / `{ error }` i stedet for `redirect()` — undgår at NEXT_REDIRECT-exception fanges af catch-blok ✅
- **Tilgængelighed på rediger-siden** — `AvailabilityCalendar` tilføjet på `/opret/hytte/[id]/rediger` med hentning af blokerede + bookede datoer ✅
- **Slet hytte + båd** — soft delete (`deleted_at`) via `deleteCabin` / `deleteBoat` server actions. Slet-knap på dashboard (Mine opslag) og /opret ✅
- **Øje-symbol på dashboard** — linker til `/hytter/[id]` for publicerede hytter, `/opret/hytte/[id]/rediger` for kladder (undgår 404 på upublicerede) ✅

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
- Ingen hytter → typisk /opret/hytte (direkte / som i nuværende implementering)
- Har hytter → inline liste med [Rediger] + [Udlej / Post tur] efter kontekst
- /opret/hytte → aktiv registreret med typisk `published: false` indtil opslag
- /opret/baad → aktiv registreret
- /opret/opslag/hytte/[id] → udlejningsperiode / publicering
- /opret/opslag/sejlads/[id] → samsejladstur

## Næste i rækkefølge
1. Minimum nætter + forberedelsestid på tilgængeligheds-siden
2. i18n dansk + engelsk (next-intl)
3. SEO — metadata, sitemap, landingssider pr. destination
4. Stripe live-test end-to-end — kritisk inden lancering
5. PostHog analytics — installer inden lancering
6. Lancering — første 20 udbydere

## Aktiv arkitektur: aktiver + opslag
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
- Roller server-side via Supabase RLS — **ALDRIG** localStorage
- Stripe-pris **ALTID** server-side (API route / server action) — **aldrig** fra frontend
- JWT i **httpOnly** cookies via @supabase/ssr — **ALDRIG** localStorage
- **service_role** (`createServiceClient` i `supabase-service.ts`): bruges **KUN** til UPDATE af `profiles.role_type` (reconcile) + cancel-operationer der passerer update-guard-trigger — **aldrig** som generel dataklient. Øvrige queries: almindelig **anon + session** (`createClient` server).
- `host_id` / `owner_id` sættes via `auth.uid()` server-side
- Reviews kræver completed booking (RLS)
- Admin-ruter: middleware + RLS
- Filtrering **ALTID** i Supabase query — aldrig «hemmelig» forretningslogik kun client-side
- **profiles følsomme felter** (`stripe_account_id`, `phone`, `stripe_onboarding_complete`): læses **ALDRIG** direkte via `.from("profiles").select(...)` fra klientkode eller server actions — brug udelukkende:
 - `get_my_sensitive_profile()` — egne data
 - `get_owner_stripe_info(cabin_id)` — ejerens Stripe-info i bookingflow
- **cabin_bookings immutable felter** (`total_price_ore`, `platform_fee_ore`, `stripe_session_id`, `stripe_payment_intent_id`, `guest_id`, `cabin_id`, `check_in`, `check_out`, `num_guests`): beskyttet af BEFORE UPDATE trigger `cabin_bookings_guard_update` — service_role passerer (auth.uid() IS NULL)
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
- Konvertering **KUN** i `src/lib/money.ts`: `oreToKr()` og `krToOre()`
- Aldrig rå øre vilkårligt i UI — kør gennem `money.ts`
- **Stripe:** forventer typisk heltals-øre i flows — hold server-side, send direkte i øre hvor det er defineret sådan

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
