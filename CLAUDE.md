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

## Bygget og komplet (27.4.2026)
- Landingpage (/)
- Auth (email + Google, httpOnly cookies via @supabase/ssr)
- Datamodel (11 tabeller inkl. boats, RLS, triggers)
- /opret — **2 kort:** «Udlej en hytte» / «Tilbyd transport» (ikke tre separate valg på samme måde som tidlig «hytte/båd/opslag»-skitse; se **/opret flow** nedenfor)
- /opret/hytte (registrér hytte-aktiv, chip-UI faciliteter, transport-switch)
- /opret/baad (registrér båd-aktiv, sikkerhedsbekræftelse, chips)
- /opret/opslag/hytte/[cabinId] (publicér udlejningsopslag fra hytte)
- /opret/opslag/sejlads/[boatId] (post samsejladstur fra båd)
- /opret/hytte/[id]/rediger, /opret/baad/[id]/rediger
- /mine-hytter → redirect /dashboard?tab=mine-opslag
- /hytter (søgeside, server-side filtrering)
- /hytter/[id] (galleri, CabinTransportSection, reviews, bookingkort)
- /dashboard (rollebaserede tabs — se **Rollemodel**)
- /transport (søgeside, TransportCard, TransportFilters)
- /transport/[id] (info-kort, bookingkort, t/r-toggle, anmodningsformular, reviews)
- /profil (avatar, roller, anmeldelser, telefon med landekode, email-skift via Supabase Auth, bio, sprog synkroniseret med navbar)
- Cloudinary (avatar + hyttebilleder)
- Navbar (transparent/scroll, plus-dropdown → /opret)
- NavUser: { id, fullName, avatarUrl, language } — navbar viser profilbillede og sprog dynamisk fra DB via revalidatePath
- src/lib/cabinFacilities.ts (CABIN_FACILITIES)
- src/components/shared/AddOnServicesEditor.tsx (DEL G)

## /opret flow (præcist)
- **/opret:** 2 kort (Udlej en hytte / Tilbyd transport)
- Ingen hytter → typisk /opret/hytte (direkte / som i nuværende implementering)
- Har hytter → inline liste med [Rediger] + [Udlej / Post tur] efter kontekst
- /opret/hytte → aktiv registreret med typisk `published: false` indtil opslag
- /opret/baad → aktiv registreret
- /opret/opslag/hytte/[id] → udlejningsperiode / publicering
- /opret/opslag/sejlads/[id] → samsejladstur

## Næste i rækkefølge
1. Stripe Connect (15% kommission, server-side)
2. Bookingflow — hytte
3. Bookingflow — samsejlads
4. /booking/success + /cancelled
5. Footer

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
- **service_role** (`createServiceClient` i `supabase-service.ts`): bruges **KUN** til **UPDATE** af `profiles.role_type` (reconcile) — **aldrig** som generel data­klient. Øvrige queries: almindelig **anon + session** (`createClient` server).
- `host_id` / `owner_id` sættes via `auth.uid()` server-side
- Reviews kræver completed booking (RLS)
- Admin-ruter: middleware + RLS
- Filtrering **ALTID** i Supabase query — aldrig «hemmelig» forretningslogik kun client-side

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
| Kolonne          | Type        | Bemærkning                                 |
|------------------|-------------|---------------------------------------------|
| departure_at     | timestamptz | IKKE departure_date + departure_time separat |
| status           | enum        | IKKE `active` boolean. Aktive: f.eks. `active` |
| boat_description | text        | IKKE `boat_type`                            |
| description      | text        | IKKE `notes`                                |
| from_latitude    | numeric     | NOT NULL                                    |
| from_longitude   | numeric     | NOT NULL                                    |
| to_latitude      | numeric     | NOT NULL                                    |
| to_longitude     | numeric     | NOT NULL                                    |

Findes **IKKE:** `images`, `boat_type`, `departure_date`, `active` (semantisk fejl hvis forvekslet)

## cabins — vigtige kolonner
- `owner_id` (IKKE `host_id`)
- `transport_price_per_person_ore` (IKKE `transport_price_ore`)

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
