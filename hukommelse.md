# Sila.gl — Hukommelse til Claude

## Status (26.4.2026)
- Landingpage, auth, datamodel (10 tabeller, RLS, triggers) — komplet
- Designsystem: Plus Jakarta Sans, CSS-variabler fra Base44, globals.css, layout.tsx
- /opret — kombineret side med ?type=cabin og ?type=transport
- /mine-hytter — liste med tomt state, edit/delete
- git push gennemført

## Base44-reference
- GitHub: github.com/runehvistendal/sila-2
- Lokalt: C:\Users\rune\sila-2-ref\src\
- REGEL: Læs altid tilsvarende fil i sila-2-ref INDEN en ny side bygges

## Byggeplan (i rækkefølge)
1. /hytter — søgeside → ref: Cabins.jsx + CabinCard + CabinFilters
2. /hytter/[id] — detaljeside → ref: CabinDetail.jsx + CabinTransportSection + CabinReviews
3. /dashboard — alle tabs → ref: Dashboard.jsx
4. /samsejlads — søgeside → ref: Transport.jsx + TransportCard
5. /samsejlads/[id] — detaljeside → ref: TransportDetail.jsx
6. /profil → ref: Profile.jsx (rolle server-side, IKKE localStorage)
7. /booking/success + /cancelled → ref: BookingSuccess.jsx
8. /favoritter → ref: Favourites.jsx
9. Cloudinary billedupload på /opret
10. Stripe Connect + webhooks
11. /admin/* → ref: AdminUsers.jsx, AdminContent.jsx

## Sikkerhedsfejl der rettes løbende
- Rolle ALDRIG i localStorage → server-side RLS
- Stripe-pris ALTID server-side
- Filtrering ALTID i Supabase query, aldrig client-side
- Reviews kræver completed booking (RLS)
- Favourites filtreret på auth.uid(), ikke user_email
- Admin-ruter: middleware.ts + RLS
- JWT: httpOnly cookies via @supabase/ssr

## Stack
Next.js 14 + Supabase (pngpelcaodbwwggaeyue) + Stripe Connect + Tailwind + shadcn/ui + Cloudinary + Mapbox + Vercel