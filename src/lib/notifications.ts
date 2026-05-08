/**
 * Notifikationsmodul — push placeholders + valgfri transactional email (Resend via fetch).
 */

import { createServiceClient } from "@/lib/supabase-service"

export type StayOfferConfirmedEmailContext = {
  stayOfferId: string
  cabinTitle: string
  checkIn: string
  checkOut: string
  guestId: string
  providerId: string
  guestName: string
  providerName: string
}

function formatStayDatesDa(isoFrom: string, isoTo: string): string {
  const fmt = new Intl.DateTimeFormat("da-DK", {
    day:    "numeric",
    month:  "short",
    year:   "numeric",
    timeZone: "UTC",
  })
  return `${fmt.format(new Date(isoFrom + "T12:00:00.000Z"))} – ${fmt.format(
    new Date(isoTo + "T12:00:00.000Z"),
  )}`
}

async function sendTransactionalEmailResend(to: string, subject: string, text: string): Promise<void> {
  const key  = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!key || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("[EMAIL] (resend ikke konfigureret)", { to, subject, preview: text.slice(0, 120) })
    }
    return
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to:  [to],
      subject,
      text,
    }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    console.error("[EMAIL] Resend fejlede", res.status, errBody)
  }
}

export async function notifyNewTransportOffer(offerId: string): Promise<void> {
  console.log("[NOTIFY] Nyt tilbud på transportanmodning:", offerId)
}

export async function notifyTransportOfferAccepted(offerId: string): Promise<void> {
  console.log("[NOTIFY] Tilbud accepteret:", offerId)
}

export async function notifyTransportBookingConfirmed(requestId: string): Promise<void> {
  console.log("[NOTIFY] Transport booking bekræftet:", requestId)
}

export async function notifyNewReview(reviewId: string): Promise<void> {
  console.log("[NOTIFY] Ny anmeldelse:", reviewId)
}

export async function notifyRideShareBookingConfirmed(bookingId: string): Promise<void> {
  console.log("[NOTIFY] Samsejlads booking bekræftet:", bookingId)
}

/** Push / in-app placeholder — gæst. */
export async function notifyStayOfferConfirmedGuestPush(stayOfferId: string): Promise<void> {
  console.log("[NOTIFY/PUSH] Stay offer bekræftet (gæst):", stayOfferId)
}

/** Push / in-app placeholder — udbyder. */
export async function notifyStayOfferConfirmedProviderPush(stayOfferId: string): Promise<void> {
  console.log("[NOTIFY/PUSH] Stay offer booking (udbyder):", stayOfferId)
}

/**
 * Emails + push efter betalt stay-tilbud (Stripe webhook).
 */
export async function notifyStayOfferBookingConfirmed(ctx: StayOfferConfirmedEmailContext): Promise<void> {
  await notifyStayOfferConfirmedGuestPush(ctx.stayOfferId)
  await notifyStayOfferConfirmedProviderPush(ctx.stayOfferId)

  const dateLine = formatStayDatesDa(ctx.checkIn, ctx.checkOut)
  const service    = createServiceClient()

  const [guestAuth, providerAuth] = await Promise.all([
    service.auth.admin.getUserById(ctx.guestId),
    service.auth.admin.getUserById(ctx.providerId),
  ])

  const guestEmail    = guestAuth.data.user?.email?.trim()
  const providerEmail = providerAuth.data.user?.email?.trim()

  if (guestEmail) {
    const text =
      `Hej ${ctx.guestName},\n\n` +
      `Dit tilbud er bekræftet.\n\n` +
      `Ophold: ${ctx.cabinTitle}\n` +
      `Datoer: ${dateLine}\n` +
      `Udbyder: ${ctx.providerName}\n\n` +
      `Du finder bookingen under Bookinger på dit Sila-dashboard.\n`
    await sendTransactionalEmailResend(guestEmail, "Dit tilbud er bekræftet — Sila.gl", text)
  }

  if (providerEmail) {
    const text =
      `Hej ${ctx.providerName},\n\n` +
      `Din booking er bekræftet.\n\n` +
      `Gæst: ${ctx.guestName}\n` +
      `Ophold: ${ctx.cabinTitle}\n` +
      `Datoer: ${dateLine}\n\n` +
      `Se mere under Bookinger på dit Sila-dashboard.\n`
    await sendTransactionalEmailResend(providerEmail, "Din booking er bekræftet — Sila.gl", text)
  }
}
