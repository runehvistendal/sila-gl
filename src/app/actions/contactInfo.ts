"use server"

import { createClient } from "@/lib/supabase-server"

export type ContactInfoData = {
  full_name: string
  phone: string
  email: string
}

function toRpcBookingType(booking_type: string): string {
  if (booking_type === "cabin_booking") return "cabin"
  return booking_type
}

export async function getContactInfo(
  booking_type: string,
  booking_id: string,
): Promise<ContactInfoData | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_contact_info_for_booking", {
    p_booking_type: toRpcBookingType(booking_type),
    p_booking_id:   booking_id,
  })

  if (error || data == null) return null

  const rows = Array.isArray(data) ? data : [data]
  const row = rows[0] as
    | { full_name: string | null; phone: string | null; email: string | null }
    | undefined
  if (!row) return null

  const full_name = row.full_name?.trim() ?? ""
  const phone = row.phone?.trim() ?? ""
  const email = row.email?.trim() ?? ""
  if (!full_name && !phone && !email) return null

  return { full_name, phone, email }
}
