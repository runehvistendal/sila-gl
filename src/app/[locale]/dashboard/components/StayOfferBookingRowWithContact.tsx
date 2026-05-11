"use client"

import type { ReactNode } from "react"
import StayOfferBookingRow, { type StayOfferBookingRowData } from "./StayOfferBookingRow"

export default function StayOfferBookingRowWithContact({
  booking,
  contactSlot,
}: {
  booking: StayOfferBookingRowData
  contactSlot?: ReactNode
}) {
  return (
    <div className="space-y-2">
      <StayOfferBookingRow booking={booking} />
      {contactSlot ?? null}
    </div>
  )
}
