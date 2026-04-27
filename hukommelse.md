# Sila.gl — Hukommelse til Cursor

## Status (27.4.2026)
Komplet: landingpage, auth, datamodel, /opret, /mine-hytter, /hytter, /hytter/[id], navbar, /dashboard (5 tabs), /transport, /transport/[id], Footer

## Næste i rækkefølge
1. /profil
2. Cloudinary billedupload på /opret
3. Stripe Connect + webhooks
4. /booking/success + /cancelled
5. /admin/*

## ride_shares — korrekte kolonnenavne
- departure_at (timestamptz) — IKKE departure_date
- status (enum: 'active'|...) — IKKE active boolean
- boat_description — IKKE boat_type
- description — IKKE notes
- from_latitude, from_longitude, to_latitude, to_longitude (NOT NULL)
- Ingen images-kolonne

## Cursor-workflow (VIGTIGT)
- Cursor-prompts kopieres ind i Cursor-chatfeltet — de erstatter ALDRIG CLAUDE.md
- CLAUDE.md er et permanent dokument — Cursor opdaterer det selv når prompten beder om det
- Start hver session med: "Læs CLAUDE.md"
- Afslut session: git add . && git commit -m "..." && git push
