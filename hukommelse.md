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
- /opret/hytte/[id]/tilgaengelighed ✅ — kalender, blokér datoer (ledige som standard), legende

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
1. ~~i18n — dansk + engelsk med next-intl~~ ✅ FÆRDIG — se detaljer nedenfor
2. SEO — metadata, sitemap, landingssider pr. destination
3. Stripe live-test end-to-end — kritisk inden lancering
4. PostHog analytics — installer inden lancering
5. Lancering — første 20 udbydere

## i18n — dansk + engelsk (færdig 5.5.2026)
- **next-intl** installeret og konfigureret
- **Routing:** `localePrefix: "always"` → /da/... og /en/...
- **Filer:** `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`
- **Messages:** `messages/da.json` + `messages/en.json` (comprehensive, alle namespaces)
- **proxy.ts:** Erstatter middleware.ts — combinerer next-intl + Supabase auth middleware
- **App-struktur:** Alle sider under `src/app/[locale]/`; api/, auth/, stripe/ forbliver på rodniveau
- **Oversat (fase 1):** Landingpage, /hytter, /transport, Navbar, Footer
- **Navbar:** Fungerende locale-skifter (dropdown med 🇩🇰 Dansk / 🇬🇧 English) + opdaterer profiles.language i DB
- **Import-fix:** Alle shared components opdateret til `@/app/[locale]/...` paths
- **Ikke oversat (fase 2):** Dashboard, /opret, /admin, /profil — bruger hardkodet dansk for nu

## Sikkerhed
- Stripe end-to-end IKKE testet live — kritisk før lancering
- Testbrugerne (Malik, Sara, Hans, Aviaja) er fake uden auth
