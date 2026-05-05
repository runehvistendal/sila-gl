# Sila.gl — Hukommelse

## Status (5.5.2026)
- Footer ✅ — root layout, alle sider
- /hytter, /hytter/[id], /transport, /transport/[id] ✅
- /dashboard, /anmod, /opret, /profil ✅
- Stripe Connect, bookingflow, anmeldelser, Mapbox ✅
- cabin_requests tabel ✅
- /admin ✅ — dashboard, brugere, hytter, bookinger, anmodninger (is_admin, middleware, service_role)
- /opret/baad ✅ — "Gem båd" + "Gem og opret tur →"
- /opret/samsejlads ✅ — bådvælger, fra/til, dato/tid, pladser, tur/retur pris (60% enkelttur), returtur, UTC
- /opret/hytte ✅ — billeder + alle felter på én side (Cloudinary pending upload)
- /opret/hytte/[id]/tilgængelighed ✅ — kalender, blokér datoer (ledige som standard), legende
- cabin_availability ✅ — gemmer BLOKEREDE datoer (is_available=false); ledige er default
- Æ-tegn i mappenavn ✅ — tilgængelighed → tilgaengelighed (ASCII-safe på Windows)

### Fixes 5.5.2026
- **Duplicate location keys** — 7 dubletter slettet fra greenlandLocations.ts. React-keys → postal_code-name_dk ✅
- **middleware.ts beholdt** — proxy.ts-rename reverteret ✅
- **AvailabilityCalendar** — simpelt klik-toggle + periodevalg (start → slut). Inline style farver, select-none fjernet fra forælde-div ✅
- **saveAvailability** — returnerer { redirectTo } / { error } i stedet for redirect() ✅
- **Tilgængelighed på rediger-siden** — AvailabilityCalendar tilføjet på /opret/hytte/[id]/rediger ✅
- **Slet hytte + båd** — soft delete (deleted_at), Slet-knap på dashboard + /opret ✅
- **Øje-symbol på dashboard** — kladder → /opret/hytte/[id]/rediger, publicerede → /hytter/[id] ✅

## Projekt
- Lokalt: C:\Users\rune\sila-gl
- Repo: github.com/runehvistendal/sila-gl
- Supabase: pngpelcaodbwwggaeyue (West EU Ireland)
- Primær testkonto: rune.runesen@gmail.com

## Næste trin
1. Minimum nætter + forberedelsestid på tilgængeligheds-siden
2. i18n — dansk + engelsk med next-intl
3. SEO — metadata, sitemap, landingssider pr. destination
4. Stripe live-test end-to-end — kritisk inden lancering
5. PostHog analytics — installer inden lancering
6. Lancering — første 20 udbydere

## Sikkerhed
- Stripe end-to-end IKKE testet live — kritisk før lancering
- Testbrugerne (Malik, Sara, Hans, Aviaja) er fake uden auth
