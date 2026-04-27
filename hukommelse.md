# Sila.gl — Hukommelse

> På tværs af sessioner: læs **[CLAUDE.md](./CLAUDE.md)** for fuld projektkontekst; denne fil er kort status og beslutninger.

## Status (27.4.2026)

Seneste commit: profil komplet + Cloudinary + navbar sprog/avatar sync.  
Ingen kendte bugs.

## Næste session starter med

Stripe Connect — se CLAUDE.md "Næste i rækkefølge".

## Vigtige beslutninger taget siden sidst

- /profil: lyst design (bg-gray-50), ikke mørkt som resten
- Roller vælges aktivt af bruger — kan altid skifte
- Telefon: react-phone-number-input, E.164, defaultCountry GL
- Email-skift: supabase.auth.updateUser — bekræftelse til ny adresse
- Navbar sprog + avatar: synkroniseres via NavUser + `revalidatePath("/")`
- Cloudinary: signed uploads, `sila/avatars` + `sila/cabins/[id]`

## Fremtidige features (ikke nu)

- IP-geolocation: automatisk sprog + lokationsforslag
- next-intl i18n (Fase 3): sprogvalg router til `/da/`, `/en/`, `/kl/`
- Grønlandsk sprog (kl): JSON-fil, involvér lokale
