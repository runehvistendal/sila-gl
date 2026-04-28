"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { notifyNewReview } from "@/lib/notifications"

export type BookingType = "cabin" | "transport" | "ride_share"
export type ReviewerRole = "guest" | "provider"

type ReviewInput = {
  booking_id: string
  booking_type: BookingType
  reviewee_id: string
  reviewer_role: ReviewerRole
  rating: number
  comment: string
}

function toReviewType(
  bookingType: BookingType,
  reviewerRole: ReviewerRole
): "guest_to_host" | "host_to_guest" | "passenger_to_skipper" | "skipper_to_passenger" {
  if (bookingType === "cabin") {
    return reviewerRole === "guest" ? "guest_to_host" : "host_to_guest"
  }
  return reviewerRole === "guest" ? "passenger_to_skipper" : "skipper_to_passenger"
}

export async function createReview(data: ReviewInput): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Ikke logget ind" }

  if (data.rating < 1 || data.rating > 5) return { error: "Bedømmelse skal være 1–5" }
  if (data.comment.trim().length < 20) return { error: "Kommentar skal være mindst 20 tegn" }

  // Verify booking completion + ownership and check within 30-day window
  if (data.booking_type === "cabin") {
    const { data: booking } = await supabase
      .from("cabin_bookings")
      .select("id, status, updated_at, guest_id, cabin_id, cabins!inner(owner_id)")
      .eq("id", data.booking_id)
      .eq("status", "completed")
      .maybeSingle()

    if (!booking) return { error: "Booking ikke fundet eller ikke afsluttet" }

    const typed = booking as unknown as { guest_id: string; updated_at: string; cabin_id: string; cabins: { owner_id: string } }
    const isGuest = typed.guest_id === user.id
    const isOwner = typed.cabins?.owner_id === user.id

    if (!isGuest && !isOwner) return { error: "Ikke autoriseret" }
    if (data.reviewer_role === "guest" && !isGuest) return { error: "Ikke autoriseret som gæst" }
    if (data.reviewer_role === "provider" && !isOwner) return { error: "Ikke autoriseret som udbyder" }

    // Check 30-day window from booking completion
    const completedAt = new Date(typed.updated_at)
    const windowMs = 30 * 24 * 60 * 60 * 1000
    if (Date.now() - completedAt.getTime() > windowMs) {
      return { error: "Anmeldelsesvinduet på 30 dage er udløbet" }
    }

    // Duplicate check
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("cabin_booking_id", data.booking_id)
      .eq("reviewer_id", user.id)
      .is("deleted_at", null)
      .maybeSingle()

    if (existing) return { error: "Du har allerede anmeldt denne booking" }

    const { data: review, error: insertErr } = await supabase.from("reviews").insert({
      reviewer_id:      user.id,
      reviewee_id:      data.reviewee_id,
      cabin_booking_id: data.booking_id,
      review_type:      toReviewType(data.booking_type, data.reviewer_role),
      reviewer_role:    data.reviewer_role,
      rating:           data.rating,
      comment:          data.comment.trim(),
      expires_at:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id").single()

    if (insertErr) return { error: "Fejl ved gemning af anmeldelse" }

    await notifyNewReview(review.id)
    revalidatePath(`/hytter/${typed.cabin_id}`)
    return {}
  }

  if (data.booking_type === "ride_share") {
    const { data: booking } = await supabase
      .from("ride_share_bookings")
      .select("id, status, updated_at, passenger_id, ride_shares!inner(skipper_id)")
      .eq("id", data.booking_id)
      .eq("status", "completed")
      .maybeSingle()

    if (!booking) return { error: "Booking ikke fundet eller ikke afsluttet" }

    const typed = booking as unknown as { passenger_id: string; updated_at: string; ride_shares: { skipper_id: string } }
    const isPassenger = typed.passenger_id === user.id
    const isSejler = typed.ride_shares?.skipper_id === user.id

    if (!isPassenger && !isSejler) return { error: "Ikke autoriseret" }
    if (data.reviewer_role === "guest" && !isPassenger) return { error: "Ikke autoriseret som gæst" }
    if (data.reviewer_role === "provider" && !isSejler) return { error: "Ikke autoriseret som sejler" }

    const completedAt = new Date(typed.updated_at)
    if (Date.now() - completedAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
      return { error: "Anmeldelsesvinduet på 30 dage er udløbet" }
    }

    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("ride_share_booking_id", data.booking_id)
      .eq("reviewer_id", user.id)
      .is("deleted_at", null)
      .maybeSingle()

    if (existing) return { error: "Du har allerede anmeldt denne booking" }

    const { data: review, error: insertErr } = await supabase.from("reviews").insert({
      reviewer_id:           user.id,
      reviewee_id:           data.reviewee_id,
      ride_share_booking_id: data.booking_id,
      review_type:           toReviewType(data.booking_type, data.reviewer_role),
      reviewer_role:         data.reviewer_role,
      rating:                data.rating,
      comment:               data.comment.trim(),
      expires_at:            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id").single()

    if (insertErr) return { error: "Fejl ved gemning af anmeldelse" }

    await notifyNewReview(review.id)
    return {}
  }

  if (data.booking_type === "transport") {
    const { data: offer } = await supabase
      .from("transport_offers")
      .select("id, status, updated_at, skipper_id, transport_requests!inner(guest_id)")
      .eq("id", data.booking_id)
      .eq("status", "accepted")
      .maybeSingle()

    if (!offer) return { error: "Tilbud ikke fundet eller ikke accepteret" }

    const typed = offer as unknown as {
      skipper_id: string
      updated_at: string
      transport_requests: { guest_id: string }
    }
    const isGuest = typed.transport_requests?.guest_id === user.id
    const isSejler = typed.skipper_id === user.id

    if (!isGuest && !isSejler) return { error: "Ikke autoriseret" }

    const completedAt = new Date(typed.updated_at)
    if (Date.now() - completedAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
      return { error: "Anmeldelsesvinduet på 30 dage er udløbet" }
    }

    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("transport_offer_id", data.booking_id)
      .eq("reviewer_id", user.id)
      .is("deleted_at", null)
      .maybeSingle()

    if (existing) return { error: "Du har allerede anmeldt denne transport" }

    const { data: review, error: insertErr } = await supabase.from("reviews").insert({
      reviewer_id:        user.id,
      reviewee_id:        data.reviewee_id,
      transport_offer_id: data.booking_id,
      review_type:        toReviewType(data.booking_type, data.reviewer_role),
      reviewer_role:      data.reviewer_role,
      rating:             data.rating,
      comment:            data.comment.trim(),
      expires_at:         new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id").single()

    if (insertErr) return { error: "Fejl ved gemning af anmeldelse" }

    await notifyNewReview(review.id)
    return {}
  }

  return { error: "Ukendt booking-type" }
}

/** Hent IDs for bookinger som den autentificerede bruger allerede har anmeldt */
export async function getMyReviewedIds(): Promise<{
  cabinBookingIds: string[]
  rideShareBookingIds: string[]
  transportOfferIds: string[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { cabinBookingIds: [], rideShareBookingIds: [], transportOfferIds: [] }

  const { data } = await supabase
    .from("reviews")
    .select("cabin_booking_id, ride_share_booking_id, transport_offer_id")
    .eq("reviewer_id", user.id)
    .is("deleted_at", null)

  const rows = data ?? []
  return {
    cabinBookingIds:      rows.map((r) => r.cabin_booking_id).filter(Boolean) as string[],
    rideShareBookingIds:  rows.map((r) => r.ride_share_booking_id).filter(Boolean) as string[],
    transportOfferIds:    rows.map((r) => r.transport_offer_id).filter(Boolean) as string[],
  }
}
