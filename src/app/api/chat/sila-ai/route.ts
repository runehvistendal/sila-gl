import { NextResponse } from "next/server"

const SYSTEM_PROMPT_CORE = `Du er Sila — Grønlands første AI-assistent til korttidsudlejning og samsejlads. Du svarer på spørgsmål om platformen Sila.gl.

Vær venlig, kortfattet og konkret. Maksimalt 3-4 sætninger pr. svar.

OM SILA.GL:
Sila.gl er Grønlands marketplace for korttidsudlejning (hytter og boliger) og samsejlads. Tagline: "Grønland på lokale vilkår."

KATEGORIER:
- Ophold I naturen: hytter og fjordboliger med naturlokation
- Ophold I byen: boliger i byer og bygder
- Samsejlads: sejlads med lokale sejlere fra A til B

OPRET OPSLAG:
Udbydere opretter opslag under /opret. Stripe Connect-konto kræves inden publicering. Hytter og boliger oprettes separat.

BOOKING:
Gæster booker og betaler direkte på platformen.
Betaling sker via Stripe.

GEBYRER:
- Udbydere betaler 5% platformsgebyr
- Gæster betaler 12% servicegebyr oveni prisen
- Samlet: 17% — dette finansierer drift, support og sikker betaling

KONTAKTINFO:
Telefon og email på modparten vises efter bekræftet booking.
Slettes automatisk 3 dage efter checkout.

CHAT:
Gæster og udbydere kan chatte med hinanden efter bekræftet booking
via denne chat-funktion.

SAMSEJLADS:
Sejlere tilbyder pladser på konkrete ruter. Gæster booker individuelle pladser. Priser angives pr. plads.

OPHOLDSØNSKER:
Gæster kan oprette ønsker om ophold — udbydere byder ind med tilbud.
Gæsten accepterer eller afviser tilbud.

ANMELDELSER:
Begge parter kan anmelde hinanden efter afsluttet booking.
Anmeldelser er kun mulige inden for 30 dage efter checkout.

AFBESTILLING:
Afbestillingspolitik aftales mellem gæst og udbyder direkte.
Sila.gl har ikke en fælles afbestillingspolitik i MVP.

SUPPORT:
Ved tekniske problemer: kontakt Sila.gl via platformen.`

function buildSystemPrompt(locale: "da" | "en"): string {
  const languageLine =
    locale === "en" ? "Always respond in English." : "Svar altid på dansk."
  return `${languageLine}\n\n${SYSTEM_PROMPT_CORE}`
}

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 10
const ipRequestTimestamps = new Map<string, number[]>()

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}

function consumeRateToken(ip: string): boolean {
  const now = Date.now()
  const prev = ipRequestTimestamps.get(ip) ?? []
  const recent = prev.filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) {
    ipRequestTimestamps.set(ip, recent)
    return false
  }
  recent.push(now)
  ipRequestTimestamps.set(ip, recent)
  return true
}

type RoleMsg = { role: "user" | "assistant"; content: string }

function validateMessages(raw: unknown): RoleMsg[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: RoleMsg[] = []
  for (const item of raw) {
    if (item === null || typeof item !== "object") return null
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if (role !== "user" && role !== "assistant") return null
    if (typeof content !== "string" || content.trim().length === 0) return null
    out.push({ role, content })
  }
  return out
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (body === null || typeof body !== "object" || !("messages" in body)) {
    return NextResponse.json({ error: "Missing messages array." }, { status: 400 })
  }

  const b = body as { messages: unknown; locale?: unknown }
  const messages = validateMessages(b.messages)
  if (!messages) {
    return NextResponse.json(
      { error: "messages must be a non-empty array of { role, content }." },
      { status: 400 },
    )
  }

  let locale: "da" | "en" = "da"
  if ("locale" in b && b.locale !== undefined) {
    if (b.locale !== "da" && b.locale !== "en") {
      return NextResponse.json({ error: "Invalid locale." }, { status: 400 })
    }
    locale = b.locale
  }
  const ip = getClientIp(request)
  if (!consumeRateToken(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey?.trim()) {
    return NextResponse.json(
      { error: "Assistant is not configured." },
      { status: 503 },
    )
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: buildSystemPrompt(locale),
        messages,
      }),
    })

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>
      error?: { message?: string }
    }

    if (!res.ok) {
      const msg =
        data.error?.message ??
        `Anthropic API error (${res.status})`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const textBlock = data.content?.find((b) => b.type === "text")
    const reply = textBlock?.text?.trim()
    if (!reply) {
      return NextResponse.json(
        { error: "Empty response from assistant." },
        { status: 502 },
      )
    }

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json(
      { error: "Failed to reach assistant service." },
      { status: 502 },
    )
  }
}
