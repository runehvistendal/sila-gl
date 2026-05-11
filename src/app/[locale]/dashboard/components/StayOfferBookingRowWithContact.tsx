import ContactInfoCard from "@/components/bookings/ContactInfoCard"
import StayOfferBookingRow, { type StayOfferBookingRowData } from "./StayOfferBookingRow"

export default function StayOfferBookingRowWithContact({
  booking,
}: {
  booking: StayOfferBookingRowData
}) {
  return (
    <div className="space-y-2">
      <StayOfferBookingRow booking={booking} />
      {booking.status === "accepted" ? (
        <ContactInfoCard booking_type="stay_offer" booking_id={booking.id} />
      ) : null}
    </div>
  )
}
