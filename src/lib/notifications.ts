/**
 * In-app notifikationer (DB) + valgfri transactional email (Resend).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceClient } from "@/lib/supabase-service"
import type { NotificationType } from "@/types/notifications"

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

const NOTIFICATION_TYPES = new Set<string>([
  "stay_offer_received",
  "stay_offer_accepted",
  "stay_offer_declined",
  "booking_confirmed",
  "message_received",
  "transport_offer_received",
  "transport_offer_accepted",
])

export async function createNotification(
  userId: string,
  type: NotificationType,
  referenceId?: string | null,
): Promise<void> {
  if (!userId?.trim() || !NOTIFICATION_TYPES.has(type)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[createNotification] invalid", { userId, type })
    }
    return
  }
  const service = createServiceClient()
  const { error } = await service.from("notifications").insert({
    user_id:      userId,
    type,
    reference_id: referenceId ?? null,
  })
  if (error) {
    console.error("[createNotification]", error.message)
  }
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) {
    console.error("[getUnreadCount]", error.message)
    return 0
  }
  return count ?? 0
}

/** Ulæste stay-tilbud til gæst (dashboard-badge). */
export async function getUnreadStayOfferReceivedCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "stay_offer_received")
    .is("read_at", null)

  if (error) {
    console.error("[getUnreadStayOfferReceivedCount]", error.message)
    return 0
  }
  return count ?? 0
}

/** Sætter read_at for alle ulæste rækker af de angivne typer (auth-bruger). */
export async function markNotificationsReadByTypes(
  supabase: SupabaseClient,
  userId: string,
  types: NotificationType[],
): Promise<void> {
  const valid = types.filter((t) => NOTIFICATION_TYPES.has(t))
  if (valid.length === 0) return
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null)
    .in("type", valid)

  if (error) {
    console.error("[markNotificationsReadByTypes]", error.message)
  }
}

function formatStayDatesDa(isoFrom: string, isoTo: string): string {
  const fmt = new Intl.DateTimeFormat("da-DK", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
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
      to: [to],
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

export async function notifyStayOfferConfirmedGuestPush(stayOfferId: string): Promise<void> {
  console.log("[NOTIFY/PUSH] Stay offer bekræftet (gæst):", stayOfferId)
}

export async function notifyStayOfferConfirmedProviderPush(stayOfferId: string): Promise<void> {
  console.log("[NOTIFY/PUSH] Stay offer booking (udbyder):", stayOfferId)
}

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
