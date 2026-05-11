"use client"

import type { ReactNode } from "react"
import BookingRow, { type CabinBookingData } from "./BookingRow"

export default function CabinBookingRowWithContact({
  booking,
  isHost,
  alreadyReviewed = false,
  contactSlot,
}: {
  booking: CabinBookingData
  isHost: boolean
  alreadyReviewed?: boolean
  /** Server-renderet ContactInfoCard — kun sat når kontakt må vises */
  contactSlot?: ReactNode
}) {
  return (
    <div className="space-y-2">
      <BookingRow booking={booking} isHost={isHost} alreadyReviewed={alreadyReviewed} />
      {contactSlot ?? null}
    </div>
  )
}
