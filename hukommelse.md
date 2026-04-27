# Sila.gl — Hukommelse (Claude Code / Cursor)

> Kombinerer projektkontekst til agent og editor. **CLAUDE.md** i repoet er fortsat det autoritative udviklerdokument; denne fil er hurtig agent-hukommelse.

## Projekt
Grønlands marketplace for hytteudlejning og samsejlads.

- Repo: github.com/runehvistendal/sila-gl
- Supabase: pngpelcaodbwwggaeyue (West EU Ireland)
- Stack: Next.js 14 + Supabase + Tailwind + shadcn/ui + Vercel
- Font: Plus Jakarta Sans
- Cursor: Supabase MCP adgang (sat op via Supabase dashboard)

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

## Ingen kendte bugs

## Næste trin (i rækkefølge)
1. /profil
2. Cloudinary billedupload (hytter + både)
3. Stripe Connect (15% kommission, server-side)
4. Bookingflow — hytte
5. Bookingflow — samsejlads

(Ældre backlog: /booking/success + /cancelled, Footer, /admin/* — se CLAUDE.md.)

## Vigtig DB-note
- **Primær brugerkonto:** rune.runesen@gmail.com  
  id: `313713bd-614d-46f7-b64e-16f525f98309`  
  **Brug altid denne — aldrig test-kontoen** (`8c29ab7f-fe44-43ef-a1af-64eda151b2f7` m.fl.).
- **Testkonto (kun reference):** rune.runesen.test@gmail.com / `fe44…`

## Datamodel (10 + 1 tabeller)
profiles, cabins, cabin_availability, cabin_bookings,
transport_requests, transport_offers, ride_shares,
ride_share_bookings, reviews, messages, boats

## Sikkerhedsregler — MÅ ALDRIG BRYDES
- Roller server-side via Supabase RLS — **ALDRIG** localStorage
- Stripe-pris **ALTID** server-side — aldrig fra frontend
- JWT i **httpOnly** cookies via @supabase/ssr — **ALDRIG** localStorage
- Vis **ALDRIG** e-mail i UI — kun `full_name`
- Beskeder: aldrig direkte kontaktinfo — **kun** via platform; diskret at aftaler indgås på platformen
- **`src/lib/supabase-service.ts` (service_role):** bruges **KUN** til **UPDATE `profiles.role_type`** (reconcile) — **aldrig** til almindelige data-queries. (`SUPABASE_SERVICE_ROLE_KEY` i `.env.local` + Vercel.)

## Pengebeløb — KRITISK
- ALLE beløb i DB = **øre** (integer), **ALDRIG** decimal/float til lagring
- Konvertering **KUN** i `src/lib/money.ts` (oreToKr / krToOre)
- Stripe: send beløb som øre, direkte, hvor relevant

## Prismodel — transport
- Udbyder angiver tur/retur-pris (øre)
- Enkeltbillet: `Math.round(roundtrip_ore * 0.6)` automatisk
- Gem: `price_per_seat_roundtrip_ore` + `price_per_seat_ore` (kontrolér præcise kolonnenavne i schema/CLAUDE.md)

## Rollemodel
`profiles.role_type`: `'traveler' | 'provider' | 'both'`

- Default: `'traveler'`
- Opretter hytte/båd og var `'traveler'` → `'both'`
- **Dashboard tabs:**
  - traveler: Bookinger, Mine ønsker, Indbakke
  - provider: Bookinger, Gæsteønsker, Mine opslag, Indbakke
  - both: alle tabs
- Fast sektion (traveler): «Har du en hytte eller båd?» / «Udlej din hytte eller tilbyd transport.»

## /opret flow
- /opret: **2 kort** (Udlej en hytte / Tilbyd transport)
- Ingen hytter → /opret/hytte (direkte / som i implementeringen)
- Har hytter → inline liste: [Rediger] + [Udlej denne] / [Post tur] efter kontekst
- /opret/hytte → **aktiv** (typisk `published: false` indtil opslag)
- /opret/baad → **aktiv**
- /opret/opslag/hytte/[id] → udlejningsperiode (opslag)
- /opret/opslag/sejlads/[id] → samsejladstur
- /opret/hytte/[id]/rediger, /opret/baad/[id]/rediger

## Terminologi — aldrig fravige
- sejler (ikke skipper i UI)
- `sejler_id` i TypeScript (skipper_id as sejler_id i SQL)
- gæst, hytte, samsejlads, udbyder
- **opslag** (ikke annonce)
- Mine ønsker (gæstens anmodninger)
- Gæsteønsker (udbyderens tab)

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

## ride_shares — korrekte kolonnenavne
- `departure_at` (timestamptz) — IKKE departure_date
- `status` (enum) — IKKE `active` boolean
- `boat_description` — IKKE boat_type
- `description` — IKKE notes
- `from_latitude`, `from_longitude`, `to_latitude`, `to_longitude` (NOT NULL)
- Ingen `images`-kolonne

## Workflow
- Læs **CLAUDE.md** ved sessionstart (og denne fil ved behov)
- **Supabase MCP** — brug til DB-forespørgsler/inspektion når det passer
- **Server actions** (eller server components) til DB — **ikke** stol på client-only fetch for autoritative data
- **Mobile first** — Tailwind `sm` / `md` / `lg`
- **shadcn/ui**-komponenter som udgangspunkt
- DB-ændringer: ny migration i `supabase/migrations/` → `supabase db push`
- Afslut arbejde: `git add .` && `git commit -m "..."` && `git push` (når det giver mening)
- Cursor-prompts erstatter **aldrig** CLAUDE.md; prompts er engangs-instruktioner i chat
