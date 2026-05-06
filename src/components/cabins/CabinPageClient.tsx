"use client"

import { useState } from "react"
import CabinBookingWidget from "@/components/cabins/CabinBookingWidget"
import CabinTransportSection, {
  type RideShareData,
} from "@/components/cabins/CabinTransportSection"

interface CabinBookingProps {
  id: string
  max_guests: number
  price_per_night_ore: number
  offers_transport: boolean
  transport_price_per_person_ore: number | null
  min_nights?: number
  location_hub: string
  instant_book: boolean
}

interface CabinTransportProps {
  id: string
  location_hub: string
  offers_transport: boolean
  transport_price_per_person_ore: number | null
  profiles: { full_name: string | null } | null
}

interface Props {
  bookingCabin: CabinBookingProps
  transportCabin: CabinTransportProps
  transports: RideShareData[]
  isLoggedIn: boolean
  loginNextPath: string
  disabledYmd: string[]
  /** Skjul booking-widgetten (bruges i venstre kolonne på desktop til kun at vise transport) */
  hideBookingWidget?: boolean
  /** Skjul transport-sektionen (bruges i højre kolonne / sticky sidebar) */
  hideTransportSection?: boolean
}

export default function CabinPageClient({
  bookingCabin,
  transportCabin,
  transports,
  isLoggedIn,
  loginNextPath,
  disabledYmd,
  hideBookingWidget = false,
  hideTransportSection = false,
}: Props) {
  const [guests, setGuests] = useState(1)

  return (
    <>
      {!hideBookingWidget && (
        <CabinBookingWidget
          cabin={bookingCabin}
          isLoggedIn={isLoggedIn}
          loginNextPath={loginNextPath}
          disabledYmd={disabledYmd}
          onGuestsChange={setGuests}
        />
      )}

      {!hideTransportSection && (transports.length > 0 || transportCabin.offers_transport) && (
        <div className={hideBookingWidget ? "" : "mt-8"}>
          <CabinTransportSection
            cabin={transportCabin}
            transports={transports}
            guests={guests}
          />
        </div>
      )}
    </>
  )
}
