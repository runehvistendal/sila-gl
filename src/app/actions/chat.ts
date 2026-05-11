"use server"

import { createClient } from "@/lib/supabase-server"
import { createNotification } from "@/lib/notifications"

export type BookingType = "cabin" | "ride_share" | "transport_offer" | "stay_offer"

export type BookingConversation = {
  booking_type: BookingType
  booking_id: string
  other_user_name: string
  last_message: string
  last_message_at: string
  unread_count: number
}

export type ChatMessageDto = {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_own: boolean
}

type MsgRow = {
  sender_id: string
  recipient_id: string
  cabin_booking_id: string | null
  ride_share_booking_id: string | null
  transport_request_id: string | null
  stay_offer_id: string | null
  content: string
  read_at: string | null
  created_at: string
}

type ConvMeta = {
  booking_type: BookingType
  booking_id: string
  other_id: string
}

function convKey(m: MsgRow): string | null {
  if (m.cabin_booking_id) return `cabin:${m.cabin_booking_id}`
  if (m.ride_share_booking_id) return `ride_share:${m.ride_share_booking_id}`
  if (m.transport_request_id) return `transport:${m.transport_request_id}`
  if (m.stay_offer_id) return `stay_offer:${m.stay_offer_id}`
  return null
}

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

function isRateLimitError(err: unknown): boolean {
  const code = String((err as { code?: string }).code ?? "")
  const msg = ((err as { message?: string }).message ?? "").toLowerCase()
  const details = String((err as { details?: string }).details ?? "").toLowerCase()
  return (
    code === "P0001" ||
    msg.includes("rate_limit") ||
    details.includes("rate_limit") ||
    msg.includes("p0001")
  )
}

export async function getBookingConversations(): Promise<
  { conversations: BookingConversation[] } | { error: "unauthorized" }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "unauthorized" }

  const { data: messageRows, error } = await supabase
    .from("messages")
    .select(
      "sender_id, recipient_id, cabin_booking_id, ride_share_booking_id, transport_request_id, stay_offer_id, content, read_at, created_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(2000)

  if (error || !messageRows) {
    return { conversations: [] }
  }

  const messages = messageRows as MsgRow[]
  const groups = new Map<
    string,
    { last: MsgRow; unread: number }
  >()

  for (const m of messages) {
    const key = convKey(m)
    if (!key) continue
    const g = groups.get(key)
    const unreadInc =
      m.recipient_id === user.id && m.read_at == null ? 1 : 0
    if (!g) {
      groups.set(key, { last: m, unread: unreadInc })
    } else {
      g.unread += unreadInc
    }
  }

  const cabinIds = new Set<string>()
  const rideIds = new Set<string>()
  const transportRequestIds = new Set<string>()
  const stayOfferIds = new Set<string>()

  for (const key of groups.keys()) {
    if (key.startsWith("cabin:")) cabinIds.add(key.slice(6))
    else if (key.startsWith("ride_share:")) rideIds.add(key.slice(11))
    else if (key.startsWith("transport:")) transportRequestIds.add(key.slice(10))
    else if (key.startsWith("stay_offer:")) stayOfferIds.add(key.slice(11))
  }

  const convMeta = new Map<string, ConvMeta>()

  if (cabinIds.size > 0) {
    const { data: cabinRows } = await supabase
      .from("cabin_bookings")
      .select("id, guest_id, cabins!inner(owner_id)")
      .in("id", [...cabinIds])
      .eq("status", "confirmed")

    for (const row of cabinRows ?? []) {
      const cabins = one(
        (row as { cabins: { owner_id: string } | { owner_id: string }[] })
          .cabins,
      )
      const r = row as { id: string; guest_id: string }
      if (!cabins) continue
      const owner_id = cabins.owner_id
      if (r.guest_id !== user.id && owner_id !== user.id) continue
      const other_id = r.guest_id === user.id ? owner_id : r.guest_id
      convMeta.set(`cabin:${r.id}`, {
        booking_type: "cabin",
        booking_id: r.id,
        other_id,
      })
    }
  }

  if (rideIds.size > 0) {
    const { data: rideRows } = await supabase
      .from("ride_share_bookings")
      .select("id, passenger_id, ride_shares!inner(skipper_id)")
      .in("id", [...rideIds])
      .eq("status", "confirmed")

    for (const row of rideRows ?? []) {
      const rs = one(
        (row as { ride_shares: { skipper_id: string } | { skipper_id: string }[] })
          .ride_shares,
      )
      const r = row as { id: string; passenger_id: string }
      if (!rs) continue
      const skipper_id = rs.skipper_id
      if (r.passenger_id !== user.id && skipper_id !== user.id) continue
      const other_id = r.passenger_id === user.id ? skipper_id : r.passenger_id
      convMeta.set(`ride_share:${r.id}`, {
        booking_type: "ride_share",
        booking_id: r.id,
        other_id,
      })
    }
  }

  if (transportRequestIds.size > 0) {
    const { data: offerRows } = await supabase
      .from("transport_offers")
      .select(
        "id, request_id, skipper_id, status, transport_requests!inner(guest_id)",
      )
      .in("request_id", [...transportRequestIds])
      .eq("status", "accepted")
      .is("deleted_at", null)

    const seenRequest = new Set<string>()
    for (const row of offerRows ?? []) {
      const o = row as {
        id: string
        request_id: string
        skipper_id: string
        transport_requests: { guest_id: string } | { guest_id: string }[]
      }
      const tr = one(o.transport_requests)
      if (seenRequest.has(o.request_id)) continue
      if (!tr) continue
      const guest_id = tr.guest_id
      if (o.skipper_id !== user.id && guest_id !== user.id) continue
      seenRequest.add(o.request_id)
      const other_id = guest_id === user.id ? o.skipper_id : guest_id
      convMeta.set(`transport:${o.request_id}`, {
        booking_type: "transport_offer",
        booking_id: o.id,
        other_id,
      })
    }
  }

  if (stayOfferIds.size > 0) {
    const { data: stayRows } = await supabase
      .from("stay_offers")
      .select("id, provider_id, status, stay_requests!inner(guest_id, deleted_at)")
      .in("id", [...stayOfferIds])
      .eq("status", "accepted")

    for (const row of stayRows ?? []) {
      const s = row as {
        id: string
        provider_id: string
        stay_requests:
          | { guest_id: string; deleted_at: string | null }
          | { guest_id: string; deleted_at: string | null }[]
      }
      const sr = one(s.stay_requests)
      if (!sr || sr.deleted_at) continue
      const guest_id = sr.guest_id
      if (s.provider_id !== user.id && guest_id !== user.id) continue
      const other_id = guest_id === user.id ? s.provider_id : guest_id
      convMeta.set(`stay_offer:${s.id}`, {
        booking_type: "stay_offer",
        booking_id: s.id,
        other_id,
      })
    }
  }

  const otherIds = new Set<string>()
  for (const meta of convMeta.values()) {
    otherIds.add(meta.other_id)
  }

  const nameById = new Map<string, string>()
  if (otherIds.size > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", [...otherIds])
    for (const p of profs ?? []) {
      nameById.set(p.id, (p as { full_name: string }).full_name ?? "")
    }
  }

  const conversations: BookingConversation[] = []
  for (const [key, agg] of groups) {
    const meta = convMeta.get(key)
    if (!meta) continue
    const nm = nameById.get(meta.other_id)?.trim() || "Sila-bruger"
    conversations.push({
      booking_type: meta.booking_type,
      booking_id: meta.booking_id,
      other_user_name: nm,
      last_message: agg.last.content,
      last_message_at: agg.last.created_at,
      unread_count: agg.unread,
    })
  }

  conversations.sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime(),
  )

  return { conversations }
}

export async function getMessages(
  bookingType: BookingType,
  bookingId: string,
): Promise<{ messages: ChatMessageDto[] } | { error: "unauthorized" }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "unauthorized" }

  let filterCol: string
  let filterVal: string

  if (bookingType === "cabin") {
    const { data: row } = await supabase
      .from("cabin_bookings")
      .select("id, guest_id, status, cabins!inner(owner_id)")
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .maybeSingle()

    const cabins = one(
      (row as { cabins?: { owner_id: string } | { owner_id: string }[] } | null)
        ?.cabins,
    )
    const guest_id = (row as { guest_id?: string } | null)?.guest_id
    if (
      !row ||
      !cabins ||
      !guest_id ||
      (guest_id !== user.id && cabins.owner_id !== user.id)
    ) {
      return { error: "unauthorized" }
    }
    filterCol = "cabin_booking_id"
    filterVal = bookingId
  } else if (bookingType === "ride_share") {
    const { data: row } = await supabase
      .from("ride_share_bookings")
      .select("id, passenger_id, status, ride_shares!inner(skipper_id)")
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .maybeSingle()

    const rs = one(
      (row as { ride_shares?: { skipper_id: string } | { skipper_id: string }[] } | null)
        ?.ride_shares,
    )
    const passenger_id = (row as { passenger_id?: string } | null)?.passenger_id
    if (
      !row ||
      !rs ||
      !passenger_id ||
      (passenger_id !== user.id && rs.skipper_id !== user.id)
    ) {
      return { error: "unauthorized" }
    }
    filterCol = "ride_share_booking_id"
    filterVal = bookingId
  } else if (bookingType === "transport_offer") {
    const { data: row } = await supabase
      .from("transport_offers")
      .select(
        "id, request_id, skipper_id, status, transport_requests!inner(guest_id)",
      )
      .eq("id", bookingId)
      .eq("status", "accepted")
      .is("deleted_at", null)
      .maybeSingle()

    const tr = one(
      (row as { transport_requests?: { guest_id: string } | { guest_id: string }[] } | null)
        ?.transport_requests,
    )
    const skipper_id = (row as { skipper_id?: string } | null)?.skipper_id
    const request_id = (row as { request_id?: string } | null)?.request_id
    if (
      !row ||
      !tr ||
      skipper_id == null ||
      request_id == null ||
      (tr.guest_id !== user.id && skipper_id !== user.id)
    ) {
      return { error: "unauthorized" }
    }
    filterCol = "transport_request_id"
    filterVal = request_id
  } else {
    const { data: row } = await supabase
      .from("stay_offers")
      .select("id, provider_id, status, stay_requests!inner(guest_id, deleted_at)")
      .eq("id", bookingId)
      .eq("status", "accepted")
      .maybeSingle()

    const sr = one(
      (row as {
        stay_requests?: { guest_id: string; deleted_at: string | null } | { guest_id: string; deleted_at: string | null }[]
      } | null)?.stay_requests,
    )
    const provider_id = (row as { provider_id?: string } | null)?.provider_id
    if (
      !row ||
      !sr ||
      provider_id == null ||
      sr.deleted_at ||
      (provider_id !== user.id && sr.guest_id !== user.id)
    ) {
      return { error: "unauthorized" }
    }
    filterCol = "stay_offer_id"
    filterVal = bookingId
  }

  const { data: rows, error: selErr } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq(filterCol, filterVal)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })

  if (selErr) {
    return { error: "unauthorized" }
  }

  const now = new Date().toISOString()
  await supabase
    .from("messages")
    .update({ read_at: now })
    .eq(filterCol, filterVal)
    .eq("recipient_id", user.id)
    .is("read_at", null)
    .is("deleted_at", null)

  const list = (rows ?? []) as Array<{
    id: string
    sender_id: string
    content: string
    created_at: string
  }>

  return {
    messages: list.map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
      is_own: m.sender_id === user.id,
    })),
  }
}

export async function sendMessage(
  bookingType: BookingType,
  bookingId: string,
  content: string,
): Promise<{ ok: true } | { error: "unauthorized" | "invalid" | "rate_limit" }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "unauthorized" }

  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 8000) return { error: "invalid" }

  const { error: rlErr } = await supabase.rpc("consume_rate_limit", {
    p_user_id: user.id,
    p_action: "chat",
    p_max_attempts: 20,
    p_window_seconds: 60,
  })
  if (rlErr) {
    if (isRateLimitError(rlErr)) return { error: "rate_limit" }
    return { error: "unauthorized" }
  }

  type Ins = {
    sender_id: string
    recipient_id: string
    content: string
    cabin_booking_id: string | null
    ride_share_booking_id: string | null
    transport_request_id: string | null
    stay_offer_id: string | null
  }

  let insert: Ins

  if (bookingType === "cabin") {
    const { data: row } = await supabase
      .from("cabin_bookings")
      .select("id, guest_id, status, cabins!inner(owner_id)")
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .maybeSingle()

    const cabins = one(
      (row as { cabins?: { owner_id: string } | { owner_id: string }[] } | null)
        ?.cabins,
    )
    const guest_id = (row as { guest_id?: string } | null)?.guest_id
    if (
      !row ||
      !cabins ||
      !guest_id ||
      (guest_id !== user.id && cabins.owner_id !== user.id)
    ) {
      return { error: "unauthorized" }
    }
    const recipient_id =
      guest_id === user.id ? cabins.owner_id : guest_id
    insert = {
      sender_id: user.id,
      recipient_id,
      content: trimmed,
      cabin_booking_id: bookingId,
      ride_share_booking_id: null,
      transport_request_id: null,
      stay_offer_id: null,
    }
  } else if (bookingType === "ride_share") {
    const { data: row } = await supabase
      .from("ride_share_bookings")
      .select("id, passenger_id, status, ride_shares!inner(skipper_id)")
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .maybeSingle()

    const rs = one(
      (row as { ride_shares?: { skipper_id: string } | { skipper_id: string }[] } | null)
        ?.ride_shares,
    )
    const passenger_id = (row as { passenger_id?: string } | null)?.passenger_id
    if (
      !row ||
      !rs ||
      !passenger_id ||
      (passenger_id !== user.id && rs.skipper_id !== user.id)
    ) {
      return { error: "unauthorized" }
    }
    const recipient_id =
      passenger_id === user.id ? rs.skipper_id : passenger_id
    insert = {
      sender_id: user.id,
      recipient_id,
      content: trimmed,
      cabin_booking_id: null,
      ride_share_booking_id: bookingId,
      transport_request_id: null,
      stay_offer_id: null,
    }
  } else if (bookingType === "transport_offer") {
    const { data: row } = await supabase
      .from("transport_offers")
      .select(
        "id, request_id, skipper_id, status, transport_requests!inner(guest_id)",
      )
      .eq("id", bookingId)
      .eq("status", "accepted")
      .is("deleted_at", null)
      .maybeSingle()

    const tr = one(
      (row as { transport_requests?: { guest_id: string } | { guest_id: string }[] } | null)
        ?.transport_requests,
    )
    const skipper_id = (row as { skipper_id?: string } | null)?.skipper_id
    const request_id = (row as { request_id?: string } | null)?.request_id
    if (
      !row ||
      !tr ||
      skipper_id == null ||
      request_id == null ||
      (tr.guest_id !== user.id && skipper_id !== user.id)
    ) {
      return { error: "unauthorized" }
    }
    const recipient_id =
      tr.guest_id === user.id ? skipper_id : tr.guest_id
    insert = {
      sender_id: user.id,
      recipient_id,
      content: trimmed,
      cabin_booking_id: null,
      ride_share_booking_id: null,
      transport_request_id: request_id,
      stay_offer_id: null,
    }
  } else {
    const { data: row } = await supabase
      .from("stay_offers")
      .select("id, provider_id, status, stay_requests!inner(guest_id, deleted_at)")
      .eq("id", bookingId)
      .eq("status", "accepted")
      .maybeSingle()

    const sr = one(
      (row as {
        stay_requests?: { guest_id: string; deleted_at: string | null } | { guest_id: string; deleted_at: string | null }[]
      } | null)?.stay_requests,
    )
    const provider_id = (row as { provider_id?: string } | null)?.provider_id
    if (
      !row ||
      !sr ||
      provider_id == null ||
      sr.deleted_at ||
      (provider_id !== user.id && sr.guest_id !== user.id)
    ) {
      return { error: "unauthorized" }
    }
    const recipient_id =
      sr.guest_id === user.id ? provider_id : sr.guest_id
    insert = {
      sender_id: user.id,
      recipient_id,
      content: trimmed,
      cabin_booking_id: null,
      ride_share_booking_id: null,
      transport_request_id: null,
      stay_offer_id: bookingId,
    }
  }

  const { error: insErr } = await supabase.from("messages").insert(insert)
  if (insErr) {
    return { error: "unauthorized" }
  }

  await createNotification(insert.recipient_id, "message_received", bookingId)

  return { ok: true }
}

export async function getUnreadMessageCount(): Promise<
  { count: number } | { error: "unauthorized" }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "unauthorized" }

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null)
    .is("deleted_at", null)

  if (error) return { count: 0 }
  return { count: count ?? 0 }
}
