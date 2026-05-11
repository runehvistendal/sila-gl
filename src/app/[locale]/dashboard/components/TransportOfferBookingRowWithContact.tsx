import ContactInfoCard from "@/components/bookings/ContactInfoCard"
import TransportOfferBookingRow, { type TransportOfferBookingRowData } from "./TransportOfferBookingRow"

export default function TransportOfferBookingRowWithContact({
  booking,
  alreadyReviewed = false,
}: {
  booking: TransportOfferBookingRowData
  alreadyReviewed?: boolean
}) {
  return (
    <div className="space-y-2">
      <TransportOfferBookingRow booking={booking} alreadyReviewed={alreadyReviewed} />
      {booking.status === "accepted" ? (
        <ContactInfoCard booking_type="transport_offer" booking_id={booking.id} />
      ) : null}
    </div>
  )
}
