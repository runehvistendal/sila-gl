# Sila.gl — Hukommelse til Claude / Cursor

## Status (27.4.2026)
Komplet og fungerende:
- Landingpage, auth, datamodel
- /hytter, /hytter/[id], /transport, /transport/[id]
- /opret (2-korts flow: Udlej en hytte / Tilbyd transport)
- /opret/hytte, /opret/baad
- /opret/opslag/hytte/[id], /opret/opslag/sejlads/[id]
- /opret/hytte/[id]/rediger, /opret/baad/[id]/rediger
- /dashboard (alle rollebaserede tabs fungerer)
- Navbar (full_name, korrekt dropdown, R-initial)
- boats-tabel med RLS

## Projekt
- Repo: github.com/runehvistendal/sila-gl
- Supabase ref: pngpelcaodbwwggaeyue (West EU Ireland)
- Stack: Next.js 14 + Supabase + Tailwind + shadcn/ui + Vercel
- Font: Plus Jakarta Sans
- Cursor har Supabase MCP adgang (sat op via Supabase dashboard)

## Ingen kendte bugs

## Næste trin (i rækkefølge)
1. /profil
2. Cloudinary billedupload (hytter + både)
3. Stripe Connect (15% kommission, server-side)
4. Bookingflow — hytte
5. Bookingflow — samsejlads

(Ældre backlog kan stadig være relevant: /booking/success + /cancelled, Footer, /admin/* — se CLAUDE.md.)

## Vigtig DB-note
- **Primær brugerkonto:** rune.runesen@gmail.com (id: `313713bd-614d-46f7-b64e-16f525f98309`)
- **Testkonto:** rune.runesen.test@gmail.com (id: `8c29ab7f-fe44-43ef-a1af-64eda151b2f7`)
- Brug altid **primærkontoen** fremover — testkontoen er kun reference.

## Datamodel (10 + 1 tabeller)
profiles, cabins, cabin_availability, cabin_bookings,
transport_requests, transport_offers, ride_shares,
ride_share_bookings, reviews, messages, boats

## Rollemodel
- Default: `role_type` = 'traveler'
- Opretter hytte/båd + var 'traveler' → 'both'
- **Dashboard tabs:**
  - traveler: Bookinger, Mine ønsker, Indbakke
  - provider: Bookinger, Gæsteønsker, Mine opslag, Indbakke
  - both: alle tabs
- Fast sektion for traveler: «Har du en hytte eller båd?» / «Udlej din hytte eller tilbyd transport.»
- `service_role`-client bruges til `role_type` UPDATE (`SUPABASE_SERVICE_ROLE_KEY` i `.env.local` + Vercel env)

## /opret flow
- 2 kort: «Udlej en hytte» + «Tilbyd transport»
- Ingen hytter/både → redirect til /opret/hytte eller /opret/baad
- Har hytter/både → inline liste med [Rediger] + [Udlej/Post tur]

## Prismodel — transport
- Udbyder angiver tur/retur-pris
- Enkeltbillet = `Math.round(roundtrip * 0.6)` automatisk
- Gem: `price_per_seat_roundtrip_ore` + `price_per_seat_ore` (juster navne efter faktisk schema / CLAUDE.md)

## Sikkerhedsregler
- Roller server-side via Supabase RLS — ALDRIG localStorage
- Stripe-pris ALTID server-side
- JWT i httpOnly cookies via @supabase/ssr
- Vis ALDRIG e-mail i UI — kun `full_name`
- Beskeder: diskret info om at aftaler indgås på platformen

## Pengebeløb — KRITISK
- ALLE beløb i **øre** (integer) i DB
- Konvertering KUN i `src/lib/money.ts` (oreToKr / krToOre)

## Faciliteter — hytte
Basis: Sengelinned, Håndklæder, Toilet indendørs, Udendørs toilet, Rindende vand, Varmt vand, Opvarmning, Elektricitet, Køkken, Køleskab  
Udendørs: Terrasse, Grill, Bålplads, Kajak, Fiskegrej  
Komfort: Wifi, TV, Vaskemaskine, Opvaskemaskine, Kaffemaskine, Fryseboks  
Sikkerhed: Røgalarm, Brandslukning, Førstehjælpskasse, Låsbar dør  
+ fri tekst «Andet»-sektion

## Faciliteter — båd
Sikkerhed (bekræftelse, ikke valgfri): Redningsveste, Flare-sæt, VHF-radio, Førstehjælpskasse, GPS  
Komfort: Kabine, Toilet, Køkken, Varmeapparat, Gummibåd  
Ekstraudstyr: Fiskegrej, Kikkert + fri tekst

## Terminologi
- sejler (ikke skipper i UI)
- `sejler_id` i TypeScript (skipper_id as sejler_id i SQL)
- gæst, hytte, samsejlads, udbyder
- opslag (ikke annonce)
- Mine ønsker (gæstens anmodninger)
- Gæsteønsker (udbyderens tab)

## ride_shares — korrekte kolonnenavne
- `departure_at` (timestamptz) — IKKE departure_date
- `status` (enum) — IKKE `active` boolean
- `boat_description` — IKKE boat_type
- `description` — IKKE notes
- `from_latitude`, `from_longitude`, `to_latitude`, `to_longitude` (NOT NULL)
- Ingen `images`-kolonne

## Cursor-workflow (VIGTIGT)
- Cursor-prompts kopieres ind i Cursor-chatfeltet — de erstatter **ALDRIG** CLAUDE.md
- CLAUDE.md er det permanente projektdokument
- Start typisk med: **«Læs CLAUDE.md»** (og denne `hukommelse.md` ved behov)
- Afslut arbejds-session: `git add .` && `git commit -m "..."` && `git push` (når det giver mening)
