Sila.gl — kontekst til næste chat
Status
Fundament komplet:

Next.js 14 + Tailwind + shadcn/ui installeret
Supabase projekt oprettet (West EU Ireland) + nøgler i .env.local
Supabase klient i src/lib/supabase.ts
CLAUDE.md pushet til github.com/runehvistendal/sila-gl
greenlandLocations.ts oprettet i src/lib/
Landingpage med nordlys-hero, navbar, søgefelt og by-chips fungerer på localhost:3000
Projekt kører lokalt: C:\Users\rune\sila-gl

Reference-design: arctic-soul-stay.base44.app — match 1:1

Næste trin i rækkefølge

Design polish — by-chips skal vise alle major hubs, søgefelt-tekst skal være læsbar, mobile first optimering
Auth — Supabase Google + email login med httpOnly cookies (ALDRIG localStorage)
Supabase datamodel — tabeller for hytter, bookinger, brugere, anmeldelser
CreateListing — formular til at oprette hytte-listing
Hyttesøgning — server-side filtrering via Supabase


Workflow

Denne chat (Claude.ai): arkitektur, beslutninger, Cursor-prompts
Cursor (Agent-mode, Sonnet 4.6): kodeimplementering — start altid med "Læs CLAUDE.md"
Slut session: "Opdater CLAUDE.md med dagens beslutninger"


Tech stack
Next.js 14 (App Router) + TypeScript
Tailwind CSS + shadcn/ui (Radix + Nova preset)
Supabase (PostgreSQL + RLS + Auth)
Stripe Connect (server-side kun)
Cloudinary (billeder)
Mapbox (sejlruter)
next-intl (DA + EN + KL)
Vercel (deploy)
Sikkerhedsregler (aldrig brydes)

Roller server-side via Supabase — aldrig localStorage
Stripe-pris altid server-side
JWT i httpOnly cookies via Supabase Auth
Reviews kræver afsluttet booking (RLS i databasen)
Admin-ruter beskyttet via Next.js middleware

