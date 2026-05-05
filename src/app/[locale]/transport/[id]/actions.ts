"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase-server"

export async function createTransportRequest(formData: {
  from_location: string
  to_location:   string
  departure_date: string
  num_guests:    number
  notes?:        string
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error("Ikke logget ind")
  const user = session.user

  const { error } = await supabase
    .from("transport_requests")
    .insert({
      requester_id:   user.id,
      from_location:  formData.from_location,
      to_location:    formData.to_location,
      departure_date: formData.departure_date,
      num_guests:     formData.num_guests,
      notes:          formData.notes ?? null,
      status:         "pending",
    })

  if (error) throw error
  revalidatePath("/dashboard")
}

// Stripe-integration tilføjes i næste fase.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function bookRideShare(_rideShareId: string, _seats: number, _message: string) {
  return { success: true }
}
