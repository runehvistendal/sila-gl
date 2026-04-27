# Sila.gl — CLAUDE.md

## Projekt
Grønlands marketplace for hytteudlejning og samsejlads.
"Grønland på lokale vilkår"

Repo: github.com/runehvistendal/sila-gl
Lokalt: C:\Users\rune\sila-gl
Base44-ref: github.com/runehvistendal/sila-2 (lokalt: C:\Users\rune\sila-2-ref\src\)
Supabase: pngpelcaodbwwggaeyue (West EU Ireland)

## Stack
Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase + Vercel

## Bygget og komplet (27.4.2026)
- Landingpage (/)
- Auth (email + Google, httpOnly cookies via @supabase/ssr)
- Datamodel (10 tabeller, RLS, triggers)
- /opret (type=cabin + type=transport)
- /mine-hytter
- /hytter (søgeside, server-side filtrering)
- /hytter/[id] (galleri, CabinTransportSection, reviews, bookingkort)
- /dashboard (5 tabs: bookinger, anmodninger, åbne ønsker, mine opslag, indbakke)
- /transport (søgeside, TransportCard, TransportFilters)
- /transport/[id] (info-kort, bookingkort, returtur, anmodningsformular, reviews)
- Navbar (transparent/scroll, plus-dropdown rolle-baseret)

## Næste i rækkefølge
1. /profil
2. Cloudinary billedupload på /opret
3. Stripe Connect + webhooks
4. /booking/success + /cancelled
5. Footer
6. /admin/*

## Designregel
Kopiér design 1:1 fra sila-2-ref inden en ny side bygges.
Læs altid den tilsvarende Base44-fil FØR du skriver kode.

## Sikkerhedsregler — må ALDRIG brydes
- Roller server-side via Supabase RLS — ALDRIG localStorage
- Stripe-pris ALTID server-side i API route
- JWT i httpOnly cookies via @supabase/ssr — ALDRIG localStorage
- host_id/owner_id sættes via auth.uid() server-side
- Reviews kræver completed booking (RLS)
- Admin-ruter: middleware.ts + RLS
- Filtrering ALTID i Supabase query — aldrig client-side

## Privatlivs- og kommunikationsregel — må ALDRIG brydes
- Vis ALDRIG bruger-emails i UI — brug altid full_name (fallback: "Sila-sejler" / "Sila-udbyder")
- Ingen direkte kontaktinfo (email, telefon, sociale medier) må eksponeres på nogen side
- Platformen er ENESTE kommunikationskanal mellem gæster og udbydere
- SELECT-queries må ALDRIG hente email-kolonner til brug i frontend-komponenter

## Pengebeløb — KRITISK
- ALLE beløb i databasen = øre (integer)
- Konvertering KUN i src/lib/money.ts: oreToKr() og krToOre()
- Aldrig rå øre i UI — aldrig float/decimal til penge

## ride_shares — korrekte kolonner
| Kolonne            | Type        | Bemærkning                                   |
|--------------------|-------------|------------------------------------------------|
| departure_at       | timestamptz | IKKE departure_date + departure_time separat   |
| status             | enum        | IKKE active boolean. Aktive: status='active'   |
| boat_description   | text        | IKKE boat_type                                 |
| description        | text        | IKKE notes                                     |
| from_latitude      | numeric     | NOT NULL                                       |
| from_longitude     | numeric     | NOT NULL                                       |
| to_latitude        | numeric     | NOT NULL                                       |
| to_longitude       | numeric     | NOT NULL                                       |

Findes IKKE: images, boat_type, departure_date, active

## cabins — vigtige kolonner
- owner_id (IKKE host_id)
- transport_price_per_person_ore (IKKE transport_price_ore)

## profiles
- role_type: 'traveler' | 'provider' | 'both'

## Terminologi — aldrig fravige
- sejler (ikke skipper) i UI — skipper_id OK i DB
- gæst (ikke bruger)
- hytte (ikke cabin) i dansk UI
- samsejlads (ikke ridesharing)
- udbyder (generelt for hytteejer/sejler)

## Workflow
- Cursor-prompts kopieres ind i Cursor-chatfeltet
- De erstatter ALDRIG CLAUDE.md direkte
- Start altid: "Læs CLAUDE.md"
- Afslut: git add . && git commit -m "..." && git push
- DB-ændringer: ny migration-fil → supabase db push
