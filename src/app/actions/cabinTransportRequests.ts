"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"
import {
  createNotification,
  notifyCabinTransportOfferAccepted,
  notifyCabinTransportOfferReceived,
} from "@/lib/notifications"
import {
  getArrivalPoints,
  type ArrivalPoint,
} from "@/lib/greenlandLocations"
import { krToOre } from "@/lib/money"

function unwrapCabinTitle(
  cabins:
    | { title?: string | null }
    | { title?: string | null }[]
    | null
    | undefined,
): string {
  let row = cabins
  if (Array.isArray(row)) row = row[0] ?? null
  const t = row?.title != null ? String(row.title).trim() : ""
  return t || "Hytte"
}

/** Nested cabin_transport_requests til email efter accept (Supabase embed). */
type CabinTransportRequestEmailNest = {
  id: string
  guest_id: string
  cabin_id: string
  arrival_point: string
  arrival_date: string
  cabins:
    | { title?: string | null }
    | { title?: string | null }[]
    | null
    | undefined
}

export type CreateCabinTransportRequestInput = {
  cabin_id: string
  /** Indtjek fra booking-widget — ankomstdato skal være samme eller senere */
  check_in: string
  arrival_date: string
  /** Valgfri — må ikke være før arrival_date */
  return_date?: string | null
  arrival_point: ArrivalPoint
  num_persons: number
  message?: string | null
}

export type CreateCabinTransportRequestResult =
  | { success: true }
  | { error: string }

/** Badge-rækker til Mine ønsker (som stay_offers på stay_requests). */
export type CabinTransportOfferBadge = {
  id: string
  status: string
}

/** Åben hytte-transportanmodning til udbyder-liste (dashboard). */
export type OpenCabinTransportRequestRow = {
  id: string
  cabin_id: string
  guest_id: string
  arrival_point: string
  arrival_date: string
  num_persons: number
  message: string | null
  status: string
  expires_at: string
  created_at: string
  cabins: { title: string; location_hub: string } | null
  profiles: { full_name: string | null } | null
}

/** Gæstens egne hytte-transportanmodninger inkl. tilbud til badges. */
export type MyCabinTransportRequestRow = {
  id: string
  cabin_id: string
  guest_id: string
  arrival_point: string
  arrival_date: string
  num_persons: number
  message: string | null
  status: string
  expires_at: string
  created_at: string
  cabins: { title: string; location_hub: string } | null
  cabin_transport_offers: CabinTransportOfferBadge[]
}

export type CreateCabinTransportOfferResult =
  | { success: true }
  | { error: string }

export type AcceptCabinTransportOfferResult =
  | { success: true; cabinId: string; offerId: string }
  | { error: string }

function parseYmd(s: string): { ok: true; d: string } | { ok: false } {
  const t = s.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { ok: false }
  const [y, m, d] = t.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false }
  }
  return { ok: true, d: t }
}

function allowedArrivalPointTypes(hub: string): ArrivalPoint[] {
  const pts = getArrivalPoints(hub)
  if (pts.length > 0) return pts
  return ["harbour"]
}

export async function createCabinTransportRequest(
  input: CreateCabinTransportRequestInput,
): Promise<CreateCabinTransportRequestResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du skal være logget ind." }
  }

  const ci = parseYmd(input.check_in)
  const ad = parseYmd(input.arrival_date)
  if (!ci.ok) {
    return { error: "Ugyldig indtjekdato." }
  }
  if (!ad.ok) {
    return { error: "Ugyldig ankomstdato." }
  }
  if (ad.d < ci.d) {
    return { error: "Ankomstdato kan ikke være før indtjek." }
  }

  let returnDateYmd: string | null = null
  const rdRaw =
    input.return_date != null ? String(input.return_date).trim() : ""
  if (rdRaw !== "") {
    const rd = parseYmd(rdRaw)
    if (!rd.ok) {
      return { error: "Ugyldig returdato." }
    }
    if (rd.d < ad.d) {
      return { error: "Returdato kan ikke være før ankomstdato." }
    }
    returnDateYmd = rd.d
  }

  const n = Math.floor(Number(input.num_persons))
  if (!Number.isFinite(n) || n < 1) {
    return { error: "Ugyldigt antal personer." }
  }

  let msg: string | null = null
  if (input.message != null && String(input.message).trim() !== "") {
    msg = String(input.message).trim()
    if (msg.length > 500) {
      return { error: "Beskeden må højst være 500 tegn." }
    }
  }

  const { data: cabin, error: cabinErr } = await supabase
    .from("cabins")
    .select("id, max_guests, location_hub, published, deleted_at, property_type")
    .eq("id", input.cabin_id)
    .eq("published", true)
    .eq("property_type", "cabin")
    .is("deleted_at", null)
    .maybeSingle()

  if (cabinErr || !cabin) {
    return { error: "Hytten findes ikke eller er ikke tilgængelig." }
  }

  if (n > cabin.max_guests) {
    return { error: `Højst ${cabin.max_guests} personer.` }
  }

  const allowed = allowedArrivalPointTypes(cabin.location_hub)
  if (!allowed.includes(input.arrival_point)) {
    return { error: "Ugyldigt ankomstpunkt for denne destination." }
  }

  const { error: insErr } = await supabase.from("cabin_transport_requests").insert({
    cabin_id: cabin.id,
    guest_id: user.id,
    arrival_point: input.arrival_point,
    arrival_date: ad.d,
    return_date: returnDateYmd,
    num_persons: n,
    message: msg,
  })

  if (insErr) {
    console.error("[createCabinTransportRequest]", insErr)
    return { error: "Kunne ikke gemme anmodningen. Prøv igen." }
  }

  return { success: true }
}

/** Udbyder: alle åbne hytte-transportanmodninger (RLS: authenticated må SELECT alle). */
export async function getOpenCabinTransportRequestsForProvider(): Promise<
  OpenCabinTransportRequestRow[]
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("cabin_transport_requests")
    .select(
      `
      id,
      cabin_id,
      guest_id,
      arrival_point,
      arrival_date,
      num_persons,
      message,
      status,
      expires_at,
      created_at,
      cabins ( title, location_hub ),
      profiles!guest_id ( full_name )
    `,
    )
    .eq("status", "open")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getOpenCabinTransportRequestsForProvider]", error.message)
    return []
  }

  return (data ?? []) as unknown as OpenCabinTransportRequestRow[]
}

/** Gæst: egne hytte-transportanmodninger med tilbuds-ID/status til badges. */
export async function getMyCabinTransportRequests(): Promise<
  MyCabinTransportRequestRow[]
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("cabin_transport_requests")
    .select(
      `
      id,
      cabin_id,
      guest_id,
      arrival_point,
      arrival_date,
      num_persons,
      message,
      status,
      expires_at,
      created_at,
      cabins ( title, location_hub ),
      cabin_transport_offers ( id, status )
    `,
    )
    .eq("guest_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getMyCabinTransportRequests]", error.message)
    return []
  }

  const rows = data ?? []
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>
    let offers = r.cabin_transport_offers as CabinTransportOfferBadge[] | null | undefined
    if (Array.isArray(offers)) {
      /* noop */
    } else if (offers && typeof offers === "object") {
      offers = [offers as CabinTransportOfferBadge]
    } else {
      offers = []
    }
    let cabinRow = r.cabins as { title: string; location_hub: string } | null | undefined
    if (Array.isArray(cabinRow)) cabinRow = cabinRow[0] ?? null

    return {
      id: r.id as string,
      cabin_id: r.cabin_id as string,
      guest_id: r.guest_id as string,
      arrival_point: r.arrival_point as string,
      arrival_date: r.arrival_date as string,
      num_persons: r.num_persons as number,
      message: (r.message as string | null) ?? null,
      status: r.status as string,
      expires_at: r.expires_at as string,
      created_at: r.created_at as string,
      cabins: cabinRow ?? null,
      cabin_transport_offers: offers,
    }
  })
}

export async function createCabinTransportOffer(
  requestId: string,
  priceKr: number,
  message?: string | null,
): Promise<CreateCabinTransportOfferResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du skal være logget ind." }
  }

  const rid = requestId?.trim()
  if (!rid) {
    return { error: "Ugyldig anmodning." }
  }

  const kr = Number(priceKr)
  if (!Number.isFinite(kr) || kr < 1) {
    return { error: "Angiv et gyldigt bud på mindst 1 kr." }
  }

  const price = krToOre(kr)
  if (!Number.isFinite(price) || price < 100) {
    return { error: "Angiv et gyldigt bud på mindst 1 kr." }
  }

  let msg: string | null = null
  if (message != null && String(message).trim() !== "") {
    msg = String(message).trim().slice(0, 500)
    if (msg.length === 0) msg = null
  }

  const nowIso = new Date().toISOString()

  const { data: reqRow, error: reqErr } = await supabase
    .from("cabin_transport_requests")
    .select(
      `
      id,
      guest_id,
      status,
      expires_at,
      arrival_point,
      arrival_date,
      cabins ( title )
    `,
    )
    .eq("id", rid)
    .maybeSingle()

  if (reqErr || !reqRow) {
    return { error: "Anmodningen findes ikke." }
  }

  if (reqRow.guest_id === user.id) {
    return { error: "Du kan ikke byde på din egen anmodning." }
  }

  if (reqRow.status !== "open") {
    return { error: "Anmodningen er ikke længere åben." }
  }

  if (!reqRow.expires_at || reqRow.expires_at <= nowIso) {
    return { error: "Anmodningen er udløbet." }
  }

  const { data: existingPending } = await supabase
    .from("cabin_transport_offers")
    .select("id")
    .eq("request_id", rid)
    .eq("provider_id", user.id)
    .eq("status", "pending")
    .maybeSingle()

  if (existingPending) {
    return { error: "Du har allerede et afventende bud på denne anmodning." }
  }

  const { data: inserted, error: insErr } = await supabase
    .from("cabin_transport_offers")
    .insert({
      request_id: rid,
      provider_id: user.id,
      price_ore: price,
      message: msg,
    })
    .select("id")
    .maybeSingle()

  if (insErr || !inserted) {
    console.error("[createCabinTransportOffer]", insErr)
    return { error: "Kunne ikke gemme tilbuddet. Prøv igen." }
  }

  await createNotification(
    reqRow.guest_id,
    "cabin_transport_offer_received",
    inserted.id,
  )

  const cabinTitle = unwrapCabinTitle(
    reqRow.cabins as
      | { title?: string | null }
      | { title?: string | null }[]
      | null
      | undefined,
  )

  await notifyCabinTransportOfferReceived({
    requestId: rid,
    offerId: inserted.id,
    guestId: reqRow.guest_id,
    providerId: user.id,
    cabinTitle,
    arrivalPoint: String(reqRow.arrival_point ?? ""),
    arrivalDate: String(reqRow.arrival_date ?? ""),
    priceOre: price,
  })

  revalidatePath("/dashboard")
  return { success: true }
}

function friendlyAcceptCabinTransportOfferError(raw: string): string {
  const m = raw.toLowerCase()
  if (m.includes("offer not found")) return "Tilbuddet findes ikke."
  if (m.includes("only the guest")) return "Du kan ikke acceptere dette tilbud."
  if (m.includes("not open")) return "Anmodningen er ikke længere åben."
  if (m.includes("not pending")) return "Tilbuddet kan ikke accepteres."
  return "Kunne ikke acceptere tilbuddet. Prøv igen."
}

export async function acceptCabinTransportOffer(
  offerId: string,
): Promise<AcceptCabinTransportOfferResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du skal være logget ind." }
  }

  const oid = offerId?.trim()
  if (!oid) {
    return { error: "Ugyldigt tilbud." }
  }

  const { error } = await supabase.rpc("accept_cabin_transport_offer", {
    p_offer_id: oid,
  })

  if (error) {
    console.error("[acceptCabinTransportOffer]", error.message)
    return { error: friendlyAcceptCabinTransportOfferError(error.message ?? "") }
  }

  const { data: offerFull, error: loadErr } = await supabase
    .from("cabin_transport_offers")
    .select(
      `
      id,
      price_ore,
      provider_id,
      cabin_transport_requests (
        id,
        guest_id,
        cabin_id,
        arrival_point,
        arrival_date,
        cabins ( title )
      )
    `,
    )
    .eq("id", oid)
    .maybeSingle()

  if (loadErr || !offerFull) {
    console.error("[acceptCabinTransportOffer] hent tilbud", loadErr?.message)
    revalidatePath("/dashboard")
    return { error: "Kunne ikke hente tilbud efter accept." }
  }

  let nested = offerFull.cabin_transport_requests as
    | CabinTransportRequestEmailNest
    | CabinTransportRequestEmailNest[]
    | null
    | undefined

  if (Array.isArray(nested)) nested = nested[0] ?? null

  if (
    !nested ||
    nested.guest_id !== user.id ||
    typeof nested.cabin_id !== "string" ||
    nested.cabin_id.trim() === ""
  ) {
    console.error("[acceptCabinTransportOffer] uventet tilbudsdata")
    revalidatePath("/dashboard")
    return { error: "Kunne ikke bekræfte tilbud." }
  }

  const cabinTitle = unwrapCabinTitle(nested.cabins)

  await notifyCabinTransportOfferAccepted({
    requestId: nested.id,
    offerId: oid,
    guestId: nested.guest_id,
    providerId: offerFull.provider_id,
    cabinTitle,
    arrivalPoint: String(nested.arrival_point ?? ""),
    arrivalDate: String(nested.arrival_date ?? ""),
    priceOre: Number(offerFull.price_ore) || 0,
  })

  revalidatePath("/dashboard")
  return { success: true, cabinId: nested.cabin_id, offerId: oid }
}
