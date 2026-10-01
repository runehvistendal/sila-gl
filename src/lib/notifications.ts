/**
 * In-app notifikationer (DB) + valgfri transactional email (Resend).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getLocaleUrl } from "@/lib/appUrl"
import { oreToKr } from "@/lib/money"
import { getLocationName } from "@/lib/greenlandLocations"
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
  "ride_share_booking_received",
  "ride_share_booking_cancelled",
  "ride_share_cancelled",
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

// ─────────────────────────────────────────────────────────────────────────────
// Samsejlads — bekræftelse, aflysning
// ─────────────────────────────────────────────────────────────────────────────

type RideShareCtx = {
  rideShareId: string
  skipperId: string
  from: string
  to: string
  departureAt: string
  meetingPoint: string | null
}

async function loadRideShareCtx(
  service: SupabaseClient,
  rideShareId: string,
): Promise<RideShareCtx | null> {
  const { data } = await service
    .from("ride_shares")
    .select("id, skipper_id, from_location, to_location, departure_at, meeting_point")
    .eq("id", rideShareId)
    .maybeSingle()
  if (!data) return null
  const r = data as {
    id: string; skipper_id: string; from_location: string; to_location: string
    departure_at: string; meeting_point: string | null
  }
  return {
    rideShareId: r.id,
    skipperId: r.skipper_id,
    from: getLocationName(r.from_location),
    to: getLocationName(r.to_location),
    departureAt: r.departure_at,
    meetingPoint: r.meeting_point,
  }
}

function formatNuukDateTime(iso: string, lang: NotificationEmailLang): string {
  return new Intl.DateTimeFormat(intlLocale(lang), {
    timeZone: "America/Godthab",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

async function emailFor(service: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await service.auth.admin.getUserById(userId)
  return data.user?.email?.trim() || null
}

async function displayName(service: SupabaseClient, userId: string, fallback: string): Promise<string> {
  const { data } = await service.from("profiles").select("full_name").eq("id", userId).maybeSingle()
  return (data as { full_name?: string | null } | null)?.full_name?.trim() || fallback
}

const PASSENGER_SAFETY: Record<NotificationEmailLang, string> = {
  da:
    "Før afgang:\n" +
    "• Mød op 15 minutter før afgang.\n" +
    "• Tag varmt, vindtæt tøj, hue og handsker på — også om sommeren.\n" +
    "• Sejleren giver en kort sikkerhedsinstruks og sørger for redningsvest til alle.\n" +
    "• Sejladsen sker altid med vejrforbehold. Aflyser sejleren pga. vejr eller is, får du hele beløbet refunderet.\n" +
    "• Nødnummer i Grønland: 112. På havet: VHF kanal 16.\n",
  en:
    "Before departure:\n" +
    "• Arrive 15 minutes before departure.\n" +
    "• Bring warm, windproof clothing, a hat and gloves — even in summer.\n" +
    "• The skipper gives a short safety briefing and provides life jackets for everyone.\n" +
    "• All trips are subject to weather. If the skipper cancels due to weather or ice, you get a full refund.\n" +
    "• Emergency number in Greenland: 112. At sea: VHF channel 16.\n",
}

export async function notifyRideShareBookingConfirmed(bookingId: string): Promise<void> {
  const service = createServiceClient()
  const { data } = await service
    .from("ride_share_bookings")
    .select("id, ride_share_id, passenger_id, num_seats, total_price_ore, service_fee_ore")
    .eq("id", bookingId)
    .maybeSingle()
  if (!data) return
  const b = data as {
    id: string; ride_share_id: string; passenger_id: string
    num_seats: number; total_price_ore: number; service_fee_ore: number
  }
  const ctx = await loadRideShareCtx(service, b.ride_share_id)
  if (!ctx) return

  await createNotification(ctx.skipperId, "ride_share_booking_received", ctx.rideShareId)

  const [skipperLang, passengerLang, skipperEmail, passengerEmail, passengerName, skipperName] =
    await Promise.all([
      getUserLanguage(ctx.skipperId, service),
      getUserLanguage(b.passenger_id, service),
      emailFor(service, ctx.skipperId),
      emailFor(service, b.passenger_id),
      displayName(service, b.passenger_id, "Sila-gæst"),
      displayName(service, ctx.skipperId, "Sila-sejler"),
    ])

  if (skipperEmail) {
    const en = skipperLang === "en"
    const when = formatNuukDateTime(ctx.departureAt, skipperLang)
    const url = getLocaleUrl(skipperLang, `/dashboard/sejlads/${ctx.rideShareId}`)
    await sendTransactionalEmailResend(
      skipperEmail,
      en
        ? `New passenger: ${ctx.from} → ${ctx.to}`
        : `Ny passager: ${ctx.from} → ${ctx.to}`,
      en
        ? `Hello ${skipperName},\n\n${passengerName} has booked ${b.num_seats} seat(s) on your trip ` +
          `${ctx.from} → ${ctx.to} (${when}, Nuuk time).\n\n` +
          `Your passenger list is here — keep it with someone ashore before you leave:\n${url}\n\n` +
          `Remember the safety briefing and life jackets for everyone on board.\n\nKind regards\nSila.gl\n`
        : `Hej ${skipperName},\n\n${passengerName} har booket ${b.num_seats} plads(er) på din tur ` +
          `${ctx.from} → ${ctx.to} (${when}, Nuuk-tid).\n\n` +
          `Din passagerliste finder du her — efterlad den hos en person i land før afgang:\n${url}\n\n` +
          `Husk sikkerhedsinstruks og redningsvest til alle om bord.\n\nVenlig hilsen\nSila.gl\n`,
    )
  }

  if (passengerEmail) {
    const en = passengerLang === "en"
    const when = formatNuukDateTime(ctx.departureAt, passengerLang)
    const total = formatPriceKrEmail(b.total_price_ore + b.service_fee_ore, passengerLang)
    const meet = ctx.meetingPoint ? (en ? `Meeting point: ${ctx.meetingPoint}\n` : `Mødested: ${ctx.meetingPoint}\n`) : ""
    const url = getLocaleUrl(passengerLang, "/dashboard?tab=bookings")
    await sendTransactionalEmailResend(
      passengerEmail,
      en ? `Booking confirmed: ${ctx.from} → ${ctx.to}` : `Booking bekræftet: ${ctx.from} → ${ctx.to}`,
      en
        ? `Hello ${passengerName},\n\nYou're booked on ${skipperName}'s trip ${ctx.from} → ${ctx.to}.\n\n` +
          `Departure: ${when} (Nuuk time)\n${meet}Seats: ${b.num_seats}\nPaid: ${total}\n\n` +
          `${PASSENGER_SAFETY.en}\nYour booking and the skipper's contact details:\n${url}\n\nKind regards\nSila.gl\n`
        : `Hej ${passengerName},\n\nDu er booket på ${skipperName}s tur ${ctx.from} → ${ctx.to}.\n\n` +
          `Afgang: ${when} (Nuuk-tid)\n${meet}Pladser: ${b.num_seats}\nBetalt: ${total}\n\n` +
          `${PASSENGER_SAFETY.da}\nDin booking og sejlerens kontaktoplysninger:\n${url}\n\nVenlig hilsen\nSila.gl\n`,
    )
  }
}

/** Sejleren har aflyst hele turen — alle passagerer får besked om fuld refusion. */
export async function notifyRideShareCancelledBySkipper(
  rideShareId: string,
  passengers: Array<{ passengerId: string; refundedOre: number }>,
  reason: "weather" | "skipper_cancelled",
): Promise<void> {
  const service = createServiceClient()
  const ctx = await loadRideShareCtx(service, rideShareId)
  if (!ctx) return
  await Promise.all(
    passengers.map(async (p) => {
      await createNotification(p.passengerId, "ride_share_cancelled", rideShareId)
      const [lang, email, name] = await Promise.all([
        getUserLanguage(p.passengerId, service),
        emailFor(service, p.passengerId),
        displayName(service, p.passengerId, "Sila-gæst"),
      ])
      if (!email) return
      const en = lang === "en"
      const when = formatNuukDateTime(ctx.departureAt, lang)
      const amount = formatPriceKrEmail(p.refundedOre, lang)
      const why = reason === "weather"
        ? (en ? "due to weather or ice conditions" : "på grund af vejr eller isforhold")
        : (en ? "by the skipper" : "af sejleren")
      const findUrl = getLocaleUrl(lang, "/transport")
      await sendTransactionalEmailResend(
        email,
        en ? `Trip cancelled: ${ctx.from} → ${ctx.to}` : `Tur aflyst: ${ctx.from} → ${ctx.to}`,
        en
          ? `Hello ${name},\n\nThe trip ${ctx.from} → ${ctx.to} on ${when} has been cancelled ${why}.\n\n` +
            `You'll receive a full refund of ${amount}. It usually appears on your card within 5–10 days.\n\n` +
            `Find another trip or post a request:\n${findUrl}\n\nKind regards\nSila.gl\n`
          : `Hej ${name},\n\nTuren ${ctx.from} → ${ctx.to} ${when} er aflyst ${why}.\n\n` +
            `Du får hele beløbet på ${amount} refunderet. Det står normalt på dit kort inden for 5–10 dage.\n\n` +
            `Find en anden tur eller efterlys en sejlads:\n${findUrl}\n\nVenlig hilsen\nSila.gl\n`,
      )
    }),
  )
}

/** En passager har annulleret — sejleren får besked. */
export async function notifyRideShareBookingCancelledByPassenger(
  rideShareId: string,
  passengerId: string,
  seats: number,
): Promise<void> {
  const service = createServiceClient()
  const ctx = await loadRideShareCtx(service, rideShareId)
  if (!ctx) return
  await createNotification(ctx.skipperId, "ride_share_booking_cancelled", rideShareId)
  const [lang, email, passengerName] = await Promise.all([
    getUserLanguage(ctx.skipperId, service),
    emailFor(service, ctx.skipperId),
    displayName(service, passengerId, "Sila-gæst"),
  ])
  if (!email) return
  const en = lang === "en"
  const when = formatNuukDateTime(ctx.departureAt, lang)
  await sendTransactionalEmailResend(
    email,
    en ? `Booking cancelled: ${ctx.from} → ${ctx.to}` : `Afbestilling: ${ctx.from} → ${ctx.to}`,
    en
      ? `${passengerName} has cancelled ${seats} seat(s) on your trip ${ctx.from} → ${ctx.to} (${when}). ` +
        `The seats are available again.\n\nSila.gl\n`
      : `${passengerName} har afbestilt ${seats} plads(er) på din tur ${ctx.from} → ${ctx.to} (${when}). ` +
        `Pladserne er ledige igen.\n\nSila.gl\n`,
  )
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
