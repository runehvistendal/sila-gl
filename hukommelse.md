# Sila.gl — Hukommelse

> **På tværs af chat-sessioner:** denne fil plus **[CLAUDE.md](./CLAUDE.md)** er den vedvarende agent-/projekthukommelse i repoet — start her og i CLAUDE.md.

Kort **agent-hukommelse**. Fuld **Claude Code / udviklerkontekst** ligger i **[CLAUDE.md](./CLAUDE.md)**.

## Husk ved sessionstart
- Læs **CLAUDE.md** først.

## Stack (ét øjeblik)
Next.js 14, Supabase, Tailwind, shadcn/ui, Vercel. **Plus Jakarta Sans.** Cursor med **Supabase MCP**.

## Konti
| | e-mail / id |
|---|-------------|
| **Brug denne** | rune.runesen@gmail.com — `313713bd-614d-46f7-b64e-16f525f98309` |
| **Kun reference** | rune.runesen.test@gmail.com — `8c29ab7f-fe44-43ef-a1af-64eda151b2f7` |

## Næste fokus
1. /profil  
2. Cloudinary (hytter + både)  
3. Stripe (15 %, server)  
4. Booking — hytte  
5. Booking — samsejlads  

## 5 regler
1. **Øre** i DB; kun **money.ts** til kr/øre.  
2. **RLS** + server; aldrig roller i `localStorage`.  
3. **Ingen e-mail** i UI — kun `full_name`.  
4. **service_role** (`supabase-service`) **kun** til `profiles.role_type` **UPDATE** — ikke almindelige queries.  
5. **Læs CLAUDE.md** for detaljer (faciliteter, `ride_shares`, `/opret`, sikkerhed, terminologi).
