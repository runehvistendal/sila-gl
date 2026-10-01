/**
 * In-app notifikationer (DB) + valgfri transactional email (Resend).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getLocaleUrl } from "@/lib/appUrl"
import { oreToKr } from "@/lib/money"
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

export type CabinTransportOfferEmailContext = {
  requestId: string
  offerId: string
  guestId: string
  providerId: string
  cabinTitle: string
  arrivalPoint: string
  arrivalDate: string
  priceOre: number
}

const NOTIFICATION_TYPES = new Set<string>([
  "stay_offer_received",
  "stay_offer_accepted",
  "stay_offer_declined",
  "booking_confirmed",
  "message_received",
  "transport_offer_received",
  "transport_offer_accepted",
  "cabin_transport_offer_received",
  "experience_booking_received",
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

export type NotificationEmailLang = "da" | "en"

/** Profilsprog til e-mail; `kl` og ukendt falder tilbage til dansk. */
export async function getUserLanguage(
  userId: string,
  service: SupabaseClient,
): Promise<NotificationEmailLang> {
  if (!userId?.trim()) return "da"
  const { data, error } = await service
    .from("profiles")
    .select("language")
    .eq("id", userId)
    .maybeSingle()

  if (error || !data) return "da"
  const lang = String((data as { language?: string | null }).language ?? "")
    .trim()
    .toLowerCase()
  if (lang === "en") return "en"
  return "da"
}

function intlLocale(lang: NotificationEmailLang): string {
  return lang === "en" ? "en-GB" : "da-DK"
}

function formatSingleDateYmd(ymd: string, lang: NotificationEmailLang): string {
  const fmt = new Intl.DateTimeFormat(intlLocale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
  return fmt.format(new Date(ymd.trim() + "T12:00:00.000Z"))
}

function arrivalPointLabel(point: string, lang: NotificationEmailLang): string {
  const p = point.trim().toLowerCase()
  if (lang === "en") {
    if (p === "airport") return "Airport"
    if (p === "harbour") return "Harbour"
    if (p === "helipad") return "Helipad"
    return point.trim()
  }
  if (p === "airport") return "Lufthavn"
  if (p === "harbour") return "Havn"
  if (p === "helipad") return "Helipad"
  return point.trim()
}

function formatPriceKrEmail(ore: number, lang: NotificationEmailLang): string {
  const kr = oreToKr(ore)
  const locale = intlLocale(lang)
  const num = kr.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return lang === "en" ? `${num} DKK` : `${num} kr`
}

function formatStayDateRange(
  checkIn: string,
  checkOut: string,
  lang: NotificationEmailLang,
): string {
  const fmt = new Intl.DateTimeFormat(intlLocale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
  return `${fmt.format(new Date(checkIn + "T12:00:00.000Z"))} – ${fmt.format(
    new Date(checkOut + "T12:00:00.000Z"),
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

const CABIN_TRANSPORT_RECEIVED_TEXTS: Record<
  NotificationEmailLang,
  {
    guestSubject: (c: CabinTransportOfferEmailContext) => string
    providerSubject: string
    guestBody: (
      c: CabinTransportOfferEmailContext,
      detailUrl: string,
      dateLine: string,
      pointLabel: string,
      priceLine: string,
    ) => string
    providerBody: (
      c: CabinTransportOfferEmailContext,
      dateLine: string,
      priceLine: string,
    ) => string
  }
> = {
  da: {
    guestSubject: (c) => `Du har modtaget et transporttilbud – ${c.cabinTitle}`,
    providerSubject: "Dit transportbud er sendt",
    guestBody: (c, detailUrl, dateLine, pointLabel, priceLine) =>
      `Hej,\n\n` +
      `En udbyder har budt på transport til ${c.cabinTitle}.\n\n` +
      `Pris: ${priceLine}\n` +
      `Ankomstpunkt: ${pointLabel}\n` +
      `Ankomstdato: ${dateLine}\n\n` +
      `Se og besvar tilbuddet på:\n${detailUrl}\n\n` +
      `Med venlig hilsen\nSila.gl\n`,
    providerBody: (c, dateLine, priceLine) =>
      `Hej,\n\n` +
      `Vi bekræfter, at dit transportbud er sendt til gæsten.\n\n` +
      `Pris: ${priceLine}\n` +
      `Hytte: ${c.cabinTitle}\n` +
      `Ankomstdato: ${dateLine}\n\n` +
      `Med venlig hilsen\nSila.gl\n`,
  },
  en: {
    guestSubject: (c) => `You have received a transport offer – ${c.cabinTitle}`,
    providerSubject: "Your transport bid has been sent",
    guestBody: (c, detailUrl, dateLine, pointLabel, priceLine) =>
      `Hello,\n\n` +
      `A provider has submitted a bid for transport to ${c.cabinTitle}.\n\n` +
      `Price: ${priceLine}\n` +
      `Arrival point: ${pointLabel}\n` +
      `Arrival date: ${dateLine}\n\n` +
      `Review and respond here:\n${detailUrl}\n\n` +
      `Kind regards\nSila.gl\n`,
    providerBody: (c, dateLine, priceLine) =>
      `Hello,\n\n` +
      `This confirms your transport bid has been sent to the guest.\n\n` +
      `Price: ${priceLine}\n` +
      `Cabin: ${c.cabinTitle}\n` +
      `Arrival date: ${dateLine}\n\n` +
      `Kind regards\nSila.gl\n`,
  },
}

const CABIN_TRANSPORT_ACCEPTED_TEXTS: Record<
  NotificationEmailLang,
  {
    providerSubject: (c: CabinTransportOfferEmailContext) => string
    guestSubject: (c: CabinTransportOfferEmailContext) => string
    providerBody: (
      c: CabinTransportOfferEmailContext,
      dateLine: string,
      pointLabel: string,
      priceLine: string,
      dashboardUrl: string,
    ) => string
    guestBody: (
      c: CabinTransportOfferEmailContext,
      dateLine: string,
      pointLabel: string,
      priceLine: string,
      detailUrl: string,
    ) => string
  }
> = {
  da: {
    providerSubject: (c) => `Din transport er bekræftet – ${c.cabinTitle}`,
    guestSubject: (c) => `Transportbud accepteret – ${c.cabinTitle}`,
    providerBody: (c, dateLine, pointLabel, priceLine, dashboardUrl) =>
      `Hej,\n\n` +
      `Gæsten har accepteret dit transportbud.\n\n` +
      `Hytte: ${c.cabinTitle}\n` +
      `Ankomstpunkt: ${pointLabel}\n` +
      `Ankomstdato: ${dateLine}\n` +
      `Pris: ${priceLine}\n\n` +
      `Kontaktinfo til gæsten følger, når betaling er gennemført.\n\n` +
      `Se dit dashboard:\n${dashboardUrl}\n\n` +
      `Med venlig hilsen\nSila.gl\n`,
    guestBody: (c, dateLine, pointLabel, priceLine, detailUrl) =>
      `Hej,\n\n` +
      `Du har accepteret transport til ${c.cabinTitle}.\n\n` +
      `Pris: ${priceLine}\n` +
      `Ankomstpunkt: ${pointLabel}\n` +
      `Ankomstdato: ${dateLine}\n\n` +
      `Betaling og kontaktinfo til udbyderen kommer i næste trin.\n\n` +
      `Se anmodningen her:\n${detailUrl}\n\n` +
      `Med venlig hilsen\nSila.gl\n`,
  },
  en: {
    providerSubject: (c) => `Your transport is confirmed – ${c.cabinTitle}`,
    guestSubject: (c) => `Transport offer accepted – ${c.cabinTitle}`,
    providerBody: (c, dateLine, pointLabel, priceLine, dashboardUrl) =>
      `Hello,\n\n` +
      `The guest has accepted your transport bid.\n\n` +
      `Cabin: ${c.cabinTitle}\n` +
      `Arrival point: ${pointLabel}\n` +
      `Arrival date: ${dateLine}\n` +
      `Price: ${priceLine}\n\n` +
      `Guest contact details will follow once payment is complete.\n\n` +
      `Your dashboard:\n${dashboardUrl}\n\n` +
      `Kind regards\nSila.gl\n`,
    guestBody: (c, dateLine, pointLabel, priceLine, detailUrl) =>
      `Hello,\n\n` +
      `You have accepted transport to ${c.cabinTitle}.\n\n` +
      `Price: ${priceLine}\n` +
      `Arrival point: ${pointLabel}\n` +
      `Arrival date: ${dateLine}\n\n` +
      `Payment and provider contact details will follow in the next step.\n\n` +
      `View your request:\n${detailUrl}\n\n` +
      `Kind regards\nSila.gl\n`,
  },
}

const STAY_OFFER_BOOKING_CONFIRMED_TEXTS: Record<
  NotificationEmailLang,
  {
    guestSubject: string
    providerSubject: string
    guestBody: (
      ctx: StayOfferConfirmedEmailContext,
      dateLine: string,
      dashboardUrl: string,
    ) => string
    providerBody: (
      ctx: StayOfferConfirmedEmailContext,
      dateLine: string,
      dashboardUrl: string,
    ) => string
  }
> = {
  da: {
    guestSubject: "Dit tilbud er bekræftet — Sila.gl",
    providerSubject: "Din booking er bekræftet — Sila.gl",
    guestBody: (ctx, dateLine, dashboardUrl) =>
      `Hej ${ctx.guestName},\n\n` +
      `Dit tilbud er bekræftet.\n\n` +
      `Ophold: ${ctx.cabinTitle}\n` +
      `Datoer: ${dateLine}\n` +
      `Udbyder: ${ctx.providerName}\n\n` +
      `Du finder bookingen under Bookinger på dit Sila-dashboard:\n${dashboardUrl}\n\n` +
      `Med venlig hilsen\nSila.gl\n`,
    providerBody: (ctx, dateLine, dashboardUrl) =>
      `Hej ${ctx.providerName},\n\n` +
      `Din booking er bekræftet.\n\n` +
      `Gæst: ${ctx.guestName}\n` +
      `Ophold: ${ctx.cabinTitle}\n` +
      `Datoer: ${dateLine}\n\n` +
      `Se mere under Bookinger på dit Sila-dashboard:\n${dashboardUrl}\n\n` +
      `Med venlig hilsen\nSila.gl\n`,
  },
  en: {
    guestSubject: "Your stay offer is confirmed — Sila.gl",
    providerSubject: "Your booking is confirmed — Sila.gl",
    guestBody: (ctx, dateLine, dashboardUrl) =>
      `Hello ${ctx.guestName},\n\n` +
      `Your offer has been confirmed.\n\n` +
      `Stay: ${ctx.cabinTitle}\n` +
      `Dates: ${dateLine}\n` +
      `Host: ${ctx.providerName}\n\n` +
      `View the booking under Bookings in your Sila dashboard:\n${dashboardUrl}\n\n` +
      `Kind regards\nSila.gl\n`,
    providerBody: (ctx, dateLine, dashboardUrl) =>
      `Hello ${ctx.providerName},\n\n` +
      `Your booking is confirmed.\n\n` +
      `Guest: ${ctx.guestName}\n` +
      `Stay: ${ctx.cabinTitle}\n` +
      `Dates: ${dateLine}\n\n` +
      `See more under Bookings on your Sila dashboard:\n${dashboardUrl}\n\n` +
      `Kind regards\nSila.gl\n`,
  },
}

export async function notifyCabinTransportOfferReceived(
  ctx: CabinTransportOfferEmailContext,
): Promise<void> {
  const service = createServiceClient()

  const [guestLang, providerLang, guestAuth, providerAuth] = await Promise.all([
    getUserLanguage(ctx.guestId, service),
    getUserLanguage(ctx.providerId, service),
    service.auth.admin.getUserById(ctx.guestId),
    service.auth.admin.getUserById(ctx.providerId),
  ])

  const guestEmail    = guestAuth.data.user?.email?.trim()
  const providerEmail = providerAuth.data.user?.email?.trim()

  if (guestEmail) {
    const lang       = guestLang
    const t          = CABIN_TRANSPORT_RECEIVED_TEXTS[lang]
    const dateLine   = formatSingleDateYmd(ctx.arrivalDate, lang)
    const pointLabel = arrivalPointLabel(ctx.arrivalPoint, lang)
    const priceLine  = formatPriceKrEmail(ctx.priceOre, lang)
    const detailUrl  = getLocaleUrl(lang, `/dashboard/transport-anmodninger/${ctx.requestId}`)
    await sendTransactionalEmailResend(
      guestEmail,
      t.guestSubject(ctx),
      t.guestBody(ctx, detailUrl, dateLine, pointLabel, priceLine),
    )
  }

  if (providerEmail) {
    const lang       = providerLang
    const t          = CABIN_TRANSPORT_RECEIVED_TEXTS[lang]
    const dateLine   = formatSingleDateYmd(ctx.arrivalDate, lang)
    const priceLine  = formatPriceKrEmail(ctx.priceOre, lang)
    await sendTransactionalEmailResend(
      providerEmail,
      t.providerSubject,
      t.providerBody(ctx, dateLine, priceLine),
    )
  }
}

export async function notifyCabinTransportOfferAccepted(
  ctx: CabinTransportOfferEmailContext,
): Promise<void> {
  const service = createServiceClient()

  const [guestLang, providerLang, guestAuth, providerAuth] = await Promise.all([
    getUserLanguage(ctx.guestId, service),
    getUserLanguage(ctx.providerId, service),
    service.auth.admin.getUserById(ctx.guestId),
    service.auth.admin.getUserById(ctx.providerId),
  ])

  const guestEmail    = guestAuth.data.user?.email?.trim()
  const providerEmail = providerAuth.data.user?.email?.trim()

  if (providerEmail) {
    const lang          = providerLang
    const t             = CABIN_TRANSPORT_ACCEPTED_TEXTS[lang]
    const dateLine      = formatSingleDateYmd(ctx.arrivalDate, lang)
    const pointLabel    = arrivalPointLabel(ctx.arrivalPoint, lang)
    const priceLine     = formatPriceKrEmail(ctx.priceOre, lang)
    const dashboardUrl  = getLocaleUrl(lang, "/dashboard?tab=bookings")
    await sendTransactionalEmailResend(
      providerEmail,
      t.providerSubject(ctx),
      t.providerBody(ctx, dateLine, pointLabel, priceLine, dashboardUrl),
    )
  }

  if (guestEmail) {
    const lang       = guestLang
    const t          = CABIN_TRANSPORT_ACCEPTED_TEXTS[lang]
    const dateLine   = formatSingleDateYmd(ctx.arrivalDate, lang)
    const pointLabel = arrivalPointLabel(ctx.arrivalPoint, lang)
    const priceLine  = formatPriceKrEmail(ctx.priceOre, lang)
    const detailUrl  = getLocaleUrl(lang, `/dashboard/transport-anmodninger/${ctx.requestId}`)
    await sendTransactionalEmailResend(
      guestEmail,
      t.guestSubject(ctx),
      t.guestBody(ctx, dateLine, pointLabel, priceLine, detailUrl),
    )
  }
}

export async function notifyStayOfferBookingConfirmed(ctx: StayOfferConfirmedEmailContext): Promise<void> {
  await notifyStayOfferConfirmedGuestPush(ctx.stayOfferId)
  await notifyStayOfferConfirmedProviderPush(ctx.stayOfferId)

  const service = createServiceClient()

  const [guestLang, providerLang, guestAuth, providerAuth] = await Promise.all([
    getUserLanguage(ctx.guestId, service),
    getUserLanguage(ctx.providerId, service),
    service.auth.admin.getUserById(ctx.guestId),
    service.auth.admin.getUserById(ctx.providerId),
  ])

  const guestEmail    = guestAuth.data.user?.email?.trim()
  const providerEmail = providerAuth.data.user?.email?.trim()

  if (guestEmail) {
    const lang         = guestLang
    const dateLine     = formatStayDateRange(ctx.checkIn, ctx.checkOut, lang)
    const dashboardUrl = getLocaleUrl(lang, "/dashboard?tab=bookings")
    const t            = STAY_OFFER_BOOKING_CONFIRMED_TEXTS[lang]
    await sendTransactionalEmailResend(
      guestEmail,
      t.guestSubject,
      t.guestBody(ctx, dateLine, dashboardUrl),
    )
  }

  if (providerEmail) {
    const lang         = providerLang
    const dateLine     = formatStayDateRange(ctx.checkIn, ctx.checkOut, lang)
    const dashboardUrl = getLocaleUrl(lang, "/dashboard?tab=bookings")
    const t            = STAY_OFFER_BOOKING_CONFIRMED_TEXTS[lang]
    await sendTransactionalEmailResend(
      providerEmail,
      t.providerSubject,
      t.providerBody(ctx, dateLine, dashboardUrl),
    )
  }
}
