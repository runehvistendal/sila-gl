"use client"

import type { ReactNode } from "react"
import RideShareBookingRow, { type RideShareBookingRowData } from "./RideShareBookingRow"

export default function RideShareBookingRowWithContact({
  booking,
  alreadyReviewed = false,
  contactSlot,
}: {
  booking: RideShareBookingRowData
  alreadyReviewed?: boolean
  contactSlot?: ReactNode
}) {
  return (
    <div className="space-y-2">
      <RideShareBookingRow booking={booking} alreadyReviewed={alreadyReviewed} />
      {contactSlot ?? null}
    </div>
  )
}
