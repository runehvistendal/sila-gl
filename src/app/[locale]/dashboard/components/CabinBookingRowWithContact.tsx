import ContactInfoCard from "@/components/bookings/ContactInfoCard"
import BookingRow, { type CabinBookingData } from "./BookingRow"

function showContactForCabinStatus(status: string) {
  return status === "confirmed" || status === "completed"
}

export default function CabinBookingRowWithContact({
  booking,
  isHost,
  alreadyReviewed = false,
}: {
  booking: CabinBookingData
  isHost: boolean
  alreadyReviewed?: boolean
}) {
  return (
    <div className="space-y-2">
      <BookingRow booking={booking} isHost={isHost} alreadyReviewed={alreadyReviewed} />
      {showContactForCabinStatus(booking.status) ? (
        <ContactInfoCard booking_type="cabin_booking" booking_id={booking.id} />
      ) : null}
    </div>
  )
}
