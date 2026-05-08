"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"
import { requireSession } from "@/lib/requireSession"
import { revalidatePublishedCabinPaths } from "@/lib/revalidateCabinPublic"
import { checkStripeOnboardingComplete, requireStripeForPublish } from "@/app/actions/stripe"

/** Matcher STRIPE_PUBLISH_REQUIRED_ERROR på klienten */
const STRIPE_REQUIRED = "stripe_required"

export async function confirmBooking(bookingId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error("Ikke logget ind")
  const user = session.user

  // Verify caller owns the cabin for this booking
  const { data: booking } = await supabase
    .from("cabin_bookings")
    .select("cabin_id")
    .eq("id", bookingId)
    .single()

  if (!booking) throw new Error("Booking ikke fundet")

  const { data: cabin } = await supabase
    .from("cabins")
    .select("owner_id")
    .eq("id", booking.cabin_id)
    .single()

  if (!cabin || cabin.owner_id !== user.id) throw new Error("Ingen adgang")

  const { error } = await supabase
    .from("cabin_bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)

  if (error) throw new Error(error.message)
}

export async function declineBooking(bookingId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error("Ikke logget ind")
  const user = session.user

  const { data: booking } = await supabase
    .from("cabin_bookings")
    .select("cabin_id")
    .eq("id", bookingId)
    .single()

  if (!booking) throw new Error("Booking ikke fundet")

  const { data: cabin } = await supabase
    .from("cabins")
    .select("owner_id")
    .eq("id", booking.cabin_id)
    .single()

  if (!cabin || cabin.owner_id !== user.id) throw new Error("Ingen adgang")

  const { error } = await supabase
    .from("cabin_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)

  if (error) throw new Error(error.message)
}

export async function acceptTransportRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error("Ikke logget ind")
  const user = session.user

  const { error } = await supabase
    .from("transport_requests")
    .update({ status: "matched" })
    .eq("id", requestId)
    .eq("guest_id", user.id)

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function declineTransportRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error("Ikke logget ind")
  const user = session.user

  const { error } = await supabase
    .from("transport_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("guest_id", user.id)

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard")
}

export async function duplicateCabin(cabinId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }
  const user = session.user

  const { data: cabin, error: fetchError } = await supabase
    .from("cabins")
    .select("*")
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .single()

  if (fetchError || !cabin) return { error: "Hytte ikke fundet" }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at, updated_at, deleted_at, ...rest } = cabin as Record<string, unknown>
  const { error } = await supabase
    .from("cabins")
    .insert({ ...rest, images: [], published: false })

  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  return {}
}

export async function checkStripeBeforePublish(
  _cabinId: string,
): Promise<{ stripeComplete: boolean } | { error: string }> {
  const r = await checkStripeOnboardingComplete()
  if (!r.ok) return { error: r.error }
  return { stripeComplete: r.complete }
}

export async function publishCabin(cabinId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireSession()

  const gate = await requireStripeForPublish()
  if (!gate.ok) {
    if (gate.error === STRIPE_REQUIRED) return { error: STRIPE_REQUIRED }
    return { error: gate.error }
  }

  const { data: row, error: rowErr } = await supabase
    .from("cabins")
    .select("property_type")
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (rowErr || !row) return { error: "Hytte ikke fundet" }

  const { error } = await supabase
    .from("cabins")
    .update({ published: true })
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  revalidatePath("/opret")
  revalidatePublishedCabinPaths(cabinId, row.property_type)
  return {}
}

export async function unpublishCabin(cabinId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireSession()
  const { data: row, error: rowErr } = await supabase
    .from("cabins")
    .select("property_type")
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (rowErr || !row) return { error: "Hytte ikke fundet" }

  const { error } = await supabase
    .from("cabins")
    .update({ published: false })
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  revalidatePath("/opret")
  revalidatePublishedCabinPaths(cabinId, row.property_type)
  return {}
}

export async function deleteCabin(cabinId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireSession()
  const { data: row } = await supabase
    .from("cabins")
    .select("property_type")
    .eq("id", cabinId)
    .eq("owner_id", user.id)
    .maybeSingle()

  const { error } = await supabase
    .from("cabins")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", cabinId)
    .eq("owner_id", user.id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  if (row) {
    revalidatePublishedCabinPaths(cabinId, row.property_type)
  }
  return {}
}

export async function deleteBoat(boatId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireSession()
  const { error } = await supabase
    .from("boats")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", boatId)
    .eq("owner_id", user.id)
  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  return {}
}

export async function duplicateBoat(boatId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { error: "Ikke logget ind" }
  const user = session.user

  const { data: boat, error: fetchError } = await supabase
    .from("boats")
    .select("*")
    .eq("id", boatId)
    .eq("owner_id", user.id)
    .single()

  if (fetchError || !boat) return { error: "Båd ikke fundet" }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at, updated_at, deleted_at, ...rest } = boat as Record<string, unknown>
  const { error } = await supabase
    .from("boats")
    .insert({ ...rest, images: [] })

  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  return {}
}
