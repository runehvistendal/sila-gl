# Sila.gl — Hukommelse

> På tværs af sessioner: læs **[CLAUDE.md](./CLAUDE.md)** for fuld projektkontekst; denne fil er kort status og beslutninger.

## Status (28.4.2026 — slutning af dag)

Komplet: Landingpage, auth, datamodel (12 tabeller + RLS + triggers),
/opret, /mine-hytter, /hytter, /hytter/[id], /transport, /transport/[id],
/transport/[id]/bekraeftelse, /transport/anmod, /transport/anmodninger/[id],
/dashboard, /profil/[id], Cloudinary, Stripe Connect, hyttebooking+webhook,
transportanmodninger+chat+Stripe+webhook, anmeldelsessystem (dobbelt-blind),
RLS, rate limiting, notifications.ts placeholder.

Samsejlads: /samsejlads slettet og fusioneret ind i /transport.
Mapbox TransportMap.tsx: streets-v12, buet linje (createArc),
grøn afgangsmarker (⚓), rød ankomstmarker (🏁), fitBounds, flyTo,
lazy load via IntersectionObserver (kun overview), direct load (detail).
Returture: return_ride_share_id på ride_shares, badge på listekort,
alternative transportmuligheder fra andre sejlere på /transport/[id].
Timezone: src/lib/nuukTime.ts — America/Godthab, alle tider vises i Nuuk-tid.
Testdata: 4 profiler (Malik, Sara, Hans, Aviaja), 3 hytter, 8 transportture.
DB: alle from_location/to_location er lowercase i ride_shares.

## Status (29.4.2026)

- `/hytter`: facilitetsfiltre i Filtrer-popover (AMENITY_FILTER_KEYS fra amenityMeta.ts), `HytterClient.tsx` klientkomponent
- `/hytter/[id]`: to-kolonne layout (`lg:grid-cols-[1fr_384px]`), sticky booking-widget, `CabinDetailLayout.tsx` + `CabinPageClient.tsx`. Sektionsrækkefølge: Om hytten → Inkluderet → Din vært → Kom dertil → Anmeldelser
- `/transport`: Filtrer-knap med popover (bådtype, kabine, ledige pladser). `TransportFilters.tsx` omskrevet
- `/transport/[id]`: `TransportDrawer.tsx` — shadcn Sheet-sidepanel for returture fra andre sejlere. Bruges også på `/hytter/[id]` via `CabinTransportSection.tsx`
- `/dashboard`: `BookingRow.tsx` accordion med profil-links. Mine ønsker: transportanmodninger + hytteanmodninger (`CabinRequestRow`). Gæsteønsker: begge typer
- `/anmod`: ny side til hytteanmodninger (server action + rate limit)
- **DB**: `cabin_requests` tabel oprettet (migration `20260429130000_cabin_requests` + RLS)
- `amenityMeta.ts`: `AMENITY_META` + `AMENITY_FILTER_KEYS` (18 DB-nøgler)
- `DashboardClient`: null-guards på `myCabinRequests`/`guestCabinRequests` (default `[]`)

Ingen kendte bugs.

## Næste session starter med

**Footer** — se CLAUDE.md "Næste i rækkefølge".

## Vigtige beslutninger (gældende)

- `/profil`: lyst design (`bg-gray-50`), ikke mørkt som resten
- Roller vælges aktivt af bruger — kan altid skifte
- Telefon: react-phone-number-input, E.164, `defaultCountry: GL`
- Email-skift: `supabase.auth.updateUser` — bekræftelse til ny adresse
- Navbar sprog + avatar: synkroniseres via `NavUser` + `revalidatePath("/")`
- Cloudinary: signed uploads, `sila/avatars` + `sila/cabins/[id]`
- **profiles følsomme felter** (`stripe_account_id`, `phone`, `stripe_onboarding_complete`):
  kun via `get_my_sensitive_profile()` og `get_owner_stripe_info(cabin_id)` — aldrig direkte SELECT
- `cabin_bookings` prisfelter: beskyttet af BEFORE UPDATE trigger (`cabin_bookings_guard_update`);
  service_role passerer (auth.uid() IS NULL)
- `handle_new_user` trigger: fallback `full_name = 'Sila-bruger'` — aldrig email
- Ingen `console.log` af service role key eller andre secrets

## Migrations kørt (i orden)

| Migration | Indhold |
|-----------|---------|
| `20260427000000_stripe_connect` | Stripe-kolonner på profiles |
| `20260427010000_bookings` | cabin_bookings tabel, booking_status enum |
| `20260427020000_security_audit` | RLS kolonneniveau, SECURITY DEFINER funktioner, indexes |
| `20260427030000_booking_cleanup` | pg_cron: auto-cancel efter 15 min |
| `20260428180000_rate_limits` | rate_limits tabel + consume_rate_limit RPC |
| `20260428190000_transport_chat` | trip_type, stripe_session_id, messages RLS, get_transport_offer_stripe_info RPC |
| `20260428200000_fix_reviews_rls` | transport_offer_id på reviews, reviews_insert RLS med alle 3 booking-typer |
| `20260428210000_reviews_system` | published_at, expires_at, reviewer_role, reviews_select_public RLS, dobbelt-blind trigger, pg_cron |
| `20260428220000_ride_share_bookings_stripe` | stripe_session_id på ride_share_bookings, get_skipper_stripe_info RPC |
| `20260428_return_trip` | return_ride_share_id kolonne på ride_shares |
| `20260429130000_cabin_requests` | cabin_requests tabel + RLS (gæst/ejer/åbne anmodninger) |

## Næste trin (i rækkefølge)

1. Footer
2. /admin
3. Samsejlads opret-flow (sejler opretter tur med returtur-tilvalg)
4. i18n (dansk + engelsk, next-intl)
5. SEO — metadata, sitemap, landingssider pr. destination
6. Premium-placering (299 kr/md, Stripe subscription)
7. Gæstegebyr 3-5% (tilføjes ved 20+ listings)
8. Offentlig lancering

## Fremtidige features (ikke nu)

- IP-geolocation: automatisk sprog + lokationsforslag
- next-intl i18n (Fase 3): sprogvalg router til `/da/`, `/en/`, `/kl/`
- Grønlandsk sprog (kl): JSON-fil, involvér lokale
