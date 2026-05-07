"use client"

import { useState, type ReactNode } from "react"
import CabinBookingWidget from "@/components/cabins/CabinBookingWidget"
import CabinTransportSection, {
  type RideShareData,
} from "@/components/cabins/CabinTransportSection"
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
  /** Strukturerede transfer-ruter til booking (samme som TransferRoutesDisplay-kilden) */
  transferRoutes?: TransferRoute[]
  /** Server-komponent: strukturerede transfer-ruter (fx TransferRoutesDisplay) */
  transferRoutesContent?: ReactNode
  /** Server-rendered statisk indhold til venstre kolonne (Om hytten, Inkluderet, Din vært) */
  leftContent: ReactNode
  /** Server-rendered anmeldelsessektion — vises i bunden af venstre kolonne */
  reviewsContent: ReactNode
}

export default function CabinDetailLayout({
  bookingCabin,
  transportCabin,
  transports,
  isLoggedIn,
  loginNextPath,
  disabledYmd,
  transferRoutes = [],
  transferRoutesContent,
  leftContent,
  reviewsContent,
}: Props) {
  const [guests, setGuests] = useState(1)

  const showTransport =
    transports.length > 0 || transportCabin.offers_transport

  const bookingWidget = (
    <CabinBookingWidget
      cabin={bookingCabin}
      isLoggedIn={isLoggedIn}
      loginNextPath={loginNextPath}
      disabledYmd={disabledYmd}
      onGuestsChange={setGuests}
      transferRoutes={transferRoutes}
    />
  )

  const transportSection = showTransport ? (
    <CabinTransportSection
      cabin={transportCabin}
      transports={transports}
      guests={guests}
      showSectionTitle={!transferRoutesContent}
    />
  ) : null

  const komDertilBlock =
    transferRoutesContent || transportSection ? (
      <div className="space-y-6">
        {transferRoutesContent}
        {transportSection}
      </div>
    ) : null

  return (
    <div className="mt-6 lg:mt-10">

      {/* ── DESKTOP: to-kolonne med sticky sidebar ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_384px] lg:gap-12 lg:items-start">

        {/* Venstre kolonne */}
        <div className="space-y-8">
          {leftContent}
          {komDertilBlock}
          {reviewsContent}
        </div>

        {/* Højre kolonne — sticky */}
        <div className="sticky top-24">
          {bookingWidget}
        </div>
      </div>

      {/* ── MOBILE: én kolonne ── */}
      <div className="lg:hidden space-y-8">
        {leftContent}
        {bookingWidget}
        {komDertilBlock}
        {reviewsContent}
      </div>

    </div>
  )
}
