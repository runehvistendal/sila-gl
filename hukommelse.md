# Sila.gl — Hukommelse

> På tværs af sessioner: læs **[CLAUDE.md](./CLAUDE.md)** for fuld projektkontekst; denne fil er kort status og beslutninger.

## Status (28.4.2026)

Komplet og fungerende:
- Landingpage, auth, datamodel, /opret, /mine-hytter
- /hytter, /hytter/[id] med sticky booking-widget
- /transport, /transport/[id]
- /dashboard (alle tabs), /profil (komplet)
- Cloudinary: avatar + hyttebilleder (CabinCard bruger nu `<img>` + MountainSnow placeholder)
- Stripe Connect onboarding (udbyder forbinder Stripe)
- Hyttebooking: Stripe checkout + webhook (confirmed verificeret)
- Kalender: grå strikethrough på optagede datoer
- Cancel-flow: pending annulleres ved tilbagetryk (Stripe session expires)
- pg_cron: pending bookinger udløber automatisk efter 15 min
- Rate limiting: 5 forsøg / 10 min pr. bruger (`rate_limits` tabel + RPC)
- Sikkerhedsaudit: RLS på alle 12 tabeller, ownership checks, immutable felter beskyttet
- **Transportanmodninger** (ny): /transport/anmod, /transport/anmodninger/[id], chat, tilbud, Stripe betaling, webhook
- **Anmeldelsessystem** (ny): dobbelt-blind, 30-dages vindue, trigger, pg_cron, ReviewForm, dashboard review-knap, /profil/[id] offentlig
- **Samsejlads bookingflow** (ny): /samsejlads søgeside, /samsejlads/[id] detaljeside + booking, /samsejlads/opret, /samsejlads/[id]/bekraeftelse, Stripe Checkout, webhook

Ingen kendte bugs.

## Næste session starter med

**Mapbox sejlruter** — se CLAUDE.md "Næste i rækkefølge".

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

## Næste trin (i rækkefølge)

1. ~~Hyttekort mangler billede~~ ✅
2. ~~Transportanmodninger~~ ✅
3. ~~Anmeldelsessystem~~ ✅
4. ~~Samsejlads bookingflow~~ ✅
5. Mapbox sejlruter
6. Footer
7. /admin
8. i18n (dansk + engelsk med next-intl)
9. SEO
10. Stripe webhook til Vercel (ved deploy)
11. MobilePay (fase 3)
12. Udbyderguide til Stripe onboarding (fase 3)

## Fremtidige features (ikke nu)

- IP-geolocation: automatisk sprog + lokationsforslag
- next-intl i18n (Fase 3): sprogvalg router til `/da/`, `/en/`, `/kl/`
- Grønlandsk sprog (kl): JSON-fil, involvér lokale
