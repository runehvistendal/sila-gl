"use client"

import type { ReactNode } from "react"
import TransportOfferBookingRow, { type TransportOfferBookingRowData } from "./TransportOfferBookingRow"

export default function TransportOfferBookingRowWithContact({
  booking,
  alreadyReviewed = false,
  contactSlot,
}: {
  booking: TransportOfferBookingRowData
  alreadyReviewed?: boolean
  contactSlot?: ReactNode
}) {
  return (
    <div className="space-y-2">
      <TransportOfferBookingRow booking={booking} alreadyReviewed={alreadyReviewed} />
      {contactSlot ?? null}
    </div>
  )
}
