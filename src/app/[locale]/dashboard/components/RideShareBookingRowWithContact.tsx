import ContactInfoCard from "@/components/bookings/ContactInfoCard"
import RideShareBookingRow, { type RideShareBookingRowData } from "./RideShareBookingRow"

function showRideContact(status: string) {
  return status === "confirmed" || status === "completed"
}

export default function RideShareBookingRowWithContact({
  booking,
  alreadyReviewed = false,
}: {
  booking: RideShareBookingRowData
  alreadyReviewed?: boolean
}) {
  return (
    <div className="space-y-2">
      <RideShareBookingRow booking={booking} alreadyReviewed={alreadyReviewed} />
      {showRideContact(booking.status) ? (
        <ContactInfoCard booking_type="ride_share" booking_id={booking.id} />
      ) : null}
    </div>
  )
}
