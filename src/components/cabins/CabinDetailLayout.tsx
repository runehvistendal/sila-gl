"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import type { AcceptedTransportOfferProp } from "@/app/actions/bookings"
import CabinBookingWidget, {
  type CabinBookingWidgetHandle,
} from "@/components/cabins/CabinBookingWidget"
import CabinGettingThere, {
  type GettingThereRideShare,
} from "@/components/cabins/CabinGettingThere"
import type { TransferRoute } from "@/types/transfer"

interface CabinBookingProps {
  id: string
  max_guests: number
  price_per_night_ore: number
  offers_transport: boolean
  transport_price_per_person_ore: number | null
  min_nights?: number
  location_hub: string
  instant_book: boolean
  property_type?: "cabin" | "residence" | null
}

interface Props {
  bookingCabin: CabinBookingProps
  /** Kommende samsejladser til og fra opholdets lokation */
  transports: GettingThereRideShare[]
  isLoggedIn: boolean
  loginNextPath: string
  disabledYmd: string[]
  /** Strukturerede transfer-ruter (vises under «Sådan kommer du dertil» og kan vælges i bookingboksen) */
  transferRoutes?: TransferRoute[]
  /** Server-rendered statisk indhold til venstre kolonne (Om hytten, Inkluderet, Din vært) */
  leftContent: ReactNode
  /** Server-rendered anmeldelsessektion — vises i bunden af venstre kolonne */
  reviewsContent: ReactNode
  /** Fx kun /ophold/i-naturen/[id]: transportanmodning når der ikke er strukturerede transfer_ruter */
  enableCabinTransportRequest?: boolean
  /** Accepteret hytte-transportbud (prefill fra ?transport_offer=) */
  acceptedTransportOffer?: AcceptedTransportOfferProp | null
  hasOpenTransportRequest?: boolean
}

export default function CabinDetailLayout({
  bookingCabin,
  transports,
  isLoggedIn,
  loginNextPath,
  disabledYmd,
  transferRoutes = [],
  leftContent,
  reviewsContent,
  enableCabinTransportRequest = false,
  acceptedTransportOffer = null,
  hasOpenTransportRequest = false,
}: Props) {
  const [guests, setGuests] = useState(1)
  const [dates, setDates] = useState<{ checkIn: string; checkOut: string }>({ checkIn: "", checkOut: "" })
  const widgetRef = useRef<CabinBookingWidgetHandle | null>(null)

  const handleDatesChange = useCallback((checkIn: string, checkOut: string) => {
    setDates((prev) => (prev.checkIn === checkIn && prev.checkOut === checkOut ? prev : { checkIn, checkOut }))
  }, [])

  const boatAccess = bookingCabin.property_type !== "residence"
  const legacyHostTransportOre =
    transferRoutes.length === 0 && bookingCabin.offers_transport
      ? bookingCabin.transport_price_per_person_ore
      : null
  const canRequest = enableCabinTransportRequest && transferRoutes.length === 0 && !acceptedTransportOffer

  const showGettingThere =
    boatAccess || transferRoutes.length > 0 || transports.length > 0 || (legacyHostTransportOre ?? 0) > 0

  return (
    // Ét sæt komponenter: på mobil ligger bookingboksen efter beskrivelsen,
    // på desktop er den en sticky højre kolonne der spænder over begge rækker.
    <div className="mt-6 lg:mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_384px] lg:gap-x-12 lg:items-start">
      <div className="min-w-0">{leftContent}</div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <CabinBookingWidget
          cabin={bookingCabin}
          isLoggedIn={isLoggedIn}
          loginNextPath={loginNextPath}
          disabledYmd={disabledYmd}
          onGuestsChange={setGuests}
          onDatesChange={handleDatesChange}
          actionsRef={widgetRef}
          transferRoutes={transferRoutes}
          enableCabinTransportRequest={enableCabinTransportRequest}
          acceptedTransportOffer={acceptedTransportOffer}
          hasOpenTransportRequest={hasOpenTransportRequest}
        />
      </div>

      <div className="space-y-8 min-w-0 lg:col-start-1">
        {showGettingThere && (
          <CabinGettingThere
            locationHub={bookingCabin.location_hub}
            boatAccess={boatAccess}
            transferRoutes={transferRoutes}
            legacyHostTransportOre={legacyHostTransportOre}
            rideShares={transports}
            checkIn={dates.checkIn}
            checkOut={dates.checkOut}
            guests={guests}
            canRequest={canRequest}
            hasOpenRequest={hasOpenTransportRequest}
            hasAcceptedOffer={Boolean(acceptedTransportOffer)}
            onRequestTransport={() => widgetRef.current?.openTransportRequest()}
          />
        )}
        {reviewsContent}
      </div>
    </div>
  )
}
