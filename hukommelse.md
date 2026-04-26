# Sila.gl — Hukommelse til Claude

## Status
- Landingpage fungerer på localhost:3000 — nordlys hero, transparent navbar, badge, headline, søgefelt, mangler by-chips
- Reference: arctic-soul-stay.base44.app — match 1:1
- Projekt: C:\Users\rune\sila-gl | github.com/runehvistendal/sila-gl
- Reference kode: github.com/runehvistendal/sila-2

## Fundament (komplet)
- Next.js 14 + Tailwind + shadcn/ui (Radix + Nova)
- Supabase oprettet (West EU Ireland) + nøgler i .env.local
- src/lib/supabase.ts + src/lib/supabase-server.ts
- src/lib/greenlandLocations.ts
- CLAUDE.md i repo

## Næste trin
1. By-chips — vis alle 6 major hubs (Nuuk, Ilulissat, Sisimiut, Qaqortoq, Aasiaat, Tasiilaq)
2. Auth — Supabase Google + email, httpOnly cookies, ALDRIG localStorage
3. Datamodel — SQL-tabeller i Supabase
4. CreateListing — hytte-formular
5. Hyttesøgning — server-side Supabase queries

## Cursor-prompt til næste session
Læs CLAUDE.md. Fix:
1. Tilføj 6 klikbare by-chips under søgefeltet (Nuuk, Ilulissat, Sisimiut, Qaqortoq, Aasiaat, Tasiilaq) fra greenlandLocations.ts (is_major_hub: true)
2. Mobile first: hamburger menu under 768px, søgefelt fuld bredde

## Workflow
- Claude.ai: arkitektur + Cursor-prompts
- Cursor Agent (Sonnet 4.6): kode — start altid med "Læs CLAUDE.md"
- Afslut session: git add . && git commit -m "..." && git push

## Sikkerhedsregler
- Roller server-side — ALDRIG localStorage
- Stripe-pris ALTID server-side
- JWT httpOnly cookies
- Reviews kræver afsluttet booking (RLS)
- Admin-ruter: Next.js middleware

## Stack
Next.js 14 + Supabase + Stripe Connect + Tailwind + shadcn/ui + Cloudinary + Mapbox + next-intl + Vercel

## Design
Mobile first (80% mobil)

## Terminologi
sejler, gæst, hytte, samsejlads, udbyder